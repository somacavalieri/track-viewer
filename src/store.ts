import { create } from 'zustand'
import { isAuthed } from './auth'
import { remoteEnabled } from './config'
import { deleteTrackRec, loadLibrary, putTrack, saveFolders, savePoints } from './db'
import { fmtCoord } from './geo'
import { initialSync } from './sync'
import { CATS, PAL, uid, type Cat, type Folder, type Photo, type Point, type PointComment, type Track } from './types'

export interface PmState {
  mode: 'new' | 'edit'
  id: string | null
  cat: Cat
  name: string
  notes: string
  coords: string
  color: string
  locMode: 'map' | 'coords'
  lat: number | null
  lng: number | null
  picking: boolean
}

export interface ImReport { ok: number; dup: number; err: number; errors: string[] }
export interface ImState {
  dest: string | null
  phase: 'idle' | 'run' | 'done'
  done: number
  total: number
  current: string
  drag: boolean
  report: ImReport | null
}

export interface CtxState { x: number; y: number; kind: 'folder' | 'track'; id: string; sub: boolean }
export interface ConfirmState { title: string; msg: string; okLabel: string; onOk: () => void }

const freshPm = (): PmState => ({
  mode: 'new', id: null, cat: 'pin', name: '', notes: '', coords: '',
  color: '#ff8a1a', locMode: 'map', lat: null, lng: null, picking: false,
})
const freshIm = (dest: string | null): ImState => ({
  dest, phase: 'idle', done: 0, total: 0, current: '', drag: false, report: null,
})

interface State {
  loaded: boolean
  /** 'local' = Neon não configurado (sem login); demais estados = sync ligado */
  authState: 'local' | 'checking' | 'signedout' | 'signedin'
  syncing: boolean
  folders: Folder[]
  tracks: Track[]
  points: Point[]
  catVisible: Record<Cat, boolean>
  catExpanded: Record<Cat, boolean>
  filter: string
  sbOpen: boolean
  selT: string | null
  selP: string | null
  hoverT: string | null
  palOpen: boolean
  renameId: string | null
  modal: 'point' | 'import' | null
  pm: PmState
  im: ImState
  ctx: CtxState | null
  confirm: ConfirmState | null
  pDel: string | null
  lightbox: { pid: string; idx: number } | null
  photoIdx: Record<string, number>
  cm: { pid: string | null; draft: string; editId: string | null; editDraft: string }
  toast: string | null
}

interface Actions {
  init(): Promise<void>
  startSync(): Promise<void>
  set: (p: Partial<State>) => void
  showToast(msg: string): void
  // folders
  folderEff(): Record<string, boolean>
  folderPath(id: string | null): string
  subtreeIds(id: string): string[]
  trackCount(folderId: string): number
  newFolder(): void
  renameFolder(id: string, name: string): void
  moveFolder(id: string, targetId: string | null): void
  deleteFolder(id: string): void
  toggleFolderEye(id: string): void
  toggleFolderExpanded(id: string): void
  // tracks
  selectTrack(id: string | null): void
  toggleTrackEye(id: string): void
  setTrackColor(id: string, color: string): void
  renameTrack(id: string, name: string): void
  moveTrack(id: string, folderId: string | null): void
  hideTrack(id: string): void
  deleteTrack(id: string): void
  nextColor(): string
  addTracks(tracks: Track[], points: Point[]): void
  // points
  selectPoint(id: string | null): void
  togglePointEye(id: string): void
  toggleCatEye(cat: Cat): void
  toggleCatExpanded(cat: Cat): void
  createPoint(p: Omit<Point, 'id' | 'createdAt' | 'visible' | 'photos' | 'comments'>): string
  updatePoint(id: string, patch: Partial<Point>): void
  deletePoint(id: string): void
  addPhotos(pid: string, photos: Photo[]): void
  removePhotoAt(pid: string, idx: number): void
  setPhotoCap(pid: string, idx: number, cap: string): void
  addComment(pid: string, text: string): void
  editComment(pid: string, cid: string, text: string): void
  deleteComment(pid: string, cid: string): void
  // modals
  openNewPoint(): void
  openEditPoint(p: Point): void
  openImport(dest: string | null): void
  closeModal(): void
  setPm(patch: Partial<PmState>): void
  setPmPos(lat: number, lng: number): void
  startPick(): void
  cancelPick(): void
  confirmPick(): void
}

export type Store = State & Actions

let saveTimer: ReturnType<typeof setTimeout> | null = null
function persistSoon(get: () => Store) {
  if (saveTimer) clearTimeout(saveTimer)
  saveTimer = setTimeout(() => {
    const s = get()
    saveFolders(s.folders)
    savePoints(s.points)
  }, 350)
}

function lsGet<T>(key: string, fallback: T): T {
  try {
    const v = localStorage.getItem(key)
    return v ? (JSON.parse(v) as T) : fallback
  } catch {
    return fallback
  }
}
function lsSet(key: string, v: unknown) {
  try { localStorage.setItem(key, JSON.stringify(v)) } catch { /* full/blocked */ }
}

let toastTimer: ReturnType<typeof setTimeout> | null = null
let pickBackup: { lat: number | null; lng: number | null } = { lat: null, lng: null }

export const useStore = create<Store>((set, get) => ({
  loaded: false,
  authState: remoteEnabled ? 'checking' : 'local',
  syncing: false,
  folders: [],
  tracks: [],
  points: [],
  catVisible: lsGet('tv-catVisible', { agua: true, cidade: true, park: true, pin: true }),
  catExpanded: lsGet('tv-catExpanded', { agua: true, cidade: false, park: false, pin: true }),
  filter: '',
  sbOpen: lsGet('tv-sbOpen', true),
  selT: null,
  selP: null,
  hoverT: null,
  palOpen: false,
  renameId: null,
  modal: null,
  pm: freshPm(),
  im: freshIm(null),
  ctx: null,
  confirm: null,
  pDel: null,
  lightbox: null,
  photoIdx: {},
  cm: { pid: null, draft: '', editId: null, editDraft: '' },
  toast: null,

  async init() {
    const lib = await loadLibrary()
    set({ folders: lib.folders, points: lib.points, tracks: lib.tracks, loaded: true })
    if (!remoteEnabled) {
      const { seedSamples } = await import('./samples')
      await seedSamples()
      return
    }
    const authed = await isAuthed()
    if (!authed) {
      set({ authState: 'signedout' })
      return
    }
    set({ authState: 'signedin' })
    get().startSync()
  },

  async startSync() {
    if (!remoteEnabled || get().syncing) return
    set({ syncing: true })
    try {
      const s = get()
      const merged = await initialSync({ folders: s.folders, tracks: s.tracks, points: s.points })
      if (merged) set({ folders: merged.folders, tracks: merged.tracks, points: merged.points })
    } catch (e) {
      console.warn('[sync] pull inicial falhou:', e)
      get().showToast('Sem conexão com o Neon — trabalhando localmente')
    } finally {
      set({ syncing: false })
    }
  },

  set: p => set(p),

  showToast(msg) {
    if (toastTimer) clearTimeout(toastTimer)
    set({ toast: msg })
    toastTimer = setTimeout(() => set({ toast: null }), 2600)
  },

  // ---------- folders ----------
  folderEff() {
    const { folders } = get()
    const byParent = new Map<string | null, Folder[]>()
    for (const f of folders) {
      const arr = byParent.get(f.parentId) ?? []
      arr.push(f)
      byParent.set(f.parentId, arr)
    }
    const eff: Record<string, boolean> = {}
    const rec = (parentId: string | null, parentEff: boolean) => {
      for (const f of byParent.get(parentId) ?? []) {
        eff[f.id] = parentEff && f.visible
        rec(f.id, eff[f.id])
      }
    }
    rec(null, true)
    return eff
  },

  folderPath(id) {
    if (!id) return 'Biblioteca'
    const { folders } = get()
    const byId = new Map(folders.map(f => [f.id, f]))
    const names: string[] = []
    let cur = byId.get(id)
    while (cur) {
      names.unshift(cur.name)
      cur = cur.parentId ? byId.get(cur.parentId) : undefined
    }
    return names.join(' / ') || 'Biblioteca'
  },

  subtreeIds(id) {
    const { folders } = get()
    const out = [id]
    let grew = true
    while (grew) {
      grew = false
      for (const f of folders) {
        if (f.parentId && out.includes(f.parentId) && !out.includes(f.id)) {
          out.push(f.id)
          grew = true
        }
      }
    }
    return out
  },

  trackCount(folderId) {
    const ids = get().subtreeIds(folderId)
    return get().tracks.filter(t => t.folderId && ids.includes(t.folderId)).length
  },

  newFolder() {
    const f: Folder = { id: uid(), parentId: null, name: 'Nova pasta', visible: true, expanded: true, createdAt: Date.now() }
    set(s => ({ folders: [...s.folders, f], renameId: f.id }))
    persistSoon(get)
  },

  renameFolder(id, name) {
    const n = name.trim()
    set(s => ({
      folders: n ? s.folders.map(f => (f.id === id ? { ...f, name: n } : f)) : s.folders,
      renameId: null,
    }))
    persistSoon(get)
  },

  moveFolder(id, targetId) {
    if (targetId && get().subtreeIds(id).includes(targetId)) return
    const f = get().folders.find(x => x.id === id)
    if (!f) return
    set(s => ({ folders: s.folders.map(x => (x.id === id ? { ...x, parentId: targetId } : x)), ctx: null }))
    const target = targetId ? '“' + (get().folders.find(x => x.id === targetId)?.name ?? '') + '”' : 'a raiz'
    get().showToast('“' + f.name + '” movida para ' + target)
    persistSoon(get)
  },

  deleteFolder(id) {
    const ids = get().subtreeIds(id)
    const goneTracks = get().tracks.filter(t => t.folderId && ids.includes(t.folderId))
    const goneTrackIds = goneTracks.map(t => t.id)
    set(s => ({
      folders: s.folders.filter(f => !ids.includes(f.id)),
      tracks: s.tracks.filter(t => !goneTrackIds.includes(t.id)),
      points: s.points.filter(p => !(p.trackId && goneTrackIds.includes(p.trackId))),
      selT: s.selT && goneTrackIds.includes(s.selT) ? null : s.selT,
      ctx: null,
      confirm: null,
    }))
    goneTrackIds.forEach(tid => deleteTrackRec(tid))
    get().showToast('Pasta excluída')
    persistSoon(get)
  },

  toggleFolderEye(id) {
    set(s => ({ folders: s.folders.map(f => (f.id === id ? { ...f, visible: !f.visible } : f)) }))
    persistSoon(get)
  },

  toggleFolderExpanded(id) {
    set(s => ({ folders: s.folders.map(f => (f.id === id ? { ...f, expanded: !f.expanded } : f)) }))
    persistSoon(get)
  },

  // ---------- tracks ----------
  selectTrack(id) {
    set({ selT: id, selP: null, palOpen: false, pDel: null })
  },

  toggleTrackEye(id) {
    const t = get().tracks.find(x => x.id === id)
    if (!t) return
    const upd = { ...t, visible: !t.visible }
    set(s => ({ tracks: s.tracks.map(x => (x.id === id ? upd : x)) }))
    putTrack(upd)
  },

  setTrackColor(id, color) {
    const t = get().tracks.find(x => x.id === id)
    if (!t) return
    const upd = { ...t, color }
    set(s => ({ tracks: s.tracks.map(x => (x.id === id ? upd : x)) }))
    putTrack(upd)
  },

  renameTrack(id, name) {
    const n = name.trim()
    const t = get().tracks.find(x => x.id === id)
    set({ renameId: null })
    if (!t || !n) return
    const upd = { ...t, name: n }
    set(s => ({ tracks: s.tracks.map(x => (x.id === id ? upd : x)) }))
    putTrack(upd)
  },

  moveTrack(id, folderId) {
    const t = get().tracks.find(x => x.id === id)
    if (!t) return
    const upd = { ...t, folderId }
    set(s => ({ tracks: s.tracks.map(x => (x.id === id ? upd : x)), ctx: null }))
    putTrack(upd)
    const target = folderId ? '“' + (get().folders.find(f => f.id === folderId)?.name ?? '') + '”' : 'a raiz'
    get().showToast('“' + t.name + '” movida para ' + target)
  },

  hideTrack(id) {
    const t = get().tracks.find(x => x.id === id)
    if (!t) return
    const upd = { ...t, visible: false }
    set(s => ({ tracks: s.tracks.map(x => (x.id === id ? upd : x)), selT: null, palOpen: false }))
    putTrack(upd)
    get().showToast('Trilha escondida')
  },

  deleteTrack(id) {
    set(s => ({
      tracks: s.tracks.filter(t => t.id !== id),
      points: s.points.filter(p => p.trackId !== id),
      selT: s.selT === id ? null : s.selT,
      palOpen: false,
      confirm: null,
      ctx: null,
    }))
    deleteTrackRec(id)
    get().showToast('Trilha excluída')
    persistSoon(get)
  },

  nextColor() {
    return PAL[get().tracks.length % PAL.length]
  },

  addTracks(tracks, points) {
    set(s => ({ tracks: [...s.tracks, ...tracks], points: [...s.points, ...points] }))
    tracks.forEach(t => putTrack(t))
    if (points.length) persistSoon(get)
  },

  // ---------- points ----------
  selectPoint(id) {
    set({ selP: id, selT: null, palOpen: false, pDel: null })
  },

  togglePointEye(id) {
    set(s => ({ points: s.points.map(p => (p.id === id ? { ...p, visible: !p.visible } : p)) }))
    persistSoon(get)
  },

  toggleCatEye(cat) {
    const cv = { ...get().catVisible, [cat]: !get().catVisible[cat] }
    set({ catVisible: cv })
    lsSet('tv-catVisible', cv)
  },

  toggleCatExpanded(cat) {
    const ce = { ...get().catExpanded, [cat]: !get().catExpanded[cat] }
    set({ catExpanded: ce })
    lsSet('tv-catExpanded', ce)
  },

  createPoint(p) {
    const id = uid()
    const point: Point = { ...p, id, visible: true, photos: [], comments: [], createdAt: Date.now() }
    set(s => ({ points: [...s.points, point], selP: id, selT: null }))
    persistSoon(get)
    return id
  },

  updatePoint(id, patch) {
    set(s => ({ points: s.points.map(p => (p.id === id ? { ...p, ...patch } : p)) }))
    persistSoon(get)
  },

  deletePoint(id) {
    set(s => ({
      points: s.points.filter(p => p.id !== id),
      selP: s.selP === id ? null : s.selP,
      pDel: null,
      lightbox: s.lightbox?.pid === id ? null : s.lightbox,
    }))
    get().showToast('Ponto excluído')
    persistSoon(get)
  },

  addPhotos(pid, photos) {
    set(s => ({ points: s.points.map(p => (p.id === pid ? { ...p, photos: [...p.photos, ...photos] } : p)) }))
    persistSoon(get)
  },

  removePhotoAt(pid, idx) {
    set(s => ({
      points: s.points.map(p => (p.id === pid ? { ...p, photos: p.photos.filter((_, i) => i !== idx) } : p)),
    }))
    get().showToast('Foto removida')
    persistSoon(get)
  },

  setPhotoCap(pid, idx, cap) {
    set(s => ({
      points: s.points.map(p =>
        p.id === pid ? { ...p, photos: p.photos.map((q, i) => (i === idx ? { ...q, cap } : q)) } : p,
      ),
    }))
    persistSoon(get)
  },

  addComment(pid, text) {
    const M = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez']
    const d = new Date()
    const cm: PointComment = { id: uid(), author: 'Você', when: d.getDate() + ' ' + M[d.getMonth()], text }
    set(s => ({
      points: s.points.map(p => (p.id === pid ? { ...p, comments: [...p.comments, cm] } : p)),
      cm: { pid, draft: '', editId: null, editDraft: '' },
    }))
    persistSoon(get)
  },

  editComment(pid, cid, text) {
    set(s => ({
      points: s.points.map(p =>
        p.id === pid ? { ...p, comments: p.comments.map(c => (c.id === cid ? { ...c, text } : c)) } : p,
      ),
      cm: { pid, draft: get().cm.pid === pid ? get().cm.draft : '', editId: null, editDraft: '' },
    }))
    get().showToast('Comentário atualizado')
    persistSoon(get)
  },

  deleteComment(pid, cid) {
    set(s => ({
      points: s.points.map(p => (p.id === pid ? { ...p, comments: p.comments.filter(c => c.id !== cid) } : p)),
    }))
    get().showToast('Comentário excluído')
    persistSoon(get)
  },

  // ---------- modals ----------
  openNewPoint() {
    set({ modal: 'point', selT: null, selP: null, palOpen: false, pm: freshPm() })
  },

  openEditPoint(p) {
    set({
      modal: 'point',
      pDel: null,
      pm: {
        mode: 'edit', id: p.id, cat: p.cat, name: p.name, notes: p.notes,
        coords: fmtCoord(p.lat, p.lng), color: p.color, locMode: 'map',
        lat: p.lat, lng: p.lng, picking: false,
      },
    })
  },

  openImport(dest) {
    set({ modal: 'import', im: freshIm(dest), ctx: null })
  },

  closeModal() {
    set({ modal: null })
  },

  setPm(patch) {
    set(s => ({ pm: { ...s.pm, ...patch } }))
  },

  setPmPos(lat, lng) {
    set(s => ({ pm: { ...s.pm, lat, lng } }))
  },

  startPick() {
    const { pm } = get()
    pickBackup = { lat: pm.lat, lng: pm.lng }
    set(s => ({ selT: null, selP: null, palOpen: false, pm: { ...s.pm, locMode: 'map', picking: true } }))
  },

  cancelPick() {
    set(s => ({ pm: { ...s.pm, picking: false, lat: pickBackup.lat, lng: pickBackup.lng } }))
  },

  confirmPick() {
    const { pm } = get()
    if (pm.lat === null || pm.lng === null) return
    set(s => ({
      pm: { ...s.pm, picking: false, locMode: 'map', coords: fmtCoord(pm.lat!, pm.lng!) },
    }))
  },
}))

export function catOf(points: Point[], cat: Cat): Point[] {
  return points.filter(p => p.cat === cat)
}

export function normText(s: string): string {
  return (s || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase()
}

export { CATS }
