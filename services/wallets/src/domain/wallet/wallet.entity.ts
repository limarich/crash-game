import { InsufficientFundsError, InvalidBalanceError, InvalidCreditAmountError, InvalidDebitAmountError } from "./wallet.errors";

export class Wallet {
    id: string;
    playerId: string;
    private balanceInCents: bigint;

    constructor(params: { id: string; playerId: string; balanceInCents: bigint }) {
        if (params.balanceInCents < 0n) {
            throw new InvalidBalanceError()
        }

        this.id = params.id
        this.playerId = params.playerId
        this.balanceInCents = params.balanceInCents
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