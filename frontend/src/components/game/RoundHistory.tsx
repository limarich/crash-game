import { useState, useEffect } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { cn } from '#/lib/utils'
import { VerifyModal, type RoundRecord } from './VerifyModal'
import { getRoundHistory, verifyRound } from '#/lib/api'
import { useGameStore } from '#/store/game.store'

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

export function RoundHistory() {
  const { phase, currentRound } = useGameStore()
  const [selectedId, setSelectedId] = useState<string | null>(null)

  const queryClient = useQueryClient()

  const { data: history = [] } = useQuery({
    queryKey: ['round-history'],
    queryFn: () => getRoundHistory(1, 20),
    refetchOnWindowFocus: false,
  })

  useEffect(() => {
    if (phase === 'BETTING') {
      queryClient.invalidateQueries({ queryKey: ['round-history'] })
    }
  }, [phase])

  const { data: verifyData, isFetching: verifying } = useQuery({
    queryKey: ['verify', selectedId],
    queryFn: () => verifyRound(selectedId!),
    enabled: !!selectedId,
    staleTime: Infinity, // crash results never change
  })

  const selected: RoundRecord | null = verifyData
    ? {
        id: history.find((r) => r.id === selectedId)?.nonce ?? 0,
        crash: verifyData.crashPoint ?? 0,
        serverSeedHash: verifyData.serverSeedHash,
        serverSeed: verifyData.serverSeed ?? undefined,
        clientSeed: verifyData.clientSeed,
        nonce: verifyData.nonce,
        timeAgo: '',
        prevHash: verifyData.chain?.nextServerSeedHash,
      }
    : null

  if (history.length === 0) return null

  return (
    <>
      <div className="card-glass px-4 py-3 flex items-center gap-3">
        <div className="shrink-0 flex flex-col gap-0.5">
          <span className="font-mono text-[10px] tracking-[0.22em] uppercase text-text-dim whitespace-nowrap">
            Last rounds
          </span>
          <span className="font-mono text-[9px] text-text-faint tracking-[0.1em] whitespace-nowrap">
            Click to verify
          </span>
        </div>

        <div className="w-px h-7 bg-border shrink-0" />

        <div className="flex gap-1.5 overflow-x-auto scrollbar-none min-w-0 flex-1 py-0.5">
          {history.map((r) => {
            const crash = r.crashPoint ?? 0
            const style = pillStyle(crash)
            const isCurrent = r.id === currentRound?.id
            const isLoading = verifying && selectedId === r.id
            return (
              <button
                key={r.id}
                onClick={() => setSelectedId(r.id)}
                disabled={isLoading}
                className={cn(
                  'shrink-0 h-7 px-2.5 rounded-md border font-mono text-[11px] font-semibold',
                  'transition-colors duration-100 tracking-[0.03em]',
                  style.base,
                  isCurrent && style.active,
                  isLoading && 'opacity-50',
                )}
              >
                {crash.toFixed(2)}x
              </button>
            )
          })}
        </div>
      </div>

      <VerifyModal
        round={selected}
        onClose={() => setSelectedId(null)}
      />
    </>
  )
}
