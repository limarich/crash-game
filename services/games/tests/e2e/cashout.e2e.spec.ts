import { describe, it, expect, beforeEach } from 'bun:test'
import { getPlayerToken, getPlayerId } from './helpers/auth'
import { waitFor } from './helpers/wait'
import { GAMES_URL, WALLETS_URL } from './helpers/constants'
import { deleteWallet, getBetStatus, getWalletBalance, seedWalletBalance, psqlGames } from './helpers/db'

const PHASE_TIMEOUT_MS = 180_000
const SAGA_TIMEOUT_MS = 15_000

async function getCurrentRound() {
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

// Returns the roundId where the bet was placed (confirmed)
async function placeBetAndWaitConfirmed(token: string, playerId: string, amountInCents = '1000') {
    await waitForPhase('BETTING')

    const res = await fetch(`${GAMES_URL}/bet`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ amountInCents }),
    })

    if (res.status !== 201) throw new Error(`Failed to place bet: ${res.status}`)

    const body = await res.json()
    const roundId = body.roundId

    await waitFor(async () => getBetStatus(playerId) === 'CONFIRMED', SAGA_TIMEOUT_MS)

    return roundId
}

function cleanupPlayer(playerId: string) {
    psqlGames(`DELETE FROM bets WHERE player_id = '${playerId}'`)
    deleteWallet(playerId)
}

async function createWallet(token: string) {
    await fetch(`${WALLETS_URL}`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
    })
}

describe('Cashout E2E', () => {
    let token: string
    let playerId: string

    beforeEach(async () => {
        token = await getPlayerToken()
        playerId = await getPlayerId()
        cleanupPlayer(playerId)
    })

    describe('Cashout without active bet', () => {
        it('should return 422 when player has no confirmed bet during RUNNING', async () => {
            await waitForPhase('RUNNING', 20_000)
            const res = await fetch(`${GAMES_URL}/bet/cashout`, {
                method: 'POST',
                headers: { Authorization: `Bearer ${token}` },
            })
            expect(res.status).toBe(422)
        })
    })

    describe('Cashout during RUNNING', () => {
        it('should cashout bet and update wallet balance', async () => {
            await createWallet(token)
            seedWalletBalance(playerId, 10_000n)

            const balanceBefore = BigInt(getWalletBalance(playerId))

            // Place bet and capture the round ID it belongs to
            const roundId = await placeBetAndWaitConfirmed(token, playerId, '1000')

            // Wait for THAT specific round to be RUNNING (not any round)
            await waitFor(async () => {
                const round = await getCurrentRound()
                return round?.id === roundId && round?.status === 'RUNNING'
            }, PHASE_TIMEOUT_MS)

            const cashoutRes = await fetch(`${GAMES_URL}/bet/cashout`, {
                method: 'POST',
                headers: { Authorization: `Bearer ${token}` },
            })
            expect([200, 201]).toContain(cashoutRes.status)
            const bet = await cashoutRes.json() as {
                status: string
                cashoutMultiplier: number
                payoutInCents: string
            }
            expect(bet.status).toBe('CASHED_OUT')
            expect(bet.cashoutMultiplier).toBeGreaterThanOrEqual(1.0)
            expect(BigInt(bet.payoutInCents)).toBeGreaterThanOrEqual(1000n)

            await waitFor(async () => {
                const balance = BigInt(getWalletBalance(playerId))
                return balance !== balanceBefore
            }, SAGA_TIMEOUT_MS)

            const balanceAfter = BigInt(getWalletBalance(playerId))
            const payout = BigInt(bet.payoutInCents)
            expect(balanceAfter).toBe(balanceBefore - 1000n + payout)
        })
    })

    describe('Round crashes -> CONFIRMED bets become LOST', () => {
        it('should mark confirmed bet as LOST and not change wallet balance after crash', async () => {
            await createWallet(token)
            seedWalletBalance(playerId, 10_000n)

            await placeBetAndWaitConfirmed(token, playerId, '1000')

            const balanceAfterBet = BigInt(getWalletBalance(playerId))
            expect(balanceAfterBet).toBe(9_000n)

            // Wait directly for the bet to become LOST.
            await waitFor(async () => getBetStatus(playerId) === 'LOST', 420_000)

            expect(getBetStatus(playerId)).toBe('LOST')

            const balanceAfterCrash = BigInt(getWalletBalance(playerId))
            expect(balanceAfterCrash).toBe(9_000n)
        }, 480_000)
    })

    describe('Insufficient balance -> bet CANCELLED', () => {
        it('should cancel bet when wallet has insufficient funds', async () => {
            await createWallet(token)
            seedWalletBalance(playerId, 500n)

            await waitForPhase('BETTING')

            const res = await fetch(`${GAMES_URL}/bet`, {
                method: 'POST',
                headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
                body: JSON.stringify({ amountInCents: '1000' }),
            })
            expect(res.status).toBe(201)
            const body = await res.json() as { status: string }
            expect(body.status).toBe('PENDING')

            await waitFor(async () => getBetStatus(playerId) === 'CANCELLED', SAGA_TIMEOUT_MS)
            expect(getBetStatus(playerId)).toBe('CANCELLED')

            expect(BigInt(getWalletBalance(playerId))).toBe(500n)
        })
    })
})
