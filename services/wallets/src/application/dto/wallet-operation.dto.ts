export interface DebitWalletInput {
    playerId: string
    amountInCents: string
}

export interface CreditWalletInput {
    playerId: string
    amountInCents: string
}

export type WalletOperationResult =
    | { success: true; newBalanceInCents: bigint }
    | { success: false; reason: string }