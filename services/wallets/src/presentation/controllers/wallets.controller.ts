import { Controller, ForbiddenException, Get, Post, Req, UseGuards } from "@nestjs/common";
import { HealthCheckResponseDto } from "../dtos/health-check-response.dto";
import { GetWalletUseCase } from "@/application/use-cases/get-wallet.use-case";
import { CreateWalletUseCase } from "@/application/use-cases/create-wallet.use-case";
import { CreditWalletUseCase } from "@/application/use-cases/credit-wallet.use-case";
import { WalletResponseDto } from "../dtos/wallet-response.dto";
import { JwtAuthGuard } from "../guards/jwt-auth.guard";
import type { AuthenticatedRequest } from "../dtos/authenticated-request";

const SEED_AMOUNT_IN_CENTS = 100_000 // R$ 1.000,00

@Controller('wallets')
export class WalletsController {
  constructor(
    private readonly getWalletUseCase: GetWalletUseCase,
    private readonly createWalletUseCase: CreateWalletUseCase,
    private readonly creditWalletUseCase: CreditWalletUseCase,
  ) { }

  @Get('health')
  check(): HealthCheckResponseDto {
    return { status: 'ok', service: 'wallets' }
  }

  @Post()
  @UseGuards(JwtAuthGuard)
  async createWallet(@Req() req: AuthenticatedRequest): Promise<WalletResponseDto> {
    const wallet = await this.createWalletUseCase.execute(req.user.sub)
    return WalletResponseDto.from(wallet)
  }

  @Get('me')
  @UseGuards(JwtAuthGuard)
  async getWallet(@Req() req: AuthenticatedRequest): Promise<WalletResponseDto> {
    const wallet = await this.getWalletUseCase.execute(req.user.sub)
    return WalletResponseDto.from(wallet)
  }

  @Post('admin/seed')
  @UseGuards(JwtAuthGuard)
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
