import { describe, it, expect, mock } from 'bun:test'
import { CreditWalletUseCase } from '../../../../src/application/use-cases/credit-wallet.use-case'
import type { IWalletRepository } from '../../../../src/domain/wallet/wallet.interface'
import { Wallet } from '../../../../src/domain/wallet/wallet.entity'

const makeWallet = (balanceInCents: bigint = 500n) => new Wallet({
    id: 'wallet-1',
    playerId: 'player-1',
    balanceInCents,
})

describe('CreditWalletUseCase', () => {
    it('should return success true and newBalanceInCents after a successful credit', async () => {
        const wallet = makeWallet(500n)
        const repository: IWalletRepository = {
            findByPlayerId: mock(() => Promise.resolve(wallet)),
            save: mock(() => Promise.resolve()),
            debitWithLock: mock(() => Promise.resolve(wallet)),
        }
        const useCase = new CreditWalletUseCase(repository)

        const result = await useCase.execute({ playerId: 'player-1', amountInCents: '300' })

        expect(result).toEqual({ success: true, newBalanceInCents: 800n })
        expect(repository.save).toHaveBeenCalledTimes(1)
        expect(repository.save).toHaveBeenCalledWith(wallet)
    })

    it('should return success false with Wallet not found reason if wallet does not exist', async () => {
        const repository: IWalletRepository = {
            findByPlayerId: mock(() => Promise.resolve(null)),
            save: mock(() => Promise.resolve()),
            debitWithLock: mock(() => Promise.resolve(makeWallet())),
        }
        const useCase = new CreditWalletUseCase(repository)

        const result = await useCase.execute({ playerId: 'player-1', amountInCents: '300' })

        expect(result).toEqual({ success: false, reason: 'Wallet not found' })
        expect(repository.save).not.toHaveBeenCalled()
    })

    it('should return success false with InvalidCreditAmountError reason for an invalid amount', async () => {
        const wallet = makeWallet(500n)
        const repository: IWalletRepository = {
            findByPlayerId: mock(() => Promise.resolve(wallet)),
            save: mock(() => Promise.resolve()),
            debitWithLock: mock(() => Promise.resolve(wallet)),
        }
        const useCase = new CreditWalletUseCase(repository)

        const result = await useCase.execute({ playerId: 'player-1', amountInCents: '0' })

        expect(result).toEqual({ success: false, reason: 'Credit amount must be greater than zero' })
        expect(repository.save).not.toHaveBeenCalled()
    })
})
