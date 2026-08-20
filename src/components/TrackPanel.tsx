import { useMemo } from 'react'
import { fmtGain, fmtKm } from '../geo'
import { mapctl } from '../mapctl'
import { useStore } from '../store'
import { PAL } from '../types'
import { CloseIcon, EyeIcon, GotoIcon, TrashIcon } from './icons'

export function TrackPanel() {
  const s = useStore()
  const track = s.tracks.find(t => t.id === s.selT)

  const spark = useMemo(() => {
    if (!track || track.profile.length < 2) return null
    const prof = track.profile
    const min = Math.min(...prof)
    const max = Math.max(...prof)
    const span = Math.max(1, max - min)
    const pts = prof.map((e, i) => [
      (i / (prof.length - 1)) * 264,
      48 - ((e - min) / span) * 40,
    ])
    const line = 'M ' + pts.map(p => p[0].toFixed(1) + ' ' + p[1].toFixed(1)).join(' L ')
    return { line, area: line + ' L 264 53 L 0 53 Z' }
  }, [track])

  if (!track) return null

  return (
    <div className="track-panel">
      <div className="tp-head">
        <span className="tp-swatch" style={{ background: track.color }} />
        <div className="tp-name">{track.name}</div>
        <button className="icon-btn sm" onClick={() => s.set({ selT: null, palOpen: false })}>
          <CloseIcon />
        </button>
      </div>
      <div className="tp-path">{s.folderPath(track.folderId)}</div>
      <div className="tp-stats">
        <div className="stat-card">
          <div className="stat-label">Distância</div>
          <div className="stat-value">{fmtKm(track.distanceM)}</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Elevação</div>
          <div className="stat-value">{fmtGain(track.gainM)}</div>
        </div>
      </div>
      {spark && (
        <svg width="100%" height="54" viewBox="0 0 264 54" preserveAspectRatio="none" style={{ marginTop: 10, display: 'block' }}>
          <path d={spark.area} fill={track.color + '2e'} />
          <path d={spark.line} fill="none" stroke={track.color} strokeWidth="1.8" />
          <line x1="0" y1="53" x2="264" y2="53" stroke="#262c35" strokeWidth="1" />
        </svg>
      )}
      <div className="tp-actions">
        <button className="btn-amber" style={{ flex: 1, height: 30, fontSize: 12.5 }} onClick={() => mapctl.fitBounds(track.bbox)}>
          <GotoIcon />Ir até
        </button>
        <button className="color-dot-btn" title="Trocar cor" onClick={() => s.set({ palOpen: !s.palOpen })}>
          <span style={{ background: track.color }} />
        </button>
        <button className="btn-sq" title="Esconder" onClick={() => s.hideTrack(track.id)}>
          <EyeIcon slashed size={15} />
        </button>
        <button
          className="btn-sq danger"
          title="Excluir"
          onClick={() =>
            s.set({
              confirm: {
                title: 'Excluir trilha',
                msg: `Excluir “${track.name}”? O traçado e os pontos vinculados serão removidos.`,
                okLabel: 'Excluir',
                onOk: () => s.deleteTrack(track.id),
              },
            })
          }
        >
          <TrashIcon />
        </button>
      </div>
      {s.palOpen && (
        <div className="pal-box">
          <div className="pal-row">
            {PAL.map(c => (
              <button
                key={c}
                className="pal-dot"
                style={{
                  background: c,
                  boxShadow: track.color === c ? '0 0 0 2px #14171d, 0 0 0 3.5px #fbbf24' : 'inset 0 0 0 1px rgba(255,255,255,.2)',
                }}
                onClick={() => s.setTrackColor(track.id, c)}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
