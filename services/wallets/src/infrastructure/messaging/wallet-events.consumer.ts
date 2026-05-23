import { CreditWalletUseCase } from "@/application/use-cases/credit-wallet.use-case";
import { DebitWalletUseCase } from "@/application/use-cases/debit-wallet.use-case";
import { RabbitSubscribe } from "@golevelup/nestjs-rabbitmq";
import { Injectable } from "@nestjs/common";
import { WalletEventsPublisher } from "./wallet-events.publisher";
import type { CreditRequestedPayload, DebitRequestedPayload } from "./wallet-events.types";

@Injectable()
export class WalletEventsConsumer {
    constructor(
        private readonly debitWalletUseCase: DebitWalletUseCase,
        private readonly creditWalletUseCase: CreditWalletUseCase,
        private readonly publisher: WalletEventsPublisher,
    ) { }
    @RabbitSubscribe({
        exchange: 'crash.events',
        routingKey: 'wallet.debit.requested',
        queue: 'wallet.debit.requested',
        queueOptions: {
            durable: true,
            deadLetterExchange: 'crash.events.dlx',
            deadLetterRoutingKey: 'wallet.debit.requested.dlq',
        },
    })
    async handleDebitRequested(payload: DebitRequestedPayload) {
        const result = await this.debitWalletUseCase.execute({
            amountInCents: payload.amountInCents,
            playerId: payload.playerId
        })

        if (result.success) {
            await this.publisher.publishDebitSucceeded({
                betId: payload.betId,
                playerId: payload.playerId,
                newBalanceInCents: result.newBalanceInCents.toString()
            })
        } else {
            await this.publisher.publishDebitFailed({
                betId: payload.betId,
                playerId: payload.playerId,
                reason: result.reason
            })
        }
    }

    @RabbitSubscribe({
        exchange: 'crash.events',
        routingKey: 'wallet.credit.requested',
        queue: 'wallet.credit.requested',
        queueOptions: {
            durable: true,
            deadLetterExchange: 'crash.events.dlx',
            deadLetterRoutingKey: 'wallet.credit.requested.dlq',
        }
    })
    async handleCreditRequested(payload: CreditRequestedPayload) {
        const result = await this.creditWalletUseCase.execute({
            amountInCents: payload.amountInCents,
            playerId: payload.playerId,
        })

        if (result.success) {
            await this.publisher.publishCreditSucceeded({
                betId: payload.betId,
                playerId: payload.playerId,
                newBalanceInCents: result.newBalanceInCents.toString()
            })
        } else {
            await this.publisher.publishCreditFailed({
                betId: payload.betId,
                playerId: payload.playerId,
                reason: result.reason
            })
        }
    }

}