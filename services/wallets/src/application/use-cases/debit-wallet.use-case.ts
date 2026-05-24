import { InsufficientFundsError, InvalidDebitAmountError } from "@/domain/wallet/wallet.errors";
import { WALLET_REPOSITORY } from "@/domain/wallet/wallet.token";
import { Inject, Injectable } from "@nestjs/common";
import type { DebitWalletInput, WalletOperationResult } from "../dto/wallet-operation.dto";
import type { IWalletRepository } from "@/domain/wallet/wallet.interface";

@Injectable()
export class DebitWalletUseCase {
    constructor(
        @Inject(WALLET_REPOSITORY)
        private readonly walletRepository: IWalletRepository
    ) { }

    async execute(data: DebitWalletInput): Promise<WalletOperationResult> {
        try {
            const updated = await this.walletRepository.debitWithLock(
                data.playerId,
                BigInt(data.amountInCents)
            )

            if (!updated) {
                return { success: false, reason: 'Wallet not found' }
            }

            return { success: true, newBalanceInCents: updated.balance }

        } catch (error) {

            if (error instanceof InsufficientFundsError || error instanceof InvalidDebitAmountError) {
                return { success: false, reason: error.message }
            }

            throw error
        }

    }
}