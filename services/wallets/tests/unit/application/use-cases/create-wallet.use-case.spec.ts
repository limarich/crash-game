import { describe, it, expect, beforeEach, mock } from 'bun:test'
import { ConflictException } from '@nestjs/common'
import { CreateWalletUseCase } from '../../../../src/application/use-cases/create-wallet.use-case'
import type { IWalletRepository } from '../../../../src/domain/wallet/wallet.interface'
import { Wallet } from '../../../../src/domain/wallet/wallet.entity'

const makeWallet = () => new Wallet({
    id: 'wallet-1',
    playerId: 'player-1',
    balanceInCents: 0n,
})

const makeMockRepository = (existing: Wallet | null = null): IWalletRepository => ({
    findByPlayerId: mock(() => Promise.resolve(existing)),
    save: mock(() => Promise.resolve()),
    debitWithLock: mock(() => Promise.resolve(makeWallet())),
})

describe('CreateWalletUseCase', () => {
    it('should create wallet with zero balance for a new player', async () => {
        const repository = makeMockRepository(null)
        const useCase = new CreateWalletUseCase(repository)

        const wallet = await useCase.execute('player-1')

        expect(wallet.playerId).toBe('player-1')
        expect(wallet.balance).toBe(0n)
        expect(wallet.id).toBeTruthy()
        expect(repository.save).toHaveBeenCalledTimes(1)
        expect(repository.save).toHaveBeenCalledWith(wallet)
    })

    it('should throw ConflictException if a wallet already exists for the playerId', async () => {
        const repository = makeMockRepository(makeWallet())
        const useCase = new CreateWalletUseCase(repository)

        expect(() => useCase.execute('player-1')).toThrow(ConflictException)
        expect(repository.save).not.toHaveBeenCalled()
    })
})
