import { Inject, Injectable, UnprocessableEntityException } from "@nestjs/common";
import type { IRoundRepository } from "@/domain/round/round.interface";
import { ROUND_REPOSITORY } from "@/domain/round/round.token";

@Injectable()
export class StartRoundUseCase {
    constructor(
        @Inject(ROUND_REPOSITORY)
        private readonly roundRepository: IRoundRepository
    ) { }

    async execute() {
        const round = await this.roundRepository.findCurrent()

        if (!round || round.getStatus() !== 'BETTING') {
            throw new UnprocessableEntityException('No active betting round')
        }

        round.start()
        await this.roundRepository.save(round)
        return round
    }
}