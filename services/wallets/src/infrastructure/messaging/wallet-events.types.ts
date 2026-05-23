export interface DebitSucceededPayload {
    betId: string
    playerId: string
    newBalanceInCents: string
}

export interface DebitFailedPayload {
    betId: string
    playerId: string
    reason: string
}

export interface CreditSucceededPayload {
    betId: string
    playerId: string
    newBalanceInCents: string
}

export interface CreditFailedPayload {
    betId: string
    playerId: string
    reason: string
}


export interface DebitRequestedPayload {
    betId: string
    playerId: string
    amountInCents: string
}

export interface CreditRequestedPayload {
    betId: string
    playerId: string
    amountInCents: string
}
