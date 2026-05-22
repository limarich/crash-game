import { Module } from "@nestjs/common";
import { WalletsController } from "./presentation/controllers/wallets.controller";
import { RabbitMQModule } from "@golevelup/nestjs-rabbitmq";
import { ConfigModule, ConfigService } from "@nestjs/config";
import { WalletEventsConsumer } from "./infrastructure/messaging/wallet-events.consumer";

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
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
  controllers: [WalletsController],
  providers: [WalletEventsConsumer],
})
export class AppModule { }