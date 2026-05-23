import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { PrismaModule } from "./infrastructure/persistence/prisma.module";
import { WalletModule } from "./wallet.module";
import { AuthModule } from "./infrastructure/auth/auth.module";
import { MessagingModule } from "./infrastructure/messaging/messaging.module";

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    PrismaModule,
    AuthModule,
    WalletModule,
    MessagingModule,
  ],
})
export class AppModule { }