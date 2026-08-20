import { fmtCoord, parseCoords } from '../geo'
import { mapctl } from '../mapctl'
import { useStore } from '../store'
import { CATS, CAT_LABEL, PAL, type Cat } from '../types'
import { CatGlyph, CloseIcon } from './icons'

export function PointModal() {
  const s = useStore()
  const pm = s.pm
  const parsed = parseCoords(pm.coords)
  const canSubmit = pm.name.trim().length > 0 && (pm.locMode === 'coords' ? parsed !== undefined : true)

  const submit = () => {
    if (!canSubmit) return
    const useMap = pm.locMode !== 'coords' && pm.lat !== null && pm.lng !== null
    const useCoords = pm.locMode === 'coords' && !!pm.coords.trim() && !!parsed
    let lat: number
    let lng: number
    if (useMap) {
      lat = pm.lat!
      lng = pm.lng!
    } else if (useCoords) {
      lat = parsed!.lat
      lng = parsed!.lng
    } else {
      const c = mapctl.center()
      lat = c.lat
      lng = c.lng
    }
    if (pm.mode === 'edit' && pm.id) {
      const prev = s.points.find(p => p.id === pm.id)
      const moved = useMap || useCoords
      s.updatePoint(pm.id, {
        name: pm.name.trim(),
        notes: pm.notes,
        cat: pm.cat,
        color: pm.color,
        lat: moved ? lat : prev?.lat,
        lng: moved ? lng : prev?.lng,
      })
      s.set({ modal: null, selP: pm.id, selT: null })
      s.showToast('Ponto atualizado')
    } else {
      const id = s.createPoint({ trackId: null, cat: pm.cat, name: pm.name.trim(), notes: pm.notes, lat, lng, color: pm.color })
      s.set({ modal: null, selP: id, selT: null })
      mapctl.flyTo(lng, lat, 13)
      s.showToast('Ponto criado')
    }
  }

  const hint =
    parsed === undefined
      ? 'Formato não reconhecido — use decimal ou graus/min/seg.'
      : parsed === null
        ? 'Deixe vazio para usar o centro do mapa.'
        : '≈ ' + parsed.lat.toFixed(5).replace('.', ',') + ', ' + parsed.lng.toFixed(5).replace('.', ',')
  const hintColor = parsed === undefined ? '#f87171' : parsed === null ? '#7d8590' : '#4ade80'

  return (
    <div className="overlay" onMouseDown={() => s.closeModal()}>
      <div className="modal point" onMouseDown={e => e.stopPropagation()}>
        <div className="modal-head">
          <div className="modal-title">{pm.mode === 'edit' ? 'Editar ponto' : 'Novo ponto'}</div>
          <button className="icon-btn" style={{ width: 24, height: 24 }} onClick={() => s.closeModal()}>
            <CloseIcon size={14} />
          </button>
        </div>

        <div className="modal-label">Categoria</div>
        <div className="cat-grid">
          {CATS.map((cat: Cat) => (
            <button key={cat} className={'cat-tile' + (pm.cat === cat ? ' act' : '')} onClick={() => s.setPm({ cat })}>
              <CatGlyph cat={cat} size={17} />
              <span>{CAT_LABEL[cat]}</span>
            </button>
          ))}
        </div>

        <div className="modal-label mt">Nome</div>
        <input
          className="modal-input"
          value={pm.name}
          onChange={e => s.setPm({ name: e.target.value })}
          placeholder="Ex.: Mirante da Janela"
        />

        <div className="modal-label mt" style={{ marginTop: 12 }}>Notas</div>
        <textarea
          className="modal-ta"
          rows={2}
          value={pm.notes}
          onChange={e => s.setPm({ notes: e.target.value })}
          placeholder="Opcional — ex.: água potável, sombra, custo…"
        />

        <div className="modal-label mt" style={{ marginTop: 12, marginBottom: 6 }}>Local</div>
        <div className="seg">
          <button className={'seg-btn' + (pm.locMode !== 'coords' ? ' act' : '')} onClick={() => s.setPm({ locMode: 'map' })}>
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M20 10c0 6-8 12-8 12S4 16 4 10a8 8 0 0 1 16 0Z" />
              <circle cx="12" cy="10" r="2.6" />
            </svg>
            No mapa
          </button>
          <button className={'seg-btn' + (pm.locMode === 'coords' ? ' act' : '')} onClick={() => s.setPm({ locMode: 'coords' })}>
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round">
              <circle cx="12" cy="12" r="9" />
              <path d="M3 12h18M12 3c3 3.4 3 14.2 0 18M12 3c-3 3.4-3 14.2 0 18" />
            </svg>
            Coordenadas
          </button>
        </div>

        {pm.locMode !== 'coords' ? (
          <div style={{ marginTop: 9 }}>
            {pm.lat !== null && pm.lng !== null ? (
              <div className="loc-set">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#f59e0b" strokeWidth="2" strokeLinejoin="round" style={{ flex: '0 0 auto' }}>
                  <path d="M20 10c0 6-8 12-8 12S4 16 4 10a8 8 0 0 1 16 0Z" />
                  <circle cx="12" cy="10" r="2.6" />
                </svg>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div className="t1">Local marcado no mapa</div>
                  <div className="t2">{fmtCoord(pm.lat, pm.lng)}</div>
                </div>
                <button className="btn-repos" onClick={() => s.startPick()}>Reposicionar</button>
              </div>
            ) : (
              <button className="loc-empty" onClick={() => s.startPick()}>
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#f59e0b" strokeWidth="1.7" strokeLinecap="round">
                  <circle cx="12" cy="12" r="7.5" />
                  <path d="M12 1.5v4M12 18.5v4M1.5 12h4M18.5 12h4" />
                  <circle cx="12" cy="12" r="1.8" fill="#f59e0b" stroke="none" />
                </svg>
                <span className="t1">Marcar clicando no mapa</span>
                <span className="t2">Sem local marcado o ponto nasce no centro da tela</span>
              </button>
            )}
          </div>
        ) : (
          <div style={{ marginTop: 9 }}>
            <input
              className="modal-input mono"
              value={pm.coords}
              onChange={e => s.setPm({ coords: e.target.value })}
              placeholder={'-20.3040, -46.5250  ·  20°18\'14"S 46°31\'30"O'}
            />
            <div className="coord-hint" style={{ color: hintColor }}>{hint}</div>
          </div>
        )}

        {pm.cat === 'pin' && (
          <div style={{ marginTop: 10 }}>
            <div className="modal-label" style={{ marginBottom: 7 }}>Cor do pin</div>
            <div style={{ display: 'flex', gap: 8 }}>
              {PAL.map(c => (
                <button
                  key={c}
                  className="pal-dot lg"
                  style={{
                    background: c,
                    boxShadow: pm.color === c ? '0 0 0 2px #14171d, 0 0 0 3.5px #fbbf24' : 'inset 0 0 0 1px rgba(255,255,255,.2)',
                  }}
                  onClick={() => s.setPm({ color: c })}
                />
              ))}
            </div>
          </div>
        )}

        <div className="modal-footer">
          <button className="btn-cancel" onClick={() => s.closeModal()}>Cancelar</button>
          <button className="btn-submit" disabled={!canSubmit} onClick={submit}>
            {pm.mode === 'edit' ? 'Salvar' : 'Criar ponto'}
          </button>
        </div>
      </div>
    </div>
  )
}
