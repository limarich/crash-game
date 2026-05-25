import { describe, it, expect, mock } from 'bun:test'
import { UnprocessableEntityException } from '@nestjs/common'
import { CrashRoundUseCase } from '../../../../src/application/use-cases/crash-round.use-case'
import type { IRoundRepository } from '../../../../src/domain/round/round.interface'
import type { IBetRepository } from '../../../../src/domain/bet/bet.interface'
import { Round } from '../../../../src/domain/round/round.entity'
import { Bet } from '../../../../src/domain/bet/bet.entity'

const makeRunningRound = () => new Round({
    id: 'round-1',
    nonce: 1,
    clientSeed: 'client-seed',
    serverSeed: 'server-seed',
    serverSeedHash: 'hash-abc',
    crashPoint: 2.0,
    bettingEndsAt: new Date(Date.now() - 1000),
    createdAt: new Date(),
    status: 'RUNNING',
    startedAt: new Date(Date.now() - 5000),
})

const makePendingBet = (id = 'bet-pending') => new Bet({
    id,
    roundId: 'round-1',
    playerId: `player-${id}`,
    amountInCents: 1000n,
    createdAt: new Date(),
})

const makeConfirmedBet = (id = 'bet-confirmed') => {
    const bet = new Bet({
        id,
        roundId: 'round-1',
        playerId: `player-${id}`,
        amountInCents: 1000n,
        createdAt: new Date(),
    })
    bet.confirm()
    return bet
}

const makeMockRepositories = (round: Round | null, bets: Bet[] = []) => ({
    roundRepository: {
        findCurrent: mock(() => Promise.resolve(round)),
        findById: mock(() => Promise.resolve(null)),
        findHistory: mock(() => Promise.resolve([])),
        save: mock(() => Promise.resolve()),
    } as unknown as IRoundRepository,
    betRepository: {
        findById: mock(() => Promise.resolve(null)),
        findByRoundId: mock(() => Promise.resolve(bets)),
        findByPlayerAndRound: mock(() => Promise.resolve(null)),
        findByPlayerAndRoundWithLock: mock(() => Promise.resolve(null)),
        findByPlayer: mock(() => Promise.resolve([])),
        save: mock(() => Promise.resolve()),
    } as unknown as IBetRepository,
})

describe('CrashRoundUseCase', () => {
    it('should throw UnprocessableEntityException if round is not in RUNNING phase', async () => {
        const bettingRound = new Round({
            id: 'round-1',
            nonce: 1,
            clientSeed: 'client-seed',
            serverSeed: 'server-seed',
            serverSeedHash: 'hash-abc',
            crashPoint: 2.0,
            bettingEndsAt: new Date(Date.now() + 10000),
            createdAt: new Date(),
            status: 'BETTING',
        })
        const { roundRepository, betRepository } = makeMockRepositories(bettingRound)
        const useCase = new CrashRoundUseCase(roundRepository, betRepository)

        await expect(useCase.execute()).rejects.toThrow(UnprocessableEntityException)
    })

    it('should transition round to CRASHED on happy path', async () => {
        const round = makeRunningRound()
        const { roundRepository, betRepository } = makeMockRepositories(round)
        const useCase = new CrashRoundUseCase(roundRepository, betRepository)

        const result = await useCase.execute()

        expect(result.getStatus()).toBe('CRASHED')
        expect(result.getCrashedAt()).toBeInstanceOf(Date)
        expect(roundRepository.save).toHaveBeenCalledWith(round)
    })

    it('should mark all CONFIRMED bets as LOST', async () => {
        const round = makeRunningRound()
        const confirmed1 = makeConfirmedBet('bet-1')
        const confirmed2 = makeConfirmedBet('bet-2')
        const { roundRepository, betRepository } = makeMockRepositories(round, [confirmed1, confirmed2])
        const useCase = new CrashRoundUseCase(roundRepository, betRepository)

        await useCase.execute()

        expect(confirmed1.getStatus()).toBe('LOST')
        expect(confirmed2.getStatus()).toBe('LOST')
        expect(betRepository.save).toHaveBeenCalledTimes(2)
    })

    it('should ignore bets that are not CONFIRMED', async () => {
        const round = makeRunningRound()
        const pendingBet = makePendingBet('bet-pending')
        const confirmedBet = makeConfirmedBet('bet-confirmed')
        const { roundRepository, betRepository } = makeMockRepositories(round, [pendingBet, confirmedBet])
        const useCase = new CrashRoundUseCase(roundRepository, betRepository)

        await useCase.execute()

        expect(pendingBet.getStatus()).toBe('PENDING')
        expect(confirmedBet.getStatus()).toBe('LOST')
        expect(betRepository.save).toHaveBeenCalledTimes(1)
        expect(betRepository.save).toHaveBeenCalledWith(confirmedBet)
    })

    it('should ignore CASHED_OUT bets when crashing', async () => {
        const round = makeRunningRound()
        const cashedOutBet = makeConfirmedBet('bet-cashedout')
        cashedOutBet.cashout(2.0)
        const confirmedBet = makeConfirmedBet('bet-confirmed')
        const { roundRepository, betRepository } = makeMockRepositories(round, [cashedOutBet, confirmedBet])
        const useCase = new CrashRoundUseCase(roundRepository, betRepository)

        await useCase.execute()

        expect(cashedOutBet.getStatus()).toBe('CASHED_OUT')
        expect(confirmedBet.getStatus()).toBe('LOST')
        expect(betRepository.save).toHaveBeenCalledTimes(1)
        expect(betRepository.save).toHaveBeenCalledWith(confirmedBet)
    })

    it('should handle empty bets list gracefully', async () => {
        const round = makeRunningRound()
        const { roundRepository, betRepository } = makeMockRepositories(round, [])
        const useCase = new CrashRoundUseCase(roundRepository, betRepository)

        const result = await useCase.execute()

        expect(result.getStatus()).toBe('CRASHED')
        expect(betRepository.save).not.toHaveBeenCalled()
    })
})
