import { useMemo } from 'react'
import { useStore } from '../store'
import type { Folder } from '../types'
import { FolderIcon, ImportIcon, PencilIcon, TrashIcon } from './icons'

export function ContextMenu() {
  const s = useStore()
  const ctx = s.ctx
  if (!ctx) return null

  return <ContextMenuInner key={ctx.kind + ctx.id} />
}

function ContextMenuInner() {
  const s = useStore()
  const ctx = s.ctx!

  const targets = useMemo(() => {
    const excluded = ctx.kind === 'folder' ? s.subtreeIds(ctx.id) : []
    const currentFolder = ctx.kind === 'track' ? s.tracks.find(t => t.id === ctx.id)?.folderId ?? null : null
    const byParent = new Map<string | null, Folder[]>()
    for (const f of s.folders) {
      const arr = byParent.get(f.parentId) ?? []
      arr.push(f)
      byParent.set(f.parentId, arr)
    }
    const out: { id: string | null; name: string; pad: number }[] = [{ id: null, name: 'Raiz (nível superior)', pad: 9 }]
    const rec = (parentId: string | null, depth: number) => {
      for (const f of byParent.get(parentId) ?? []) {
        if (!excluded.includes(f.id)) out.push({ id: f.id, name: f.name, pad: 9 + (depth + 1) * 10 })
        rec(f.id, depth + 1)
      }
    }
    rec(null, 0)
    return out.filter(t => (ctx.kind === 'track' ? t.id !== currentFolder : true))
  }, [s.folders, s.tracks, ctx])

  const folder = ctx.kind === 'folder' ? s.folders.find(f => f.id === ctx.id) : null
  const track = ctx.kind === 'track' ? s.tracks.find(t => t.id === ctx.id) : null

  const doDelete = () => {
    if (ctx.kind === 'folder' && folder) {
      const n = s.trackCount(folder.id)
      s.set({
        ctx: null,
        confirm: {
          title: 'Excluir pasta',
          msg: `Excluir “${folder.name}”?` + (n ? ` ${n} trilha${n > 1 ? 's' : ''} e os pontos vinculados serão removidos.` : ''),
          okLabel: 'Excluir',
          onOk: () => s.deleteFolder(folder.id),
        },
      })
    } else if (track) {
      s.set({
        ctx: null,
        confirm: {
          title: 'Excluir trilha',
          msg: `Excluir “${track.name}”? O traçado e os pontos vinculados serão removidos.`,
          okLabel: 'Excluir',
          onOk: () => s.deleteTrack(track.id),
        },
      })
    }
  }

  return (
    <>
      <div
        className="ctx-backdrop"
        onMouseDown={() => s.set({ ctx: null })}
        onContextMenu={e => {
          e.preventDefault()
          s.set({ ctx: null })
        }}
      />
      <div className="ctx" style={{ left: ctx.x, top: ctx.y }}>
        <div
          className="ctx-item"
          onMouseEnter={() => ctx.sub && s.set({ ctx: { ...ctx, sub: false } })}
          onClick={() => s.set({ renameId: ctx.id, ctx: null })}
        >
          <PencilIcon size={14} />Renomear
        </div>
        <div
          className={'ctx-item' + (ctx.sub ? ' hl' : '')}
          onMouseEnter={() => s.set({ ctx: { ...ctx, sub: true } })}
        >
          <FolderIcon size={14} />Mover para…
          <span style={{ marginLeft: 'auto', color: '#6b7280', display: 'flex' }}>
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"><path d="m9 6 6 6-6 6" /></svg>
          </span>
          {ctx.sub && (
            <div className="ctx-sub">
              {targets.map(t => (
                <div
                  key={t.id ?? '__root'}
                  className="ctx-sub-item"
                  style={{ paddingLeft: t.pad }}
                  onClick={e => {
                    e.stopPropagation()
                    if (ctx.kind === 'folder') s.moveFolder(ctx.id, t.id)
                    else s.moveTrack(ctx.id, t.id)
                  }}
                >
                  <FolderIcon />
                  <span className="name">{t.name}</span>
                </div>
              ))}
            </div>
          )}
        </div>
        {ctx.kind === 'folder' && (
          <div
            className="ctx-item"
            onMouseEnter={() => ctx.sub && s.set({ ctx: { ...ctx, sub: false } })}
            onClick={() => s.openImport(ctx.id)}
          >
            <ImportIcon size={14} stroke="#8b93a0" />Importar GPX aqui
          </div>
        )}
        <div className="ctx-sep" />
        <div
          className="ctx-item danger"
          onMouseEnter={() => ctx.sub && s.set({ ctx: { ...ctx, sub: false } })}
          onClick={doDelete}
        >
          <TrashIcon size={14} />Excluir
        </div>
      </div>
    </>
  )
}
