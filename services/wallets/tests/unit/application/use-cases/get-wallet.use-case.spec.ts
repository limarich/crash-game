import { describe, it, expect, mock } from 'bun:test'
import { NotFoundException } from '@nestjs/common'
import { GetWalletUseCase } from '../../../../src/application/use-cases/get-wallet.use-case'
import type { IWalletRepository } from '../../../../src/domain/wallet/wallet.interface'
import { Wallet } from '../../../../src/domain/wallet/wallet.entity'

const makeWallet = () => new Wallet({
    id: 'wallet-1',
    playerId: 'player-1',
    balanceInCents: 500n,
})

const makeMockRepository = (existing: Wallet | null): IWalletRepository => ({
    findByPlayerId: mock(() => Promise.resolve(existing)),
    save: mock(() => Promise.resolve()),
    debitWithLock: mock(() => Promise.resolve(makeWallet())),
})

describe('GetWalletUseCase', () => {
    it('should return the wallet for an existing playerId', async () => {
        const wallet = makeWallet()
        const repository = makeMockRepository(wallet)
        const useCase = new GetWalletUseCase(repository)

        const result = await useCase.execute('player-1')

        expect(result).toBe(wallet)
        expect(result.playerId).toBe('player-1')
        expect(result.balance).toBe(500n)
    })

    it('should throw NotFoundException if wallet does not exist', async () => {
        const repository = makeMockRepository(null)
        const useCase = new GetWalletUseCase(repository)

        expect(() => useCase.execute('player-1')).toThrow(NotFoundException)
    })
})
