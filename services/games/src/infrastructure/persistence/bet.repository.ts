import { IBetRepository } from "@/domain/bet/bet.interface"
import { Bet, BetStatus as DomainBetStatus } from "@/domain/bet/bet.entity"
import { PrismaService } from "./prisma.service"
import { Bet as PrismaBet } from "@/generated/prisma/client"
import { Injectable } from "@nestjs/common"

interface BetRecord {
    id: string
    round_id: string
    player_id: string
    player_name: string
    amount_in_cents: string
    status: string
    created_at: Date
    cashout_multiplier: number | null
    payout_in_cents: string | null
}

@Injectable()
export class BetRepository implements IBetRepository {
    constructor(private readonly prismaService: PrismaService) { }

    async findById(id: string) {
        const record = await this.prismaService.bet.findUnique({
            where: { id }
        })

        if (!record) {
            return null
        }

        return this.toDomain(record)
    }

    async findByRoundId(roundId: string) {
        const records = await this.prismaService.bet.findMany({
            where: { roundId },
        })

        return records.map(record => this.toDomain(record))
    }

    async findByPlayerAndRound(playerId: string, roundId: string) {
        const record = await this.prismaService.bet.findUnique({
            where: { playerId_roundId: { playerId, roundId } },
        })

        if (!record) {
            return null
        }

        return this.toDomain(record)
    }

    async findByPlayerAndRoundWithLock(playerId: string, roundId: string) {
        return this.prismaService.$transaction(async (tx) => {
            const records = await tx.$queryRaw<BetRecord[]>`
                SELECT * FROM bets
                WHERE player_id = ${playerId}
                AND round_id = ${roundId}
                FOR UPDATE
            `

            if (!records.length) return null

            const record = records[0]
            return new Bet({
                id: record.id,
                roundId: record.round_id,
                playerId: record.player_id,
                playerName: record.player_name,
                amountInCents: BigInt(record.amount_in_cents),
                status: record.status as DomainBetStatus,
                createdAt: record.created_at,
                cashoutMultiplier: record.cashout_multiplier,
                payoutInCents: record.payout_in_cents ? BigInt(record.payout_in_cents) : null,
            })
        })
    }

    async findByPlayer(playerId: string, page: number, limit: number) {
        const records = await this.prismaService.bet.findMany({
            where: { playerId },
            orderBy: { createdAt: 'desc' },
            skip: (page - 1) * limit,
            take: limit,
        })

        return records.map(record => this.toDomain(record))
    }

    async findLeaderboard(limit: number) {
        const rows = await this.prismaService.$queryRaw<{ player_id: string; player_name: string; net_profit_in_cents: bigint }[]>`
            SELECT
                player_id,
                MAX(player_name) AS player_name,
                COALESCE(SUM(payout_in_cents), 0) - SUM(amount_in_cents) AS net_profit_in_cents
            FROM bets
            WHERE status IN ('CASHED_OUT', 'LOST')
            GROUP BY player_id
            ORDER BY net_profit_in_cents DESC
            LIMIT ${limit}
        `
        return rows.map(r => ({
            playerId: r.player_id,
            playerName: r.player_name,
            netProfitInCents: BigInt(r.net_profit_in_cents),
        }))
    }

    async save(bet: Bet) {
        await this.prismaService.bet.upsert({
            where: { id: bet.id },
            create: {
                id: bet.id,
                roundId: bet.roundId,
                playerId: bet.playerId,
                playerName: bet.playerName,
                amountInCents: bet.amountInCents,
                status: bet.getRawStatus(),
                createdAt: bet.createdAt,
                cashoutMultiplier: bet.getRawCashoutMultiplier(),
                payoutInCents: bet.getRawPayoutInCents(),
            },
            update: {
                status: bet.getRawStatus(),
                cashoutMultiplier: bet.getRawCashoutMultiplier(),
                payoutInCents: bet.getRawPayoutInCents(),
            },
        })
    }

    private toDomain(record: PrismaBet) {
        return new Bet({
            id: record.id,
            roundId: record.roundId,
            playerId: record.playerId,
            playerName: record.playerName,
            amountInCents: record.amountInCents,
            status: record.status as DomainBetStatus,
            createdAt: record.createdAt,
            cashoutMultiplier: record.cashoutMultiplier,
            payoutInCents: record.payoutInCents,
        })
    }
}