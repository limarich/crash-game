import { describe, it, expect, mock } from 'bun:test'
import { DebitWalletUseCase } from '../../../../src/application/use-cases/debit-wallet.use-case'
import type { IWalletRepository } from '../../../../src/domain/wallet/wallet.interface'
import { Wallet } from '../../../../src/domain/wallet/wallet.entity'
import { InsufficientFundsError, InvalidDebitAmountError } from '../../../../src/domain/wallet/wallet.errors'

const makeWallet = (balanceInCents: bigint = 800n) => new Wallet({
    id: 'wallet-1',
    playerId: 'player-1',
    balanceInCents,
})

describe('DebitWalletUseCase', () => {
    it('should return success true and newBalanceInCents after a successful debit', async () => {
        const walletAfterDebit = makeWallet(800n)
        const repository: IWalletRepository = {
            findByPlayerId: mock(() => Promise.resolve(walletAfterDebit)),
            save: mock(() => Promise.resolve()),
            debitWithLock: mock(() => Promise.resolve(walletAfterDebit)),
        }
        const useCase = new DebitWalletUseCase(repository)

        const result = await useCase.execute({ playerId: 'player-1', amountInCents: '200' })

        expect(result).toEqual({ success: true, newBalanceInCents: 800n })
        expect(repository.debitWithLock).toHaveBeenCalledWith('player-1', 200n)
    })

    it('should return success false with InsufficientFundsError reason', async () => {
        const repository: IWalletRepository = {
            findByPlayerId: mock(() => Promise.resolve(null)),
            save: mock(() => Promise.resolve()),
            debitWithLock: mock(() => Promise.reject(new InsufficientFundsError())),
        }
        const useCase = new DebitWalletUseCase(repository)

        const result = await useCase.execute({ playerId: 'player-1', amountInCents: '9999' })

        expect(result).toEqual({ success: false, reason: 'Insufficient funds' })
    })

    it('should return success false with InvalidDebitAmountError reason', async () => {
        const repository: IWalletRepository = {
            findByPlayerId: mock(() => Promise.resolve(null)),
            save: mock(() => Promise.resolve()),
            debitWithLock: mock(() => Promise.reject(new InvalidDebitAmountError())),
        }
        const useCase = new DebitWalletUseCase(repository)

        const result = await useCase.execute({ playerId: 'player-1', amountInCents: '0' })

        expect(result).toEqual({ success: false, reason: 'Debit amount must be greater than zero' })
    })

    it('should rethrow unexpected errors without swallowing them', async () => {
        const unexpectedError = new Error('Database connection lost')
        const repository: IWalletRepository = {
            findByPlayerId: mock(() => Promise.resolve(null)),
            save: mock(() => Promise.resolve()),
            debitWithLock: mock(() => Promise.reject(unexpectedError)),
        }
        const useCase = new DebitWalletUseCase(repository)

        expect(() => useCase.execute({ playerId: 'player-1', amountInCents: '100' })).toThrow('Database connection lost')
    })
})
