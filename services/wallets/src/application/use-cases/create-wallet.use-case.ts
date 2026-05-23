import { Wallet } from "@/domain/wallet/wallet.entity";
import type { IWalletRepository } from "@/domain/wallet/wallet.interface";
import { WALLET_REPOSITORY } from "@/domain/wallet/wallet.token";
import { ConflictException, Inject, Injectable } from "@nestjs/common";
import { randomUUID } from 'crypto'

@Injectable()
export class CreateWalletUseCase {
    constructor(
        @Inject(WALLET_REPOSITORY)
        private readonly walletRepository: IWalletRepository
    ) { }

    async execute(playerId: string) {
        const walletExists = await this.walletRepository.findByPlayerId(playerId)

        if (walletExists) {
            throw new ConflictException('Wallet already exists for this player')
        }

        const wallet = new Wallet({
            id: randomUUID(),
            playerId,
            balanceInCents: 0n,
        });

        await this.walletRepository.save(wallet)

        return wallet
    }
}