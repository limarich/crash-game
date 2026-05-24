import { RabbitSubscribe } from "@golevelup/nestjs-rabbitmq";
import { Injectable } from "@nestjs/common";
import type { CreditFailedPayload, CreditSucceededPayload, DebitFailedPayload, DebitSucceededPayload } from "./game-events.types";
import { ConfirmBetUseCase } from "@/application/use-cases/confirm-bet.use-case";
import { CancelBetUseCase } from "@/application/use-cases/cancel-bet.use-case";

@Injectable()
export class GameEventsConsumer {
    constructor(
        private readonly confirmBetUseCase: ConfirmBetUseCase,
        private readonly cancelBetUseCase: CancelBetUseCase
    ) { }

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
        return this.confirmBetUseCase.execute({ betId: payload.betId })
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
        return this.cancelBetUseCase.execute({ betId: payload.betId })
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