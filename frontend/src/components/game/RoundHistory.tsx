import { useState } from 'react'
import { cn } from '#/lib/utils'
import { VerifyModal, type RoundRecord } from './VerifyModal'

const DEMO_HISTORY: RoundRecord[] = [
  { id: 89432, crash: 1.24, serverSeedHash: 'a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2', serverSeed: 'deadbeef01234567deadbeef01234567deadbeef01234567deadbeef01234567', clientSeed: 'player-seed-round-89432', nonce: 1, timeAgo: '2 min ago', prevId: 89431, prevHash: 'prev000hash', nextId: 89433, nextHash: 'next000hash' },
  { id: 89431, crash: 3.81, serverSeedHash: 'b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3', serverSeed: 'feedface01234567feedface01234567feedface01234567feedface01234567', clientSeed: 'player-seed-round-89431', nonce: 2, timeAgo: '4 min ago' },
  { id: 89430, crash: 1.73, serverSeedHash: 'c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4', serverSeed: 'cafebabe01234567cafebabe01234567cafebabe01234567cafebabe01234567', clientSeed: 'player-seed-round-89430', nonce: 3, timeAgo: '6 min ago' },
  { id: 89429, crash: 8.40, serverSeedHash: 'd4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5', serverSeed: 'baddcafe01234567baddcafe01234567baddcafe01234567baddcafe01234567', clientSeed: 'player-seed-round-89429', nonce: 4, timeAgo: '8 min ago' },
  { id: 89428, crash: 1.01, serverSeedHash: 'e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6', serverSeed: 'face000001234567face000001234567face000001234567face000001234567', clientSeed: 'player-seed-round-89428', nonce: 5, timeAgo: '10 min ago' },
  { id: 89427, crash: 2.47, serverSeedHash: 'f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1', serverSeed: 'beef000001234567beef000001234567beef000001234567beef000001234567', clientSeed: 'player-seed-round-89427', nonce: 6, timeAgo: '12 min ago' },
  { id: 89426, crash: 1.38, serverSeedHash: 'a2b3c4d5e6f7a2b3c4d5e6f7a2b3c4d5e6f7a2b3c4d5e6f7a2b3c4d5e6f7a2b3', serverSeed: 'dead000001234567dead000001234567dead000001234567dead000001234567', clientSeed: 'player-seed-round-89426', nonce: 7, timeAgo: '14 min ago' },
  { id: 89425, crash: 5.12, serverSeedHash: 'b3c4d5e6f7a2b3c4d5e6f7a2b3c4d5e6f7a2b3c4d5e6f7a2b3c4d5e6f7a2b3c4', serverSeed: 'feed000001234567feed000001234567feed000001234567feed000001234567', clientSeed: 'player-seed-round-89425', nonce: 8, timeAgo: '16 min ago' },
  { id: 89424, crash: 1.89, serverSeedHash: 'c4d5e6f7a2b3c4d5e6f7a2b3c4d5e6f7a2b3c4d5e6f7a2b3c4d5e6f7a2b3c4d5', serverSeed: 'cafe000001234567cafe000001234567cafe000001234567cafe000001234567', clientSeed: 'player-seed-round-89424', nonce: 9, timeAgo: '18 min ago' },
  { id: 89423, crash: 12.30, serverSeedHash: 'd5e6f7a2b3c4d5e6f7a2b3c4d5e6f7a2b3c4d5e6f7a2b3c4d5e6f7a2b3c4d5e6', serverSeed: 'babe000001234567babe000001234567babe000001234567babe000001234567', clientSeed: 'player-seed-round-89423', nonce: 10, timeAgo: '20 min ago' },
  { id: 89422, crash: 1.11, serverSeedHash: 'e6f7a2b3c4d5e6f7a2b3c4d5e6f7a2b3c4d5e6f7a2b3c4d5e6f7a2b3c4d5e6f7', serverSeed: 'badd000001234567badd000001234567badd000001234567badd000001234567', clientSeed: 'player-seed-round-89422', nonce: 11, timeAgo: '22 min ago' },
  { id: 89421, crash: 2.05, serverSeedHash: 'f7a2b3c4d5e6f7a2b3c4d5e6f7a2b3c4d5e6f7a2b3c4d5e6f7a2b3c4d5e6f7a2', serverSeed: 'face100001234567face100001234567face100001234567face100001234567', clientSeed: 'player-seed-round-89421', nonce: 12, timeAgo: '24 min ago' },
  { id: 89420, crash: 1.55, serverSeedHash: 'a3b4c5d6e7f8a3b4c5d6e7f8a3b4c5d6e7f8a3b4c5d6e7f8a3b4c5d6e7f8a3b4', serverSeed: 'beef100001234567beef100001234567beef100001234567beef100001234567', clientSeed: 'player-seed-round-89420', nonce: 13, timeAgo: '26 min ago' },
  { id: 89419, crash: 4.66, serverSeedHash: 'b4c5d6e7f8a3b4c5d6e7f8a3b4c5d6e7f8a3b4c5d6e7f8a3b4c5d6e7f8a3b4c5', serverSeed: 'dead100001234567dead100001234567dead100001234567dead100001234567', clientSeed: 'player-seed-round-89419', nonce: 14, timeAgo: '28 min ago' },
  { id: 89418, crash: 1.29, serverSeedHash: 'c5d6e7f8a3b4c5d6e7f8a3b4c5d6e7f8a3b4c5d6e7f8a3b4c5d6e7f8a3b4c5d6', serverSeed: 'feed100001234567feed100001234567feed100001234567feed100001234567', clientSeed: 'player-seed-round-89418', nonce: 15, timeAgo: '30 min ago' },
  { id: 89417, crash: 3.09, serverSeedHash: 'd6e7f8a3b4c5d6e7f8a3b4c5d6e7f8a3b4c5d6e7f8a3b4c5d6e7f8a3b4c5d6e7', serverSeed: 'cafe100001234567cafe100001234567cafe100001234567cafe100001234567', clientSeed: 'player-seed-round-89417', nonce: 16, timeAgo: '32 min ago' },
  { id: 89416, crash: 1.47, serverSeedHash: 'e7f8a3b4c5d6e7f8a3b4c5d6e7f8a3b4c5d6e7f8a3b4c5d6e7f8a3b4c5d6e7f8', serverSeed: 'babe100001234567babe100001234567babe100001234567babe100001234567', clientSeed: 'player-seed-round-89416', nonce: 17, timeAgo: '34 min ago' },
  { id: 89415, crash: 7.77, serverSeedHash: 'f8a3b4c5d6e7f8a3b4c5d6e7f8a3b4c5d6e7f8a3b4c5d6e7f8a3b4c5d6e7f8a3', serverSeed: 'badd100001234567badd100001234567badd100001234567badd100001234567', clientSeed: 'player-seed-round-89415', nonce: 18, timeAgo: '36 min ago' },
  { id: 89414, crash: 1.62, serverSeedHash: 'a4b5c6d7e8f9a4b5c6d7e8f9a4b5c6d7e8f9a4b5c6d7e8f9a4b5c6d7e8f9a4b5', serverSeed: 'face200001234567face200001234567face200001234567face200001234567', clientSeed: 'player-seed-round-89414', nonce: 19, timeAgo: '38 min ago' },
  { id: 89413, crash: 2.88, serverSeedHash: 'b5c6d7e8f9a4b5c6d7e8f9a4b5c6d7e8f9a4b5c6d7e8f9a4b5c6d7e8f9a4b5c6', serverSeed: 'beef200001234567beef200001234567beef200001234567beef200001234567', clientSeed: 'player-seed-round-89413', nonce: 20, timeAgo: '40 min ago' },
]

interface RoundHistoryProps {
  currentRoundId?: number
  history?: RoundRecord[]
}

function pillStyle(crash: number) {
  if (crash < 1.5) return {
    base: 'border-neon-red/30 text-neon-red bg-neon-red/[0.07] hover:bg-neon-red/[0.14] hover:border-neon-red/60',
    active: 'border-neon-red/70 bg-neon-red/[0.18] ring-1 ring-neon-red/30',
  }
  if (crash < 2) return {
    base: 'border-neon-amber/30 text-neon-amber bg-neon-amber/[0.07] hover:bg-neon-amber/[0.14] hover:border-neon-amber/60',
    active: 'border-neon-amber/70 bg-neon-amber/[0.18] ring-1 ring-neon-amber/30',
  }
  return {
    base: 'border-neon-green/30 text-neon-green bg-neon-green/[0.07] hover:bg-neon-green/[0.14] hover:border-neon-green/60',
    active: 'border-neon-green/70 bg-neon-green/[0.18] ring-1 ring-neon-green/30',
  }
}

export function RoundHistory({
  currentRoundId,
  history = DEMO_HISTORY,
}: RoundHistoryProps) {
  const [selected, setSelected] = useState<RoundRecord | null>(null)

  return (
    <>
      <div className="card-glass px-4 py-3 flex items-center gap-3">

        {/* Label */}
        <div className="shrink-0 flex flex-col gap-0.5">
          <span className="font-mono text-[10px] tracking-[0.22em] uppercase text-text-dim whitespace-nowrap">
            Last rounds
          </span>
          <span className="font-mono text-[9px] text-text-faint tracking-[0.1em] whitespace-nowrap">
            Click to verify
          </span>
        </div>

        <div className="w-px h-7 bg-border shrink-0" />

        {/* Pills */}
        <div className="flex gap-1.5 overflow-x-auto scrollbar-none min-w-0 flex-1 py-0.5">
          {history.map((r) => {
            const style = pillStyle(r.crash)
            const isCurrent = r.id === currentRoundId
            return (
              <button
                key={r.id}
                onClick={() => setSelected(r)}
                className={cn(
                  'shrink-0 h-7 px-2.5 rounded-md border font-mono text-[11px] font-semibold',
                  'transition-colors duration-100 tracking-[0.03em]',
                  style.base,
                  isCurrent && style.active,
                )}
              >
                {r.crash.toFixed(2)}x
              </button>
            )
          })}
        </div>
      </div>

      <VerifyModal round={selected} onClose={() => setSelected(null)} />
    </>
  )
}
