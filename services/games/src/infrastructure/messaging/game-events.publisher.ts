import { Injectable } from "@nestjs/common";
import { AmqpConnection } from "@golevelup/nestjs-rabbitmq";
import { DebitRequestedPayload, CreditRequestedPayload } from "./game-events.types";

@Injectable()
export class GameEventsPublisher {
    constructor(private readonly amqpConnection: AmqpConnection) { }

    async publishDebitRequest(data: DebitRequestedPayload) {
        await this.amqpConnection.publish(
            'crash.events',
            'wallet.debit.requested',
            data,
        )
    }

    async publishCreditRequest(data: CreditRequestedPayload) {
        await this.amqpConnection.publish(
            'crash.events',
            'wallet.credit.requested',
            data,
        )
    }
}
