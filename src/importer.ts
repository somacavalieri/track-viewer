import { putRawGpx } from './db'
import { fmtCoord } from './geo'
import { parseGpxFile } from './gpx'
import { useStore } from './store'
import { uid, type Point, type Track } from './types'

/** Collect .gpx Files from a drop event (supports whole-folder drops). */
export async function filesFromDrop(dt: DataTransfer): Promise<File[]> {
  const out: File[] = []
  const items = [...dt.items]
  const entries = items
    .map(i => (typeof i.webkitGetAsEntry === 'function' ? i.webkitGetAsEntry() : null))
    .filter(Boolean) as FileSystemEntry[]

  if (!entries.length) {
    return [...dt.files].filter(isGpx)
  }

  const walk = async (entry: FileSystemEntry): Promise<void> => {
    if (entry.isFile) {
      const file = await new Promise<File>((res, rej) => (entry as FileSystemFileEntry).file(res, rej)).catch(() => null)
      if (file && isGpx(file)) out.push(file)
    } else if (entry.isDirectory) {
      const reader = (entry as FileSystemDirectoryEntry).createReader()
      // readEntries returns batches of ≤100; loop until empty
      for (;;) {
        const batch = await new Promise<FileSystemEntry[]>((res, rej) => reader.readEntries(res, rej)).catch(() => [])
        if (!batch.length) break
        for (const e of batch) await walk(e)
      }
    }
  }
  for (const e of entries) await walk(e)
  return out
}

function isGpx(f: File): boolean {
  return /\.gpx$/i.test(f.name)
}

/** Runs the batch import. Adds tracks/waypoints incrementally, skips duplicates
 *  by file hash, isolates per-file errors, reports at the end. */
export async function runImport(files: File[], destFolderId: string | null): Promise<void> {
  const store = useStore.getState()
  const gpxFiles = files.filter(isGpx)
  if (!gpxFiles.length) {
    store.showToast('Nenhum arquivo .gpx encontrado')
    return
  }

  useStore.setState(s => ({ im: { ...s.im, phase: 'run', done: 0, total: gpxFiles.length, current: '', drag: false } }))

  const seen = new Set(useStore.getState().tracks.map(t => t.fileHash))
  let ok = 0
  let dup = 0
  const errors: string[] = []

  for (let i = 0; i < gpxFiles.length; i++) {
    const file = gpxFiles[i]
    useStore.setState(s => ({ im: { ...s.im, done: i, current: file.name } }))
    // yield so the UI keeps painting between files
    await new Promise(r => setTimeout(r, 0))
    try {
      const parsed = await parseGpxFile(file)
      if (seen.has(parsed.hash)) {
        dup++
        continue
      }
      seen.add(parsed.hash)

      const st = useStore.getState()
      const tracks: Track[] = parsed.tracks.map((t, j) => ({
        id: uid(),
        folderId: destFolderId,
        name: parsed.tracks.length > 1 && t.name === parsed.tracks[0].name && j > 0 ? `${t.name} (${j + 1})` : t.name,
        color: st.nextColor(),
        visible: true,
        distanceM: t.distanceM,
        gainM: t.gainM,
        bbox: t.bbox,
        profile: t.profile,
        geometry: t.geometry,
        fileHash: parsed.hash,
        createdAt: Date.now(),
      }))
      // waypoints from the file become generic pins linked to the file's first track (RF-12)
      const linkId = tracks[0]?.id ?? null
      const points: Point[] = parsed.waypoints.map(w => ({
        id: uid(),
        trackId: linkId,
        cat: 'pin',
        name: w.name,
        notes: '',
        lat: w.lat,
        lng: w.lng,
        color: '#ff8a1a',
        visible: true,
        photos: [],
        comments: [],
        createdAt: Date.now(),
      }))
      if (tracks.length || points.length) {
        st.addTracks(tracks, points)
        putRawGpx(parsed.hash, file.name, parsed.text)
        ok += tracks.length
      }
    } catch (e) {
      errors.push(`Falha ao ler: ${file.name} (${e instanceof Error ? e.message : 'erro'})`)
    }
  }

  useStore.setState(s => ({
    im: {
      ...s.im,
      phase: 'done',
      done: gpxFiles.length,
      report: { ok, dup, err: errors.length, errors: errors.slice(0, 4) },
    },
  }))
}

export { fmtCoord }
