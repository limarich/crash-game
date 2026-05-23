import { AmqpConnection } from "@golevelup/nestjs-rabbitmq";
import { Injectable } from "@nestjs/common";
import type { CreditFailedPayload, CreditSucceededPayload, DebitFailedPayload, DebitSucceededPayload } from "./wallet-events.types";

@Injectable()
export class WalletEventsPublisher {
    constructor(private readonly amqpConnection: AmqpConnection) { }

    async publishDebitSucceeded(payload: DebitSucceededPayload) {
        await this.amqpConnection.publish(
            'crash.events',
            'wallet.debit.succeeded',
            payload
        )
    }

    async publishDebitFailed(payload: DebitFailedPayload) {
        await this.amqpConnection.publish(
            'crash.events',
            'wallet.debit.failed',
            payload
        )
    }

    async publishCreditSucceeded(payload: CreditSucceededPayload) {
        await this.amqpConnection.publish(
            'crash.events',
            'wallet.credit.succeeded',
            payload
        )
    }

    async publishCreditFailed(payload: CreditFailedPayload) {
        await this.amqpConnection.publish(
            'crash.events',
            'wallet.credit.failed',
            payload
        )
    }
}