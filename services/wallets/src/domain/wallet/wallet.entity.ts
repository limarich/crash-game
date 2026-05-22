import { InsufficientFundsError, InvalidBalanceError, InvalidCreditAmountError, InvalidDebitAmountError } from "./wallet.errors";

export class Wallet {
    readonly id: string;
    readonly playerId: string;
    private balanceInCents: bigint;
    readonly createdAt?: Date
    readonly updatedAt?: Date

    constructor(params: {
        id: string;
        playerId: string;
        balanceInCents: bigint;
        createdAt?: Date;
        updatedAt?: Date;
    }) {
        if (params.balanceInCents < 0n) {
            throw new InvalidBalanceError()
        }

        this.id = params.id
        this.playerId = params.playerId
        this.balanceInCents = params.balanceInCents
        this.createdAt = params.createdAt
        this.updatedAt = params.updatedAt
    }

    get balance(): bigint {
        return this.balanceInCents;
    }

    credit(amountInCents: bigint) {
        if (amountInCents <= 0n) {
            throw new InvalidCreditAmountError()
        }
        this.balanceInCents += amountInCents;
    }

    debit(amountInCents: bigint) {
        if (amountInCents <= 0n) {
            throw new InvalidDebitAmountError()
        }

        if (this.balanceInCents - amountInCents < 0n) {
            throw new InsufficientFundsError()
        }
        this.balanceInCents -= amountInCents;
    }
}