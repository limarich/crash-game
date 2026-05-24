import {
    Body,
    Controller,
    Get,
    Inject,
    NotFoundException,
    Param,
    Post,
    Query,
    Req,
    UseGuards,
} from '@nestjs/common'
import { JwtAuthGuard } from '../guards/jwt-auth.guard'
import type { AuthenticatedRequest } from '../dtos/authenticated-request'
import { RoundResponseDto } from '../dtos/round-response.dto'
import { BetResponseDto } from '../dtos/bet-response.dto'
import { PlaceBetUseCase } from '../../application/use-cases/place-bet.use-case'
import { CashoutUseCase } from '../../application/use-cases/cashout.use-case'
import { ProvablyFairService } from '../../application/provably-fair/provably-fair.service'
import { ROUND_REPOSITORY } from '../../domain/round/round.token'
import { BET_REPOSITORY } from '../../domain/bet/bet.token'
import type { IRoundRepository } from '../../domain/round/round.interface'
import type { IBetRepository } from '../../domain/bet/bet.interface'
import { VerifyResponseDto } from '../dtos/verify-response.dto'
import { PlaceBetDto } from '../dtos/place-bet.dto'

@Controller('games')
export class GamesController {
    constructor(
        @Inject(ROUND_REPOSITORY)
        private readonly roundRepository: IRoundRepository,
        @Inject(BET_REPOSITORY)
        private readonly betRepository: IBetRepository,
        private readonly placeBetUseCase: PlaceBetUseCase,
        private readonly cashoutUseCase: CashoutUseCase,
        private readonly provablyFairService: ProvablyFairService,
    ) { }

    @Get('health')
    check() {
        return { status: 'ok', service: 'games' }
    }

    @Get('rounds/current')
    async getCurrentRound() {
        const round = await this.roundRepository.findCurrent()
        if (!round) throw new NotFoundException('No active round')
        const bets = await this.betRepository.findByRoundId(round.id)
        return RoundResponseDto.from(round, bets)
    }

    @Get('rounds/history')
    async getRoundHistory(
        @Query('page') page = '1',
        @Query('limit') limit = '20',
    ) {
        const rounds = await this.roundRepository.findHistory(
            parseInt(page, 10),
            parseInt(limit, 10),
        )
        return rounds.map(r => RoundResponseDto.from(r))
    }

    @Get('rounds/:roundId/verify')
    async verifyRound(@Param('roundId') roundId: string): Promise<VerifyResponseDto> {
        const round = await this.roundRepository.findById(roundId)
        if (!round) throw new NotFoundException('Round not found')

        const crashed = round.getStatus() === 'CRASHED'

        if (!crashed) {
            return {
                roundId: round.id,
                serverSeed: null,
                serverSeedHash: round.serverSeedHash,
                clientSeed: round.clientSeed,
                nonce: round.nonce,
                crashPoint: null,
                verified: false,
                chain: null,
            }
        }

        const serverSeed = round.getServerSeed()
        const crashPoint = round.getCrashPoint()
        const verified = this.provablyFairService.verify(
            serverSeed,
            round.serverSeedHash,
            round.clientSeed,
            round.nonce,
            crashPoint,
        )

        const nextRound = await this.roundRepository.findByNonce(round.nonce + 1)
        const chain = nextRound
            ? {
                nextRoundId: nextRound.id,
                nextServerSeedHash: nextRound.serverSeedHash,
                chainValid: this.provablyFairService.hashSeed(serverSeed) === nextRound.serverSeedHash,
            }
            : null

        return {
            roundId: round.id,
            serverSeed,
            serverSeedHash: round.serverSeedHash,
            clientSeed: round.clientSeed,
            nonce: round.nonce,
            crashPoint,
            verified,
            chain,
        }
    }

    @Get('bets/me')
    @UseGuards(JwtAuthGuard)
    async getMyBets(
        @Req() req: AuthenticatedRequest,
        @Query('page') page = '1',
        @Query('limit') limit = '20',
    ) {
        const bets = await this.betRepository.findByPlayer(
            req.user.sub,
            parseInt(page, 10),
            parseInt(limit, 10),
        )
        return bets.map(b => BetResponseDto.from(b))
    }

    @Post('bet')
    @UseGuards(JwtAuthGuard)
    async placeBet(
        @Req() req: AuthenticatedRequest,
        @Body() body: PlaceBetDto,
    ) {
        const bet = await this.placeBetUseCase.execute({
            playerId: req.user.sub,
            amountInCents: body.amountInCents,
        })
        return BetResponseDto.from(bet)
    }

    @Post('bet/cashout')
    @UseGuards(JwtAuthGuard)
    async cashout(@Req() req: AuthenticatedRequest) {
        const bet = await this.cashoutUseCase.execute({ playerId: req.user.sub })
        return BetResponseDto.from(bet)
    }
}
