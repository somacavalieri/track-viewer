import { useRef } from 'react'
import { fmtCoord } from '../geo'
import { mapctl } from '../mapctl'
import { removePhoto, storePhoto, usePhotoURL } from '../photos'
import { useStore } from '../store'
import { CAT_LABEL, uid, type Photo, type Point } from '../types'
import { CatBadge, CloseIcon, GotoIcon, PencilIcon, PlusIcon, TrashIcon } from './icons'

function initials(n: string): string {
  if (n === 'Você') return 'VC'
  const w = (n || '').trim().split(/\s+/).filter(Boolean)
  if (!w.length) return '?'
  return (w.length === 1 ? w[0].slice(0, 2) : w[0][0] + w[1][0]).toUpperCase()
}

export function PointPanel() {
  const s = useStore()
  const point = s.points.find(p => p.id === s.selP)
  const fileRef = useRef<HTMLInputElement>(null)

  const phs = point?.photos ?? []
  const idx = point ? Math.max(0, Math.min(s.photoIdx[point.id] ?? 0, phs.length - 1)) : 0
  const act: Photo | undefined = phs[idx]
  const coverURL = usePhotoURL(act?.id ?? null)

  if (!point) return null
  const p: Point = point

  const setIdx = (i: number) => s.set({ photoIdx: { ...s.photoIdx, [p.id]: i } })

  const addFiles = async (files: FileList | File[]) => {
    const imgs = [...files].filter(f => f.type.startsWith('image/'))
    if (!imgs.length) return
    const photos: Photo[] = []
    for (const f of imgs) {
      const id = uid()
      await storePhoto(id, f)
      photos.push({ id, cap: '' })
    }
    s.addPhotos(p.id, photos)
    setIdx(phs.length)
  }

  const mine = s.cm.pid === p.id
  const draft = mine ? s.cm.draft : ''
  const editId = mine ? s.cm.editId : null
  const setCm = (o: Partial<{ draft: string; editId: string | null; editDraft: string }>) =>
    s.set({ cm: { ...(mine ? s.cm : { pid: p.id, draft: '', editId: null, editDraft: '' }), pid: p.id, ...o } })

  return (
    <div className="point-panel">
      <div className="pp-head">
        <CatBadge cat={p.cat} color={p.color} />
        <div style={{ flex: 1, minWidth: 0 }}>
          <div className="pp-name">{p.name}</div>
          <div className="pp-cat">{CAT_LABEL[p.cat]}</div>
        </div>
        <button className="icon-btn sm" onClick={() => s.set({ selP: null, pDel: null, lightbox: null })}>
          <CloseIcon />
        </button>
      </div>

      <div className="pp-body">
        <input
          ref={fileRef}
          type="file"
          accept="image/*"
          multiple
          style={{ display: 'none' }}
          onChange={e => {
            if (e.target.files) addFiles(e.target.files)
            e.target.value = ''
          }}
        />
        <div className="pp-sec-head">
          <span className="pp-sec-label">Fotos</span>
          <span className="pp-sec-count">{phs.length ? '· ' + phs.length : ''}</span>
          <div style={{ flex: 1 }} />
          {phs.length > 0 && (
            <button className="pp-add-btn" onClick={() => fileRef.current?.click()}>
              <PlusIcon size={11} stroke="currentColor" />Foto
            </button>
          )}
        </div>

        {phs.length > 0 ? (
          <div>
            <div
              className="gal-cover"
              onDragOver={e => e.preventDefault()}
              onDrop={e => {
                e.preventDefault()
                addFiles(e.dataTransfer.files)
              }}
            >
              {coverURL ? <img src={coverURL} alt={act?.cap || p.name} /> : <div className="drop-hint">Arraste uma foto</div>}
              <div className="gal-counter">{idx + 1} / {phs.length}</div>
              {phs.length > 1 && (
                <>
                  <button className="gal-nav prev" title="Foto anterior" onClick={() => setIdx((idx - 1 + phs.length) % phs.length)}>
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"><path d="m14 6-6 6 6 6" /></svg>
                  </button>
                  <button className="gal-nav next" title="Próxima foto" onClick={() => setIdx((idx + 1) % phs.length)}>
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"><path d="m10 6 6 6-6 6" /></svg>
                  </button>
                </>
              )}
              <div className="gal-tools">
                <button className="gal-tool" title="Ampliar" onClick={() => act && s.set({ lightbox: { pid: p.id, idx } })}>
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.1" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M15 3h6v6" /><path d="M9 21H3v-6" /><path d="M21 3l-7 7" /><path d="M3 21l7-7" />
                  </svg>
                </button>
                <button
                  className="gal-tool danger"
                  title="Remover foto"
                  onClick={() => {
                    if (act) removePhoto(act.id)
                    s.removePhotoAt(p.id, idx)
                    setIdx(Math.max(0, idx - 1))
                  }}
                >
                  <TrashIcon size={13} bars={false} />
                </button>
              </div>
            </div>
            <input
              className="cap-input"
              value={act?.cap ?? ''}
              onChange={e => s.setPhotoCap(p.id, idx, e.target.value)}
              placeholder="Legenda da foto (opcional)"
            />
            <div className="thumbs">
              {phs.map((ph, i) => (
                <Thumb key={ph.id} photo={ph} active={i === idx} onPick={() => setIdx(i)} />
              ))}
            </div>
          </div>
        ) : (
          <button
            className="photos-empty"
            onClick={() => fileRef.current?.click()}
            onDragOver={e => e.preventDefault()}
            onDrop={e => {
              e.preventDefault()
              addFiles(e.dataTransfer.files)
            }}
          >
            <svg width="21" height="21" viewBox="0 0 24 24" fill="none" stroke="#f59e0b" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
              <path d="M4 8.6A2 2 0 0 1 6 6.6h1.6a2 2 0 0 0 1.7-1l.5-.9a1 1 0 0 1 .9-.6h2.6a1 1 0 0 1 .9.6l.5.9a2 2 0 0 0 1.7 1H18a2 2 0 0 1 2 2v8.4a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2Z" />
              <circle cx="12" cy="12.6" r="3.4" />
            </svg>
            <span className="t1">Adicionar fotos</span>
            <span className="t2">Arraste imagens aqui ou clique para escolher</span>
          </button>
        )}

        <div className="pp-notes-label">Notas</div>
        <div className="pp-notes">{p.notes || 'Sem notas.'}</div>
        <div className="pp-coord">{fmtCoord(p.lat, p.lng)}</div>

        <div className="pp-sec-head" style={{ margin: '17px 0 9px' }}>
          <span className="pp-sec-label">Comentários</span>
          <span className="pp-sec-count">{p.comments.length ? '· ' + p.comments.length : ''}</span>
        </div>
        <div className="cm-list">
          {p.comments.map(c => (
            <div key={c.id} className="cm-item">
              <div
                className="cm-avatar"
                style={{
                  background: c.author === 'Você' ? 'rgba(245,158,11,.16)' : 'rgba(91,140,255,.16)',
                  color: c.author === 'Você' ? '#fbbf24' : '#9db4ff',
                }}
              >
                {initials(c.author)}
              </div>
              <div className="cm-bubble">
                <div className="cm-meta">
                  <span className="cm-author">{c.author}</span>
                  <span className="cm-when">{c.when}</span>
                  <div style={{ flex: 1 }} />
                  <button className="icon-btn xs" title="Editar comentário" onClick={() => setCm({ editId: c.id, editDraft: c.text })}>
                    <PencilIcon size={12} />
                  </button>
                  <button className="icon-btn xs danger" title="Excluir comentário" onClick={() => s.deleteComment(p.id, c.id)}>
                    <TrashIcon size={12} bars={false} />
                  </button>
                </div>
                {editId === c.id ? (
                  <div style={{ display: 'flex', flexDirection: 'column', marginTop: 6 }}>
                    <textarea
                      className="cm-textarea"
                      rows={3}
                      value={s.cm.editDraft}
                      onChange={e => setCm({ editDraft: e.target.value })}
                    />
                    <div style={{ display: 'flex', gap: 6, justifyContent: 'flex-end', marginTop: 6 }}>
                      <button className="btn-mini-ghost" onClick={() => setCm({ editId: null, editDraft: '' })}>Cancelar</button>
                      <button
                        className="btn-mini-amber"
                        onClick={() => {
                          const v = s.cm.editDraft.trim()
                          if (v) s.editComment(p.id, c.id, v)
                        }}
                      >
                        Salvar
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="cm-text">{c.text}</div>
                )}
              </div>
            </div>
          ))}
        </div>
        <div style={{ display: 'flex', gap: 8, marginTop: 10 }}>
          <div className="cm-avatar" style={{ background: 'rgba(245,158,11,.16)', color: '#fbbf24' }}>VC</div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <textarea
              className="cm-new-ta"
              rows={2}
              value={draft}
              onChange={e => setCm({ draft: e.target.value })}
              placeholder="Escreva um comentário…"
            />
            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 6 }}>
              <button
                className="btn-mini-amber"
                style={{ height: 27, padding: '0 12px', fontSize: 12, opacity: draft.trim() ? 1 : 0.45, pointerEvents: draft.trim() ? 'auto' : 'none' }}
                onClick={() => draft.trim() && s.addComment(p.id, draft.trim())}
              >
                Comentar
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="pp-footer">
        {s.pDel === p.id && (
          <div className="pp-del-banner">
            <div className="pp-del-msg">
              Excluir “{p.name}”?
              {(phs.length || p.comments.length) ? ` ${phs.length} foto(s) e ${p.comments.length} comentário(s) serão perdidos.` : ''}
            </div>
            <button className="btn-mini-ghost filled" onClick={() => s.set({ pDel: null })}>Cancelar</button>
            <button className="btn-mini-red" onClick={() => {
              p.photos.forEach(ph => removePhoto(ph.id))
              s.deletePoint(p.id)
            }}>Excluir</button>
          </div>
        )}
        <div className="pp-footer-actions">
          <button className="btn-amber" style={{ flex: 1, height: 30, fontSize: 12.5 }} onClick={() => mapctl.flyTo(p.lng, p.lat, 14)}>
            <GotoIcon />Ir até
          </button>
          <button className="btn-edit" onClick={() => s.openEditPoint(p)}>
            <PencilIcon />Editar
          </button>
          <button className="btn-sq danger" title="Excluir ponto" onClick={() => s.set({ pDel: p.id })}>
            <TrashIcon />
          </button>
        </div>
      </div>
    </div>
  )
}

function Thumb({ photo, active, onPick }: { photo: Photo; active: boolean; onPick: () => void }) {
  const url = usePhotoURL(photo.id)
  return (
    <button className={'thumb' + (active ? ' act' : '')} title={photo.cap || 'Foto'} onClick={onPick}>
      {url && <img src={url} alt={photo.cap || ''} />}
    </button>
  )
}
