import { cn } from '#/lib/utils'
import { ScrollArea } from '#/components/ui/scroll-area'
import type { GamePhase } from './CrashGraph'

interface Bet {
  id: string
  username: string
  colorId: number
  amount: number
  cashedAt: number | null
  you?: boolean
}

type BetStatus = 'pending' | 'cashed' | 'lost'

function getStatus(bet: Bet, phase: GamePhase): BetStatus {
  if (bet.cashedAt !== null) return 'cashed'
  if (phase === 'crashed') return 'lost'
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

function avatarGradient(colorId: number): string {
  const [from, to] = AVATAR_GRADIENTS[colorId % AVATAR_GRADIENTS.length]
  return `linear-gradient(135deg, ${from}, ${to})`
}

// Dados fictícios para demo
const DEMO_BETS: Bet[] = [
  { id: '1', username: 'you',      colorId: 0, amount: 50.00, cashedAt: 2.10, you: true },
  { id: '2', username: 'Nova_X',   colorId: 1, amount: 25.00, cashedAt: null },
  { id: '3', username: 'bicaoBR',  colorId: 2, amount:  5.00, cashedAt: 1.54 },
  { id: '4', username: 'luckyG',   colorId: 3, amount: 100.00,cashedAt: null },
  { id: '5', username: 'xpto99',   colorId: 4, amount: 10.00, cashedAt: 3.20 },
  { id: '6', username: 'turbobet', colorId: 5, amount: 75.00, cashedAt: null },
  { id: '7', username: 'w1nner',   colorId: 1, amount: 20.00, cashedAt: null },
  { id: '8', username: 'crashkng', colorId: 2, amount: 50.00, cashedAt: 1.80 },
  { id: '9', username: 'joao_rj',  colorId: 3, amount: 15.00, cashedAt: null },
  { id:'10', username: 'aposta1',  colorId: 4, amount: 30.00, cashedAt: null },
  { id:'11', username: 'megabr',   colorId: 5, amount: 200.00,cashedAt: 2.47 },
  { id:'12', username: 'zebet',    colorId: 0, amount:  8.00, cashedAt: null },
]

interface BetsListProps {
  phase?: GamePhase
  bets?: Bet[]
}

export function BetsList({ phase = 'running', bets = DEMO_BETS }: BetsListProps) {
  const totalWagered = bets.reduce((s, b) => s + b.amount, 0)
  const cashedBets = bets.filter((b) => b.cashedAt !== null)
  const totalPaidOut = cashedBets.reduce((s, b) => s + b.amount * (b.cashedAt ?? 0), 0)

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
        <div className="bets-scroll flex flex-col">
          {bets.map((bet) => {
            const status = getStatus(bet, phase)
            return (
              <div
                key={bet.id}
                className={cn(
                  'grid gap-[10px] items-center px-[14px] py-[10px] border-b border-border [grid-template-columns:1.4fr_0.9fr_0.9fr]',
                  status === 'cashed' && 'bg-neon-green/[0.04]',
                )}
              >
                {/* Player */}
                <div className="flex items-center gap-2 min-w-0">
                  <span
                    className="w-6 h-6 rounded-full grid place-items-center text-white text-[10px] font-bold shrink-0"
                    style={{ background: avatarGradient(bet.colorId) }}
                  >
                    {bet.username[0].toUpperCase()}
                  </span>
                  <span
                    className={cn(
                      'text-[12px] font-medium truncate',
                      bet.you         && 'text-neon-amber font-semibold',
                      !bet.you && status === 'cashed' && 'text-neon-green',
                      !bet.you && status === 'lost'   && 'text-text-dim',
                      !bet.you && status === 'pending' && 'text-text-hi',
                    )}
                  >
                    {bet.you ? 'you' : bet.username}
                  </span>
                </div>

                {/* Bet amount */}
                <span
                  className={cn(
                    'font-mono text-[12px] font-medium text-text-body',
                    status === 'lost' && 'line-through text-text-dim',
                  )}
                >
                  R$ {bet.amount.toFixed(2)}
                </span>

                {/* Status */}
                <span
                  className={cn(
                    'font-mono text-[12px] font-semibold tracking-[0.02em] text-right',
                    status === 'pending' && 'text-text-mid',
                    status === 'lost'    && 'text-neon-red opacity-70',
                    status === 'cashed'  && 'text-neon-green',
                  )}
                  style={status === 'cashed' ? { textShadow: '0 0 8px rgba(0,255,136,0.4)' } : undefined}
                >
                  {status === 'cashed'  && `${bet.cashedAt!.toFixed(2)}x`}
                  {status === 'lost'    && 'Lost'}
                  {status === 'pending' && '—'}
                </span>
              </div>
            )
          })}
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
          <p
            className={cn(
              'font-mono text-[16px] font-semibold',
              cashedBets.length > 0 ? 'text-neon-green' : 'text-text-hi',
            )}
          >
            R$ {totalPaidOut.toFixed(2)}
          </p>
        </div>
      </div>

    </div>
  )
}
