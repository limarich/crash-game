import { Module } from "@nestjs/common";
import { WalletsController } from "./presentation/controllers/wallets.controller";
import { WALLET_REPOSITORY } from "./domain/wallet/wallet.token";
import { WalletRepository } from "./infrastructure/persistence/wallet.repository";
import { CreateWalletUseCase } from "./application/use-cases/create-wallet.use-case";
import { GetWalletUseCase } from "./application/use-cases/get-wallet.use-case";
import { CreditWalletUseCase } from "./application/use-cases/credit-wallet.use-case";
import { DebitWalletUseCase } from "./application/use-cases/debit-wallet.use-case";

@Module({
    controllers: [WalletsController],
    providers: [
        {
            provide: WALLET_REPOSITORY,
            useClass: WalletRepository,
        },
        CreateWalletUseCase,
        GetWalletUseCase,
        CreditWalletUseCase,
        DebitWalletUseCase,
    ],
    exports: [
        DebitWalletUseCase,
        CreditWalletUseCase,
    ],
})
export class WalletModule { }