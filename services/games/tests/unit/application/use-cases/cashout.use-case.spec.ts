import { describe, it, expect, mock, beforeEach } from 'bun:test'
import { UnprocessableEntityException } from '@nestjs/common'
import { CashoutUseCase } from '../../../../src/application/use-cases/cashout.use-case'
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
    crashPoint: 5.0,
    bettingEndsAt: new Date(Date.now() - 1000),
    createdAt: new Date(),
    status: 'RUNNING',
    startedAt: new Date(Date.now() - 5000),
})

const makeBet = (status: 'PENDING' | 'CONFIRMED' | 'CASHED_OUT' | 'LOST' | 'CANCELLED' = 'CONFIRMED') => {
    const bet = new Bet({
        id: 'bet-1',
        roundId: 'round-1',
        playerId: 'player-1',
        amountInCents: 1000n,
        createdAt: new Date(),
    })
    if (status === 'CONFIRMED') bet.confirm()
    return bet
}

const makeMockRepositories = () => ({
    roundRepository: {
        findCurrent: mock(() => Promise.resolve(null)),
        findById: mock(() => Promise.resolve(null)),
        findHistory: mock(() => Promise.resolve([])),
        save: mock(() => Promise.resolve()),
    } as IRoundRepository,
    betRepository: {
        findById: mock(() => Promise.resolve(null)),
        findByRoundId: mock(() => Promise.resolve([])),
        findByPlayerAndRound: mock(() => Promise.resolve(null)),
        findByPlayerAndRoundWithLock: mock(() => Promise.resolve(null)),
        findByPlayer: mock(() => Promise.resolve([])),
        save: mock(() => Promise.resolve()),
    } as IBetRepository,
    publisher: {
        publishDebitRequest: mock(() => Promise.resolve()),
        publishCreditRequest: mock(() => Promise.resolve()),
    },
})

describe('CashoutUseCase', () => {
    let roundRepository: IRoundRepository
    let betRepository: IBetRepository
    let publisher: { publishDebitRequest: ReturnType<typeof mock>, publishCreditRequest: ReturnType<typeof mock> }

    beforeEach(() => {
        const mocks = makeMockRepositories()
        roundRepository = mocks.roundRepository
        betRepository = mocks.betRepository
        publisher = mocks.publisher
    })

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
        roundRepository.findCurrent = mock(() => Promise.resolve(bettingRound))
        const useCase = new CashoutUseCase(roundRepository, betRepository, publisher as any)

        await expect(useCase.execute({ playerId: 'player-1' }))
            .rejects.toThrow(UnprocessableEntityException)
    })

    it('should throw UnprocessableEntityException if player has no CONFIRMED bet', async () => {
        roundRepository.findCurrent = mock(() => Promise.resolve(makeRunningRound()))
        betRepository.findByPlayerAndRoundWithLock = mock(() => Promise.resolve(null))
        const useCase = new CashoutUseCase(roundRepository, betRepository, publisher as any)

        await expect(useCase.execute({ playerId: 'player-1' }))
            .rejects.toThrow(UnprocessableEntityException)
    })

    it('should throw UnprocessableEntityException if bet exists but is not CONFIRMED', async () => {
        roundRepository.findCurrent = mock(() => Promise.resolve(makeRunningRound()))
        const pendingBet = new Bet({
            id: 'bet-1', roundId: 'round-1', playerId: 'player-1',
            amountInCents: 1000n, createdAt: new Date(),
        })
        betRepository.findByPlayerAndRoundWithLock = mock(() => Promise.resolve(pendingBet))
        const useCase = new CashoutUseCase(roundRepository, betRepository, publisher as any)

        await expect(useCase.execute({ playerId: 'player-1' }))
            .rejects.toThrow(UnprocessableEntityException)
    })

    it('should calculate payout and publish wallet.credit.requested on happy path', async () => {
        roundRepository.findCurrent = mock(() => Promise.resolve(makeRunningRound()))
        betRepository.findByPlayerAndRoundWithLock = mock(() => Promise.resolve(makeBet('CONFIRMED')))
        const useCase = new CashoutUseCase(roundRepository, betRepository, publisher as any)

        const bet = await useCase.execute({ playerId: 'player-1' })

        expect(bet.getStatus()).toBe('CASHED_OUT')
        expect(bet.getCashoutMultiplier()).toBeGreaterThan(1)
        expect(bet.getPayoutInCents()).toBeGreaterThan(0n)
        expect(betRepository.save).toHaveBeenCalledTimes(1)
        expect(publisher.publishCreditRequest).toHaveBeenCalledTimes(1)
    })

    it('should use findByPlayerAndRoundWithLock and not findByPlayerAndRound', async () => {
        roundRepository.findCurrent = mock(() => Promise.resolve(makeRunningRound()))
        betRepository.findByPlayerAndRoundWithLock = mock(() => Promise.resolve(makeBet('CONFIRMED')))
        const useCase = new CashoutUseCase(roundRepository, betRepository, publisher as any)

        await useCase.execute({ playerId: 'player-1' })

        expect(betRepository.findByPlayerAndRoundWithLock).toHaveBeenCalledTimes(1)
        expect(betRepository.findByPlayerAndRound).not.toHaveBeenCalled()
    })
})
