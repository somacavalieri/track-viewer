import { getAllRawGpx, putTrack, saveFolders, savePoints } from './db'
import { gate, pullGeometries, pullLibrary, pushFoldersSnapshot, pushGpx, pushPointsSnapshot, pushTrack, rowToTrack } from './remote'
import type { Folder, Point, Track, TrackGeometry } from './types'

export interface Library {
  folders: Folder[]
  tracks: Track[]
  points: Point[]
}

/**
 * Pulls the remote library (remote wins) and returns the merged result, or
 * null when the local library is the one to keep (bootstrap: remote was empty,
 * local content was pushed up instead). Geometries are hydrated lazily —
 * reused from the local cache when present, batch-fetched otherwise (RNF-01).
 */
export async function initialSync(local: Library): Promise<Library | null> {
  const remote = await pullLibrary()
  const remoteEmpty = !remote.folders.length && !remote.trackRows.length && !remote.points.length
  const localEmpty = !local.folders.length && !local.tracks.length && !local.points.length

  if (remoteEmpty && !localEmpty) {
    // first device to sync: seed the server with the local library
    pushFoldersSnapshot(local.folders)
    local.tracks.forEach(t => pushTrack(t))
    pushPointsSnapshot(local.points)
    for (const g of await getAllRawGpx()) pushGpx(g.hash, g.name, g.text)
    return null
  }

  const localGeom = new Map<string, TrackGeometry>(local.tracks.map(t => [t.id, t.geometry]))
  const missing = remote.trackRows.filter(r => !localGeom.has(r.id)).map(r => r.id)
  const fetched = missing.length ? await pullGeometries(missing) : new Map<string, TrackGeometry>()

  const tracks: Track[] = []
  for (const row of remote.trackRows) {
    const geometry = localGeom.get(row.id) ?? fetched.get(row.id)
    if (!geometry) {
      console.warn('[sync] trilha sem geometria, ignorada:', row.id, row.name)
      continue
    }
    tracks.push(rowToTrack(row, geometry))
  }

  // remote wins, but photos are local-only: carry them over by point id
  const localPhotos = new Map(local.points.map(p => [p.id, p.photos]))
  const points = remote.points.map(p => ({ ...p, photos: localPhotos.get(p.id) ?? [] }))

  // refresh the local cache without echoing back to the server
  gate.applying = true
  try {
    await saveFolders(remote.folders)
    await savePoints(points)
    for (const t of tracks) await putTrack(t)
  } finally {
    gate.applying = false
  }

  return { folders: remote.folders, tracks, points }
}
