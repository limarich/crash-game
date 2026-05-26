import { describe, it, expect } from 'bun:test'
import { GAMES_URL, WALLETS_URL } from './helpers/constants'
import { getPlayerToken } from './helpers/auth'

describe('Rate Limiting E2E', () => {
    describe('Kong injects rate-limit headers on games-service routes', () => {
        it('GET /games/rounds/current has X-RateLimit headers', async () => {
            const res = await fetch(`${GAMES_URL}/rounds/current`)
            expect(res.headers.get('X-RateLimit-Limit-Minute')).not.toBeNull()
            expect(Number(res.headers.get('X-RateLimit-Limit-Minute'))).toBeGreaterThan(0)
            expect(res.headers.get('X-RateLimit-Remaining-Minute')).not.toBeNull()
        })

        it('POST /games/bet has per-route limit of 20 req/min', async () => {
            const token = await getPlayerToken()
            const res = await fetch(`${GAMES_URL}/bet`, {
                method: 'POST',
                headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
                body: '{"amountInCents":"100"}',
            })
            expect(res.headers.get('X-RateLimit-Limit-Minute')).toBe('20')
        })

        it('POST /games/bet/cashout has per-route limit of 20 req/min', async () => {
            const token = await getPlayerToken()
            const res = await fetch(`${GAMES_URL}/bet/cashout`, {
                method: 'POST',
                headers: { Authorization: `Bearer ${token}` },
            })
            expect(res.headers.get('X-RateLimit-Limit-Minute')).toBe('20')
        })
    })

    describe('Kong injects rate-limit headers on wallets-service routes', () => {
        it('POST /wallets has per-route limit of 10 req/min', async () => {
            const token = await getPlayerToken()
            const res = await fetch(`${WALLETS_URL}`, {
                method: 'POST',
                headers: { Authorization: `Bearer ${token}` },
            })
            expect(res.headers.get('X-RateLimit-Limit-Minute')).toBe('10')
        })
    })

    describe('Normal usage is never rate-limited', () => {
        it('10 concurrent GET /games/rounds/current calls all succeed (no 429)', async () => {
            const statuses = await Promise.all(
                Array.from({ length: 10 }, () =>
                    fetch(`${GAMES_URL}/rounds/current`).then(r => r.status),
                ),
            )
            expect(statuses.every(s => s !== 429)).toBe(true)
        })

        it('10 concurrent GET /games/leaderboard calls all succeed (no 429)', async () => {
            const statuses = await Promise.all(
                Array.from({ length: 10 }, () =>
                    fetch(`${GAMES_URL}/leaderboard`).then(r => r.status),
                ),
            )
            expect(statuses.every(s => s !== 429)).toBe(true)
        })
    })
})
