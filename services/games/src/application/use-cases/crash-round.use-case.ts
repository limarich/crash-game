import type { IBetRepository } from "@/domain/bet/bet.interface";
import { BET_REPOSITORY } from "@/domain/bet/bet.token";
import type { IRoundRepository } from "@/domain/round/round.interface";
import { ROUND_REPOSITORY } from "@/domain/round/round.token";
import { Inject, Injectable, UnprocessableEntityException } from "@nestjs/common";

@Injectable()
export class CrashRoundUseCase {
    constructor(
        @Inject(ROUND_REPOSITORY)
        private readonly roundRepository: IRoundRepository,
        @Inject(BET_REPOSITORY)
        private readonly betRepository: IBetRepository,
    ) { }

    async execute() {
        const round = await this.roundRepository.findCurrent()

        if (!round || round.getStatus() !== 'RUNNING') {
            throw new UnprocessableEntityException('No active running round')
        }

        round.crash()
        await this.roundRepository.save(round)

        const bets = await this.betRepository.findByRoundId(round.id)

        const confirmedBets = bets.filter(bet => bet.getStatus() === "CONFIRMED")

        await Promise.all(
            confirmedBets.map(async bet => {
                bet.lose()
                await this.betRepository.save(bet)
            })
        )
        return round
    }
}