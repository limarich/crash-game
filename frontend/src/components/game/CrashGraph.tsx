import { useMemo, useState, useEffect } from 'react'
import { cn } from '#/lib/utils'
import { SegDisplay } from './SegDisplay'
import { useGameStore } from '#/store/game.store'

export type GamePhase = 'betting' | 'running' | 'crashed'

const W = 1000
const H = 400
const BETTING_PHASE_MS = 10_000

function yFor(m: number): number {
  const y = H - 20 - (Math.log(Math.max(m, 1)) / Math.log(8)) * (H - 60)
  return Math.max(20, Math.min(H - 20, y))
}

function buildCurve(multiplier: number) {
  const m = Math.max(1, multiplier)
  const t = Math.log(m) / Math.log(1.07)
  const xEnd = Math.min(W - 40, 60 + t * 48)
  const yEnd = yFor(m)

  const pts: [number, number][] = Array.from({ length: 61 }, (_, i) => {
    const f = i / 60
    return [60 + f * (xEnd - 60), yFor(Math.pow(m, f))]
  })

  const path = pts.map(([x, y], i) => `${i === 0 ? 'M' : 'L'} ${x.toFixed(1)} ${y.toFixed(1)}`).join(' ')
  const areaPath = `${path} L ${xEnd.toFixed(1)} ${H - 20} L 60 ${H - 20} Z`

  return { path, areaPath, xEnd, yEnd }
}

export function CrashGraph() {
  const { phase: serverPhase, multiplier, bettingEndsAt, serverSeedHash, crashPoint, currentRound } = useGameStore()

  const phase: GamePhase =
    serverPhase === 'BETTING' ? 'betting'
      : serverPhase === 'RUNNING' ? 'running'
        : serverPhase === 'CRASHED' ? 'crashed'
          : 'betting'

  const { path, areaPath, xEnd, yEnd } = useMemo(() => buildCurve(multiplier), [multiplier])
  const stroke = phase === 'crashed' ? '#ff3355' : '#00ff88'
  const fillId = phase === 'crashed' ? 'fillRed' : 'fillGreen'

  const roundId = currentRound?.nonce ?? '—'
  const seedHash = serverSeedHash ?? ''

  const [now, setNow] = useState(() => Date.now())
  const [flashing, setFlashing] = useState(false)

  useEffect(() => {
    if (phase !== 'betting') return
    const id = setInterval(() => setNow(Date.now()), 100)
    return () => clearInterval(id)
  }, [phase])

  useEffect(() => {
    if (phase !== 'crashed') return
    setFlashing(true)
    const id = setTimeout(() => setFlashing(false), 600)
    return () => clearTimeout(id)
  }, [phase])

  const bettingEndsMs = bettingEndsAt ? bettingEndsAt.getTime() : now + BETTING_PHASE_MS
  const bettingSecondsLeft = Math.max(0, (bettingEndsMs - now) / 1000)
  const bettingProgress = Math.max(0, Math.min(1, 1 - bettingSecondsLeft / (BETTING_PHASE_MS / 1000)))

  const stateLabel = { betting: 'Place bets', running: 'Round live', crashed: 'Round over' }[phase]
  const crashLabel = {
    betting: 'Round starts soon',
    running: 'Multiplier rising',
    crashed: `Busted at ${(crashPoint ?? multiplier).toFixed(2)}x`,
  }[phase]

  function copyHash() {
    if (seedHash) navigator.clipboard.writeText(seedHash)
  }

  return (
    <div className="card-glass flex flex-col min-h-[480px]">
      <div className="crash-stage relative flex-1 min-h-[380px] overflow-hidden rounded-lg" data-state={phase}>

        {/* Phase background overlays  */}
        <div
          className="crash-stage-overlay absolute inset-0 z-[1]"
          style={{
            opacity: phase === 'running' ? 1 : 0,
            background: 'radial-gradient(800px 400px at 50% 100%, rgba(0,255,136,0.09), transparent 70%)',
          }}
        />
        <div
          className="crash-stage-overlay absolute inset-0 z-[1]"
          style={{
            opacity: phase === 'crashed' ? 1 : 0,
            background: 'radial-gradient(800px 500px at 50% 50%, rgba(255,51,85,0.22), transparent 70%), linear-gradient(180deg, rgba(40,5,15,0.5), rgba(20,0,8,0.75))',
          }}
        />

        {/* Crash flash overlay */}
        <div
          className={cn(
            'absolute inset-0 z-20 pointer-events-none',
            flashing ? 'animate-crash-flash' : 'opacity-0',
          )}
          style={{ background: 'radial-gradient(ellipse at 50% 40%, rgba(255,51,85,0.7) 0%, rgba(255,51,85,0.3) 50%, transparent 80%)' }}
        />

        <div className="crash-grid absolute inset-0 pointer-events-none" />

        {/* Y-Axis */}
        <div className="absolute left-3 top-[70px] bottom-[130px] z-[3] flex flex-col-reverse justify-between pointer-events-none">
          {['1.00x', '1.5x', '2x', '4x', '8x'].map((label) => (
            <span
              key={label}
              className="font-mono text-[10px] tracking-[0.04em] text-text-dim px-1 rounded-sm"
              style={{ background: 'rgba(6,7,18,0.6)' }}
            >
              {label}
            </span>
          ))}
        </div>

        {/* Curve SVG */}
        <svg className="absolute inset-0 w-full h-full" viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none">
          <defs>
            <linearGradient id="fillGreen" x1="0" x2="0" y1="0" y2="1">
              <stop offset="0%" stopColor="#00ff88" stopOpacity="0.55" />
              <stop offset="50%" stopColor="#00ff88" stopOpacity="0.18" />
              <stop offset="100%" stopColor="#00ff88" stopOpacity="0" />
            </linearGradient>
            <linearGradient id="fillRed" x1="0" x2="0" y1="0" y2="1">
              <stop offset="0%" stopColor="#ff3355" stopOpacity="0.55" />
              <stop offset="50%" stopColor="#ff3355" stopOpacity="0.18" />
              <stop offset="100%" stopColor="#ff3355" stopOpacity="0" />
            </linearGradient>
            <filter id="curveGlow" x="-20%" y="-20%" width="140%" height="140%">
              <feGaussianBlur stdDeviation="3" result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
          </defs>

          <line x1="60" y1={H - 20} x2={W - 20} y2={H - 20} stroke="rgba(120,130,200,0.18)" strokeWidth="1" strokeDasharray="2 4" />

          {phase === 'betting' && (
            <line x1="60" y1={H - 20} x2={W - 60} y2={H - 20} stroke="#5a607e" strokeWidth="2" strokeDasharray="6 6" opacity="0.7" />
          )}

          {phase !== 'betting' && (
            <>
              <path d={areaPath} fill={`url(#${fillId})`} />
              <path d={path} fill="none" stroke={stroke} strokeWidth="3" strokeLinecap="round" filter="url(#curveGlow)" />
            </>
          )}

          {phase === 'running' && (
            <circle cx={xEnd} cy={yEnd} r="5" fill="#00ff88" filter="url(#curveGlow)" />
          )}

          {phase === 'crashed' && (
            <g>
              <circle cx={xEnd} cy={yEnd} r="6" fill="#ff3355" filter="url(#curveGlow)" />
              <line x1={xEnd - 14} y1={yEnd - 14} x2={xEnd + 14} y2={yEnd + 14} stroke="#ff3355" strokeWidth="3" />
              <line x1={xEnd - 14} y1={yEnd + 14} x2={xEnd + 14} y2={yEnd - 14} stroke="#ff3355" strokeWidth="3" />
            </g>
          )}
        </svg>

        {/* State Badge */}
        <div className={cn(
          'absolute top-4 left-4 z-[4] flex items-center gap-2 px-3 py-1.5 rounded-pill',
          'border backdrop-blur-sm bg-black/50',
          'font-mono text-[10px] tracking-[0.2em] uppercase',
          phase === 'betting' && 'border-neon-amber/50 text-neon-amber',
          phase === 'running' && 'border-neon-green/50 text-neon-green',
          phase === 'crashed' && 'border-neon-red/60 text-neon-red',
        )}>
          <span className={cn(
            'w-2 h-2 rounded-full shrink-0',
            phase === 'betting' && 'bg-neon-amber shadow-[0_0_8px_var(--neon-amber)]',
            phase === 'running' && 'bg-neon-green shadow-[0_0_8px_var(--neon-green)]',
            phase === 'crashed' && 'bg-neon-red shadow-[0_0_8px_var(--neon-red)]',
          )} />
          {stateLabel}
        </div>

        {/* Round ID */}
        <div className="absolute top-4 right-4 z-[4] text-right font-mono text-[10px] tracking-[0.18em] uppercase text-text-dim">
          <strong className="block text-[12px] tracking-[0.06em] font-semibold text-text-body">#{roundId}</strong>
          <span>nonce</span>
        </div>

        {/* Multiplier */}
        <div className="absolute inset-0 z-[3] grid place-items-center text-center pointer-events-none">
          <div>
            {phase === 'crashed' && (
              <p className="font-display font-extrabold text-[22px] tracking-[0.4em] uppercase text-neon-red mb-1"
                style={{ textShadow: '0 0 18px rgba(255,51,85,0.7)' }}>
                Crashed
              </p>
            )}
            <SegDisplay value={multiplier} />
            <p className={cn(
              'mt-2 font-mono text-[11px] tracking-[0.28em] uppercase',
              phase === 'betting' && 'text-text-mid',
              phase === 'running' && 'text-neon-green',
              phase === 'crashed' && 'text-neon-red',
            )}>
              {crashLabel}
            </p>
          </div>
        </div>

        {/* Countdown */}
        {phase === 'betting' && (
          <div className="absolute left-4 right-4 bottom-[60px] z-[5]">
            <div className="flex justify-between items-center mb-1.5 font-mono text-[10px] tracking-[0.18em] uppercase text-text-mid">
              <span>Betting closes in</span>
              <strong className="text-neon-amber font-semibold">{bettingSecondsLeft.toFixed(1)}s</strong>
            </div>
            <div className="relative h-1 rounded-full overflow-hidden bg-white/[0.06]">
              <div
                className="absolute inset-0 origin-left transition-transform duration-100"
                style={{
                  transform: `scaleX(${bettingProgress})`,
                  background: 'linear-gradient(90deg, var(--neon-amber), var(--neon-amber-soft))',
                  boxShadow: '0 0 12px rgba(245,158,11,0.6)',
                }}
              />
            </div>
          </div>
        )}

        {/* Seed hash */}
        {phase === 'betting' && seedHash && (
          <div className="absolute bottom-4 left-4 right-4 z-[4] flex items-center gap-3 px-3 py-2 rounded-md border border-border bg-black/45 backdrop-blur-sm">
            <span className="font-mono text-[9px] tracking-[0.22em] uppercase text-text-dim shrink-0">
              Server seed hash
            </span>
            <span className="font-mono text-[11px] text-neon-cyan tracking-[0.04em] truncate min-w-0 flex-1">
              {seedHash}
            </span>
            <button
              onClick={copyHash}
              className="font-mono text-[10px] tracking-[0.12em] uppercase text-text-mid hover:text-neon-cyan transition-colors duration-150 shrink-0"
            >
              Copy
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
