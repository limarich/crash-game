import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { PrismaModule } from "./infrastructure/persistence/prisma.module";
import { MessagingModule } from "./infrastructure/messaging/messaging.module";
import { GameModule } from "./game.module";
import { AuthModule } from "./infrastructure/auth/auth.module";

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    PrismaModule,
    AuthModule,
    MessagingModule,
    GameModule,
  ],
})
export class AppModule { }
