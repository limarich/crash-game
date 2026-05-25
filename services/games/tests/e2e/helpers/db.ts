import { execSync } from 'child_process'

export function psqlGames(sql: string) {
    return execSync(
        `docker exec crash-game-postgres-1 psql -U admin -d games -t -c "${sql.replace(/"/g, '\\"')}"`,
    ).toString().trim()
}

export function psqlWallets(sql: string) {
    return execSync(
        `docker exec crash-game-postgres-1 psql -U admin -d wallets -t -c "${sql.replace(/"/g, '\\"')}"`,
    ).toString().trim()
}

export function seedWalletBalance(playerId: string, balanceInCents: bigint) {
    psqlWallets(
        `UPDATE wallets SET balance_in_cents = ${balanceInCents} WHERE player_id = '${playerId}'`,
    )
}

export function deleteWallet(playerId: string) {
    psqlWallets(`DELETE FROM wallets WHERE player_id = '${playerId}'`)
}

export function getBetStatus(playerId: string) {
    return psqlGames(
        `SELECT status FROM bets WHERE player_id = '${playerId}' ORDER BY created_at DESC LIMIT 1`,
    ).trim()
}

export function getWalletBalance(playerId: string) {
    return psqlWallets(
        `SELECT balance_in_cents FROM wallets WHERE player_id = '${playerId}'`,
    ).trim()
}
