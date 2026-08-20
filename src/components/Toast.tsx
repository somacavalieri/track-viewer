import { useStore } from '../store'

export function Toast() {
  const msg = useStore(s => s.toast)
  if (!msg) return null
  return (
    <div className="toast">
      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#f59e0b" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
        <path d="m4 12.5 5.5 5.5L20 7" />
      </svg>
      {msg}
    </div>
  )
}
