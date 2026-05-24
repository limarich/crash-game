import { Wallet } from './wallet.entity';

export interface IWalletRepository {
    findByPlayerId(playerId: string): Promise<Wallet | null>;
    save(wallet: Wallet): Promise<void>;

    // avoid race condition
    debitWithLock(playerId: string, amountInCents: bigint): Promise<Wallet | null>
}