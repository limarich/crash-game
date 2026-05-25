import { useState } from 'react'
import { Switch } from '#/components/ui/switch'
import { cn } from '#/lib/utils'
import type { GamePhase } from './CrashGraph'

const MIN_BET = 1
const MAX_BET = 1000
const CHIPS = [1, 5, 10, 50, 100]

interface BettingPanelProps {
  phase?: GamePhase
  multiplier?: number
  balance?: number
  username?: string
}

export function BettingPanel({
  phase = 'betting',
  multiplier = 1.0,
  balance = 250.0,
  username = 'you',
}: BettingPanelProps) {
  const [betAmount, setBetAmount] = useState(10)
  const [rawInput, setRawInput] = useState('10.00')
  const [inputError, setInputError] = useState(false)

  const [autoCashoutEnabled, setAutoCashoutEnabled] = useState(false)
  const [autoCashout, setAutoCashout] = useState(2.0)
  const [rawAutoInput, setRawAutoInput] = useState('2.00')

  const [hasBet, setHasBet] = useState(false)

  const potentialPayout = betAmount * multiplier
  const autoPayout = betAmount * autoCashout

  function clampBet(v: number): number {
    return Math.min(MAX_BET, Math.max(MIN_BET, Math.round(v * 100) / 100))
  }

  function applyBet(v: number) {
    const clamped = clampBet(v)
    setBetAmount(clamped)
    setRawInput(clamped.toFixed(2))
    setInputError(false)
  }

  function handleInputChange(val: string) {
    setRawInput(val)
    const n = parseFloat(val)
    if (isNaN(n)) {
      setInputError(true)
      return
    }
    if (n < MIN_BET || n > MAX_BET) {
      setInputError(true)
      setBetAmount(clampBet(n))
    } else {
      setInputError(false)
      setBetAmount(clampBet(n))
    }
  }

  function handleInputBlur() {
    applyBet(betAmount)
  }

  function adjust(delta: number) {
    applyBet(betAmount + delta)
  }

  function handleAutoInputChange(val: string) {
    setRawAutoInput(val)
    const n = parseFloat(val)
    if (!isNaN(n) && n >= 1.01) {
      setAutoCashout(Math.round(n * 100) / 100)
    }
  }

  function handleAutoInputBlur() {
    const clamped = Math.max(1.01, Math.round(autoCashout * 100) / 100)
    setAutoCashout(clamped)
    setRawAutoInput(clamped.toFixed(2))
  }

  const canBet = phase === 'betting' && !hasBet
  const canCashout = phase === 'running' && hasBet

  const isLocked = phase !== 'betting'

  return (
    <div className="flex flex-col gap-3 h-full">

      {/* Balance card */}
      <div className="card-glass ring-1 ring-neon-amber/20 px-4 py-4">
        <div className="flex items-center justify-between mb-2">
          <span className="font-mono text-[10px] tracking-[0.22em] uppercase text-text-dim">Balance</span>
          <span className="font-mono text-[10px] text-text-dim">@{username}</span>
        </div>
        <p
          className="font-mono text-[28px] font-bold text-neon-amber leading-none"
          style={{ textShadow: '0 0 18px rgba(245,158,11,0.5), 0 0 4px rgba(245,158,11,0.8)' }}
        >
          <span className="text-[16px] font-normal opacity-60 mr-1">R$</span>
          {balance.toFixed(2)}
        </p>
        <p className="mt-2 font-mono text-[10px] text-neon-green-soft tracking-[0.06em]">
          +R$ 12.40 today
        </p>
      </div>

      {/* Bet controls card */}
      <div className="card-glass flex flex-col flex-1 min-h-0">

        {/* Card header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-border">
          <span className="font-mono text-[10px] tracking-[0.22em] uppercase text-text-mid">
            Bet amount
          </span>
          <span
            className={cn(
              'font-mono text-[10px] tracking-[0.14em] uppercase',
              isLocked ? 'text-text-dim' : 'text-neon-green',
            )}
          >
            {isLocked ? 'Locked' : 'Open'}
          </span>
        </div>

        <div className="flex flex-col gap-3 px-4 py-4 flex-1">

          {/* Amount input row */}
          <div className="flex items-center gap-2">
            <button
              onClick={() => adjust(-1)}
              disabled={isLocked}
              aria-label="Decrease"
              className={cn(
                'w-9 h-9 shrink-0 rounded-md border font-mono text-[18px] font-light',
                'flex items-center justify-center transition-colors duration-150',
                isLocked
                  ? 'border-border text-text-faint cursor-not-allowed'
                  : 'border-border-strong text-text-mid hover:border-neon-green/40 hover:text-neon-green active:scale-95',
              )}
            >
              −
            </button>

            <div
              className={cn(
                'flex-1 flex items-center gap-1.5 rounded-md border px-3 h-9 transition-colors duration-150',
                inputError
                  ? 'border-neon-red/60 bg-neon-red/[0.05]'
                  : isLocked
                    ? 'border-border bg-white/[0.02]'
                    : 'border-border-strong bg-white/[0.03] focus-within:border-neon-green/50',
              )}
            >
              <span className="font-mono text-[11px] text-text-dim shrink-0">R$</span>
              <input
                type="number"
                min={MIN_BET}
                max={MAX_BET}
                step="1"
                value={rawInput}
                disabled={isLocked}
                onChange={(e) => handleInputChange(e.target.value)}
                onBlur={handleInputBlur}
                className={cn(
                  'flex-1 bg-transparent font-mono text-[14px] font-medium text-right',
                  'focus:outline-none min-w-0',
                  inputError ? 'text-neon-red' : isLocked ? 'text-text-dim' : 'text-text-hi',
                  '[appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none',
                )}
              />
            </div>

            <button
              onClick={() => adjust(1)}
              disabled={isLocked}
              aria-label="Increase"
              className={cn(
                'w-9 h-9 shrink-0 rounded-md border font-mono text-[18px] font-light',
                'flex items-center justify-center transition-colors duration-150',
                isLocked
                  ? 'border-border text-text-faint cursor-not-allowed'
                  : 'border-border-strong text-text-mid hover:border-neon-green/40 hover:text-neon-green active:scale-95',
              )}
            >
              +
            </button>
          </div>

          {inputError && (
            <p className="font-mono text-[10px] text-neon-red tracking-[0.06em]">
              Min R$1 · Max R$1,000
            </p>
          )}

          {/* Quick chips */}
          <div className="grid grid-cols-5 gap-1.5">
            {CHIPS.map((c) => (
              <button
                key={c}
                disabled={isLocked}
                onClick={() => applyBet(c)}
                className={cn(
                  'h-7 rounded-md border font-mono text-[11px] font-medium transition-colors duration-150',
                  isLocked
                    ? 'border-border text-text-faint cursor-not-allowed'
                    : betAmount === c
                      ? 'border-neon-green/60 bg-neon-green/10 text-neon-green'
                      : 'border-border-strong text-text-dim hover:border-neon-green/30 hover:text-text-mid',
                )}
              >
                {c < 100 ? `R$${c}` : '100'}
              </button>
            ))}
          </div>

          {/* Primary action button */}
          <PrimaryButton
            phase={phase}
            hasBet={hasBet}
            betAmount={betAmount}
            multiplier={multiplier}
            potentialPayout={potentialPayout}
            canBet={canBet}
            canCashout={canCashout}
            onBet={() => setHasBet(true)}
            onCashout={() => setHasBet(false)}
          />

          {/* Potential payout hint */}
          {phase === 'running' && hasBet && (
            <p className="font-mono text-[10px] text-center tracking-[0.06em] text-text-dim">
              Current payout{' '}
              <span className="text-neon-amber font-semibold">
                R$ {potentialPayout.toFixed(2)}
              </span>
              {' '}at <span className="text-text-mid">{multiplier.toFixed(2)}x</span>
            </p>
          )}
        </div>
      </div>

      {/* Auto-cashout card */}
      <div className="card-glass">
        <div className="flex items-center justify-between px-4 py-3 border-b border-border">
          <span className="font-mono text-[10px] tracking-[0.22em] uppercase text-text-mid">
            Auto cashout
          </span>
          <span
            className={cn(
              'font-mono text-[10px] tracking-[0.14em] uppercase',
              autoCashoutEnabled ? 'text-neon-green' : 'text-text-dim',
            )}
          >
            {autoCashoutEnabled ? 'On' : 'Off'}
          </span>
        </div>

        <div className="px-4 py-3 flex items-center justify-between gap-3">
          <div className="flex flex-col gap-0.5 min-w-0">
            <span className="font-mono text-[11px] text-text-body">Cash out at</span>
            <span className="font-mono text-[10px] text-text-dim">
              ≈ R$ {autoPayout.toFixed(2)} payout
            </span>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <div
              className={cn(
                'flex items-center gap-1 rounded-md border px-2 h-8 w-[72px]',
                autoCashoutEnabled
                  ? 'border-border-strong bg-white/[0.03]'
                  : 'border-border bg-white/[0.01]',
              )}
            >
              <input
                type="number"
                min="1.01"
                step="0.05"
                value={rawAutoInput}
                disabled={!autoCashoutEnabled}
                onChange={(e) => handleAutoInputChange(e.target.value)}
                onBlur={handleAutoInputBlur}
                className={cn(
                  'w-full bg-transparent font-mono text-[12px] font-medium text-right',
                  'focus:outline-none',
                  autoCashoutEnabled ? 'text-text-hi' : 'text-text-faint',
                  '[appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none',
                )}
              />
              <span className="font-mono text-[10px] text-text-dim shrink-0">x</span>
            </div>

            <Switch
              checked={autoCashoutEnabled}
              onCheckedChange={setAutoCashoutEnabled}
              aria-label="Toggle auto cashout"
            />
          </div>
        </div>
      </div>

    </div>
  )
}

interface PrimaryButtonProps {
  phase: GamePhase
  hasBet: boolean
  betAmount: number
  multiplier: number
  potentialPayout: number
  canBet: boolean
  canCashout: boolean
  onBet: () => void
  onCashout: () => void
}

function PrimaryButton({
  phase, hasBet, betAmount, potentialPayout, canBet, canCashout, onBet, onCashout,
}: PrimaryButtonProps) {
  if (phase === 'running' && hasBet) {
    return (
      <button
        onClick={onCashout}
        disabled={!canCashout}
        className={cn(
          'w-full rounded-lg py-3 px-4 flex flex-col items-center gap-0.5 transition-all duration-150',
          'border border-neon-amber/50 bg-neon-amber/10',
          'hover:bg-neon-amber/18 hover:border-neon-amber/70 active:scale-[0.98]',
        )}
        style={{ boxShadow: '0 0 20px rgba(245,158,11,0.15)' }}
      >
        <span className="font-mono text-[14px] font-bold tracking-[0.06em] text-neon-amber">
          Cash out
        </span>
        <span className="font-mono text-[10px] text-neon-amber/70 tracking-[0.04em]">
          → R$ {potentialPayout.toFixed(2)}
        </span>
      </button>
    )
  }

  if (phase === 'running' && !hasBet) {
    return (
      <button
        disabled
        className="w-full rounded-lg py-3 px-4 flex flex-col items-center gap-0.5 border border-border bg-white/[0.02] cursor-not-allowed"
      >
        <span className="font-mono text-[13px] font-semibold text-text-dim tracking-[0.04em]">
          Round in progress
        </span>
        <span className="font-mono text-[10px] text-text-faint tracking-[0.04em]">
          Wait for next betting window
        </span>
      </button>
    )
  }

  if (phase === 'betting') {
    return (
      <button
        onClick={canBet ? onBet : undefined}
        disabled={!canBet}
        className={cn(
          'w-full rounded-lg py-3 px-4 flex flex-col items-center gap-0.5 transition-all duration-150',
          canBet
            ? 'border border-neon-green/50 bg-neon-green/10 hover:bg-neon-green/16 hover:border-neon-green/70 active:scale-[0.98]'
            : 'border border-border bg-white/[0.02] cursor-not-allowed',
        )}
        style={canBet ? { boxShadow: '0 0 20px rgba(0,255,136,0.12)' } : undefined}
      >
        <span
          className={cn(
            'font-mono text-[14px] font-bold tracking-[0.06em]',
            canBet ? 'text-neon-green' : 'text-text-dim',
          )}
        >
          {hasBet ? 'Confirmed' : `Bet R$ ${betAmount.toFixed(2)}`}
        </span>
        <span
          className={cn(
            'font-mono text-[10px] tracking-[0.04em]',
            canBet ? 'text-neon-green/60' : 'text-text-faint',
          )}
        >
          {hasBet ? 'Good luck!' : 'Locks at countdown end'}
        </span>
      </button>
    )
  }

  return (
    <button
      disabled
      className="w-full rounded-lg py-3 px-4 flex flex-col items-center gap-0.5 border border-border bg-white/[0.02] cursor-not-allowed"
    >
      <span className="font-mono text-[13px] font-semibold text-text-dim tracking-[0.04em]">
        Crashed
      </span>
      <span className="font-mono text-[10px] text-text-faint tracking-[0.04em]">
        New round soon
      </span>
    </button>
  )
}
