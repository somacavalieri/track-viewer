import { useMemo, type ReactNode } from 'react'
import { mapctl } from '../mapctl'
import { normText, useStore } from '../store'
import { CATS, CAT_DOT, CAT_PLURAL, type Cat, type Folder, type Track } from '../types'
import { CatGlyph, ChevronIcon, EyeIcon, ImportIcon, PlusIcon } from './icons'

export function Sidebar() {
  const s = useStore()
  const eff = useMemo(() => s.folderEff(), [s.folders])
  const filter = normText(s.filter.trim())

  const byParent = useMemo(() => {
    const m = new Map<string | null, Folder[]>()
    for (const f of s.folders) {
      const arr = m.get(f.parentId) ?? []
      arr.push(f)
      m.set(f.parentId, arr)
    }
    return m
  }, [s.folders])

  const tracksByFolder = useMemo(() => {
    const m = new Map<string | null, Track[]>()
    for (const t of s.tracks) {
      const arr = m.get(t.folderId) ?? []
      arr.push(t)
      m.set(t.folderId, arr)
    }
    return m
  }, [s.tracks])

  const setSb = (open: boolean) => {
    s.set({ sbOpen: open })
    try { localStorage.setItem('tv-sbOpen', JSON.stringify(open)) } catch { /* ignore */ }
  }

  function renderTrackRow(t: Track, depth: number) {
    const tEff = (t.folderId ? eff[t.folderId] : true) && t.visible
    const sel = s.selT === t.id
    const renaming = s.renameId === t.id
    return (
      <div
        key={t.id}
        className={'row' + (sel ? ' sel' : '')}
        style={{ paddingLeft: 8 + depth * 14 }}
        onClick={() => {
          if (renaming) return
          s.selectTrack(t.id)
          mapctl.fitBounds(t.bbox)
        }}
        onContextMenu={e => {
          e.preventDefault()
          e.stopPropagation()
          s.set({ ctx: { x: Math.min(e.clientX, window.innerWidth - 410), y: Math.min(e.clientY, window.innerHeight - 200), kind: 'track', id: t.id, sub: false } })
        }}
        onMouseEnter={() => s.set({ hoverT: t.id })}
        onMouseLeave={() => s.set({ hoverT: null })}
      >
        <div className="row-main" style={{ opacity: tEff ? 1 : 0.42 }}>
          <span className="dash-swatch" style={{ background: t.color }} />
          {renaming ? (
            <input
              className="rename-input"
              defaultValue={t.name}
              autoFocus
              onFocus={e => e.target.select()}
              onClick={e => e.stopPropagation()}
              onKeyDown={e => {
                if (e.key === 'Enter') s.renameTrack(t.id, (e.target as HTMLInputElement).value)
                if (e.key === 'Escape') s.set({ renameId: null })
              }}
              onBlur={e => s.renameTrack(t.id, e.target.value)}
            />
          ) : (
            <span className="row-name" style={{ fontWeight: 500, color: sel ? '#fbbf24' : '#dfe3e9' }}>{t.name}</span>
          )}
        </div>
        <button className="eye-btn" title="Mostrar / esconder" onClick={e => { e.stopPropagation(); s.toggleTrackEye(t.id) }}>
          <EyeIcon slashed={!t.visible} />
        </button>
      </div>
    )
  }

  function renderFolder(f: Folder, depth: number): ReactNode[] {
    const kids = byParent.get(f.id) ?? []
    const kidTracks = tracksByFolder.get(f.id) ?? []
    const selfMatch = !filter || normText(f.name).includes(filter)
    const matchTracks = filter ? kidTracks.filter(t => selfMatch || normText(t.name).includes(filter)) : kidTracks
    const childRows = kids.flatMap(k => renderFolder(k, depth + 1))
    if (filter && !selfMatch && matchTracks.length === 0 && childRows.length === 0) return []

    const expanded = filter ? true : f.expanded
    const renaming = s.renameId === f.id
    const count = s.trackCount(f.id)

    const row = (
      <div
        key={f.id}
        className="row"
        style={{ paddingLeft: 8 + depth * 14 }}
        onClick={() => { if (!renaming) s.toggleFolderExpanded(f.id) }}
        onContextMenu={e => {
          e.preventDefault()
          e.stopPropagation()
          s.set({ ctx: { x: Math.min(e.clientX, window.innerWidth - 410), y: Math.min(e.clientY, window.innerHeight - 200), kind: 'folder', id: f.id, sub: false } })
        }}
      >
        <div className="row-main" style={{ opacity: eff[f.id] ? 1 : 0.42 }}>
          <span
            className="chev"
            style={{ transform: `rotate(${expanded ? 90 : 0}deg)` }}
            onClick={e => { e.stopPropagation(); s.toggleFolderExpanded(f.id) }}
          >
            <ChevronIcon />
          </span>
          {renaming ? (
            <input
              className="rename-input"
              defaultValue={f.name}
              autoFocus
              onFocus={e => e.target.select()}
              onClick={e => e.stopPropagation()}
              onKeyDown={e => {
                if (e.key === 'Enter') s.renameFolder(f.id, (e.target as HTMLInputElement).value)
                if (e.key === 'Escape') s.set({ renameId: null })
              }}
              onBlur={e => s.renameFolder(f.id, e.target.value)}
            />
          ) : (
            <span className="row-name" style={{ fontWeight: 600, color: '#e6e8ec' }}>{f.name}</span>
          )}
          <span className="row-count">{count ? `(${count})` : ''}</span>
        </div>
        <button className="eye-btn" title="Mostrar / esconder" onClick={e => { e.stopPropagation(); s.toggleFolderEye(f.id) }}>
          <EyeIcon slashed={!f.visible} />
        </button>
      </div>
    )

    return expanded
      ? [row, ...matchTracks.map(t => renderTrackRow(t, depth + 1)), ...childRows]
      : [row]
  }

  const rootFolders = byParent.get(null) ?? []
  const rootTracks = (tracksByFolder.get(null) ?? []).filter(t => !filter || normText(t.name).includes(filter))
  const treeRows = [...rootFolders.flatMap(f => renderFolder(f, 0)), ...rootTracks.map(t => renderTrackRow(t, 0))]
  const libEmpty = s.folders.length === 0 && s.tracks.length === 0

  function renderCat(cat: Cat) {
    const all = s.points.filter(p => p.cat === cat)
    const pts = all.filter(p => !filter || normText(p.name).includes(filter))
    const expanded = filter ? pts.length > 0 : s.catExpanded[cat]
    const catVis = s.catVisible[cat]
    const trackEffVisible = (trackId: string | null) => {
      if (!trackId) return true
      const t = s.tracks.find(x => x.id === trackId)
      if (!t) return true
      return (t.folderId ? eff[t.folderId] : true) && t.visible
    }
    return (
      <div key={cat}>
        <div className="row" style={{ paddingLeft: 8 }} onClick={() => s.toggleCatExpanded(cat)}>
          <div className="row-main" style={{ opacity: catVis ? 1 : 0.42 }}>
            <span className="chev" style={{ transform: `rotate(${expanded ? 90 : 0}deg)` }}>
              <ChevronIcon />
            </span>
            <CatGlyph cat={cat} />
            <span className="row-name" style={{ fontWeight: 600 }}>{CAT_PLURAL[cat]}</span>
            <span className="row-count">({all.length})</span>
          </div>
          <button className="eye-btn" title="Mostrar / esconder categoria" onClick={e => { e.stopPropagation(); s.toggleCatEye(cat) }}>
            <EyeIcon slashed={!catVis} />
          </button>
        </div>
        {expanded && pts.map(p => {
          const sel = s.selP === p.id
          const effVis = catVis && p.visible && trackEffVisible(p.trackId)
          return (
            <div
              key={p.id}
              className={'row pt-row' + (sel ? ' sel' : '')}
              style={{ paddingLeft: 38 }}
              onClick={() => {
                s.selectPoint(p.id)
                mapctl.flyTo(p.lng, p.lat, 13)
              }}
            >
              <div className="row-main" style={{ opacity: effVis ? 1 : 0.42 }}>
                <span className="pt-dot" style={{ background: p.cat === 'pin' ? p.color : CAT_DOT[p.cat] }} />
                <span className="row-name" style={{ color: sel ? '#fbbf24' : '#c9cfd8' }}>{p.name}</span>
              </div>
              <button className="eye-btn" title="Mostrar / esconder" onClick={e => { e.stopPropagation(); s.togglePointEye(p.id) }}>
                <EyeIcon slashed={!p.visible} size={14} />
              </button>
            </div>
          )
        })}
      </div>
    )
  }

  return (
    <aside className={'sidebar' + (s.sbOpen ? '' : ' closed')}>
      <div className="sb-head">
        <div className="sb-logo">
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#221303" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="6" cy="19" r="3" />
            <circle cx="18" cy="5" r="3" />
            <path d="M8.5 16.5H15a3.5 3.5 0 0 0 0-7h-5a3.5 3.5 0 0 1 0-7" />
          </svg>
        </div>
        <div className="sb-title">Track Viewer</div>
        <div style={{ flex: 1 }} />
        {s.authState === 'signedin' && (
          <button
            className="icon-btn"
            title={s.syncing ? 'Sincronizando…' : 'Sair'}
            onClick={async () => {
              const { signOut } = await import('../auth')
              await signOut()
              s.set({ authState: 'signedout' })
            }}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
              <path d="m16 17 5-5-5-5" />
              <path d="M21 12H9" />
            </svg>
          </button>
        )}
        <button className="icon-btn" title="Recolher painel" onClick={() => setSb(false)}>
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="m11 17-5-5 5-5" />
            <path d="m18 17-5-5 5-5" />
          </svg>
        </button>
      </div>
      <div className="sb-filter">
        <div className="wrap">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#6b7280" strokeWidth="2.2" strokeLinecap="round">
            <circle cx="11" cy="11" r="7" />
            <path d="m16.5 16.5 4.5 4.5" />
          </svg>
          <input
            className="filter-input"
            value={s.filter}
            onChange={e => s.set({ filter: e.target.value })}
            placeholder="Filtrar…"
          />
        </div>
      </div>
      <div className="sb-scroll">
        <div className="sb-label">Trilhas</div>
        {libEmpty ? (
          <div className="sb-empty">Nenhuma trilha ainda. Use <strong>Importar GPX</strong> para trazer arquivos ou uma pasta inteira do disco.</div>
        ) : treeRows.length === 0 ? (
          <div className="sb-empty">Nada encontrado para “{s.filter.trim()}”.</div>
        ) : (
          treeRows
        )}
        <div className="sb-label pts">Pontos</div>
        {CATS.map(renderCat)}
      </div>
      <div className="sb-footer">
        <button className="sb-btn" style={{ flex: 1.1 }} onClick={() => s.newFolder()}>
          <PlusIcon />Nova pasta
        </button>
        <button className="sb-btn" style={{ flex: 1.2 }} onClick={() => s.openImport(null)}>
          <ImportIcon stroke="#f59e0b" />Importar GPX
        </button>
        <button className="sb-btn" style={{ flex: 0.9 }} onClick={() => s.openNewPoint()}>
          <PlusIcon />Ponto
        </button>
      </div>
      <div
        className="sb-rail"
        title="Expandir painel"
        style={{ opacity: s.sbOpen ? 0 : 1, pointerEvents: s.sbOpen ? 'none' : 'auto' }}
        onClick={() => setSb(true)}
      >
        <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="#8b93a0" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round">
          <path d="m9 6 6 6-6 6" />
        </svg>
      </div>
    </aside>
  )
}
