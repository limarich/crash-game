import { describe, it, expect } from 'bun:test'
import { GAMES_URL } from './helpers/constants'
import { getPlayerToken } from './helpers/auth'

describe('Authentication E2E', () => {
    describe('Unauthenticated access to public endpoints', () => {
        it('GET /games/rounds/current should return 200 without auth', async () => {
            const res = await fetch(`${GAMES_URL}/rounds/current`)
            expect(res.status).toBe(200)
        })

        it('GET /games/rounds/history should return 200 without auth', async () => {
            const res = await fetch(`${GAMES_URL}/rounds/history`)
            expect(res.status).toBe(200)
        })
    })

    describe('Protected endpoints require auth', () => {
        it('GET /games/bets/me should return 401 without token', async () => {
            const res = await fetch(`${GAMES_URL}/bets/me`)
            expect(res.status).toBe(401)
        })

        it('POST /games/bet should return 401 without token', async () => {
            const res = await fetch(`${GAMES_URL}/bet`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ amountInCents: '1000' }),
            })
            expect(res.status).toBe(401)
        })

        it('POST /games/bet/cashout should return 401 without token', async () => {
            const res = await fetch(`${GAMES_URL}/bet/cashout`, { method: 'POST' })
            expect(res.status).toBe(401)
        })

        it('POST /games/bet should return 401 with invalid token', async () => {
            const res = await fetch(`${GAMES_URL}/bet`, {
                method: 'POST',
                headers: {
                    Authorization: 'Bearer invalid.token.here',
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ amountInCents: '1000' }),
            })
            expect(res.status).toBe(401)
        })
    })

    describe('Valid token grants access', () => {
        it('GET /games/bets/me should return 200 with valid token', async () => {
            const token = await getPlayerToken()
            const res = await fetch(`${GAMES_URL}/bets/me`, {
                headers: { Authorization: `Bearer ${token}` },
            })
            expect(res.status).toBe(200)
        })
    })
})
