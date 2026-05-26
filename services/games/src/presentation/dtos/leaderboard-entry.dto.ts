import { ApiProperty } from '@nestjs/swagger'

export class LeaderboardEntryDto {
    @ApiProperty({ example: 'auth0|abc123', description: 'Keycloak user sub' })
    playerId: string

    @ApiProperty({ example: 'player', description: 'Username from Keycloak' })
    playerName: string

    @ApiProperty({ example: '12400', description: 'Net profit in cents as string (can be negative)' })
    netProfitInCents: string

    static from(raw: { playerId: string; playerName: string; netProfitInCents: bigint }): LeaderboardEntryDto {
        return {
            playerId: raw.playerId,
            playerName: raw.playerName,
            netProfitInCents: raw.netProfitInCents.toString(),
        }
    }
}
