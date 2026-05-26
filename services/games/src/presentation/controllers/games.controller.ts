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
import { ApiBody, ApiOAuth2, ApiOperation, ApiParam, ApiQuery, ApiResponse, ApiTags } from '@nestjs/swagger'
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
import { LeaderboardEntryDto } from '../dtos/leaderboard-entry.dto'

@ApiTags('games')
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
    @ApiOperation({ summary: 'Health check do serviço' })
    @ApiResponse({ status: 200, schema: { example: { status: 'ok', service: 'games' } } })
    check() {
        return { status: 'ok', service: 'games' }
    }

    @Get('rounds/current')
    @ApiOperation({ summary: 'Estado da rodada atual com apostas confirmadas' })
    @ApiResponse({ status: 200, type: RoundResponseDto })
    @ApiResponse({ status: 404, description: 'No active round' })
    async getCurrentRound() {
        const round = await this.roundRepository.findCurrent()
        if (!round) throw new NotFoundException('No active round')
        const bets = await this.betRepository.findByRoundId(round.id)
        return RoundResponseDto.from(round, bets)
    }

    @Get('rounds/history')
    @ApiOperation({ summary: 'Histórico paginado de rodadas crashadas' })
    @ApiQuery({ name: 'page', required: false, example: 1, description: 'Página (1-based)' })
    @ApiQuery({ name: 'limit', required: false, example: 20, description: 'Itens por página' })
    @ApiResponse({ status: 200, type: [RoundResponseDto] })
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
    @ApiOperation({
        summary: 'Verificação provably fair de uma rodada',
        description: 'Retorna serverSeed apenas se a rodada já crashou. Use os dados para recalcular o crashPoint de forma independente via HMAC-SHA256(serverSeed, clientSeed:nonce).',
    })
    @ApiParam({ name: 'roundId', type: 'string', description: 'UUID da rodada' })
    @ApiResponse({ status: 200, type: VerifyResponseDto })
    @ApiResponse({ status: 404, description: 'Round not found' })
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
                chainValid: this.provablyFairService.verifyChain(serverSeed, nextRound.serverSeedHash),
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
    @ApiOAuth2([], 'keycloak')
    @ApiOperation({ summary: 'Histórico de apostas do jogador autenticado' })
    @ApiQuery({ name: 'page', required: false, example: 1 })
    @ApiQuery({ name: 'limit', required: false, example: 20 })
    @ApiResponse({ status: 200, type: [BetResponseDto] })
    @ApiResponse({ status: 401, description: 'Unauthorized' })
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

    @Get('leaderboard')
    @ApiOperation({ summary: 'Top jogadores por lucro líquido' })
    @ApiQuery({ name: 'limit', required: false, example: 10, description: 'Máximo de entradas (max 50)' })
    @ApiResponse({ status: 200, type: [LeaderboardEntryDto] })
    async getLeaderboard(@Query('limit') limit = '10') {
        const entries = await this.betRepository.findLeaderboard(
            Math.min(Math.max(1, parseInt(limit, 10)), 50),
        )
        return entries.map(LeaderboardEntryDto.from)
    }

    @Post('bet')
    @UseGuards(JwtAuthGuard)
    @ApiOAuth2([], 'keycloak')
    @ApiOperation({ summary: 'Fazer aposta na rodada atual (fase BETTING)' })
    @ApiBody({ type: PlaceBetDto })
    @ApiResponse({ status: 201, type: BetResponseDto })
    @ApiResponse({ status: 401, description: 'Unauthorized' })
    @ApiResponse({ status: 409, description: 'Player already has a bet in this round' })
    @ApiResponse({ status: 422, description: 'No active betting round' })
    async placeBet(
        @Req() req: AuthenticatedRequest,
        @Body() body: PlaceBetDto,
    ) {
        const bet = await this.placeBetUseCase.execute({
            playerId: req.user.sub,
            playerName: req.user.username,
            amountInCents: body.amountInCents,
        })
        return BetResponseDto.from(bet)
    }

    @Post('bet/cashout')
    @UseGuards(JwtAuthGuard)
    @ApiOAuth2([], 'keycloak')
    @ApiOperation({ summary: 'Sacar no multiplicador atual (fase RUNNING)' })
    @ApiResponse({ status: 200, type: BetResponseDto })
    @ApiResponse({ status: 401, description: 'Unauthorized' })
    @ApiResponse({ status: 422, description: 'No active running round or no confirmed bet' })
    async cashout(@Req() req: AuthenticatedRequest) {
        const bet = await this.cashoutUseCase.execute({ playerId: req.user.sub })
        return BetResponseDto.from(bet)
    }
}
