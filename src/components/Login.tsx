import { useState, type FormEvent } from 'react'
import { signIn } from '../auth'
import { useStore } from '../store'

export function Login() {
  const s = useStore()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  const submit = async (e: FormEvent) => {
    e.preventDefault()
    if (busy || !email.trim() || !password) return
    setBusy(true)
    setError(null)
    const err = await signIn(email.trim(), password)
    setBusy(false)
    if (err) {
      setError(err)
      return
    }
    s.set({ authState: 'signedin' })
    s.startSync()
  }

  return (
    <div className="login-screen">
      <svg width="100%" height="100%" viewBox="0 0 1440 900" preserveAspectRatio="xMidYMid slice" className="login-bg">
        <g fill="none" stroke="rgba(148,163,184,.07)" strokeWidth="1.5">
          <path d="M 200 980 C 100 800 180 640 340 560 C 520 470 780 500 900 380 C 1010 270 980 120 1120 40" />
          <path d="M 320 980 C 230 820 300 680 450 610 C 630 528 860 550 970 440 C 1075 335 1050 170 1180 80" />
          <path d="M 440 980 C 360 840 420 720 560 660 C 740 585 940 600 1040 500 C 1140 400 1120 230 1240 130" />
          <path d="M 560 980 C 490 860 540 760 670 710 C 850 640 1020 650 1110 560 C 1200 470 1190 290 1300 190" />
          <path d="M 80 980 C -20 780 60 600 230 510 C 420 410 700 450 830 320 C 950 200 910 30 1060 -60" />
        </g>
        <path d="M 680 980 C 620 880 660 800 780 755 C 950 692 1100 700 1180 620 C 1260 540 1255 350 1360 250" fill="none" stroke="rgba(245,158,11,.14)" strokeWidth="1.5" />
        <circle cx="780" cy="755" r="3.5" fill="#f59e0b" opacity=".55" />
        <circle cx="1360" cy="250" r="3.5" fill="#f59e0b" opacity=".55" />
      </svg>
      <form className="login-card" onSubmit={submit}>
        <div className="login-head">
          <div className="login-logo">
            <svg width="23" height="23" viewBox="0 0 24 24" fill="none" stroke="#221303" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="6" cy="19" r="3" />
              <circle cx="18" cy="5" r="3" />
              <path d="M8.5 16.5H15a3.5 3.5 0 0 0 0-7h-5a3.5 3.5 0 0 1 0-7" />
            </svg>
          </div>
          <div className="login-title">Track Viewer</div>
          <div className="login-tag">Suas rotas, seus mapas.</div>
        </div>
        <div className="login-label">E-mail</div>
        <input
          className="login-input"
          type="email"
          value={email}
          onChange={e => setEmail(e.target.value)}
          placeholder="voce@exemplo.com"
          autoComplete="email"
          autoFocus
        />
        <div className="login-label mt">Senha</div>
        <input
          className="login-input"
          type="password"
          value={password}
          onChange={e => setPassword(e.target.value)}
          placeholder="••••••••"
          autoComplete="current-password"
        />
        {error && <div className="login-error">{error}</div>}
        <button className="login-submit" type="submit" disabled={busy || !email.trim() || !password}>
          {busy ? 'Entrando…' : 'Entrar'}
        </button>
        <div className="login-foot">Acesso restrito — o usuário é criado manualmente no Neon.</div>
      </form>
    </div>
  )
}
