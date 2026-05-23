import { Wallet } from "@/domain/wallet/wallet.entity";

export class WalletResponseDto {
    id: string
    playerId: string
    balanceInCents: string

    static from(wallet: Wallet): WalletResponseDto {
        return {
            id: wallet.id,
            playerId: wallet.playerId,
            balanceInCents: wallet.balance.toString(),
        };
    }
}