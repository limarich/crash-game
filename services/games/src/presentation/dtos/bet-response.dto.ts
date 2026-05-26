import { ApiProperty } from '@nestjs/swagger'
import { Bet } from '../../domain/bet/bet.entity'

export class BetResponseDto {
    @ApiProperty({ example: '550e8400-e29b-41d4-a716-446655440000' })
    id: string

    @ApiProperty({ example: '550e8400-e29b-41d4-a716-446655440001' })
    roundId: string

    @ApiProperty({ example: '550e8400-e29b-41d4-a716-446655440002', description: 'Keycloak user sub' })
    playerId: string

    @ApiProperty({ example: '1000', description: 'Bet amount in cents as string' })
    amountInCents: string

    @ApiProperty({ example: 'CONFIRMED', enum: ['PENDING', 'CONFIRMED', 'CASHED_OUT', 'LOST', 'CANCELLED'] })
    status: string

    @ApiProperty({ example: 2.35, nullable: true, description: 'Multiplier at cashout time, null if not cashed out' })
    cashoutMultiplier: number | null

    @ApiProperty({ example: '2350', nullable: true, description: 'Payout in cents as string, null if not cashed out' })
    payoutInCents: string | null

    @ApiProperty({ example: '2024-01-01T00:00:00.000Z' })
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
