import { InvalidStateTransitionError, SeedNotAvailableError } from "./round.errors"

export type RoundStatus = 'BETTING' | 'RUNNING' | 'CRASHED'

export class Round {
    readonly id: string
    private crashPoint: number
    readonly bettingEndsAt: Date
    readonly createdAt: Date
    private status: RoundStatus
    private startedAt: Date | null
    private crashedAt: Date | null


    // provably fair
    readonly nonce: number
    readonly clientSeed: string
    private serverSeed: string
    readonly serverSeedHash: string

    // the increment multiplier for each ms
    private static readonly MULTIPLIER_BASE = 1.0024

    constructor(
        params: {
            id: string
            nonce: number
            clientSeed: string
            serverSeed: string
            serverSeedHash: string
            crashPoint: number
            bettingEndsAt: Date
            createdAt: Date
            status?: RoundStatus
            startedAt?: Date | null
            crashedAt?: Date | null
        }
    ) {
        this.id = params.id
        this.nonce = params.nonce
        this.clientSeed = params.clientSeed
        this.serverSeed = params.serverSeed
        this.serverSeedHash = params.serverSeedHash
        this.crashPoint = params.crashPoint
        this.bettingEndsAt = params.bettingEndsAt
        this.createdAt = params.createdAt
        this.status = params.status ?? 'BETTING'
        this.startedAt = params.startedAt ?? null
        this.crashedAt = params.crashedAt ?? null
    }

    getStatus() { return this.status }
    getStartedAt() { return this.startedAt }
    getCrashedAt() { return this.crashedAt }

    getCrashPoint(): number {
        if (this.status !== 'CRASHED') {
            throw new SeedNotAvailableError()
        }
        return this.crashPoint
    }

    getServerSeed() {
        if (this.status !== 'CRASHED') {
            throw new SeedNotAvailableError()
        }
        return this.serverSeed
    }

    start() {
        if (this.status !== 'BETTING') {
            throw new InvalidStateTransitionError(this.status, 'RUNNING')
        }
        this.status = 'RUNNING'
        this.startedAt = new Date()
    }

    crash() {
        if (this.status !== 'RUNNING') {
            throw new InvalidStateTransitionError(this.status, 'CRASHED')
        }
        this.status = 'CRASHED'
        this.crashedAt = new Date()
    }

    getCurrentMultiplier(now: number) {
        if (this.status !== "RUNNING" || !this.startedAt) {
            throw new InvalidStateTransitionError(this.status, 'RUNNING')
        }

        const elapsedMs = now - this.startedAt.getTime()
        return this.calculateMultiplier(elapsedMs)
    }

    private calculateMultiplier(elapsedMs: number) {
        return Math.pow(Round.MULTIPLIER_BASE, elapsedMs / 100)
    }
}