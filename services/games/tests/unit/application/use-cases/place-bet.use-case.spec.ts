import { describe, it, expect, mock, beforeEach } from 'bun:test'
import { ConflictException, UnprocessableEntityException } from '@nestjs/common'
import { PlaceBetUseCase } from '../../../../src/application/use-cases/place-bet.use-case'
import type { IRoundRepository } from '../../../../src/domain/round/round.interface'
import type { IBetRepository } from '../../../../src/domain/bet/bet.interface'
import { Round } from '../../../../src/domain/round/round.entity'
import { Bet } from '../../../../src/domain/bet/bet.entity'

const makeRound = (status: 'BETTING' | 'RUNNING' | 'CRASHED' = 'BETTING') => new Round({
    id: 'round-1',
    nonce: 1,
    clientSeed: 'client-seed',
    serverSeed: 'server-seed',
    serverSeedHash: 'hash-abc',
    crashPoint: 2.0,
    bettingEndsAt: new Date(Date.now() + 10000),
    createdAt: new Date(),
    status,
    startedAt: status === 'RUNNING' ? new Date(Date.now() - 5000) : null,
})

const makeBet = () => new Bet({
    id: 'bet-1',
    roundId: 'round-1',
    playerId: 'player-1',
    amountInCents: 1000n,
    createdAt: new Date(),
})

const makeMockRepositories = () => ({
    roundRepository: {
        findCurrent: mock(() => Promise.resolve(null)),
        findById: mock(() => Promise.resolve(null)),
        findHistory: mock(() => Promise.resolve([])),
        save: mock(() => Promise.resolve()),
    } as unknown as IRoundRepository,
    betRepository: {
        findById: mock(() => Promise.resolve(null)),
        findByRoundId: mock(() => Promise.resolve([])),
        findByPlayerAndRound: mock(() => Promise.resolve(null)),
        findByPlayerAndRoundWithLock: mock(() => Promise.resolve(null)),
        findByPlayer: mock(() => Promise.resolve([])),
        save: mock(() => Promise.resolve()),
    } as unknown as IBetRepository,
    publisher: {
        publishDebitRequest: mock(() => Promise.resolve()),
        publishCreditRequest: mock(() => Promise.resolve()),
    },
})

describe('PlaceBetUseCase', () => {
    let roundRepository: IRoundRepository
    let betRepository: IBetRepository
    let publisher: { publishDebitRequest: ReturnType<typeof mock>, publishCreditRequest: ReturnType<typeof mock> }

    beforeEach(() => {
        const mocks = makeMockRepositories()
        roundRepository = mocks.roundRepository
        betRepository = mocks.betRepository
        publisher = mocks.publisher
    })

    it('should throw UnprocessableEntityException if no active round exists', async () => {
        const useCase = new PlaceBetUseCase(roundRepository, betRepository, publisher as any)
        await expect(useCase.execute({ playerId: 'player-1', amountInCents: '1000' }))
            .rejects.toThrow(UnprocessableEntityException)
    })

    it('should throw UnprocessableEntityException if round is not in BETTING phase', async () => {
        roundRepository.findCurrent = mock(() => Promise.resolve(makeRound('RUNNING')))
        const useCase = new PlaceBetUseCase(roundRepository, betRepository, publisher as any)
        await expect(useCase.execute({ playerId: 'player-1', amountInCents: '1000' }))
            .rejects.toThrow(UnprocessableEntityException)
    })

    it('should throw ConflictException if player already placed a bet in this round', async () => {
        roundRepository.findCurrent = mock(() => Promise.resolve(makeRound('BETTING')))
        betRepository.findByPlayerAndRound = mock(() => Promise.resolve(makeBet()))
        const useCase = new PlaceBetUseCase(roundRepository, betRepository, publisher as any)
        await expect(useCase.execute({ playerId: 'player-1', amountInCents: '1000' }))
            .rejects.toThrow(ConflictException)
    })

    it('should create a PENDING bet and publish wallet.debit.requested on happy path', async () => {
        roundRepository.findCurrent = mock(() => Promise.resolve(makeRound('BETTING')))
        const useCase = new PlaceBetUseCase(roundRepository, betRepository, publisher as any)

        const bet = await useCase.execute({ playerId: 'player-1', amountInCents: '1000' })

        expect(bet.getStatus()).toBe('PENDING')
        expect(bet.playerId).toBe('player-1')
        expect(bet.roundId).toBe('round-1')
        expect(betRepository.save).toHaveBeenCalledTimes(1)
        expect(publisher.publishDebitRequest).toHaveBeenCalledTimes(1)
    })

    it('should convert amountInCents from string to BigInt correctly', async () => {
        roundRepository.findCurrent = mock(() => Promise.resolve(makeRound('BETTING')))
        const useCase = new PlaceBetUseCase(roundRepository, betRepository, publisher as any)

        const bet = await useCase.execute({ playerId: 'player-1', amountInCents: '5000' })

        expect(bet.amountInCents).toBe(5000n)
    })

    it('should throw when amountInCents is a non-numeric string', async () => {
        roundRepository.findCurrent = mock(() => Promise.resolve(makeRound('BETTING')))
        const useCase = new PlaceBetUseCase(roundRepository, betRepository, publisher)

        expect(() => useCase.execute({ playerId: 'player-1', amountInCents: 'abc' }))
            .toThrow()
    })

    it('should throw when amountInCents contains decimals', async () => {
        roundRepository.findCurrent = mock(() => Promise.resolve(makeRound('BETTING')))
        const useCase = new PlaceBetUseCase(roundRepository, betRepository, publisher)

        expect(() => useCase.execute({ playerId: 'player-1', amountInCents: '100.5' }))
            .toThrow()
    })
})
