import { InvalidBetStateError, InvalidBetAmountError } from './bet.errors'

export type BetStatus = 'PENDING' | 'CONFIRMED' | 'CANCELLED' | 'CASHED_OUT' | 'LOST'

const MIN_BET = 100n        // 1,00
const MAX_BET = 100_000n    // 1.000,00

export class Bet {
    readonly id: string
    readonly roundId: string
    readonly playerId: string
    readonly amountInCents: bigint
    readonly createdAt: Date
    private status: BetStatus
    private cashoutMultiplier: number | null

    // for immutability from this register
    private payoutInCents: bigint | null

    constructor(params: {
        id: string
        roundId: string
        playerId: string
        amountInCents: bigint
        createdAt: Date
        status?: BetStatus
        cashoutMultiplier?: number | null
        payoutInCents?: bigint | null
    }) {
        if (params.amountInCents < MIN_BET) {
            throw new InvalidBetAmountError(`Minimum bet is ${MIN_BET} cents`)
        }
        if (params.amountInCents > MAX_BET) {
            throw new InvalidBetAmountError(`Maximum bet is ${MAX_BET} cents`)
        }
        this.id = params.id
        this.roundId = params.roundId
        this.playerId = params.playerId
        this.amountInCents = params.amountInCents
        this.createdAt = params.createdAt
        this.status = params.status ?? 'PENDING'
        this.cashoutMultiplier = params.cashoutMultiplier ?? null
        this.payoutInCents = params.payoutInCents ?? null
    }

    getStatus() { return this.status }
    getCashoutMultiplier() { return this.cashoutMultiplier }
    getPayoutInCents() { return this.payoutInCents }

    confirm() {
        if (this.status !== 'PENDING') {
            throw new InvalidBetStateError(this.status, 'CONFIRMED')
        }
        this.status = 'CONFIRMED'
    }

    cancel() {
        if (this.status !== 'PENDING') {
            throw new InvalidBetStateError(this.status, 'CANCELLED')
        }
        this.status = 'CANCELLED'
    }

    cashout(multiplier: number) {
        if (this.status !== 'CONFIRMED') {
            throw new InvalidBetStateError(this.status, 'CASHED_OUT')
        }
        this.status = 'CASHED_OUT'
        this.cashoutMultiplier = multiplier
        this.payoutInCents = BigInt(Math.floor(Number(this.amountInCents) * multiplier))
    }

    lose() {
        if (this.status !== 'CONFIRMED') {
            throw new InvalidBetStateError(this.status, 'LOST')
        }
        this.status = 'LOST'
    }
}