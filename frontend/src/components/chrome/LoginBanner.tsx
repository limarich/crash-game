import { LogIn } from 'lucide-react'
import { useAuthStore } from '#/store/auth.store'

export function LoginBanner() {
  const { token, openLoginModal } = useAuthStore()

  if (token) return null

  return (
    <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-40 pointer-events-none">
      <button
        onClick={openLoginModal}
        pointer-events="auto"
        className="pointer-events-auto flex items-center gap-3 px-5 py-3 rounded-2xl border border-neon-green/40 font-mono text-[13px] font-semibold text-neon-green tracking-[0.06em] transition-all duration-200 hover:border-neon-green/70 hover:scale-105 active:scale-95"
        style={{
          background: 'linear-gradient(135deg, rgba(0,255,136,0.08), rgba(0,255,200,0.04))',
          boxShadow: '0 0 24px rgba(0,255,136,0.15), 0 4px 24px rgba(0,0,0,0.4)',
          backdropFilter: 'blur(12px)',
          WebkitBackdropFilter: 'blur(12px)',
          animation: 'banner-pulse 3s ease-in-out infinite',
        }}
      >
        <LogIn className="w-4 h-4" />
        Sign in to play
      </button>

      <style>{`
        @keyframes banner-pulse {
          0%, 100% { box-shadow: 0 0 24px rgba(0,255,136,0.15), 0 4px 24px rgba(0,0,0,0.4); }
          50%       { box-shadow: 0 0 36px rgba(0,255,136,0.30), 0 4px 24px rgba(0,0,0,0.4); }
        }
      `}</style>
    </div>
  )
}
