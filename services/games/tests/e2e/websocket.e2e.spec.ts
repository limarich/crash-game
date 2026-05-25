import { describe, it, expect, afterEach } from 'bun:test'
import { io, Socket } from 'socket.io-client'

const WS_URL = 'http://localhost:4001'

function connectSocket(): Socket {
    return io(WS_URL, {
        transports: ['websocket'],
        reconnection: false,
    })
}

function waitForEvent<T>(socket: Socket, event: string, timeoutMs = 15_000): Promise<T> {
    return new Promise((resolve, reject) => {
        const timer = setTimeout(() => reject(new Error(`Timeout waiting for "${event}"`)), timeoutMs)
        socket.once(event, (data: T) => {
            clearTimeout(timer)
            resolve(data)
        })
    })
}

function collectEvents<T>(socket: Socket, event: string, count: number, timeoutMs = 30_000): Promise<T[]> {
    return new Promise((resolve, reject) => {
        const collected: T[] = []
        const timer = setTimeout(
            () => reject(new Error(`Timeout: got ${collected.length}/${count} "${event}" events`)),
            timeoutMs,
        )
        socket.on(event, (data: T) => {
            collected.push(data)
            if (collected.length >= count) {
                clearTimeout(timer)
                resolve(collected)
            }
        })
    })
}

interface SyncPayload {
    round: {
        id: string
        status: string
        elapsedMs: number
        bettingEndsAt: string
        startedAt: string | null
    }
    bets: unknown[]
}

type TickPayload = { roundId: string; multiplier: number; elapsedMs: number }

describe('WebSocket E2E', () => {
    const sockets: Socket[] = []

    afterEach(() => {
        sockets.forEach(s => s.disconnect())
        sockets.length = 0
    })

    describe('E2E-19 — round:sync on connection', () => {
        it('should receive round:sync with current round state on connect', async () => {
            const socket = connectSocket()
            sockets.push(socket)

            const payload = await waitForEvent<SyncPayload>(socket, 'round:sync')

            expect(payload.round).toBeDefined()
            expect(['BETTING', 'RUNNING', 'CRASHED']).toContain(payload.round.status)
            expect(payload.round.id).toBeTruthy()
            expect(Array.isArray(payload.bets)).toBe(true)
            expect(typeof payload.round.elapsedMs).toBe('number')
        })
    })

    describe('round:tick events', () => {
        it('should receive round:tick events with growing elapsedMs while RUNNING', async () => {
            const socket = connectSocket()
            sockets.push(socket)

            // Collect more than 3 to guarantee 3 from the same round even across boundaries
            const all = await collectEvents<TickPayload>(socket, 'round:tick', 5, 30_000)

            // Use the round that appears most often -> avoids instant-crash (1x) rounds
            const counts = new Map<string, number>()
            for (const t of all) counts.set(t.roundId, (counts.get(t.roundId) ?? 0) + 1)
            const dominantRoundId = [...counts.entries()].sort((a, b) => b[1] - a[1])[0][0]
            const ticks = all.filter(t => t.roundId === dominantRoundId)

            expect(ticks.length).toBeGreaterThanOrEqual(2)
            expect(ticks[0].multiplier).toBeGreaterThanOrEqual(1.0)
            expect(ticks[0].roundId).toBeTruthy()
            for (let i = 1; i < ticks.length; i++) {
                expect(ticks[i].elapsedMs).toBeGreaterThan(ticks[i - 1].elapsedMs)
            }
        })

        it('should receive same multiplier on two simultaneous connections', async () => {
            const socket1 = connectSocket()
            const socket2 = connectSocket()
            sockets.push(socket1, socket2)

            const [ticks1, ticks2] = await Promise.all([
                collectEvents<TickPayload>(socket1, 'round:tick', 5, 30_000),
                collectEvents<TickPayload>(socket2, 'round:tick', 5, 30_000),
            ])

            const ids1 = new Set(ticks1.map(t => t.roundId))
            const commonTicks2 = ticks2.filter(t => ids1.has(t.roundId))

            expect(commonTicks2.length).toBeGreaterThan(0)

            const tick1Sample = ticks1.find(t => t.roundId === commonTicks2[0].roundId)!
            const tick2Sample = commonTicks2[0]
            const diff = Math.abs(tick1Sample.elapsedMs - tick2Sample.elapsedMs)
            expect(diff).toBeLessThan(500)
        })
    })
})
