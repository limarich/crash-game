import { WALLET_REPOSITORY } from "@/domain/wallet/wallet.token";
import { Inject, Injectable } from "@nestjs/common";
import type { CreditWalletInput, WalletOperationResult } from "../dto/wallet-operation.dto";
import { InvalidCreditAmountError } from "@/domain/wallet/wallet.errors";
import type { IWalletRepository } from "@/domain/wallet/wallet.interface";

@Injectable()
export class CreditWalletUseCase {
    constructor(
        @Inject(WALLET_REPOSITORY)
        private readonly walletRepository: IWalletRepository
    ) { }

    async execute(data: CreditWalletInput): Promise<WalletOperationResult> {
        const wallet = await this.walletRepository.findByPlayerId(data.playerId)

        if (!wallet) {
            return { success: false, reason: 'Wallet not found' }
        }

        try {
            wallet.credit(BigInt(data.amountInCents))

            await this.walletRepository.save(wallet)

            return { success: true, newBalanceInCents: wallet.balance }
        } catch (error) {
            if (error instanceof InvalidCreditAmountError) {
                return { success: false, reason: error.message }
            }
            throw error
        }

    }
}