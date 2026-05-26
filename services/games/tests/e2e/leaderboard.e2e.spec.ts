import { describe, it, expect, beforeEach } from 'bun:test'
import { getPlayerToken, getPlayerId } from './helpers/auth'
import { waitFor } from './helpers/wait'
import { GAMES_URL, WALLETS_URL } from './helpers/constants'
import { deleteWallet, getBetStatus, psqlGames, seedWalletBalance } from './helpers/db'

const PHASE_TIMEOUT_MS = 180_000
const SAGA_TIMEOUT_MS = 15_000

interface LeaderboardEntry {
    playerId: string
    playerName: string
    netProfitInCents: string
}

function getPlayerNameFromToken(token: string): string {
    const payload = token.split('.')[1]
    const decoded = Buffer.from(payload, 'base64').toString('utf8')
    return JSON.parse(decoded).preferred_username
}

async function getCurrentRound(): Promise<{ id: string; status: string } | null> {
    const res = await fetch(`${GAMES_URL}/rounds/current`)
    if (!res.ok) return null
    return res.json()
}

async function waitForPhase(phase: 'BETTING' | 'RUNNING', timeoutMs = PHASE_TIMEOUT_MS) {
    await waitFor(async () => {
        const round = await getCurrentRound()
        return round?.status === phase
    }, timeoutMs)
}

async function createWallet(token: string) {
    await fetch(`${WALLETS_URL}`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
    })
}

async function placeBet(token: string, amountInCents = '1000') {
    await waitForPhase('BETTING')

    const res = await fetch(`${GAMES_URL}/bet`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ amountInCents }),
    })
    if (res.status !== 201) throw new Error(`Failed to place bet: ${res.status}`)
    const body = await res.json() as { roundId: string }
    return body.roundId
}

function cleanupPlayer(playerId: string) {
    psqlGames(`DELETE FROM bets WHERE player_id = '${playerId}'`)
    deleteWallet(playerId)
}

describe('GET /games/leaderboard', () => {
    let token: string
    let playerId: string
    let playerName: string

    beforeEach(async () => {
        token = await getPlayerToken()
        playerId = await getPlayerId()
        playerName = getPlayerNameFromToken(token)
        cleanupPlayer(playerId)
    })

    it('should return 200 with an array', async () => {
        const res = await fetch(`${GAMES_URL}/leaderboard`)

        expect(res.status).toBe(200)
        const data = await res.json()
        expect(Array.isArray(data)).toBe(true)
    })

    it('should respect the limit query parameter', async () => {
        const res = await fetch(`${GAMES_URL}/leaderboard?limit=3`)

        expect(res.status).toBe(200)
        const data = await res.json() as LeaderboardEntry[]
        expect(data.length).toBeLessThanOrEqual(3)
    })

    it('should cap limit at 50 even when a higher value is requested', async () => {
        const res = await fetch(`${GAMES_URL}/leaderboard?limit=999`)

        expect(res.status).toBe(200)
        const data = await res.json() as LeaderboardEntry[]
        expect(data.length).toBeLessThanOrEqual(50)
    })

    it('should include playerName after a completed bet', async () => {
        const round = await getCurrentRound()
        if (!round) throw new Error('No current round')

        psqlGames(
            `INSERT INTO bets (id, round_id, player_id, player_name, amount_in_cents, status) ` +
            `VALUES (gen_random_uuid(), '${round.id}', '${playerId}', '${playerName}', 1000, 'LOST')`
        )

        const leaderboardRes = await fetch(`${GAMES_URL}/leaderboard?limit=50`)
        expect(leaderboardRes.status).toBe(200)
        const entries = await leaderboardRes.json() as LeaderboardEntry[]

        const myEntry = entries.find(e => e.playerId === playerId)
        expect(myEntry).toBeDefined()
        expect(myEntry?.playerName).toBe(playerName)
    })

    it('should return entries ordered by net profit descending', async () => {
        const leaderboardRes = await fetch(`${GAMES_URL}/leaderboard?limit=50`)
        expect(leaderboardRes.status).toBe(200)
        const entries = await leaderboardRes.json() as LeaderboardEntry[]

        for (let i = 1; i < entries.length; i++) {
            expect(BigInt(entries[i - 1].netProfitInCents)).toBeGreaterThanOrEqual(
                BigInt(entries[i].netProfitInCents),
            )
        }
    })

    it('should not include player with only PENDING bets', async () => {
        await createWallet(token)
        seedWalletBalance(playerId, 0n)

        await waitForPhase('BETTING')
        const res = await fetch(`${GAMES_URL}/bet`, {
            method: 'POST',
            headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
            body: JSON.stringify({ amountInCents: '1000' }),
        })
        expect(res.status).toBe(201)

        // The bet is PENDING (wallet debit will fail due to zero balance), give saga time to cancel it
        await waitFor(async () => {
            const status = getBetStatus(playerId)
            return status === 'CANCELLED' || status === 'CONFIRMED'
        }, SAGA_TIMEOUT_MS)

        const leaderboardRes = await fetch(`${GAMES_URL}/leaderboard?limit=50`)
        const entries = await leaderboardRes.json() as LeaderboardEntry[]

        // Player should not appear: CANCELLED bets are excluded from the leaderboard query
        const myEntry = entries.find(e => e.playerId === playerId)
        expect(myEntry).toBeUndefined()
    }, PHASE_TIMEOUT_MS)
})
