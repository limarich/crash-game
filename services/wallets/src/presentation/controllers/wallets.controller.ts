import { Controller, Get, Post, Req, UseGuards } from "@nestjs/common";
import { HealthCheckResponseDto } from "../dtos/health-check-response.dto";
import { GetWalletUseCase } from "@/application/use-cases/get-wallet.use-case";
import { CreateWalletUseCase } from "@/application/use-cases/create-wallet.use-case";
import { WalletResponseDto } from "../dtos/wallet-response.dto";
import { JwtAuthGuard } from "../guards/jwt-auth.guard";
import type { AuthenticatedRequest } from "../dtos/authenticated-request";

@Controller('wallets')
export class WalletsController {
  constructor(
    private readonly getWalletUseCase: GetWalletUseCase,
    private readonly createWalletUseCase: CreateWalletUseCase,
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
}
