import { describe, it, expect, beforeEach, beforeAll } from 'bun:test'
import { getPlayerToken, getPlayerId } from './helpers/auth'
import { waitFor } from './helpers/wait'
import { GAMES_URL, WALLETS_URL } from './helpers/constants'
import { deleteWallet, getBetStatus, seedWalletBalance, psqlGames } from './helpers/db'

const PHASE_TIMEOUT_MS = 180_000
const SAGA_TIMEOUT_MS = 15_000

async function getCurrentRound() {
    const res = await fetch(`${GAMES_URL}/rounds/current`)
    if (!res.ok) return null
    return res.json() as Promise<{ id: string; status: string }>
}

async function waitForPhase(phase: 'BETTING' | 'RUNNING', timeoutMs = PHASE_TIMEOUT_MS) {
    await waitFor(async () => {
        const round = await getCurrentRound()
        return round?.status === phase
    }, timeoutMs)
}

async function placeBet(token: string, amountInCents: string) {
    return fetch(`${GAMES_URL}/bet`, {
        method: 'POST',
        headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({ amountInCents }),
    })
}

async function createWallet(token: string) {
    await fetch(`${WALLETS_URL}`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
    })
}

function cleanupPlayer(playerId: string) {
    deleteWallet(playerId)
    psqlGames(`DELETE FROM bets WHERE player_id = '${playerId}'`)
}

describe('Place Bet E2E - validation errors', () => {
    let token: string
    let playerId: string

    beforeAll(async () => {
        token = await getPlayerToken()
        playerId = await getPlayerId()
        cleanupPlayer(playerId)
        await waitForPhase('BETTING')
    })

    it('should return 422 for amount below minimum (99 cents)', async () => {
        const round = await getCurrentRound()
        if (round?.status !== 'BETTING') await waitForPhase('BETTING')
        const res = await placeBet(token, '99')
        expect(res.status).toBe(422)
    })

    it('should return 422 for amount above maximum (100001 cents)', async () => {
        const round = await getCurrentRound()
        if (round?.status !== 'BETTING') await waitForPhase('BETTING')
        const res = await placeBet(token, '100001')
        expect(res.status).toBe(422)
    })

    it('should return 422 when betting during RUNNING phase', async () => {
        await waitForPhase('RUNNING')
        const res = await placeBet(token, '1000')
        expect(res.status).toBe(422)
    })
})

describe('Place Bet E2E -> Saga: wallet not found -> bet CANCELLED', () => {
    let token: string
    let playerId: string

    beforeEach(async () => {
        token = await getPlayerToken()
        playerId = await getPlayerId()
        cleanupPlayer(playerId)
    })

    it('should create PENDING bet then CANCEL it when player has no wallet', async () => {
        await waitForPhase('BETTING')

        const res = await placeBet(token, '1000')
        expect(res.status).toBe(201)
        const body = await res.json() as { status: string }
        expect(body.status).toBe('PENDING')

        await waitFor(async () => getBetStatus(playerId) === 'CANCELLED', SAGA_TIMEOUT_MS)
        expect(getBetStatus(playerId)).toBe('CANCELLED')
    })
})

describe('Place Bet E2E -> Saga: wallet with funds -> bet CONFIRMED', () => {
    let token: string
    let playerId: string

    beforeEach(async () => {
        token = await getPlayerToken()
        playerId = await getPlayerId()
        cleanupPlayer(playerId)
    })

    it('should create PENDING bet then CONFIRM it when player has sufficient balance', async () => {
        await createWallet(token)
        seedWalletBalance(playerId, 10_000n)
        await waitForPhase('BETTING')

        const res = await placeBet(token, '1000')
        expect(res.status).toBe(201)
        const body = await res.json() as { status: string; amountInCents: string }
        expect(body.status).toBe('PENDING')
        expect(body.amountInCents).toBe('1000')

        await waitFor(async () => getBetStatus(playerId) === 'CONFIRMED', SAGA_TIMEOUT_MS)
        expect(getBetStatus(playerId)).toBe('CONFIRMED')
    })
})

describe('Place Bet E2E -> Duplicate bet -> 409', () => {
    let token: string
    let playerId: string

    beforeEach(async () => {
        token = await getPlayerToken()
        playerId = await getPlayerId()
        cleanupPlayer(playerId)
    })

    it('should return 409 when player places a second bet in the same round', async () => {
        await createWallet(token)
        seedWalletBalance(playerId, 10_000n)
        await waitForPhase('BETTING')

        const first = await placeBet(token, '1000')
        expect(first.status).toBe(201)

        const second = await placeBet(token, '1000')
        expect(second.status).toBe(409)
    })
})
