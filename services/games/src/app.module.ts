import { Module } from "@nestjs/common";
import { GamesController } from "./presentation/controllers/games.controller";
import { ConfigModule } from "@nestjs/config";
import { PrismaModule } from "./infrastructure/persistence/prisma.module";
import { MessagingModule } from "./infrastructure/messaging/messaging.module";

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true
    }),
    PrismaModule,
    MessagingModule
  ],
  controllers: [GamesController],
})
export class AppModule { }
