import { Round } from '../../domain/round/round.entity'
import { Bet } from '../../domain/bet/bet.entity'
import { BetResponseDto } from './bet-response.dto'

export class RoundResponseDto {
    id: string
    status: string
    serverSeedHash: string
    clientSeed: string
    nonce: number
    bettingEndsAt: Date
    startedAt: Date | null
    crashedAt: Date | null
    createdAt: Date
    crashPoint: number | null
    serverSeed: string | null
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
