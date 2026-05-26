import { useState, useEffect, useRef } from 'react'
import { cn } from '#/lib/utils'
import { ScrollArea } from '#/components/ui/scroll-area'
import { useGameStore, type BetInfo } from '#/store/game.store'
import { useAuthStore } from '#/store/auth.store'

type BetStatus = 'pending' | 'cashed' | 'lost'

function getStatus(bet: BetInfo, phase: string): BetStatus {
  if (bet.status === 'CASHED_OUT') return 'cashed'
  if (bet.cashoutMultiplier !== null && bet.cashoutMultiplier !== undefined) return 'cashed'
  if (phase === 'CRASHED' && bet.status !== 'CASHED_OUT') return 'lost'
  return 'pending'
}

const AVATAR_GRADIENTS = [
  ['#ff3df6', '#8b5cf6'],
  ['#22e1ff', '#00ff88'],
  ['#f59e0b', '#ff3355'],
  ['#8b5cf6', '#22e1ff'],
  ['#00ff88', '#22e1ff'],
  ['#ff3df6', '#f59e0b'],
]

function avatarGradient(playerId: string): string {
  const idx = playerId.charCodeAt(0) % AVATAR_GRADIENTS.length
  const [from, to] = AVATAR_GRADIENTS[idx]
  return `linear-gradient(135deg, ${from}, ${to})`
}

function shortName(playerId: string): string {
  return playerId.length > 10 ? playerId.slice(0, 10) : playerId
}

export function BetsList() {
  const { bets, phase } = useGameStore()
  const { username } = useAuthStore()
  const [newKeys, setNewKeys] = useState<Set<string>>(new Set())
  const prevLengthRef = useRef(bets.length)

  useEffect(() => {
    const prevLen = prevLengthRef.current
    if (bets.length <= prevLen) {
      prevLengthRef.current = bets.length
      return
    }
    const added = bets.slice(prevLen).map((b, i) => b.id ?? `${b.playerId}-${prevLen + i}`)
    prevLengthRef.current = bets.length
    setNewKeys((prev) => new Set([...prev, ...added]))
    const id = setTimeout(() => setNewKeys((prev) => {
      const next = new Set(prev)
      added.forEach((k) => next.delete(k))
      return next
    }), 400)
    return () => clearTimeout(id)
  }, [bets])

  const totalWagered = bets.reduce((s, b) => s + Number(b.amountInCents) / 100, 0)
  const cashedBets = bets.filter((b) => b.status === 'CASHED_OUT' || b.cashoutMultiplier != null)
  const totalPaidOut = cashedBets.reduce((s, b) => {
    if (b.payoutInCents) return s + Number(b.payoutInCents) / 100
    return s
  }, 0)

  return (
    <div className="card-glass flex flex-col h-full">

      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-border">
        <span className="flex items-center gap-2 font-mono text-[10px] tracking-[0.22em] uppercase text-text-mid">
          <span className="w-1 h-1 rounded-full bg-neon-green" style={{ boxShadow: '0 0 6px var(--neon-green)' }} />
          Round bets
          <span className="text-text-dim">· {bets.length}</span>
        </span>
        <span className="font-mono text-[10px] tracking-[0.16em] uppercase text-text-dim">
          R$ {totalWagered.toFixed(0)} pot
        </span>
      </div>

      {/* Column headers */}
      <div className="grid gap-[10px] px-[14px] py-2 font-mono text-[10px] tracking-[0.18em] uppercase text-text-dim border-b border-border [grid-template-columns:1.4fr_0.9fr_0.9fr]">
        <span>Player</span>
        <span>Bet</span>
        <span className="text-right">Status</span>
      </div>

      {/* Rows */}
      <ScrollArea className="flex-1 max-h-[520px]">
        <div className="flex flex-col">
          {bets.length === 0 ? (
            <p className="px-4 py-6 font-mono text-[11px] text-text-faint text-center">
              No bets yet this round
            </p>
          ) : (
            bets.map((bet, i) => {
              const status = getStatus(bet, phase)
              const isYou = username && bet.playerId === username
              const amountR = Number(bet.amountInCents) / 100
              const betKey = bet.id ?? `${bet.playerId}-${i}`
              return (
                <div
                  key={betKey}
                  className={cn(
                    'grid gap-[10px] items-center px-[14px] py-[10px] border-b border-border [grid-template-columns:1.4fr_0.9fr_0.9fr]',
                    status === 'cashed' && 'bg-neon-green/[0.04]',
                    newKeys.has(betKey) && 'animate-bet-enter',
                  )}
                >
                  {/* Player */}
                  <div className="flex items-center gap-2 min-w-0">
                    <span
                      className="w-6 h-6 rounded-full grid place-items-center text-white text-[10px] font-bold shrink-0"
                      style={{ background: avatarGradient(bet.playerId) }}
                    >
                      {bet.playerId[0].toUpperCase()}
                    </span>
                    <span className={cn(
                      'text-[12px] font-medium truncate',
                      isYou && 'text-neon-amber font-semibold',
                      !isYou && status === 'cashed' && 'text-neon-green',
                      !isYou && status === 'lost' && 'text-text-dim',
                      !isYou && status === 'pending' && 'text-text-hi',
                    )}>
                      {isYou ? 'you' : shortName(bet.playerId)}
                    </span>
                  </div>

                  {/* Bet amount */}
                  <span className={cn('font-mono text-[12px] font-medium text-text-body', status === 'lost' && 'line-through text-text-dim')}>
                    R$ {amountR.toFixed(2)}
                  </span>

                  {/* Status */}
                  <span
                    className={cn(
                      'font-mono text-[12px] font-semibold tracking-[0.02em] text-right',
                      status === 'pending' && 'text-text-mid',
                      status === 'lost' && 'text-neon-red opacity-70',
                      status === 'cashed' && 'text-neon-green',
                    )}
                    style={status === 'cashed' ? { textShadow: '0 0 8px rgba(0,255,136,0.4)' } : undefined}
                  >
                    {status === 'cashed' && `${bet.cashoutMultiplier?.toFixed(2)}x`}
                    {status === 'lost' && 'Lost'}
                    {status === 'pending' && '—'}
                  </span>
                </div>
              )
            })
          )}
        </div>
      </ScrollArea>

      {/* Footer */}
      <div className="grid grid-cols-2 border-t border-border bg-black/25 mt-auto">
        <div className="px-[14px] py-3">
          <p className="font-mono text-[10px] tracking-[0.18em] uppercase text-text-dim mb-1">Wagered</p>
          <p className="font-mono text-[16px] font-semibold text-text-hi">R$ {totalWagered.toFixed(2)}</p>
        </div>
        <div className="px-[14px] py-3 border-l border-border">
          <p className="font-mono text-[10px] tracking-[0.18em] uppercase text-text-dim mb-1">
            Paid · {cashedBets.length}
          </p>
          <p className={cn('font-mono text-[16px] font-semibold', cashedBets.length > 0 ? 'text-neon-green' : 'text-text-hi')}>
            R$ {totalPaidOut.toFixed(2)}
          </p>
        </div>
      </div>

    </div>
  )
}
