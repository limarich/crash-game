import { describe, it, expect } from 'bun:test'

import { Bet } from '../../../../src/domain/bet/bet.entity'
import { InvalidBetStateError, InvalidBetAmountError } from '../../../../src/domain/bet/bet.errors'

const makeBet = (overrides?: Partial<{
    amountInCents: bigint
    status: string
}>) => new Bet({
    id: 'bet-1',
    roundId: 'round-1',
    playerId: 'player-1',
    amountInCents: overrides?.amountInCents ?? 1000n,
    createdAt: new Date(),
})

describe('Bet', () => {

    describe('constructor validation', () => {
        it('should create a bet with valid amount', () => {
            const bet = makeBet({ amountInCents: 1000n })
            expect(bet.getStatus()).toBe('PENDING')
            expect(bet.amountInCents).toBe(1000n)
        })

        it('should throw InvalidBetAmountError when amount is below minimum', () => {
            expect(() => makeBet({ amountInCents: 99n })).toThrow(InvalidBetAmountError)
        })

        it('should throw InvalidBetAmountError when amount is above maximum', () => {
            expect(() => makeBet({ amountInCents: 100_001n })).toThrow(InvalidBetAmountError)
        })

        it('should accept minimum bet amount', () => {
            expect(() => makeBet({ amountInCents: 100n })).not.toThrow()
        })

        it('should accept maximum bet amount', () => {
            expect(() => makeBet({ amountInCents: 100_000n })).not.toThrow()
        })
    })

    describe('state transitions', () => {
        it('should start with PENDING status', () => {
            const bet = makeBet()
            expect(bet.getStatus()).toBe('PENDING')
        })

        it('should transition from PENDING to CONFIRMED', () => {
            const bet = makeBet()
            bet.confirm()
            expect(bet.getStatus()).toBe('CONFIRMED')
        })

        it('should transition from PENDING to CANCELLED', () => {
            const bet = makeBet()
            bet.cancel()
            expect(bet.getStatus()).toBe('CANCELLED')
        })

        it('should transition from CONFIRMED to CASHED_OUT', () => {
            const bet = makeBet()
            bet.confirm()
            bet.cashout(2.5)
            expect(bet.getStatus()).toBe('CASHED_OUT')
        })

        it('should transition from CONFIRMED to LOST', () => {
            const bet = makeBet()
            bet.confirm()
            bet.lose()
            expect(bet.getStatus()).toBe('LOST')
        })

        it('should throw InvalidBetStateError when confirming a non-PENDING bet', () => {
            const bet = makeBet()
            bet.confirm()
            expect(() => bet.confirm()).toThrow(InvalidBetStateError)
        })

        it('should throw InvalidBetStateError when cancelling a non-PENDING bet', () => {
            const bet = makeBet()
            bet.confirm()
            expect(() => bet.cancel()).toThrow(InvalidBetStateError)
        })

        it('should throw InvalidBetStateError when cashing out a non-CONFIRMED bet', () => {
            const bet = makeBet()
            expect(() => bet.cashout(2.5)).toThrow(InvalidBetStateError)
        })

        it('should throw InvalidBetStateError when losing a non-CONFIRMED bet', () => {
            const bet = makeBet()
            expect(() => bet.lose()).toThrow(InvalidBetStateError)
        })

        it('should throw InvalidBetStateError when cashing out an already CASHED_OUT bet', () => {
            const bet = makeBet()
            bet.confirm()
            bet.cashout(2.5)
            expect(() => bet.cashout(3.0)).toThrow(InvalidBetStateError)
        })
    })

    describe('cashout payout calculation', () => {
        it('should calculate payout correctly', () => {
            const bet = makeBet({ amountInCents: 1000n })
            bet.confirm()
            bet.cashout(2.5)
            expect(bet.getPayoutInCents()).toBe(2500n)
        })

        it('should floor the payout to nearest cent', () => {
            const bet = makeBet({ amountInCents: 1000n })
            bet.confirm()
            bet.cashout(1.337)
            expect(bet.getPayoutInCents()).toBe(1337n)
        })

        it('should store the cashout multiplier', () => {
            const bet = makeBet({ amountInCents: 1000n })
            bet.confirm()
            bet.cashout(3.14)
            expect(bet.getCashoutMultiplier()).toBe(3.14)
        })

        it('should return null payout before cashout', () => {
            const bet = makeBet()
            expect(bet.getPayoutInCents()).toBeNull()
            expect(bet.getCashoutMultiplier()).toBeNull()
        })

        it('should not change payout after being set', () => {
            const bet = makeBet({ amountInCents: 1000n })
            bet.confirm()
            bet.cashout(2.0)
            expect(bet.getPayoutInCents()).toBe(2000n)
        })
    })

})