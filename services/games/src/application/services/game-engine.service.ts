import type { IRoundRepository } from "@/domain/round/round.interface";
import { Inject, Injectable, OnApplicationBootstrap, OnApplicationShutdown, Optional } from "@nestjs/common";
import { StartRoundUseCase } from "../use-cases/start-round.use-case";
import { CrashRoundUseCase } from "../use-cases/crash-round.use-case";
import { ProvablyFairService } from "../provably-fair/provably-fair.service";
import { ROUND_REPOSITORY } from "@/domain/round/round.token";
import { Round } from "@/domain/round/round.entity";
import { randomUUID } from "crypto";
import { GameGateway } from "@/presentation/websocket/game.gateway";

const BETTING_PHASE_MS = 10_000
const TICK_INTERVAL_MS = 100
const CRASH_COOLDOWN_MS = 3_000

@Injectable()
export class GameEngineService implements OnApplicationBootstrap, OnApplicationShutdown {
    private tickInterval: ReturnType<typeof setInterval> | null = null
    private currentRound: Round | null = null
    private nonce = 0

    constructor(
        @Inject(ROUND_REPOSITORY)
        private readonly roundRepository: IRoundRepository,
        private readonly startRoundUseCase: StartRoundUseCase,
        private readonly crashRoundUseCase: CrashRoundUseCase,
        private readonly provablyFairService: ProvablyFairService,
        @Optional() private readonly gateway?: GameGateway,
    ) { }

    async onApplicationBootstrap() {
        try {
            console.log('[GameEngine] onApplicationBootstrap called')
            await this.recoverOrStart()
        } catch (error) {
            console.error('[GameEngine] Failed to start round:', error)
        }
    }

    onApplicationShutdown() {
        try {
            console.log('[GameEngine] onApplicationShutdown called')
            this.stopTick()
        } catch (error) {
            console.error('[GameEngine] Failed to onApplicationShutdown:', error)
        }
    }

    private async recoverOrStart() {
        try {
            console.log('[GameEngine] recoverOrStart called')
            const existing = await this.roundRepository.findCurrent()
            console.log('[GameEngine] existing round:', existing?.id ?? 'none')

            if (existing) {
                this.currentRound = existing;
                this.nonce = existing.nonce;

                if (existing.getStatus() === "RUNNING") {
                    this.startTick()
                    return;
                }

                this.gateway?.emitBettingStarted(existing)

                const elapsed = Date.now() - existing.bettingEndsAt.getTime()
                const remaining = Math.max(0, BETTING_PHASE_MS - elapsed)

                setTimeout(() => this.runRound(), remaining)
                return
            }
            await this.startBettingPhase()
        } catch (error) {
            console.error('[GameEngine] Failed to start round:', error)
        }
    }

    private async startBettingPhase() {
        this.nonce += 1

        const serverSeed = this.provablyFairService.generateinitialSeed()
        const serverSeedHash = this.provablyFairService.hashSeed(serverSeed)
        const clientSeed = this.provablyFairService.generateinitialSeed()
        const crashPoint = this.provablyFairService.calculateCrashPoint(
            serverSeed,
            clientSeed,
            this.nonce,
        )

        const round = new Round({
            id: randomUUID(),
            nonce: this.nonce,
            serverSeed,
            serverSeedHash,
            clientSeed,
            crashPoint,
            bettingEndsAt: new Date(Date.now() + BETTING_PHASE_MS),
            createdAt: new Date(),
        })

        await this.roundRepository.save(round)
        this.currentRound = round

        this.gateway?.emitBettingStarted(round)
        setTimeout(() => this.runRound(), BETTING_PHASE_MS)
    }

    private async runRound() {
        try {
            const round = await this.startRoundUseCase.execute()
            this.currentRound = round

            this.gateway?.emitRoundStarted(round)
            this.startTick()
        } catch (error) {
            console.error('[GameEngine] Failed to start round:', error)
            setTimeout(() => this.startBettingPhase(), CRASH_COOLDOWN_MS)
        }
    }

    private async startTick() {
        this.stopTick()

        this.tickInterval = setInterval(async () => {
            if (!this.currentRound) {
                return
            }

            const now = Date.now()
            const multiplier = this.currentRound.getCurrentMultiplier(now)
            const crashPoint = this.currentRound.getRawCrashPoint()
            const elapsedMs = now - this.currentRound.getStartedAt()!.getTime()

            this.gateway?.emitTick(this.currentRound.id, multiplier, elapsedMs)

            if (multiplier >= crashPoint) {
                this.stopTick()
                await this.crash()
            }
        }, TICK_INTERVAL_MS)
    }

    private stopTick() {
        if (this.tickInterval) {
            clearInterval(this.tickInterval)
            this.tickInterval = null
        }
    }

    private async crash() {
        try {
            const round = await this.crashRoundUseCase.execute()
            this.currentRound = round

            this.gateway?.emitCrashed(round)
            setTimeout(() => this.startBettingPhase(), CRASH_COOLDOWN_MS)
        } catch (error) {
            console.error('[GameEngine] Failed to crash round:', error)
            setTimeout(() => this.startBettingPhase(), CRASH_COOLDOWN_MS)
        }
    }

    getCurrentRound() {
        return this.currentRound
    }
}
