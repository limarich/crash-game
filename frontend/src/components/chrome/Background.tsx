export function Background() {
  return (
    <div
      aria-hidden
      className="fixed inset-0 z-0 pointer-events-none overflow-hidden"
      style={{
        background: `
          radial-gradient(1000px 700px at 18% 8%, rgba(139, 92, 246, 0.18), transparent 60%),
          radial-gradient(1100px 700px at 92% 100%, rgba(0, 255, 136, 0.10), transparent 60%),
          radial-gradient(900px 500px at 70% 0%, rgba(34, 225, 255, 0.08), transparent 70%),
          linear-gradient(180deg, #07071a 0%, #06060c 45%, #050511 100%)
        `,
      }}
    >
      {/* CRT scanlines */}
      <div
        className="absolute inset-0 opacity-50 mix-blend-overlay"
        style={{
          backgroundImage: `repeating-linear-gradient(
            180deg,
            rgba(255, 255, 255, 0.02) 0px,
            rgba(255, 255, 255, 0.02) 1px,
            transparent 1px,
            transparent 3px
          )`,
        }}
      />

      {/* Grid sutil */}
      <div
        className="absolute inset-0"
        style={{
          backgroundImage: `
            linear-gradient(rgba(120, 130, 200, 0.045) 1px, transparent 1px),
            linear-gradient(90deg, rgba(120, 130, 200, 0.045) 1px, transparent 1px)
          `,
          backgroundSize: '48px 48px',
          maskImage: 'radial-gradient(1200px 800px at 50% 30%, #000 30%, transparent 90%)',
          WebkitMaskImage: 'radial-gradient(1200px 800px at 50% 30%, #000 30%, transparent 90%)',
        }}
      />

      {/* Vignette */}
      <div
        className="absolute inset-0"
        style={{
          background: 'radial-gradient(1400px 900px at 50% 50%, transparent 60%, rgba(0, 0, 0, 0.55) 100%)',
        }}
      />
    </div>
  )
}
