import { ApiProperty } from '@nestjs/swagger'
import { Round } from '../../domain/round/round.entity'
import { Bet } from '../../domain/bet/bet.entity'
import { BetResponseDto } from './bet-response.dto'

export class RoundResponseDto {
    @ApiProperty({ example: '550e8400-e29b-41d4-a716-446655440000' })
    id: string

    @ApiProperty({ example: 'BETTING', enum: ['BETTING', 'RUNNING', 'CRASHED'] })
    status: string

    @ApiProperty({ example: 'a3f1...', description: 'SHA256 do serverSeed — publicado antes da rodada' })
    serverSeedHash: string

    @ApiProperty({ example: 'abc123def456', description: 'Client seed da sessão atual' })
    clientSeed: string

    @ApiProperty({ example: 42, description: 'Nonce da rodada — incrementado a cada rodada na hash chain' })
    nonce: number

    @ApiProperty({ example: '2024-01-01T00:10:00.000Z', description: 'Momento em que as apostas encerram' })
    bettingEndsAt: Date

    @ApiProperty({ example: '2024-01-01T00:10:10.000Z', nullable: true })
    startedAt: Date | null

    @ApiProperty({ example: '2024-01-01T00:10:45.000Z', nullable: true })
    crashedAt: Date | null

    @ApiProperty({ example: '2024-01-01T00:10:00.000Z' })
    createdAt: Date

    @ApiProperty({ example: 3.14, nullable: true, description: 'Crash point — revelado apenas após o crash' })
    crashPoint: number | null

    @ApiProperty({ example: 'b7e2...', nullable: true, description: 'Server seed — revelado apenas após o crash' })
    serverSeed: string | null

    @ApiProperty({ type: () => [BetResponseDto], required: false })
    bets?: BetResponseDto[]

    static from(round: Round, bets?: Bet[]): RoundResponseDto {
        const crashed = round.getStatus() === 'CRASHED'
        return {
            id: round.id,
            status: round.getStatus(),
            serverSeedHash: round.serverSeedHash,
            clientSeed: round.clientSeed,
            nonce: round.nonce,
            bettingEndsAt: round.bettingEndsAt,
            startedAt: round.getStartedAt(),
            crashedAt: round.getCrashedAt(),
            createdAt: round.createdAt,
            crashPoint: crashed ? round.getCrashPoint() : null,
            serverSeed: crashed ? round.getServerSeed() : null,
            bets: bets?.map(b => BetResponseDto.from(b)),
        }
    }
}
