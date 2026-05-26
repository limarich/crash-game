#!/usr/bin/env bun


import { execSync } from 'child_process'
import { createHmac, createHash, randomBytes, randomUUID } from 'crypto'

function calculateCrashPoint(serverSeed: string, clientSeed: string, nonce: number): number {
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

function nextSeed(currentSeed: string): string {
    return createHash('sha256').update(currentSeed).digest('hex')
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

interface SeedResult {
    serverSeed: string
    clientSeed: string
    nonce: number
    serverSeedHash: string
    crashPoint: number
}

function findSeedForCrashPoint(
    target: number,
    tolerance: number,
    clientSeed: string,
    nonce: number,
): SeedResult {

    if (target === 1.00) {
        for (let attempt = 0; attempt < 1_000_000; attempt++) {
            const serverSeed = generateSeed()
            const hmac = createHmac('sha256', serverSeed)
            hmac.update(`${clientSeed}:${nonce}`)
            const hash = hmac.digest('hex')
            const h = parseInt(hash.slice(0, 8), 16)
            if (h % 33 === 0) {
                return {
                    serverSeed,
                    clientSeed,
                    nonce,
                    serverSeedHash: hashSeed(serverSeed),
                    crashPoint: 1.00,
                }
            }
        }
        throw new Error('Could not find a seed for crash point 1.00 after 1_000_000 attempts')
    }

    for (let attempt = 0; attempt < 1_000_000; attempt++) {
        const serverSeed = generateSeed()
        const cp = calculateCrashPoint(serverSeed, clientSeed, nonce)
        if (Math.abs(cp - target) <= tolerance) {
            return {
                serverSeed,
                clientSeed,
                nonce,
                serverSeedHash: hashSeed(serverSeed),
                crashPoint: cp,
            }
        }
    }
    throw new Error(`Could not find a seed for crash point ~${target} (±${tolerance}) after 1_000_000 attempts`)
}

const CLIENT_SEED = 'e2e-client-seed-deterministic'

interface RoundConfig {
    label: string
    targetCrashPoint: number
    tolerance: number
    nonce: number
}

const ROUND_CONFIGS: RoundConfig[] = [
    { label: 'crash@1.00', targetCrashPoint: 1.00, tolerance: 0.00, nonce: 100 },
    { label: 'crash@1.50', targetCrashPoint: 1.50, tolerance: 0.05, nonce: 101 },
    { label: 'crash@2.00', targetCrashPoint: 2.00, tolerance: 0.05, nonce: 102 },
    { label: 'crash@3.00', targetCrashPoint: 3.00, tolerance: 0.10, nonce: 103 },
    { label: 'crash@5.00', targetCrashPoint: 5.00, tolerance: 0.10, nonce: 104 },
]

// Starting base time so historical rounds don't overlap with live rounds
const BASE_TIME = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) // 7 days ago

function buildRoundTimestamps(index: number): { bettingEndsAt: Date; startedAt: Date; crashedAt: Date; createdAt: Date } {
    const offset = index * 5 * 60 * 1000 // 5 minutes apart
    const createdAt = new Date(BASE_TIME.getTime() + offset)
    const bettingEndsAt = new Date(createdAt.getTime() + 10_000)
    const startedAt = new Date(bettingEndsAt.getTime() + 100)
    const crashedAt = new Date(startedAt.getTime() + 3_000)
    return { bettingEndsAt, startedAt, crashedAt, createdAt }
}

function toIso(d: Date): string {
    return d.toISOString()
}

function insertRound(
    id: string,
    seed: SeedResult,
    timestamps: ReturnType<typeof buildRoundTimestamps>,
): void {
    const { bettingEndsAt, startedAt, crashedAt, createdAt } = timestamps
    psqlGames(
        `INSERT INTO rounds (id, nonce, client_seed, server_seed, server_seed_hash, crash_point, status, betting_ends_at, started_at, crashed_at, created_at)` +
        ` VALUES ('${id}', ${seed.nonce}, '${seed.clientSeed}', '${seed.serverSeed}', '${seed.serverSeedHash}',` +
        ` ${seed.crashPoint}, 'CRASHED', '${toIso(bettingEndsAt)}', '${toIso(startedAt)}', '${toIso(crashedAt)}', '${toIso(createdAt)}')` +
        ` ON CONFLICT (nonce) DO UPDATE SET` +
        ` client_seed = EXCLUDED.client_seed, server_seed = EXCLUDED.server_seed,` +
        ` server_seed_hash = EXCLUDED.server_seed_hash, crash_point = EXCLUDED.crash_point,` +
        ` status = EXCLUDED.status, betting_ends_at = EXCLUDED.betting_ends_at,` +
        ` started_at = EXCLUDED.started_at, crashed_at = EXCLUDED.crashed_at, created_at = EXCLUDED.created_at`
    )
}

function insertBet(
    roundId: string,
    playerId: string,
    amountInCents: bigint,
    createdAt: Date,
): void {
    const id = randomUUID()
    psqlGames(
        `INSERT INTO bets (id, round_id, player_id, player_name, amount_in_cents, status, cashout_multiplier, payout_in_cents, created_at)` +
        ` VALUES ('${id}', '${roundId}', '${playerId}', 'player', ${amountInCents}, 'LOST', NULL, NULL, '${toIso(createdAt)}')` +
        ` ON CONFLICT (player_id, round_id) DO UPDATE SET` +
        ` status = 'LOST', cashout_multiplier = NULL, payout_in_cents = NULL`
    )
}

function ensureWallet(playerId: string, balanceInCents: bigint): void {
    //  create if absent, always reset balance to the requested amount
    const walletId = randomUUID()
    const now = new Date().toISOString()
    psqlWallets(
        `INSERT INTO wallets (id, player_id, balance_in_cents, created_at, updated_at)` +
        ` VALUES ('${walletId}', '${playerId}', ${balanceInCents}, '${now}', '${now}')` +
        ` ON CONFLICT (player_id) DO UPDATE SET balance_in_cents = EXCLUDED.balance_in_cents, updated_at = EXCLUDED.updated_at`
    )
}

async function main() {
    const playerId = process.argv[2] ?? process.env['E2E_PLAYER_ID']
    if (!playerId || !/^[0-9a-f-]{36}$/i.test(playerId)) {
        console.error('Usage: bun scripts/seed-e2e.ts <player-uuid>')
        console.error('       E2E_PLAYER_ID=<player-uuid> bun scripts/seed-e2e.ts')
        process.exit(1)
    }

    const WALLET_BALANCE = 50_000n // R$500.00 in cents

    console.log('=== E2E Seed Script ===')
    console.log(`Player: ${playerId}`)
    console.log(`Wallet balance: ${WALLET_BALANCE} cents (R$${Number(WALLET_BALANCE) / 100}.00)`)
    console.log()

    // Wallet
    console.log('[1/3] Upserting wallet…')
    ensureWallet(playerId, WALLET_BALANCE)
    console.log(`      wallet set to ${WALLET_BALANCE} cents`)
    console.log()

    // Find seeds for each target crash point
    console.log('[2/3] Brute-forcing seeds for target crash points…')
    const results: Array<{ config: RoundConfig; seed: SeedResult; roundId: string }> = []

    for (const config of ROUND_CONFIGS) {
        process.stdout.write(`      ${config.label} (nonce=${config.nonce}) … `)
        const seed = findSeedForCrashPoint(config.targetCrashPoint, config.tolerance, CLIENT_SEED, config.nonce)
        const roundId = randomUUID()
        results.push({ config, seed, roundId })
        console.log(`found! crashPoint=${seed.crashPoint}`)
    }
    console.log()

    // Insert rounds and bets
    console.log('[3/3] Inserting rounds and LOST bets into DB…')
    for (let i = 0; i < results.length; i++) {
        const { config, seed, roundId } = results[i]
        const timestamps = buildRoundTimestamps(i)

        insertRound(roundId, seed, timestamps)
        insertBet(roundId, playerId, 1000n, timestamps.createdAt)

        console.log(
            `      round ${roundId.slice(0, 8)}… | nonce=${seed.nonce} | crashPoint=${seed.crashPoint} | bet LOST (1000 cents)`,
        )
    }
    console.log()

    // Summary table
    console.log('=== Summary ===')
    console.log(`Wallet balance : ${WALLET_BALANCE} cents`)
    console.log('Rounds seeded  :')
    for (const { config, seed, roundId } of results) {
        console.log(`  [${config.label}] id=${roundId} nonce=${seed.nonce} crashPoint=${seed.crashPoint}`)
        console.log(`    serverSeed    : ${seed.serverSeed}`)
        console.log(`    serverSeedHash: ${seed.serverSeedHash}`)
        console.log(`    clientSeed    : ${seed.clientSeed}`)
    }
    console.log()
    console.log('Done.')

    // Emit machine-readable JSON for use by seeder.ts (piped from CI)
    const knownSeeds: Record<string, SeedResult> = {}
    for (const { config, seed } of results) {
        const key = config.label.replace('@', '').replace('.', '_') // crash1_00, crash1_50, etc.
        knownSeeds[key] = seed
    }
    // Print as KNOWN_SEEDS export for copy-paste convenience
    console.log('\n=== KNOWN_SEEDS (copy into seeder.ts if regenerating) ===')
    console.log(JSON.stringify(knownSeeds, null, 2))
}

main().catch((err) => {
    console.error(err)
    process.exit(1)
})
