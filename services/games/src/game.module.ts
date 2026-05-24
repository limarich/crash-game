import { Module } from "@nestjs/common";
import { PlaceBetUseCase } from "./application/use-cases/place-bet.use-case";
import { CashoutUseCase } from "./application/use-cases/cashout.use-case";
import { GameEngineService } from "./application/services/game-engine.service";
import { ROUND_REPOSITORY } from "./domain/round/round.token";
import { RoundRepository } from "./infrastructure/persistence/round.repository";
import { BET_REPOSITORY } from "./domain/bet/bet.token";
import { BetRepository } from "./infrastructure/persistence/bet.repository";
import { StartRoundUseCase } from "./application/use-cases/start-round.use-case";
import { CrashRoundUseCase } from "./application/use-cases/crash-round.use-case";
import { PrismaModule } from "./infrastructure/persistence/prisma.module";
import { ProvablyFairModule } from "./application/provably-fair/provably-fair.module";
import { MessagingModule } from "./infrastructure/messaging/messaging.module";

@Module({
    imports: [
        PrismaModule,
        ProvablyFairModule,
        MessagingModule,
    ],
    providers: [
        {
            provide: ROUND_REPOSITORY,
            useClass: RoundRepository,
        },
        {
            provide: BET_REPOSITORY,
            useClass: BetRepository,
        },
        PlaceBetUseCase,
        CashoutUseCase,
        StartRoundUseCase,
        CrashRoundUseCase,
        GameEngineService,
    ],
    exports: [
        PlaceBetUseCase,
        CashoutUseCase,
        GameEngineService,
    ],
})
export class GameModule { }
