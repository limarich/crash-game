import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '#/components/ui/dialog'
import { cn } from '#/lib/utils'

export interface RoundRecord {
  id: number
  crash: number
  serverSeedHash: string
  serverSeed?: string
  clientSeed: string
  nonce: number
  timeAgo: string
  prevId?: number
  prevHash?: string
  nextId?: number
  nextHash?: string
}

interface VerifyModalProps {
  round: RoundRecord | null
  onClose: () => void
}

function bucket(v: number): 'red' | 'amber' | 'green' {
  if (v < 1.5) return 'red'
  if (v < 2) return 'amber'
  return 'green'
}

const bucketColor = {
  red: 'text-neon-red',
  amber: 'text-neon-amber',
  green: 'text-neon-green',
}

const bucketLabel = {
  red: 'Low',
  amber: 'Mid',
  green: 'High',
}

export function VerifyModal({ round, onClose }: VerifyModalProps) {
  if (!round) return null

  const b = bucket(round.crash)
  const revealed = !!round.serverSeed

  return (
    <Dialog open={!!round} onOpenChange={(open) => { if (!open) onClose() }}>
      <DialogContent className="max-w-[520px] bg-bg-2 border border-border p-0 overflow-hidden">

        <DialogHeader className="px-5 pt-5 pb-4 border-b border-border">
          <div className="flex items-start gap-3">
            <div className="flex-1 min-w-0">
              <DialogTitle className="font-display text-[16px] font-semibold text-text-hi flex items-center gap-2">
                Round #{round.id}
                <span
                  className={cn(
                    'font-mono text-[12px] font-bold px-2 py-0.5 rounded-md border',
                    b === 'red' && 'text-neon-red border-neon-red/40 bg-neon-red/10',
                    b === 'amber' && 'text-neon-amber border-neon-amber/40 bg-neon-amber/10',
                    b === 'green' && 'text-neon-green border-neon-green/40 bg-neon-green/10',
                  )}
                >
                  {round.crash.toFixed(2)}x
                </span>
              </DialogTitle>
              <p className="mt-1 font-mono text-[11px] text-text-dim tracking-[0.08em]">
                Provably fair · {round.timeAgo}
              </p>
            </div>
          </div>
        </DialogHeader>

        <div className="px-5 py-4 flex flex-col gap-4">

          {/* Verified banner */}
          {revealed && (
            <div className="flex items-center gap-3 px-3 py-2.5 rounded-md border border-neon-green/25 bg-neon-green/[0.06]">
              <span
                className="w-5 h-5 rounded-full border border-neon-green/60 bg-neon-green/15 flex items-center justify-center text-neon-green text-[11px] font-bold shrink-0"
                style={{ textShadow: '0 0 8px rgba(0,255,136,0.6)' }}
              >
                ✓
              </span>
              <div>
                <p className="font-mono text-[12px] font-semibold text-neon-green">Verified</p>
                <p className="font-mono text-[10px] text-text-dim mt-0.5">
                  SHA-256(server_seed) matches the committed hash.
                </p>
              </div>
            </div>
          )}

          {/* Crash point */}
          <Field
            label="Crash point"
            hint={bucketLabel[b]}
            hintClass={bucketColor[b]}
          >
            <span className={cn('font-mono text-[18px] font-bold tracking-[0.04em]', bucketColor[b])}>
              {round.crash.toFixed(2)}x
            </span>
          </Field>

          {/* Server seed hash */}
          <Field label="Server seed hash" hint="committed">
            <span className="font-mono text-[11px] text-neon-cyan break-all leading-relaxed">
              {round.serverSeedHash}
            </span>
          </Field>

          {/* Server seed */}
          <Field label="Server seed" hint={revealed ? 'revealed' : 'sealed'}>
            {revealed
              ? <span className="font-mono text-[11px] text-neon-green break-all leading-relaxed">{round.serverSeed}</span>
              : <span className="font-mono text-[11px] text-text-faint italic">Will be revealed after the round ends.</span>
            }
          </Field>

          {/* Client seed */}
          <Field label="Client seed" hint={`nonce ${round.nonce}`}>
            <span className="font-mono text-[11px] text-text-body break-all leading-relaxed">
              {round.clientSeed}
            </span>
          </Field>

          {/* Hash chain */}
          {(round.prevId || round.nextId) && (
            <Field label="Hash chain" hint="linked rounds">
              <div className="flex items-stretch gap-2 w-full">
                {round.prevId && (
                  <div className="flex-1 min-w-0 rounded-md border border-border bg-white/[0.02] px-3 py-2">
                    <p className="font-mono text-[10px] text-text-dim mb-1">Prev · #{round.prevId}</p>
                    <p className="font-mono text-[10px] text-text-mid truncate">{round.prevHash}</p>
                  </div>
                )}
                {round.prevId && round.nextId && (
                  <div className="flex items-center text-text-faint font-mono text-[12px] shrink-0 px-1">→</div>
                )}
                {round.nextId && (
                  <div className="flex-1 min-w-0 rounded-md border border-border bg-white/[0.02] px-3 py-2">
                    <p className="font-mono text-[10px] text-text-dim mb-1">Next · #{round.nextId}</p>
                    <p className="font-mono text-[10px] text-text-mid truncate">{round.nextHash}</p>
                  </div>
                )}
              </div>
            </Field>
          )}

        </div>
      </DialogContent>
    </Dialog>
  )
}

function Field({
  label,
  hint,
  hintClass,
  children,
}: {
  label: string
  hint?: string
  hintClass?: string
  children: React.ReactNode
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex items-center justify-between">
        <span className="font-mono text-[10px] tracking-[0.18em] uppercase text-text-dim">{label}</span>
        {hint && (
          <span className={cn('font-mono text-[10px] tracking-[0.08em] uppercase', hintClass ?? 'text-text-faint')}>
            {hint}
          </span>
        )}
      </div>
      <div className="rounded-md border border-border bg-white/[0.02] px-3 py-2">
        {children}
      </div>
    </div>
  )
}
