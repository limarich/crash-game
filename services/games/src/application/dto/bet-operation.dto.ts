export interface PlaceBetInput {
    playerId: string
    playerName: string
    amountInCents: string
}

export interface CashoutInput {
    playerId: string
}

export interface ConfirmBetInput {
    betId: string
}

export interface CancelBetInput {
    betId: string
}