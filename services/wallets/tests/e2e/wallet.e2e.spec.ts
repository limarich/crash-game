import { describe, it, expect, beforeEach } from 'bun:test'
import { getPlayerToken, getPlayerId, WALLETS_URL } from './helpers/auth'
import { deleteWallet, getWalletBalance } from './helpers/db'

describe('Wallet E2E', () => {
    let token: string
    let playerId: string

    beforeEach(async () => {
        token = await getPlayerToken()
        playerId = await getPlayerId()
        deleteWallet(playerId)
    })

    describe('POST /wallets', () => {
        it('should create wallet with zero balance', async () => {
            const res = await fetch(`${WALLETS_URL}`, {
                method: 'POST',
                headers: { Authorization: `Bearer ${token}` },
            })
            expect(res.status).toBe(201)
            const body = await res.json() as { id: string; balanceInCents: string }
            expect(body.id).toBeTruthy()
            expect(body.balanceInCents).toBe('0')
        })

        it('GET /wallets/me should return zero balance after creation', async () => {
            await fetch(`${WALLETS_URL}`, {
                method: 'POST',
                headers: { Authorization: `Bearer ${token}` },
            })

            const res = await fetch(`${WALLETS_URL}/me`, {
                headers: { Authorization: `Bearer ${token}` },
            })
            expect(res.status).toBe(200)
            const body = await res.json() as { balanceInCents: string }
            expect(body.balanceInCents).toBe('0')
        })

        it('should return 409 when wallet already exists', async () => {
            await fetch(`${WALLETS_URL}`, {
                method: 'POST',
                headers: { Authorization: `Bearer ${token}` },
            })
            const res = await fetch(`${WALLETS_URL}`, {
                method: 'POST',
                headers: { Authorization: `Bearer ${token}` },
            })
            expect(res.status).toBe(409)
        })

        it('should return 401 without token', async () => {
            const res = await fetch(`${WALLETS_URL}`, { method: 'POST' })
            expect(res.status).toBe(401)
        })

        it('should return 401 with invalid token', async () => {
            const res = await fetch(`${WALLETS_URL}`, {
                method: 'POST',
                headers: { Authorization: 'Bearer invalid.token.here' },
            })
            expect(res.status).toBe(401)
        })
    })

    describe('GET /wallets/me', () => {
        it('should return 401 without token', async () => {
            const res = await fetch(`${WALLETS_URL}/me`)
            expect(res.status).toBe(401)
        })

        it('should return 404 when wallet does not exist', async () => {
            const res = await fetch(`${WALLETS_URL}/me`, {
                headers: { Authorization: `Bearer ${token}` },
            })
            expect(res.status).toBe(404)
        })

        it('should return correct balance from database', async () => {
            await fetch(`${WALLETS_URL}`, {
                method: 'POST',
                headers: { Authorization: `Bearer ${token}` },
            })

            const dbBalance = getWalletBalance(playerId)
            expect(dbBalance).toBe('0')

            const res = await fetch(`${WALLETS_URL}/me`, {
                headers: { Authorization: `Bearer ${token}` },
            })
            const body = await res.json() as { balanceInCents: string }
            expect(body.balanceInCents).toBe(dbBalance)
        })
    })
})
