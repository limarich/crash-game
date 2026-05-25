interface SegDisplayProps {
  value: number
  suffix?: string
}

export function SegDisplay({ value, suffix = 'x' }: SegDisplayProps) {
  const formatted = Math.max(1, value).toFixed(2)
  const ghost = formatted.split('').map((c) => (c === '.' ? '.' : '8')).join('')

  return (
    <div aria-label={`Multiplicador ${formatted}x`}>
      <div className="seg">
        <span
          className="relative inline-block"
        >
          <span className="ghost" aria-hidden="true">{ghost}</span>
          <span className="relative">{formatted}</span>
        </span>
        <span
          className="text-[0.42em] opacity-65 font-semibold ml-[0.08em] align-[0.18em] tracking-normal"
        >
          {suffix}
        </span>
      </div>
    </div>
  )
}
