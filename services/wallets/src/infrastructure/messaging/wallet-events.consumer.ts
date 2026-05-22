import { RabbitSubscribe } from "@golevelup/nestjs-rabbitmq";
import { Injectable } from "@nestjs/common";

@Injectable()
export class WalletEventsConsumer {

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
    async handleDebitRequested(payload: unknown) {
        // TODO: DebitWalletUseCase 
        console.log('wallet.debit.requested', payload)
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
    async handleCreditRequested(payload: unknown) {
        // TODO: CreditWalletUseCase 
        console.log('wallet.credit.requested', payload)
    }

}