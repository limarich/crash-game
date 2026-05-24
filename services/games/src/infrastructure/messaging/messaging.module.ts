import { RabbitMQModule } from "@golevelup/nestjs-rabbitmq";
import { Module } from "@nestjs/common";
import { ConfigModule, ConfigService } from "@nestjs/config";
import { GameEventsPublisher } from "./game-events.publisher";
import { GameEventsConsumer } from "./game-events.consumer";

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
    ],
    providers: [GameEventsPublisher, GameEventsConsumer],
})
export class MessagingModule { }