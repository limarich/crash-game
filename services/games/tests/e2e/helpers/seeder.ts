
import { execSync } from 'child_process'
import { createHmac, createHash, randomBytes, randomUUID } from 'crypto'

export function computeCrashPoint(serverSeed: string, clientSeed: string, nonce: number): number {
    const hmac = createHmac('sha256', serverSeed)
    hmac.update(`${clientSeed}:${nonce}`)
    const hash = hmac.digest('hex')
    const h = parseInt(hash.slice(0, 8), 16)
    const e = Math.pow(2, 32)
    if (h % 33 === 0) return 1.00
    const raw = Math.floor((99 * e) / (e - h)) / 100
    return Math.min(raw, 100)
}

function hashSeed(seed: string): string {
    return createHash('sha256').update(seed).digest('hex')
}

function generateSeed(): string {
    return randomBytes(32).toString('hex')
}

function psqlGames(sql: string): string {
    return execSync(
        `docker exec crash-game-postgres-1 psql -U admin -d games -t -c "${sql.replace(/"/g, '\\"')}"`,
    ).toString().trim()
}

function psqlWallets(sql: string): string {
    return execSync(
        `docker exec crash-game-postgres-1 psql -U admin -d wallets -t -c "${sql.replace(/"/g, '\\"')}"`,
    ).toString().trim()
}

const CLIENT_SEED = 'e2e-client-seed-deterministic'

export interface SeedEntry {
    serverSeed: string
    serverSeedHash: string
    clientSeed: string
    nonce: number
    crashPoint: number
}

function findSeedForCrashPoint(target: number, tolerance: number, nonce: number): SeedEntry {
    if (target === 1.00) {
        for (let i = 0; i < 1_000_000; i++) {
            const serverSeed = generateSeed()
            const hmac = createHmac('sha256', serverSeed)
            hmac.update(`${CLIENT_SEED}:${nonce}`)
            const hash = hmac.digest('hex')
            const h = parseInt(hash.slice(0, 8), 16)
            if (h % 33 === 0) {
                return { serverSeed, serverSeedHash: hashSeed(serverSeed), clientSeed: CLIENT_SEED, nonce, crashPoint: 1.00 }
            }
        }
        throw new Error('Failed to find seed for crashPoint 1.00')
    }
    for (let i = 0; i < 1_000_000; i++) {
        const serverSeed = generateSeed()
        const cp = computeCrashPoint(serverSeed, CLIENT_SEED, nonce)
        if (Math.abs(cp - target) <= tolerance) {
            return { serverSeed, serverSeedHash: hashSeed(serverSeed), clientSeed: CLIENT_SEED, nonce, crashPoint: cp }
        }
    }
    throw new Error(`Failed to find seed for crashPoint ~${target} (±${tolerance})`)
}

function computeKnownSeeds(): {
    crash100: SeedEntry
    crash150: SeedEntry
    crash200: SeedEntry
    crash300: SeedEntry
    crash500: SeedEntry
} {
    return {
        crash100: findSeedForCrashPoint(1.00, 0.00, 100),
        crash150: findSeedForCrashPoint(1.50, 0.05, 101),
        crash200: findSeedForCrashPoint(2.00, 0.05, 102),
        crash300: findSeedForCrashPoint(3.00, 0.10, 103),
        crash500: findSeedForCrashPoint(5.00, 0.10, 104),
    }
}

let _knownSeeds: ReturnType<typeof computeKnownSeeds> | null = null

export function getKnownSeeds(): ReturnType<typeof computeKnownSeeds> {
    if (!_knownSeeds) _knownSeeds = computeKnownSeeds()
    return _knownSeeds
}

export const KNOWN_SEEDS = new Proxy({} as ReturnType<typeof computeKnownSeeds>, {
    get(_target, prop: string) {
        return getKnownSeeds()[prop as keyof ReturnType<typeof computeKnownSeeds>]
    },
})

const BASE_TIME = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) // 7 days ago

function toIso(d: Date): string {
    return d.toISOString()
}

function roundTimestamps(index: number) {
    const offset = index * 5 * 60 * 1000
    const createdAt = new Date(BASE_TIME.getTime() + offset)
    const bettingEndsAt = new Date(createdAt.getTime() + 10_000)
    const startedAt = new Date(bettingEndsAt.getTime() + 100)
    const crashedAt = new Date(startedAt.getTime() + 3_000)
    return { createdAt, bettingEndsAt, startedAt, crashedAt }
}

function upsertRound(roundId: string, seed: SeedEntry, ts: ReturnType<typeof roundTimestamps>): string {
    const raw = psqlGames(
        `INSERT INTO rounds (id, nonce, client_seed, server_seed, server_seed_hash, crash_point, status, betting_ends_at, started_at, crashed_at, created_at)` +
        ` VALUES ('${roundId}', ${seed.nonce}, '${seed.clientSeed}', '${seed.serverSeed}', '${seed.serverSeedHash}',` +
        ` ${seed.crashPoint}, 'CRASHED', '${toIso(ts.bettingEndsAt)}', '${toIso(ts.startedAt)}', '${toIso(ts.crashedAt)}', '${toIso(ts.createdAt)}')` +
        ` ON CONFLICT (nonce) DO UPDATE SET` +
        ` client_seed = EXCLUDED.client_seed, server_seed = EXCLUDED.server_seed,` +
        ` server_seed_hash = EXCLUDED.server_seed_hash, crash_point = EXCLUDED.crash_point,` +
        ` status = EXCLUDED.status, betting_ends_at = EXCLUDED.betting_ends_at,` +
        ` started_at = EXCLUDED.started_at, crashed_at = EXCLUDED.crashed_at, created_at = EXCLUDED.created_at` +
        ` RETURNING id`
    )
    // psql -t output: "<uuid>\n\nINSERT 0 1" — take the first non-empty line
    return raw.split('\n').map(l => l.trim()).filter(Boolean)[0]
}

function upsertLostBet(roundId: string, playerId: string, amountInCents: bigint, createdAt: Date): void {
    const betId = randomUUID()
    psqlGames(
        `INSERT INTO bets (id, round_id, player_id, player_name, amount_in_cents, status, cashout_multiplier, payout_in_cents, created_at)` +
        ` VALUES ('${betId}', '${roundId}', '${playerId}', 'player', ${amountInCents}, 'LOST', NULL, NULL, '${toIso(createdAt)}')` +
        ` ON CONFLICT (player_id, round_id) DO UPDATE SET` +
        ` status = 'LOST', cashout_multiplier = NULL, payout_in_cents = NULL`
    )
}

function upsertWallet(playerId: string, balanceInCents: bigint): void {
    const walletId = randomUUID()
    const now = new Date().toISOString()
    psqlWallets(
        `INSERT INTO wallets (id, player_id, balance_in_cents, created_at, updated_at)` +
        ` VALUES ('${walletId}', '${playerId}', ${balanceInCents}, '${now}', '${now}')` +
        ` ON CONFLICT (player_id) DO UPDATE SET balance_in_cents = EXCLUDED.balance_in_cents, updated_at = EXCLUDED.updated_at`
    )
}

export interface SeededRoundIds {
    crash100: string
    crash150: string
    crash200: string
    crash300: string
    crash500: string
}

export function seedE2EState(playerId: string, balanceInCents: bigint = 50_000n): SeededRoundIds {
    // Wallet
    upsertWallet(playerId, balanceInCents)

    // Historical rounds
    const seeds = getKnownSeeds()
    const entries: Array<[keyof SeededRoundIds, SeedEntry]> = [
        ['crash100', seeds.crash100],
        ['crash150', seeds.crash150],
        ['crash200', seeds.crash200],
        ['crash300', seeds.crash300],
        ['crash500', seeds.crash500],
    ]

    const ids = {} as SeededRoundIds
    for (let i = 0; i < entries.length; i++) {
        const [label, seed] = entries[i]
        const roundId = randomUUID()
        const ts = roundTimestamps(i)
        const actualId = upsertRound(roundId, seed, ts)
        upsertLostBet(actualId, playerId, 1_000n, ts.createdAt)
        ids[label] = actualId
    }
    return ids
}
