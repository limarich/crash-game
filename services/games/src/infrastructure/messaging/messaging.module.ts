import { RabbitMQModule } from "@golevelup/nestjs-rabbitmq";
import { Module } from "@nestjs/common";
import { ConfigModule, ConfigService } from "@nestjs/config";
import { GameEventsPublisher } from "./game-events.publisher";
import { GameEventsConsumer } from "./game-events.consumer";
import { ConfirmBetUseCase } from "@/application/use-cases/confirm-bet.use-case";
import { CancelBetUseCase } from "@/application/use-cases/cancel-bet.use-case";
import { BET_REPOSITORY } from "@/domain/bet/bet.token";
import { BetRepository } from "@/infrastructure/persistence/bet.repository";
import { PrismaModule } from "@/infrastructure/persistence/prisma.module";

@Module({
    imports: [
        PrismaModule,
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
    providers: [
        { provide: BET_REPOSITORY, useClass: BetRepository },
        GameEventsPublisher,
        GameEventsConsumer,
        ConfirmBetUseCase,
        CancelBetUseCase,
    ],
    exports: [GameEventsPublisher],
})
export class MessagingModule { }
