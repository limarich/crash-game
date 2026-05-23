import type { IWalletRepository } from "@/domain/wallet/wallet.interface";
import { WALLET_REPOSITORY } from "@/domain/wallet/wallet.token";
import { Inject, Injectable, NotFoundException } from "@nestjs/common";

@Injectable()
export class GetWalletUseCase {
    constructor(
        @Inject(WALLET_REPOSITORY)
        private readonly walletRepository: IWalletRepository) { }

    async execute(playerId: string) {
        const wallet = await this.walletRepository.findByPlayerId(playerId)

        if (!wallet) {
            throw new NotFoundException('Wallet not found')
        }

        return wallet
    }


}
