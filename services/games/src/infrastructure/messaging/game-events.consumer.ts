import { RabbitSubscribe } from "@golevelup/nestjs-rabbitmq";
import { Injectable } from "@nestjs/common";
import { CreditFailedPayload, CreditSucceededPayload, DebitFailedPayload, DebitSucceededPayload } from "./game-events.types";

@Injectable()
export class GameEventsConsumer {
    @RabbitSubscribe({
        exchange: 'crash.events',
        routingKey: 'wallet.debit.succeeded',
        queue: 'wallet.debit.succeeded',
        queueOptions: {
            durable: true,
            deadLetterExchange: 'crash.events.dlx',
            deadLetterRoutingKey: 'wallet.debit.succeeded.dlq',
        },
    })
    async handleDebitSucceeded(payload: DebitSucceededPayload) {
        // TODO: ConfirmBetUseCase
    }

    @RabbitSubscribe({
        exchange: 'crash.events',
        routingKey: 'wallet.debit.failed',
        queue: 'wallet.debit.failed',
        queueOptions: {
            durable: true,
            deadLetterExchange: 'crash.events.dlx',
            deadLetterRoutingKey: 'wallet.debit.failed.dlq',
        },
    })
    async handleDebitFailed(payload: DebitFailedPayload) {
        // TODO: CancelBetUseCase 
    }

    @RabbitSubscribe({
        exchange: 'crash.events',
        routingKey: 'wallet.credit.succeeded',
        queue: 'wallet.credit.succeeded',
        queueOptions: {
            durable: true,
            deadLetterExchange: 'crash.events.dlx',
            deadLetterRoutingKey: 'wallet.credit.succeeded.dlq',
        },
    })
    async handleCreditSucceeded(payload: CreditSucceededPayload) {
        // cashout is finalized before this event is received
    }

    @RabbitSubscribe({
        exchange: 'crash.events',
        routingKey: 'wallet.credit.failed',
        queue: 'wallet.credit.failed',
        queueOptions: {
            durable: true,
            deadLetterExchange: 'crash.events.dlx',
            deadLetterRoutingKey: 'wallet.credit.failed.dlq',
        },
    })
    async handleCreditFailed(payload: CreditFailedPayload) {
        // credit failure is a systemic error
    }

}