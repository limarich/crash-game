import type { IBetRepository } from "@/domain/bet/bet.interface";
import { BET_REPOSITORY } from "@/domain/bet/bet.token";
import { Inject, Injectable } from "@nestjs/common";
import { ConfirmBetInput } from "../dto/bet-operation.dto";

@Injectable()
export class ConfirmBetUseCase {
    constructor(
        @Inject(BET_REPOSITORY)
        private readonly betRepository: IBetRepository
    ) { }

    async execute(data: ConfirmBetInput) {

        const bet = await this.betRepository.findById(data.betId)

        if (!bet) return

        bet.confirm()
        await this.betRepository.save(bet)
    }
}