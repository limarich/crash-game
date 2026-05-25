import { createHmac, randomBytes, createHash } from 'crypto'
import { Injectable } from '@nestjs/common';

@Injectable()
export class ProvablyFairService {

    generateinitialSeed() {
        return randomBytes(32).toString('hex')
    }
    nextSeed(currentSeed: string) {
        return createHash('sha256').update(currentSeed).digest('hex')
    }

    hashSeed(seed: string) {
        return createHash('sha256').update(seed).digest('hex')
    }

    calculateCrashPoint(serverSeed: string, clientSeed: string, nonce: number) {
        const hmac = createHmac('sha256', serverSeed)
        hmac.update(`${clientSeed}:${nonce}`)
        const hash = hmac.digest('hex')

        const h = parseInt(hash.slice(0, 8), 16)
        const e = Math.pow(2, 32)

        // houseEdge
        if (h % 33 === 0) return 1.00

        // long tail curve, capped at 100x
        const raw = Math.floor((99 * e) / (e - h)) / 100
        return Math.min(raw, 100)
    }


    verify(
        serverSeed: string,
        serverSeedHash: string,
        clientSeed: string,
        nonce: number,
        crashPoint: number
    ) {
        const seedMatch = this.hashSeed(serverSeed) === serverSeedHash
        const crashPointMatch = this.calculateCrashPoint(serverSeed, clientSeed, nonce) === crashPoint
        return seedMatch && crashPointMatch
    }

    verifyChain(currentServerSeed: string, nextServerSeedHash: string) {
        return this.hashSeed(this.nextSeed(currentServerSeed)) === nextServerSeedHash
    }
}
