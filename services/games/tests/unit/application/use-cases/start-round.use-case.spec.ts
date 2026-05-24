import { describe, it, expect, mock } from 'bun:test'
import { UnprocessableEntityException } from '@nestjs/common'
import { StartRoundUseCase } from '../../../../src/application/use-cases/start-round.use-case'
import type { IRoundRepository } from '../../../../src/domain/round/round.interface'
import { Round } from '../../../../src/domain/round/round.entity'

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

const makeMockRepository = (round: Round | null = null): IRoundRepository => ({
    findCurrent: mock(() => Promise.resolve(round)),
    findById: mock(() => Promise.resolve(null)),
    findHistory: mock(() => Promise.resolve([])),
    save: mock(() => Promise.resolve()),
})

describe('StartRoundUseCase', () => {
    it('should throw UnprocessableEntityException if no active round exists', async () => {
        const repository = makeMockRepository(null)
        const useCase = new StartRoundUseCase(repository)

        await expect(useCase.execute()).rejects.toThrow(UnprocessableEntityException)
    })

    it('should throw UnprocessableEntityException if round is not in BETTING phase', async () => {
        const repository = makeMockRepository(makeRound('RUNNING'))
        const useCase = new StartRoundUseCase(repository)

        await expect(useCase.execute()).rejects.toThrow(UnprocessableEntityException)
    })

    it('should transition round to RUNNING and save on happy path', async () => {
        const round = makeRound('BETTING')
        const repository = makeMockRepository(round)
        const useCase = new StartRoundUseCase(repository)

        const result = await useCase.execute()

        expect(result.getStatus()).toBe('RUNNING')
        expect(result.getStartedAt()).toBeInstanceOf(Date)
        expect(repository.save).toHaveBeenCalledTimes(1)
        expect(repository.save).toHaveBeenCalledWith(round)
    })
})
