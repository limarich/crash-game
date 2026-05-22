import { describe, expect, it } from "bun:test"
import { Wallet } from "../../../../src/domain/wallet/wallet.entity"
import { InsufficientFundsError, InvalidBalanceError, InvalidCreditAmountError, InvalidDebitAmountError } from "../../../../src/domain/wallet/wallet.errors"


const makeWallet = (balanceInCents: bigint = 0n) => new Wallet({
    id: 'wallet-1',
    playerId: 'player-1',
    balanceInCents: balanceInCents,
})

describe("wallet", () => {

    it('should credit balance correctly in cents', () => {
        const wallet = makeWallet()
        wallet.credit(100n)
        expect(wallet.balance).toBe(100n)
    })

    it('should throw InvalidCreditAmountError for zero or negative credit', () => {
        const wallet = makeWallet(1000n)
        expect(() => wallet.credit(0n)).toThrow(InvalidCreditAmountError)
        expect(() => wallet.credit(-100n)).toThrow(InvalidCreditAmountError)
    })

    it('should debit balance correctly in cents', () => {
        const wallet = makeWallet(100n)
        wallet.debit(100n)
        expect(wallet.balance).toBe(0n)
    })

    it('should throw InvalidDebitAmountError for zero or negative debit', () => {
        const wallet = makeWallet(1000n)
        expect(() => wallet.debit(0n)).toThrow(InvalidDebitAmountError)
        expect(() => wallet.debit(-100n)).toThrow(InvalidDebitAmountError)
    })

    it('should not change balance when debit throws', () => {
        const wallet = makeWallet(100n)
        expect(() => wallet.debit(200n)).toThrow(InsufficientFundsError)
        expect(wallet.balance).toBe(100n)
    })

    it('should throw InsufficientFundsError with insufficient balance', () => {
        const wallet = makeWallet()
        expect(() => wallet.debit(100n)).toThrow(InsufficientFundsError)
    })


    it('should never allow negative balance', () => {
        expect(() => new Wallet({ id: '1', playerId: '1', balanceInCents: -100n })).toThrow(InvalidBalanceError)
    })

    it('should maintain monetary precision without floating point', () => {
        const wallet = makeWallet(100n)
        wallet.credit(33n)
        expect(wallet.balance).toBe(133n)
    })
})

