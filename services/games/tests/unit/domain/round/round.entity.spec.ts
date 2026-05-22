import { describe, it, expect } from 'bun:test'

import { Round, RoundStatus } from '../../../../src/domain/round/round.entity'
import { InvalidStateTransitionError, SeedNotAvailableError } from '../../../../src/domain/round/round.errors'

const makeRound = (overrides?: Partial<{
    status: RoundStatus
    startedAt: Date | null
    crashedAt: Date | null
}>) => new Round({
    id: 'round-1',
    nonce: 1,
    clientSeed: 'client-seed-abc',
    serverSeed: 'server-seed-xyz',
    serverSeedHash: 'hash-xyz',
    crashPoint: 2.50,
    bettingEndsAt: new Date(Date.now() + 10000),
    createdAt: new Date(),
    ...overrides,
})

describe('Round', () => {

    describe('state machine', () => {
        it('should start with BETTING status', () => {
            const round = makeRound()
            expect(round.getStatus()).toBe('BETTING')
        })

        it('should transition from BETTING to RUNNING when calling start()', () => {
            const round = makeRound()
            round.start()
            expect(round.getStatus()).toBe('RUNNING')
        })

        it('should define startedAt when calling start()', () => {
            const round = makeRound()
            expect(round.getStartedAt()).toBeNull()
            round.start()
            expect(round.getStartedAt()).toBeInstanceOf(Date)
        })

        it('should transition from RUNNING to CRASHED when calling crash()', () => {
            const round = makeRound()
            round.start()
            round.crash()
            expect(round.getStatus()).toBe('CRASHED')
        })

        it('should define crashedAt when calling crash()', () => {
            const round = makeRound()
            round.start()
            expect(round.getCrashedAt()).toBeNull()
            round.crash()
            expect(round.getCrashedAt()).toBeInstanceOf(Date)
        })

        it('should throw InvalidStateTransitionError when calling start() before BETTING', () => {
            const round = makeRound()
            round.start()
            expect(() => round.start()).toThrow(InvalidStateTransitionError)
        })

        it('should throw InvalidStateTransitionError when calling crash() outside of RUNNING', () => {
            const round = makeRound()
            expect(() => round.crash()).toThrow(InvalidStateTransitionError)
        })

        it('should throw InvalidStateTransitionError when calling crash() after already crashed', () => {
            const round = makeRound()
            round.start()
            round.crash()
            expect(() => round.crash()).toThrow(InvalidStateTransitionError)
        })
    })

    describe('provably fair', () => {
        it('should throw SeedNotAvailableError when calling getServerSeed() before crash', () => {
            const round = makeRound()
            expect(() => round.getServerSeed()).toThrow(SeedNotAvailableError)
        })

        it('should throw SeedNotAvailableError when calling getServerSeed() during RUNNING', () => {
            const round = makeRound()
            round.start()
            expect(() => round.getServerSeed()).toThrow(SeedNotAvailableError)
        })

        it('should return serverSeed after crash', () => {
            const round = makeRound()
            round.start()
            round.crash()
            expect(round.getServerSeed()).toBe('server-seed-xyz')
        })

        it('should throw SeedNotAvailableError when calling getCrashPoint() before crash', () => {
            const round = makeRound()
            expect(() => round.getCrashPoint()).toThrow(SeedNotAvailableError)
        })

        it('should return crashPoint after crash', () => {
            const round = makeRound()
            round.start()
            round.crash()
            expect(round.getCrashPoint()).toBe(2.50)
        })
    })

    describe('multiplier', () => {
        it('should throw error when calling getCurrentMultiplier() outside of RUNNING', () => {
            const round = makeRound()
            expect(() => round.getCurrentMultiplier(Date.now())).toThrow(InvalidStateTransitionError)
        })

        it('should return 1.00 at the start of the round', () => {
            const round = makeRound()
            round.start()
            const now = round.getStartedAt()!.getTime()
            expect(round.getCurrentMultiplier(now)).toBe(1)
        })

        it('should grow with time', () => {
            const round = makeRound()
            round.start()
            const start = round.getStartedAt()!.getTime()
            const after30s = start + 30000
            expect(round.getCurrentMultiplier(after30s)).toBeGreaterThan(2)
        })

        it('should be deterministic for the same timestamp', () => {
            const round = makeRound()
            round.start()
            const now = round.getStartedAt()!.getTime() + 15000
            expect(round.getCurrentMultiplier(now)).toBe(round.getCurrentMultiplier(now))
        })
    })

})