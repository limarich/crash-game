import { describe, it, expect } from 'bun:test'
import { GAMES_URL } from './helpers/constants'
import { waitFor } from './helpers/wait'
import { createHash } from 'crypto'

interface VerifyResponse {
    roundId: string
    serverSeed: string | null
    serverSeedHash: string
    clientSeed: string
    nonce: number
    crashPoint: number | null
    verified: boolean
    chain: {
        nextRoundId: string
        nextServerSeedHash: string
        chainValid: boolean
    } | null
}

interface RoundResponse {
    id: string
    status: string
    serverSeedHash: string
    nonce: number
}

async function getVerify(roundId: string) {
    const res = await fetch(`${GAMES_URL}/rounds/${roundId}/verify`)
    return res.json() as Promise<VerifyResponse>
}

async function getHistory(limit = 5) {
    const res = await fetch(`${GAMES_URL}/rounds/history?limit=${limit}`)
    return res.json() as Promise<RoundResponse[]>
}

describe('Provably Fair E2E', () => {
    describe('verify on non-crashed round', () => {
        it('should return serverSeed null and verified false for current (non-crashed) round', async () => {
            // Wait until there is a non-crashed current round
            let current: { id: string; status: string } | null = null
            await waitFor(async () => {
                const res = await fetch(`${GAMES_URL}/rounds/current`)
                if (!res.ok) return false
                const body = await res.json() as { id: string; status: string }
                if (body.status !== 'CRASHED') {
                    current = body
                    return true
                }
                return false
            }, 30_000)

            const verify = await getVerify(current!.id)
            expect(verify.serverSeed).toBeNull()
            expect(verify.crashPoint).toBeNull()
            expect(verify.verified).toBe(false)
            expect(verify.serverSeedHash).toHaveLength(64)
        })
    })

    describe('verify on crashed round', () => {
        it('should return verified true with serverSeed and crashPoint revealed', async () => {
            let crashed: RoundResponse | null = null

            await waitFor(async () => {
                const history = await getHistory(1)
                if (history.length > 0 && history[0].status === 'CRASHED') {
                    crashed = history[0]
                    return true
                }
                return false
            }, 120_000, 2_000)

            expect(crashed).not.toBeNull()

            const verify = await getVerify(crashed!.id)

            expect(verify.serverSeed).not.toBeNull()
            expect(verify.serverSeed).toHaveLength(64)
            expect(verify.serverSeed).toMatch(/^[0-9a-f]+$/)
            expect(verify.crashPoint).not.toBeNull()
            expect(verify.crashPoint).toBeGreaterThanOrEqual(1.0)
            expect(verify.verified).toBe(true)

            const computedHash = createHash('sha256')
                .update(verify.serverSeed!)
                .digest('hex')
            expect(computedHash).toBe(verify.serverSeedHash)
        })
    })

    describe('chain between consecutive rounds', () => {
        it('should have chainValid true between two consecutive rounds', async () => {
            let validChainVerify: VerifyResponse | null = null

            await waitFor(async () => {
                const history = await getHistory(10)
                const crashed = history.filter(r => r.status === 'CRASHED')
                for (const round of crashed) {
                    const verify = await getVerify(round.id)
                    if (verify.chain?.chainValid === true) {
                        validChainVerify = verify
                        return true
                    }
                }
                return false
            }, 120_000, 5_000)

            expect(validChainVerify).not.toBeNull()
            expect(validChainVerify!.chain).not.toBeNull()
            expect(validChainVerify!.chain!.chainValid).toBe(true)
            expect(validChainVerify!.chain!.nextRoundId).toBeTruthy()
        })
    })
})
