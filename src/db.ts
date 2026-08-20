import { openDB, type IDBPDatabase } from 'idb'
import { pushFoldersSnapshot, pushGpx, pushPointsSnapshot, pushTrack, pushTrackDelete } from './remote'
import type { Folder, Point, Track } from './types'

/** Local persistence (IndexedDB) with write-through sync to the Neon Data API.
 *  When Neon isn't configured (or the user is signed out) the push helpers
 *  no-op and the app is fully local. */

let dbp: Promise<IDBPDatabase> | null = null

function db() {
  dbp ??= openDB('track-viewer', 1, {
    upgrade(d) {
      d.createObjectStore('kv')
      d.createObjectStore('tracks')
      d.createObjectStore('photos')
      d.createObjectStore('gpx')
    },
  })
  return dbp
}

export async function loadLibrary(): Promise<{ folders: Folder[]; points: Point[]; tracks: Track[] }> {
  const d = await db()
  const [folders, points, tracks] = await Promise.all([
    d.get('kv', 'folders'),
    d.get('kv', 'points'),
    d.getAll('tracks'),
  ])
  return { folders: folders ?? [], points: points ?? [], tracks: (tracks ?? []) as Track[] }
}

export async function saveFolders(folders: Folder[]) {
  await (await db()).put('kv', folders, 'folders')
  pushFoldersSnapshot(folders)
}

export async function savePoints(points: Point[]) {
  await (await db()).put('kv', points, 'points')
  pushPointsSnapshot(points)
}

export async function putTrack(t: Track) {
  await (await db()).put('tracks', t, t.id)
  pushTrack(t)
}

export async function deleteTrackRec(id: string) {
  await (await db()).delete('tracks', id)
  pushTrackDelete(id)
}

/** Original .gpx text preserved, keyed by file hash (RF-17). */
export async function putRawGpx(hash: string, name: string, text: string) {
  await (await db()).put('gpx', { name, text }, hash)
  pushGpx(hash, name, text)
}

export async function getAllRawGpx(): Promise<{ hash: string; name: string; text: string }[]> {
  const d = await db()
  const keys = (await d.getAllKeys('gpx')) as string[]
  const out: { hash: string; name: string; text: string }[] = []
  for (const hash of keys) {
    const rec = (await d.get('gpx', hash)) as { name: string; text: string } | undefined
    if (rec) out.push({ hash, name: rec.name, text: rec.text })
  }
  return out
}

export async function putPhotoBlob(id: string, blob: Blob) {
  ;(await db()).put('photos', blob, id)
}

export async function getPhotoBlob(id: string): Promise<Blob | undefined> {
  return (await db()).get('photos', id)
}

export async function deletePhotoBlob(id: string) {
  ;(await db()).delete('photos', id)
}
