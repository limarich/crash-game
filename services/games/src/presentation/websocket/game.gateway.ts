import type { IBetRepository } from "@/domain/bet/bet.interface";
import { BET_REPOSITORY } from "@/domain/bet/bet.token";
import type { IRoundRepository } from "@/domain/round/round.interface";
import { ROUND_REPOSITORY } from "@/domain/round/round.token";
import { Inject, Injectable } from "@nestjs/common";
import { OnGatewayConnection, WebSocketGateway, WebSocketServer } from "@nestjs/websockets";
import { Server, Socket } from 'socket.io'
import { Round } from "../../domain/round/round.entity";

@WebSocketGateway({
    cors: { origin: '*' },
})
@Injectable()
export class GameGateway implements OnGatewayConnection {
    @WebSocketServer()
    server: Server

    constructor(
        @Inject(ROUND_REPOSITORY)
        private readonly roundRepository: IRoundRepository,
        @Inject(BET_REPOSITORY)
        private readonly betRepository: IBetRepository,
    ) { }

    async handleConnection(client: Socket) {
        const round = await this.roundRepository.findCurrent()
        if (!round) return

        const bets = await this.betRepository.findByRoundId(round.id)

        client.emit('round:sync', {
            round: {
                id: round.id,
                status: round.getStatus(),
                serverSeedHash: round.serverSeedHash,
                clientSeed: round.clientSeed,
                nonce: round.nonce,
                bettingEndsAt: round.bettingEndsAt,
                startedAt: round.getStartedAt(),
                elapsedMs: round.getStartedAt()
                    ? Date.now() - round.getStartedAt()!.getTime()
                    : 0,
            },
            bets: bets.map(b => ({
                id: b.id,
                playerId: b.playerId,
                amountInCents: b.amountInCents.toString(),
                status: b.getStatus(),
                cashoutMultiplier: b.getCashoutMultiplier(),
                payoutInCents: b.getPayoutInCents()?.toString() ?? null,
            })),
        })

    }
    emitBettingStarted(round: Round) {
        this.server.emit('round:betting-started', {
            roundId: round.id,
            bettingEndsAt: round.bettingEndsAt,
            serverSeedHash: round.serverSeedHash,
        })
    }

    emitRoundStarted(round: Round) {
        this.server.emit('round:started', {
            roundId: round.id,
            startedAt: round.getStartedAt(),
        })
    }

    emitTick(roundId: string, multiplier: number, elapsedMs: number) {
        this.server.emit('round:tick', { roundId, multiplier, elapsedMs })
    }

    emitCrashed(round: Round) {
        this.server.emit('round:crashed', {
            roundId: round.id,
            crashPoint: round.getCrashPoint(),
            serverSeed: round.getServerSeed(),
        })
    }

    emitBetPlaced(roundId: string, playerId: string, amountInCents: string) {
        this.server.emit('bet:placed', { roundId, playerId, amountInCents })
    }

    emitBetCashedOut(
        roundId: string,
        playerId: string,
        multiplier: number,
        payoutInCents: string,
    ) {
        this.server.emit('bet:cashedout', {
            roundId,
            playerId,
            multiplier,
            payoutInCents,
        })
    }
}