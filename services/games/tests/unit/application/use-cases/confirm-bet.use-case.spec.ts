import { describe, it, expect, mock } from 'bun:test'
import { ConfirmBetUseCase } from '../../../../src/application/use-cases/confirm-bet.use-case'
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

describe('ConfirmBetUseCase', () => {
    it('should return silently if bet is not found', async () => {
        const repository = makeMockRepository(null)
        const useCase = new ConfirmBetUseCase(repository)

        await expect(useCase.execute({ betId: 'bet-1' })).resolves.toBeUndefined()
        expect(repository.save).not.toHaveBeenCalled()
    })

    it('should transition bet from PENDING to CONFIRMED on happy path', async () => {
        const bet = makeBet()
        const repository = makeMockRepository(bet)
        const useCase = new ConfirmBetUseCase(repository)

        await useCase.execute({ betId: 'bet-1' })

        expect(bet.getStatus()).toBe('CONFIRMED')
        expect(repository.save).toHaveBeenCalledTimes(1)
        expect(repository.save).toHaveBeenCalledWith(bet)
    })

    it('should throw when wallet.debit.succeeded is delivered twice for the same bet', async () => {
        const bet = makeBet()
        bet.confirm()
        const repository = makeMockRepository(bet)
        const useCase = new ConfirmBetUseCase(repository)

        await expect(useCase.execute({ betId: 'bet-1' })).rejects.toThrow()
        expect(repository.save).not.toHaveBeenCalled()
    })
})
