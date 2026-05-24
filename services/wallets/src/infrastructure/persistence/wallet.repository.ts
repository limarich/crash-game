import type { IWalletRepository } from "@/domain/wallet/wallet.interface";
import { Wallet } from "../../domain/wallet/wallet.entity";
import { PrismaService } from "./prisma.service";
import { Injectable } from "@nestjs/common";

interface WalletRecord {
    id: string
    player_id: string
    balance_in_cents: bigint
    created_at: Date
    updated_at: Date
}

@Injectable()
export class WalletRepository implements IWalletRepository {
    constructor(private readonly prismaService: PrismaService) { }
    async findByPlayerId(playerId: string): Promise<Wallet | null> {
        const record = await this.prismaService.wallet.findUnique({ where: { playerId } });

        if (!record) {
            return null;
        }

        return new Wallet({
            id: record.id,
            playerId: record.playerId,
            balanceInCents: record.balanceInCents,
            createdAt: record.createdAt,
            updatedAt: record.updatedAt,
        });
    }
    async debitWithLock(playerId: string, amountInCents: bigint) {
        return this.prismaService.$transaction(async (tx) => {
            const records = await tx.$queryRaw<WalletRecord[]>`
                SELECT * FROM wallets
                WHERE player_id = ${playerId}
                FOR UPDATE
            `
            if (!records.length) return null
            // throw new Error('Wallet not found')

            const wallet = new Wallet({
                id: records[0].id,
                playerId: records[0].player_id,
                balanceInCents: records[0].balance_in_cents,
                createdAt: records[0].created_at,
                updatedAt: records[0].updated_at,
            })

            // preserves domain logic
            wallet.debit(amountInCents)

            await tx.wallet.update({
                where: { playerId },
                data: { balanceInCents: wallet.balance },
            })

            return wallet
        })
    }
    async save(wallet: Wallet): Promise<void> {
        await this.prismaService.wallet.upsert({
            where: { playerId: wallet.playerId },
            create: {
                id: wallet.id,
                playerId: wallet.playerId,
                balanceInCents: wallet.balance,
            },
            update: {
                balanceInCents: wallet.balance,
            },
        })
    }
}