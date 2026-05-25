import { execSync } from 'child_process'

export function psqlWallets(sql: string) {
    return execSync(
        `docker exec crash-game-postgres-1 psql -U admin -d wallets -t -c "${sql.replace(/"/g, '\\"')}"`,
    ).toString().trim()
}

export function deleteWallet(playerId: string) {
    psqlWallets(`DELETE FROM wallets WHERE player_id = '${playerId}'`)
}

export function getWalletBalance(playerId: string) {
    return psqlWallets(
        `SELECT balance_in_cents FROM wallets WHERE player_id = '${playerId}'`,
    ).trim()
}
