import { describe, it, expect, beforeAll } from 'bun:test'
import { GAMES_URL } from './helpers/constants'
import { getPlayerId } from './helpers/auth'
import { seedE2EState, computeCrashPoint, SeededRoundIds } from './helpers/seeder'

interface RoundResponse {
    id: string
    nonce: number
    status: string
    crashPoint: number | null
}

interface VerifyResponse {
    roundId: string
    serverSeed: string
    serverSeedHash: string
    clientSeed: string
    nonce: number
    crashPoint: number
    verified: boolean
}

async function getVerify(roundId: string): Promise<VerifyResponse> {
    const res = await fetch(`${GAMES_URL}/rounds/${roundId}/verify`)
    return res.json() as Promise<VerifyResponse>
}

describe('Seeder E2E', () => {
    let roundIds: SeededRoundIds

    beforeAll(async () => {
        const playerId = await getPlayerId()
        roundIds = seedE2EState(playerId)
    })

    describe('History endpoint shows seeded rounds', () => {
        it('returns at least 5 CRASHED rounds in history', async () => {
            // fetch enough to be sure we cover historical rounds
            const res = await fetch(`${GAMES_URL}/rounds/history?limit=10`)
            const history = await res.json() as RoundResponse[]
            const crashed = history.filter(r => r.status === 'CRASHED')
            expect(crashed.length).toBeGreaterThanOrEqual(5)
        })
    })

    describe('Verify endpoint on seeded rounds', () => {
        it('crash100 round: verified=true, serverSeed revealed, crashPoint=1.00', async () => {
            const verify = await getVerify(roundIds.crash100)
            expect(verify.verified).toBe(true)
            expect(verify.serverSeed).toHaveLength(64)
            expect(verify.crashPoint).toBe(1.00)
        })

        it('crash500 round: verified=true, crashPoint near 5.00 (±0.10)', async () => {
            const verify = await getVerify(roundIds.crash500)
            expect(verify.verified).toBe(true)
            expect(Math.abs(verify.crashPoint - 5.00)).toBeLessThanOrEqual(0.10)
        })

        it('serverSeed matches serverSeedHash (SHA-256) for all seeded rounds', async () => {
            const { createHash } = await import('crypto')
            const labels = ['crash100', 'crash150', 'crash200', 'crash300', 'crash500'] as const
            expect(labels.length).toBe(5)

            for (const label of labels) {
                const verify = await getVerify(roundIds[label])
                expect(verify.verified).toBe(true)
                const computed = createHash('sha256').update(verify.serverSeed).digest('hex')
                expect(computed).toBe(verify.serverSeedHash)
            }
        })

        it('computeCrashPoint(serverSeed, clientSeed, nonce) reproduces stored crashPoint for all seeded rounds', async () => {
            const labels = ['crash100', 'crash150', 'crash200', 'crash300', 'crash500'] as const
            expect(labels.length).toBe(5)

            for (const label of labels) {
                const verify = await getVerify(roundIds[label])
                const computed = computeCrashPoint(
                    verify.serverSeed,
                    verify.clientSeed,
                    verify.nonce,
                )
                expect(Math.abs(computed - verify.crashPoint)).toBeLessThanOrEqual(0.001)
            }
        })
    })
})
