import { describe, it, expect, mock } from 'bun:test'
import { CancelBetUseCase } from '../../../../src/application/use-cases/cancel-bet.use-case'
import type { IBetRepository } from '../../../../src/domain/bet/bet.interface'
import { Bet } from '../../../../src/domain/bet/bet.entity'

const makeBet = () => new Bet({
    id: 'bet-1',
    roundId: 'round-1',
    playerId: 'player-1',
    amountInCents: 1000n,
    createdAt: new Date(),
})

const makeMockRepository = (bet: Bet | null = null): IBetRepository => ({
    findById: mock(() => Promise.resolve(bet)),
    findByRoundId: mock(() => Promise.resolve([])),
    findByPlayerAndRound: mock(() => Promise.resolve(null)),
    findByPlayerAndRoundWithLock: mock(() => Promise.resolve(null)),
    findByPlayer: mock(() => Promise.resolve([])),
    save: mock(() => Promise.resolve()),
})

describe('CancelBetUseCase', () => {
    it('should return silently if bet is not found', async () => {
        const repository = makeMockRepository(null)
        const useCase = new CancelBetUseCase(repository)

        await expect(useCase.execute({ betId: 'bet-1' })).resolves.toBeUndefined()
        expect(repository.save).not.toHaveBeenCalled()
    })

    it('should transition bet from PENDING to CANCELLED on happy path', async () => {
        const bet = makeBet()
        const repository = makeMockRepository(bet)
        const useCase = new CancelBetUseCase(repository)

        await useCase.execute({ betId: 'bet-1' })

        expect(bet.getStatus()).toBe('CANCELLED')
        expect(repository.save).toHaveBeenCalledTimes(1)
        expect(repository.save).toHaveBeenCalledWith(bet)
    })
})
