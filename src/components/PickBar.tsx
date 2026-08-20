import { useEffect, useRef } from 'react'
import { mapctl } from '../mapctl'
import { useStore } from '../store'

export function PickBar() {
  const s = useStore()
  const readRef = useRef<HTMLSpanElement>(null)
  const hasPos = s.pm.lat !== null && s.pm.lng !== null

  useEffect(() => {
    mapctl.setReadout(readRef.current)
    return () => mapctl.setReadout(null)
  }, [])

  return (
    <div className="pick-bar-wrap">
      <div className="pick-bar">
        <div style={{ display: 'flex', alignItems: 'center', gap: 9, flex: '0 1 auto', minWidth: 0 }}>
          <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="#f59e0b" strokeWidth="1.8" strokeLinecap="round" style={{ flex: '0 0 auto' }}>
            <circle cx="12" cy="12" r="7.5" />
            <path d="M12 1.5v4M12 18.5v4M1.5 12h4M18.5 12h4" />
            <circle cx="12" cy="12" r="1.8" fill="#f59e0b" stroke="none" />
          </svg>
          <div className="headline">{hasPos ? 'Arraste o pin para ajustar' : 'Clique no mapa para marcar'}</div>
        </div>
        <span ref={readRef} className="mono-chip" />
        <div style={{ display: 'flex', gap: 7, flex: '0 0 auto' }}>
          <button className="btn-ghost" onClick={() => s.cancelPick()}>Cancelar</button>
          <button className="btn-amber" disabled={!hasPos} onClick={() => s.confirmPick()}>
            Usar este local
          </button>
        </div>
      </div>
    </div>
  )
}
