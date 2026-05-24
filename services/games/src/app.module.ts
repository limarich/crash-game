import { Module } from "@nestjs/common";
import { GamesController } from "./presentation/controllers/games.controller";
import { ConfigModule } from "@nestjs/config";
import { PrismaModule } from "./infrastructure/persistence/prisma.module";
import { MessagingModule } from "./infrastructure/messaging/messaging.module";
import { GameModule } from "./game.module";

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true
    }),
    PrismaModule,
    MessagingModule,
    GameModule
  ],
  controllers: [GamesController],
})
export class AppModule { }
