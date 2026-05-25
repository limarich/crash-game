import { useState } from 'react'
import { Dialog, DialogContent, DialogTitle } from '#/components/ui/dialog'
import { useAuthStore } from '#/store/auth.store'

interface LoginModalProps {
  open: boolean
  onClose: () => void
}

const PRESET_USERS = [
  { username: 'player', password: 'player123', gradient: 'linear-gradient(135deg, #ff3df6, #8b5cf6)' },
]

export function LoginModal({ open, onClose }: LoginModalProps) {
  const { login, loading, error } = useAuthStore()
  const [showForm, setShowForm] = useState(false)
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')

  async function handlePreset(u: typeof PRESET_USERS[0]) {
    try {
      await login(u.username, u.password)
      onClose()
    } catch { /* error shown via store */ }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    try {
      await login(username, password)
      onClose()
    } catch { /* error shown via store */ }
  }

  function handleOpenChange(o: boolean) {
    if (!o) { setShowForm(false); onClose() }
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-[380px] bg-bg-2 border border-border p-0 overflow-hidden">

        {!showForm ? (
          <>
            {/* Header */}
            <div className="px-6 pt-7 pb-5 flex flex-col items-center text-center gap-1">
              <div
                className="w-10 h-10 rounded-[11px] mb-3 font-mono font-extrabold text-[18px] text-bg-base grid place-items-center"
                style={{ background: 'linear-gradient(135deg, var(--neon-green), var(--neon-cyan))', boxShadow: 'var(--glow-green)' }}
              >
                ▲
              </div>
              <DialogTitle className="font-display text-[17px] font-semibold text-text-hi">
                Choose your account
              </DialogTitle>
              <p className="font-mono text-[11px] text-text-dim">to continue to CRASHHAUS</p>
            </div>

            {/* User cards */}
            <div className="px-5 flex flex-col gap-2 pb-2">
              {PRESET_USERS.map((u) => (
                <button
                  key={u.username}
                  onClick={() => handlePreset(u)}
                  disabled={loading}
                  className="flex items-center gap-4 px-4 py-3.5 rounded-xl border border-border bg-white/[0.02] hover:bg-white/[0.05] hover:border-border-strong transition-all duration-150 text-left group disabled:opacity-50"
                >
                  {/* Avatar */}
                  <div
                    className="w-11 h-11 rounded-full grid place-items-center text-white text-[15px] font-bold shrink-0"
                    style={{ background: u.gradient, boxShadow: '0 0 16px rgba(139,92,246,0.35)' }}
                  >
                    {u.username[0].toUpperCase()}
                  </div>

                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-[14px] text-text-hi">{u.username}</p>
                    <p className="font-mono text-[11px] text-text-dim mt-0.5">Test account</p>
                  </div>

                  <span className="font-mono text-[11px] text-text-faint group-hover:text-neon-green transition-colors duration-150 shrink-0">
                    {loading ? '…' : '→'}
                  </span>
                </button>
              ))}
            </div>

            {/* Divider + other account */}
            <div className="px-5 py-4 flex items-center gap-3">
              <div className="flex-1 h-px bg-border" />
              <span className="font-mono text-[10px] tracking-[0.16em] uppercase text-text-faint">or</span>
              <div className="flex-1 h-px bg-border" />
            </div>

            <div className="px-5 pb-6">
              <button
                onClick={() => setShowForm(true)}
                className="w-full h-9 rounded-lg border border-border text-text-mid font-mono text-[12px] tracking-[0.06em] hover:border-border-strong hover:text-text-body transition-colors duration-150"
              >
                Sign in with another account
              </button>
            </div>

            {error && (
              <p className="px-5 pb-4 font-mono text-[11px] text-neon-red text-center">{error}</p>
            )}
          </>
        ) : (
          <>
            {/* Credentials form */}
            <div className="px-6 pt-6 pb-4 border-b border-border flex items-center gap-3">
              <button
                onClick={() => setShowForm(false)}
                className="font-mono text-[12px] text-text-dim hover:text-text-body transition-colors"
              >
                ←
              </button>
              <DialogTitle className="font-display text-[15px] font-semibold text-text-hi">
                Sign in
              </DialogTitle>
            </div>

            <form onSubmit={handleSubmit} className="px-6 py-5 flex flex-col gap-4">
              <div className="flex flex-col gap-1.5">
                <label className="font-mono text-[10px] tracking-[0.18em] uppercase text-text-dim">Username</label>
                <input
                  type="text"
                  autoComplete="username"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="username"
                  className="h-9 rounded-md border border-border-strong bg-white/[0.03] px-3 font-mono text-[13px] text-text-hi placeholder:text-text-faint focus:outline-none focus:border-neon-cyan/50 transition-colors"
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="font-mono text-[10px] tracking-[0.18em] uppercase text-text-dim">Password</label>
                <input
                  type="password"
                  autoComplete="current-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="h-9 rounded-md border border-border-strong bg-white/[0.03] px-3 font-mono text-[13px] text-text-hi placeholder:text-text-faint focus:outline-none focus:border-neon-cyan/50 transition-colors"
                />
              </div>

              {error && <p className="font-mono text-[11px] text-neon-red">{error}</p>}

              <button
                type="submit"
                disabled={loading || !username || !password}
                className="h-10 rounded-lg border border-neon-green/50 bg-neon-green/10 font-mono text-[13px] font-bold text-neon-green tracking-[0.06em] transition-all duration-150 hover:bg-neon-green/16 hover:border-neon-green/70 disabled:opacity-40 disabled:cursor-not-allowed"
              >
                {loading ? 'Signing in…' : 'Sign in'}
              </button>
            </form>
          </>
        )}
      </DialogContent>
    </Dialog>
  )
}
