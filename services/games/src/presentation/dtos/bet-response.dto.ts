import { Bet } from '../../domain/bet/bet.entity'

export class BetResponseDto {
    id: string
    roundId: string
    playerId: string
    amountInCents: string
    status: string
    cashoutMultiplier: number | null
    payoutInCents: string | null
    createdAt: Date

    static from(bet: Bet): BetResponseDto {
        return {
            id: bet.id,
            roundId: bet.roundId,
            playerId: bet.playerId,
            amountInCents: bet.amountInCents.toString(),
            status: bet.getStatus(),
            cashoutMultiplier: bet.getCashoutMultiplier(),
            payoutInCents: bet.getPayoutInCents()?.toString() ?? null,
            createdAt: bet.createdAt,
        }
    }
}
