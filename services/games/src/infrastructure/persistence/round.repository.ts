import type { IRoundRepository } from "../../domain/round/round.interface"
import { Round } from "../../domain/round/round.entity"
import { PrismaService } from "./prisma.service"
import { Round as PrismaRound } from "@/generated/prisma/client"
import { Injectable } from "@nestjs/common"

@Injectable()
export class RoundRepository implements IRoundRepository {
    constructor(private prismaService: PrismaService) { }

    async findCurrent() {
        const record = await this.prismaService.round.findFirst({
            where: {
                status: { in: ['BETTING', 'RUNNING'] },
            },
            orderBy: { createdAt: 'desc' },
        })

        if (!record) {
            return null
        }

        return this.toDomain(record)
    }
    async findById(id: string) {
        const record = await this.prismaService.round.findUnique({
            where: { id }
        })

        if (!record) {
            return null
        }

        return this.toDomain(record)
    }
    async findByNonce(nonce: number) {
        const record = await this.prismaService.round.findFirst({
            where: { nonce }
        })

        if (!record) {
            return null
        }

        return this.toDomain(record)
    }
    async findLastNonce() {
        const record = await this.prismaService.round.findFirst({
            orderBy: { nonce: 'desc' },
            select: { nonce: true },
        })
        return record?.nonce ?? 0
    }

    async findHistory(page: number, limit: number) {
        const records = await this.prismaService.round.findMany({
            where: { status: 'CRASHED' },
            orderBy: { createdAt: 'desc' },
            skip: (page - 1) * limit,
            take: limit,
        })

        return records.map(record => this.toDomain(record))
    }
    async save(round: Round) {
        await this.prismaService.round.upsert({
            where: { id: round.id },
            create: {
                id: round.id,
                nonce: round.nonce,
                clientSeed: round.clientSeed,
                serverSeed: round.getRawServerSeed(),
                serverSeedHash: round.serverSeedHash,
                crashPoint: round.getRawCrashPoint(),
                status: round.getStatus(),
                bettingEndsAt: round.bettingEndsAt,
                startedAt: round.getStartedAt(),
                crashedAt: round.getCrashedAt(),
                createdAt: round.createdAt,
            },
            update: {
                status: round.getStatus(),
                startedAt: round.getStartedAt(),
                crashedAt: round.getCrashedAt(),
            },
        })
    }

    private toDomain(record: PrismaRound) {
        return new Round({
            id: record.id,
            nonce: record.nonce,
            clientSeed: record.clientSeed,
            serverSeed: record.serverSeed,
            serverSeedHash: record.serverSeedHash,
            crashPoint: record.crashPoint,
            bettingEndsAt: record.bettingEndsAt,
            createdAt: record.createdAt,
            status: record.status,
            startedAt: record.startedAt,
            crashedAt: record.crashedAt
        })
    }
}