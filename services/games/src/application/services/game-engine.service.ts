import type { IRoundRepository } from "@/domain/round/round.interface";
import { Inject, Injectable, OnApplicationBootstrap, OnApplicationShutdown } from "@nestjs/common";
import { StartRoundUseCase } from "../use-cases/start-round.use-case";
import { CrashRoundUseCase } from "../use-cases/crash-round.use-case";
import { ProvablyFairService } from "../provably-fair/provably-fair.service";
import { ROUND_REPOSITORY } from "@/domain/round/round.token";
import { Round } from "@/domain/round/round.entity";
import { randomUUID } from "crypto";

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
    ) { }

    async onApplicationBootstrap() {
        await this.recoverOrStart()
    }

    onApplicationShutdown(): void {
        this.stopTick()
    }

    private async recoverOrStart() {

        const existing = await this.roundRepository.findCurrent()

        if (existing) {
            this.currentRound = existing;
            this.nonce = existing.nonce;

            if (existing.getStatus() === "RUNNING") {
                this.startTick()
                return;
            }

            const elapsed = Date.now() - existing.bettingEndsAt.getTime()
            const remaining = Math.max(0, BETTING_PHASE_MS - elapsed)

            setTimeout(() => this.runRound(), remaining)
            return
        }
        await this.startBettingPhase()
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

        // TODO: emmit round:betting-started 
        setTimeout(() => this.runRound(), BETTING_PHASE_MS)
    }

    private async runRound() {
        try {
            const round = await this.startRoundUseCase.execute()
            this.currentRound = round

            // TODO: emmit round:started
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

            // TODO: emmit round:tick 

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

            // TODO: emmit round:crashed 
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