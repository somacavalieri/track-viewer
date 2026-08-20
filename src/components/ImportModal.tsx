import { useMemo, useRef } from 'react'
import { filesFromDrop, runImport } from '../importer'
import { useStore } from '../store'
import type { Folder } from '../types'
import { CloseIcon, FolderIcon } from './icons'

export function ImportModal() {
  const s = useStore()
  const im = s.im
  const filesRef = useRef<HTMLInputElement>(null)
  const dirRef = useRef<HTMLInputElement>(null)

  const rows = useMemo(() => {
    const byParent = new Map<string | null, Folder[]>()
    for (const f of s.folders) {
      const arr = byParent.get(f.parentId) ?? []
      arr.push(f)
      byParent.set(f.parentId, arr)
    }
    const out: { id: string | null; name: string; depth: number; count: number }[] = [
      { id: null, name: 'Biblioteca (raiz)', depth: 0, count: s.tracks.filter(t => !t.folderId).length },
    ]
    const rec = (parentId: string | null, depth: number) => {
      for (const f of byParent.get(parentId) ?? []) {
        out.push({ id: f.id, name: f.name, depth, count: s.trackCount(f.id) })
        rec(f.id, depth + 1)
      }
    }
    rec(null, 1)
    return out
  }, [s.folders, s.tracks])

  const start = (files: FileList | File[]) => {
    if (im.phase !== 'idle') return
    runImport([...files], im.dest)
  }

  const finish = () => {
    const rep = im.report
    s.closeModal()
    if (rep && rep.ok > 0) {
      const dest = im.dest ? s.folders.find(f => f.id === im.dest)?.name ?? '' : 'Biblioteca'
      s.showToast(`${rep.ok} trilha${rep.ok > 1 ? 's' : ''} importada${rep.ok > 1 ? 's' : ''} em “${dest}”`)
    }
  }

  const close = () => {
    if (im.phase === 'run') return
    s.closeModal()
  }

  return (
    <div className="overlay" onMouseDown={close}>
      <div className="modal import" onMouseDown={e => e.stopPropagation()}>
        <div className="modal-head">
          <div className="modal-title">Importar GPX</div>
          <button className="icon-btn" style={{ width: 24, height: 24 }} onClick={close}>
            <CloseIcon size={14} />
          </button>
        </div>

        <div className="modal-label">Pasta de destino</div>
        <div className="dest-tree">
          {rows.map(r => (
            <div
              key={r.id ?? '__root'}
              className={'dest-row' + (im.dest === r.id ? ' sel' : '')}
              style={{ paddingLeft: 8 + r.depth * 14 }}
              onClick={() => s.set({ im: { ...im, dest: r.id } })}
            >
              <FolderIcon />
              <span className="name">{r.name}</span>
              <span className="cnt">{r.count ? `(${r.count})` : ''}</span>
              <span className="radio"><span /></span>
            </div>
          ))}
        </div>

        <input
          ref={filesRef}
          type="file"
          accept=".gpx"
          multiple
          style={{ display: 'none' }}
          onChange={e => {
            if (e.target.files?.length) start(e.target.files)
            e.target.value = ''
          }}
        />
        <input
          ref={dirRef}
          type="file"
          style={{ display: 'none' }}
          // @ts-expect-error non-standard folder picker attribute
          webkitdirectory=""
          onChange={e => {
            if (e.target.files?.length) start(e.target.files)
            e.target.value = ''
          }}
        />

        {im.phase === 'idle' && (
          <div
            className={'dropzone' + (im.drag ? ' drag' : '')}
            onClick={() => filesRef.current?.click()}
            onDragOver={e => {
              e.preventDefault()
              if (!im.drag) s.set({ im: { ...im, drag: true } })
            }}
            onDragLeave={() => s.set({ im: { ...im, drag: false } })}
            onDrop={async e => {
              e.preventDefault()
              const files = await filesFromDrop(e.dataTransfer)
              start(files)
            }}
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#8b93a0" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ display: 'inline-block' }}>
              <path d="M12 15V4" />
              <path d="m7 9 5-5 5 5" />
              <path d="M4 20h16" />
            </svg>
            <div className="t1">Solte arquivos ou uma pasta inteira aqui</div>
            <div className="t2">
              .gpx · clique para escolher arquivos ou{' '}
              <button
                onClick={e => {
                  e.stopPropagation()
                  dirRef.current?.click()
                }}
              >
                escolha uma pasta
              </button>
            </div>
          </div>
        )}

        {im.phase === 'run' && (
          <div className="im-progress">
            <div className="im-prog-head">
              <span>Importando trilhas…</span>
              <span className="n">{im.done} / {im.total}</span>
            </div>
            <div className="im-bar">
              <div style={{ width: (im.total ? Math.round((im.done / im.total) * 100) : 0) + '%' }} />
            </div>
            <div className="im-file">{im.current}</div>
          </div>
        )}

        {im.phase === 'done' && im.report && (
          <div className="im-report">
            <div className="chips">
              <span className="chip ok">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round"><path d="m4 12.5 5.5 5.5L20 7" /></svg>
                {im.report.ok} importada{im.report.ok === 1 ? '' : 's'}
              </span>
              <span className="chip dup">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round"><path d="M12 8v5" /><circle cx="12" cy="16.5" r=".5" fill="currentColor" /><circle cx="12" cy="12" r="9.2" /></svg>
                {im.report.dup} duplicada{im.report.dup === 1 ? '' : 's'}
              </span>
              <span className="chip err">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round"><path d="M6 6l12 12M18 6 6 18" /></svg>
                {im.report.err} com erro
              </span>
            </div>
            {im.report.errors.map((e, i) => (
              <div key={i} className="im-err-line">{e}</div>
            ))}
          </div>
        )}

        <div className="modal-footer">
          {im.phase !== 'done' && (
            <button className="btn-cancel" disabled={im.phase === 'run'} style={im.phase === 'run' ? { opacity: 0.45 } : undefined} onClick={close}>
              Cancelar
            </button>
          )}
          {im.phase === 'done' && (
            <button className="btn-submit" onClick={finish}>Concluir</button>
          )}
        </div>
      </div>
    </div>
  )
}
