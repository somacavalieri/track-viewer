import { getToken } from './auth'
import { NEON_DATA_API_URL, remoteEnabled } from './config'
import type { Cat, Folder, Point, Track, TrackGeometry } from './types'

/** Neon Data API (PostgREST) access. All calls are RLS-scoped to the signed-in
 *  user. Every function silently no-ops when remote sync is off or signed out —
 *  the app keeps working local-first. */

/** Set while initialSync writes remote data into the local cache, so the
 *  write-through hooks in db.ts don't echo it back to the server. */
export const gate = { applying: false }

class RemoteError extends Error {}

async function req(path: string, init: RequestInit = {}): Promise<Response> {
  const token = await getToken()
  if (!token) throw new RemoteError('sem sessão')
  const res = await fetch(`${NEON_DATA_API_URL}/${path}`, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
      ...(init.headers || {}),
    },
  })
  if (!res.ok) throw new RemoteError(`Data API ${res.status} em ${path}: ${(await res.text()).slice(0, 300)}`)
  return res
}

function canPush(): boolean {
  return remoteEnabled && !gate.applying
}

function warn(op: string, e: unknown) {
  if (e instanceof RemoteError && e.message === 'sem sessão') return
  console.warn(`[sync] falha em ${op}:`, e)
}

// ---------- row mapping ----------

interface FolderRow {
  id: string; parent_id: string | null; name: string; visible: boolean; expanded: boolean; created_at: string
}
interface TrackRow {
  id: string; folder_id: string | null; name: string; color: string; visible: boolean
  distance_m: number; gain_m: number; bbox: [number, number, number, number]
  profile: number[]; geometry?: TrackGeometry; file_hash: string; created_at: string
}
interface PointRow {
  id: string; track_id: string | null; category: Cat; pin_color: string | null; name: string
  notes: string; lat: number; lng: number; visible: boolean
  comments: Point['comments']; created_at: string
}

const folderToRow = (f: Folder) => ({
  id: f.id, parent_id: f.parentId, name: f.name, visible: f.visible, expanded: f.expanded,
})
export const rowToFolder = (r: FolderRow): Folder => ({
  id: r.id, parentId: r.parent_id, name: r.name, visible: r.visible, expanded: r.expanded,
  createdAt: Date.parse(r.created_at) || Date.now(),
})

const trackToRow = (t: Track) => ({
  id: t.id, folder_id: t.folderId, name: t.name, color: t.color, visible: t.visible,
  distance_m: t.distanceM, gain_m: t.gainM, bbox: t.bbox, profile: t.profile,
  geometry: t.geometry, file_hash: t.fileHash,
})
export const rowToTrack = (r: TrackRow, geometry: TrackGeometry): Track => ({
  id: r.id, folderId: r.folder_id, name: r.name, color: r.color, visible: r.visible,
  distanceM: r.distance_m, gainM: r.gain_m, bbox: r.bbox, profile: r.profile ?? [],
  geometry, fileHash: r.file_hash, createdAt: Date.parse(r.created_at) || Date.now(),
})

const pointToRow = (p: Point) => ({
  id: p.id, track_id: p.trackId, category: p.cat, pin_color: p.cat === 'pin' ? p.color : null,
  name: p.name, notes: p.notes, lat: p.lat, lng: p.lng, visible: p.visible, comments: p.comments,
})
export const rowToPoint = (r: PointRow): Point => ({
  id: r.id, trackId: r.track_id, cat: r.category, name: r.name, notes: r.notes ?? '',
  lat: r.lat, lng: r.lng, color: r.pin_color ?? '#ff8a1a', visible: r.visible,
  photos: [], // fotos são locais no MVP (ver PRD §6)
  comments: r.comments ?? [], createdAt: Date.parse(r.created_at) || Date.now(),
})

// ---------- pull ----------

export interface RemoteLibrary {
  folders: Folder[]
  trackRows: TrackRow[]
  points: Point[]
}

const TRACK_META_COLS = 'id,folder_id,name,color,visible,distance_m,gain_m,bbox,profile,file_hash,created_at'

export async function pullLibrary(): Promise<RemoteLibrary> {
  const [folders, tracks, points] = await Promise.all([
    req('folders?select=*&order=created_at').then(r => r.json() as Promise<FolderRow[]>),
    req(`tracks?select=${TRACK_META_COLS}&order=created_at`).then(r => r.json() as Promise<TrackRow[]>),
    req('points?select=*&order=created_at').then(r => r.json() as Promise<PointRow[]>),
  ])
  return { folders: folders.map(rowToFolder), trackRows: tracks, points: points.map(rowToPoint) }
}

export async function pullGeometries(ids: string[]): Promise<Map<string, TrackGeometry>> {
  const out = new Map<string, TrackGeometry>()
  for (let i = 0; i < ids.length; i += 20) {
    const chunk = ids.slice(i, i + 20)
    const rows = (await req(`tracks?select=id,geometry&id=in.(${chunk.join(',')})`).then(r => r.json())) as {
      id: string; geometry: TrackGeometry
    }[]
    for (const r of rows) out.set(r.id, r.geometry)
  }
  return out
}

// ---------- push (write-through; fire-and-forget with one retry) ----------

async function upsert(table: string, rows: object[], onConflict = 'id') {
  if (!rows.length) return
  await req(`${table}?on_conflict=${onConflict}`, {
    method: 'POST',
    headers: { Prefer: 'resolution=merge-duplicates,return=minimal' },
    body: JSON.stringify(rows),
  })
}

async function withRetry(op: string, fn: () => Promise<void>) {
  try {
    await fn()
  } catch (e1) {
    if (e1 instanceof RemoteError && e1.message === 'sem sessão') return
    await new Promise(r => setTimeout(r, 1200))
    try {
      await fn()
    } catch (e2) {
      warn(op, e2)
    }
  }
}

/** Upsert every row and delete the user's rows that are no longer present. */
async function replaceAll(table: string, rows: object[], ids: string[]) {
  await upsert(table, rows)
  const filter = ids.length ? `id=not.in.(${ids.join(',')})` : 'id=not.is.null'
  await req(`${table}?${filter}`, { method: 'DELETE', headers: { Prefer: 'return=minimal' } })
}

export function pushFoldersSnapshot(folders: Folder[]) {
  if (!canPush()) return
  withRetry('folders', () => replaceAll('folders', folders.map(folderToRow), folders.map(f => f.id)))
}

export function pushPointsSnapshot(points: Point[]) {
  if (!canPush()) return
  withRetry('points', () => replaceAll('points', points.map(pointToRow), points.map(p => p.id)))
}

export function pushTrack(t: Track) {
  if (!canPush()) return
  withRetry('track', () => upsert('tracks', [trackToRow(t)]))
}

export function pushTrackDelete(id: string) {
  if (!canPush()) return
  withRetry('track-delete', async () => {
    await req(`tracks?id=eq.${id}`, { method: 'DELETE', headers: { Prefer: 'return=minimal' } })
  })
}

export function pushGpx(hash: string, name: string, text: string) {
  if (!canPush()) return
  withRetry('gpx', async () => {
    const content = await gzipBase64(text)
    await req('gpx_files?on_conflict=user_id,hash', {
      method: 'POST',
      headers: { Prefer: 'resolution=ignore-duplicates,return=minimal' },
      body: JSON.stringify([{ hash, name, content }]),
    })
  })
}

// ---------- helpers ----------

async function gzipBase64(text: string): Promise<string> {
  const stream = new Blob([text]).stream().pipeThrough(new CompressionStream('gzip'))
  const buf = await new Response(stream).arrayBuffer()
  const bytes = new Uint8Array(buf)
  let bin = ''
  for (let i = 0; i < bytes.length; i += 0x8000) {
    bin += String.fromCharCode(...bytes.subarray(i, i + 0x8000))
  }
  return btoa(bin)
}
