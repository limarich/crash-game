import type { IBetRepository } from "@/domain/bet/bet.interface";
import { BET_REPOSITORY } from "@/domain/bet/bet.token";
import { Inject, Injectable } from "@nestjs/common";
import { CancelBetInput } from "../dto/bet-operation.dto";

@Injectable()
export class CancelBetUseCase {
    constructor(
        @Inject(BET_REPOSITORY)
        private readonly betRepository: IBetRepository
    ) { }

    async execute(data: CancelBetInput) {

        const bet = await this.betRepository.findById(data.betId)

        if (!bet) return

        bet.cancel()
        await this.betRepository.save(bet)
    }
}