import { Controller, ForbiddenException, Get, Post, Req, UseGuards } from "@nestjs/common";
import { ApiOAuth2, ApiOperation, ApiResponse, ApiTags } from "@nestjs/swagger";
import { HealthCheckResponseDto } from "../dtos/health-check-response.dto";
import { GetWalletUseCase } from "@/application/use-cases/get-wallet.use-case";
import { CreateWalletUseCase } from "@/application/use-cases/create-wallet.use-case";
import { CreditWalletUseCase } from "@/application/use-cases/credit-wallet.use-case";
import { WalletResponseDto } from "../dtos/wallet-response.dto";
import { JwtAuthGuard } from "../guards/jwt-auth.guard";
import type { AuthenticatedRequest } from "../dtos/authenticated-request";

const SEED_AMOUNT_IN_CENTS = 100_000 // R$ 1.000,00

@ApiTags('wallets')
@Controller('wallets')
export class WalletsController {
  constructor(
    private readonly getWalletUseCase: GetWalletUseCase,
    private readonly createWalletUseCase: CreateWalletUseCase,
    private readonly creditWalletUseCase: CreditWalletUseCase,
  ) { }

  @Get('health')
  @ApiOperation({ summary: 'Health check do serviço' })
  @ApiResponse({ status: 200, description: 'Serviço online', type: HealthCheckResponseDto })
  check(): HealthCheckResponseDto {
    return { status: 'ok', service: 'wallets' }
  }

  @Post()
  @UseGuards(JwtAuthGuard)
  @ApiOAuth2([], 'keycloak')
  @ApiOperation({ summary: 'Criar carteira para o jogador autenticado' })
  @ApiResponse({ status: 201, description: 'Carteira criada com saldo zero', type: WalletResponseDto })
  @ApiResponse({ status: 401, description: 'Unauthorized — token inválido ou ausente' })
  @ApiResponse({ status: 409, description: 'Wallet already exists for this player' })
  async createWallet(@Req() req: AuthenticatedRequest): Promise<WalletResponseDto> {
    const wallet = await this.createWalletUseCase.execute(req.user.sub)
    return WalletResponseDto.from(wallet)
  }

  @Get('me')
  @UseGuards(JwtAuthGuard)
  @ApiOAuth2([], 'keycloak')
  @ApiOperation({ summary: 'Consultar saldo e dados da carteira do jogador autenticado' })
  @ApiResponse({ status: 200, description: 'Dados da carteira', type: WalletResponseDto })
  @ApiResponse({ status: 401, description: 'Unauthorized — token inválido ou ausente' })
  @ApiResponse({ status: 404, description: 'Wallet not found for this player' })
  async getWallet(@Req() req: AuthenticatedRequest): Promise<WalletResponseDto> {
    const wallet = await this.getWalletUseCase.execute(req.user.sub)
    return WalletResponseDto.from(wallet)
  }

  @Post('admin/seed')
  @UseGuards(JwtAuthGuard)
  @ApiOAuth2([], 'keycloak')
  @ApiOperation({
    summary: 'Semear saldo inicial (apenas dev/staging)',
    description: 'Credita R$ 1.000,00 na carteira do jogador autenticado se o saldo for zero. Endpoint desativado em produção (NODE_ENV=production retorna 403). Idempotente: sem efeito se o saldo já for maior que zero.',
  })
  @ApiResponse({ status: 201, description: 'Saldo creditado ou já existente', schema: { example: { credited: true, balanceInCents: '100000' } } })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden — endpoint desativado em produção' })
  async seedWallet(@Req() req: AuthenticatedRequest): Promise<{ credited: boolean; balanceInCents: string }> {
    if (process.env.NODE_ENV === 'production') throw new ForbiddenException()

    const playerId = req.user.sub
    const wallet = await this.getWalletUseCase.execute(playerId)

    if (wallet.balance > 0n) {
      return { credited: false, balanceInCents: wallet.balance.toString() }
    }

    const result = await this.creditWalletUseCase.execute({ playerId, amountInCents: SEED_AMOUNT_IN_CENTS.toString() })
    return { credited: true, balanceInCents: result.success ? result.newBalanceInCents.toString() : '0' }
  }
}
