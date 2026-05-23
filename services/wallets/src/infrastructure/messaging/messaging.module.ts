import { Module } from "@nestjs/common";
import { RabbitMQModule } from "@golevelup/nestjs-rabbitmq";
import { ConfigModule, ConfigService } from "@nestjs/config";
import { WalletModule } from "@/wallet.module";
import { WalletEventsConsumer } from "./wallet-events.consumer";
import { WalletEventsPublisher } from "./wallet-events.publisher";

@Module({
    imports: [
        RabbitMQModule.forRootAsync({
            imports: [ConfigModule],
            inject: [ConfigService],
            useFactory: async (config: ConfigService) => ({
                exchanges: [
                    {
                        name: 'crash.events',
                        type: 'topic',
                        options: { durable: true },
                    },
                    {
                        name: 'crash.events.dlx',
                        type: 'topic',
                        options: { durable: true },
                    },
                ],
                uri: config.get('RABBITMQ_URL') ?? 'amqp://guest:guest@localhost:5672',
                connectionInitOptions: { wait: true },
            }),
        }),
        WalletModule
    ],
    providers: [WalletEventsConsumer, WalletEventsPublisher],

})
export class MessagingModule {

}