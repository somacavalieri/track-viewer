import { usePhotoURL } from '../photos'
import { useStore } from '../store'
import { CloseIcon } from './icons'

export function Lightbox() {
  const s = useStore()
  const lb = s.lightbox
  const point = lb ? s.points.find(p => p.id === lb.pid) : null
  const phs = point?.photos ?? []
  const idx = lb ? Math.max(0, Math.min(lb.idx, phs.length - 1)) : 0
  const act = phs[idx]
  const url = usePhotoURL(act?.id ?? null)

  if (!lb || !point || !act) return null

  const go = (d: number) => {
    const i = (idx + d + phs.length) % phs.length
    s.set({ lightbox: { pid: lb.pid, idx: i }, photoIdx: { ...s.photoIdx, [lb.pid]: i } })
  }

  return (
    <div className="lb-overlay" onMouseDown={() => s.set({ lightbox: null })}>
      <div className="lb-frame" onMouseDown={e => e.stopPropagation()}>
        {url && <img src={url} alt={act.cap || point.name} />}
        {phs.length > 1 && (
          <>
            <button className="lb-nav prev" title="Anterior" onClick={() => go(-1)}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.3" strokeLinecap="round" strokeLinejoin="round"><path d="m14 6-6 6 6 6" /></svg>
            </button>
            <button className="lb-nav next" title="Próxima" onClick={() => go(1)}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.3" strokeLinecap="round" strokeLinejoin="round"><path d="m10 6 6 6-6 6" /></svg>
            </button>
          </>
        )}
      </div>
      <div className="lb-meta" onMouseDown={e => e.stopPropagation()}>
        <span className="lb-title">{point.name}</span>
        <span className="lb-counter">{idx + 1} / {phs.length}</span>
        <span className="lb-cap">{act.cap || 'Sem legenda'}</span>
      </div>
      <button className="lb-close" title="Fechar" onClick={() => s.set({ lightbox: null })}>
        <CloseIcon size={15} />
      </button>
    </div>
  )
}
