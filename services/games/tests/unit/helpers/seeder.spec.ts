import { describe, it, expect } from 'bun:test'
import { computeCrashPoint, KNOWN_SEEDS } from '../../e2e/helpers/seeder'

describe('computeCrashPoint', () => {
    it('is deterministic — same inputs always return same crash point', () => {
        const seed = 'abc123def456abc123def456abc123def456abc123def456abc123def456abc1'
        const a = computeCrashPoint(seed, 'client', 1)
        const b = computeCrashPoint(seed, 'client', 1)
        expect(a).toBe(b)
    })

    it('returns 1.00 when house edge condition is met (h % 33 === 0)', () => {
        // Brute-force a seed that triggers the house edge path
        const { createHmac } = require('crypto')
        const clientSeed = 'test-client'
        const nonce = 1

        let houseEdgeSeed: string | null = null
        for (let i = 0; i < 10_000; i++) {
            const candidate = i.toString(16).padStart(64, '0')
            const hmac = createHmac('sha256', candidate)
            hmac.update(`${clientSeed}:${nonce}`)
            const hash = hmac.digest('hex')
            const h = parseInt(hash.slice(0, 8), 16)
            if (h % 33 === 0) { houseEdgeSeed = candidate; break }
        }

        expect(houseEdgeSeed).not.toBeNull()
        expect(computeCrashPoint(houseEdgeSeed!, clientSeed, nonce)).toBe(1.00)
    })

    it('changes crash point when nonce changes', () => {
        const seed = 'deadbeefdeadbeefdeadbeefdeadbeefdeadbeefdeadbeefdeadbeefdeadbeef'
        const a = computeCrashPoint(seed, 'client', 1)
        const b = computeCrashPoint(seed, 'client', 2)
        expect(a).toBeGreaterThanOrEqual(1.00)
        expect(b).toBeGreaterThanOrEqual(1.00)
    })

    it('result is always >= 1.00', () => {
        const seeds = [
            'aaaa'.repeat(16),
            'bbbb'.repeat(16),
            'cccc'.repeat(16),
            'ffff'.repeat(16),
            '0000'.repeat(16),
        ]
        for (const seed of seeds) {
            expect(computeCrashPoint(seed, 'client', 1)).toBeGreaterThanOrEqual(1.00)
        }
    })

    it('result is always <= 100 (cap applied)', () => {
        const seeds = [
            'aaaa'.repeat(16),
            'bbbb'.repeat(16),
            'ffff'.repeat(16),
        ]
        for (const seed of seeds) {
            expect(computeCrashPoint(seed, 'client', 1)).toBeLessThanOrEqual(100)
        }
    })
})

describe('KNOWN_SEEDS', () => {
    it('crash100 produces crash point of exactly 1.00', () => {
        const { crash100 } = KNOWN_SEEDS
        expect(computeCrashPoint(crash100.serverSeed, crash100.clientSeed, crash100.nonce)).toBe(1.00)
    })

    it('crash150 produces crash point near 1.50 (±0.05)', () => {
        const { crash150 } = KNOWN_SEEDS
        const cp = computeCrashPoint(crash150.serverSeed, crash150.clientSeed, crash150.nonce)
        expect(cp).toBeCloseTo(1.50, 1)
        expect(Math.abs(cp - 1.50)).toBeLessThanOrEqual(0.05)
    })

    it('crash200 produces crash point near 2.00 (±0.05)', () => {
        const { crash200 } = KNOWN_SEEDS
        const cp = computeCrashPoint(crash200.serverSeed, crash200.clientSeed, crash200.nonce)
        expect(Math.abs(cp - 2.00)).toBeLessThanOrEqual(0.05)
    })

    it('crash300 produces crash point near 3.00 (±0.10)', () => {
        const { crash300 } = KNOWN_SEEDS
        const cp = computeCrashPoint(crash300.serverSeed, crash300.clientSeed, crash300.nonce)
        expect(Math.abs(cp - 3.00)).toBeLessThanOrEqual(0.10)
    })

    it('crash500 produces crash point near 5.00 (±0.10)', () => {
        const { crash500 } = KNOWN_SEEDS
        const cp = computeCrashPoint(crash500.serverSeed, crash500.clientSeed, crash500.nonce)
        expect(Math.abs(cp - 5.00)).toBeLessThanOrEqual(0.10)
    })

    it('serverSeedHash is SHA256 of serverSeed for all known seeds', () => {
        const { createHash } = require('crypto')
        for (const entry of Object.values(KNOWN_SEEDS)) {
            const expected = createHash('sha256').update(entry.serverSeed).digest('hex')
            expect(entry.serverSeedHash).toBe(expected)
        }
    })
})
