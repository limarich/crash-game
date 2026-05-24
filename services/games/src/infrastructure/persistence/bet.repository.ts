import { IBetRepository } from "@/domain/bet/bet.interface"
import { Bet, BetStatus as DomainBetStatus } from "@/domain/bet/bet.entity"
import { PrismaService } from "./prisma.service"
import { Bet as PrismaBet } from "@/generated/prisma/client"
import { Injectable } from "@nestjs/common"

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
            const records = await tx.$queryRaw<PrismaBet[]>`
                SELECT * FROM bets
                WHERE player_id = ${playerId}
                AND round_id = ${roundId}
                FOR UPDATE
    `
            if (!records.length) {
                return null
            }

            return this.toDomain(records[0])
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

    async save(bet: Bet) {
        await this.prismaService.bet.upsert({
            where: { id: bet.id },
            create: {
                id: bet.id,
                roundId: bet.roundId,
                playerId: bet.playerId,
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
            amountInCents: record.amountInCents,
            status: record.status as DomainBetStatus,
            createdAt: record.createdAt,
            cashoutMultiplier: record.cashoutMultiplier,
            payoutInCents: record.payoutInCents,
        })
    }
}