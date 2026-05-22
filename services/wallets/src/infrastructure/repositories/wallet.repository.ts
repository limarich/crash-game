import { Wallet } from "../../domain/wallet/wallet.entity";
import { IWalletRepository } from "../../domain/wallet/wallet.interface";

export class WalletRepository implements IWalletRepository {
    findByPlayerId(playerId: string): Promise<Wallet | null> {
        throw new Error("Method not implemented.");
    }
    save(wallet: Wallet): Promise<void> {
        throw new Error("Method not implemented.");
    }
}