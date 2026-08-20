import { gpx } from '@tmcw/togeojson'
import simplify from 'simplify-js'
import { emptyBBox, extendBBox, haversine, type BBox } from './geo'
import type { TrackGeometry } from './types'

export interface ParsedWaypoint {
  name: string
  lat: number
  lng: number
}

export interface ParsedTrack {
  name: string
  geometry: TrackGeometry
  distanceM: number
  gainM: number
  bbox: BBox
  profile: number[]
}

export interface ParsedGpx {
  hash: string
  text: string
  tracks: ParsedTrack[]
  waypoints: ParsedWaypoint[]
}

export async function sha256hex(text: string): Promise<string> {
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text))
  return [...new Uint8Array(buf)].map(b => b.toString(16).padStart(2, '0')).join('')
}

const MAX_POINTS = 3000

/** Parses a .gpx file: tracks (<trk>, multi-segment) and routes (<rte>) become
 *  track entries; <wpt> become waypoints. Throws on invalid XML / empty files. */
export async function parseGpxFile(file: File): Promise<ParsedGpx> {
  const text = await file.text()
  const hash = await sha256hex(text)
  const doc = new DOMParser().parseFromString(text, 'application/xml')
  if (doc.querySelector('parsererror')) throw new Error('XML inválido')
  const fc = gpx(doc)

  const baseName = file.name.replace(/\.gpx$/i, '')
  const tracks: ParsedTrack[] = []
  const waypoints: ParsedWaypoint[] = []

  for (const feat of fc.features) {
    const g = feat.geometry
    if (!g) continue
    if (g.type === 'Point') {
      const [lng, lat] = g.coordinates as number[]
      waypoints.push({ name: String(feat.properties?.name || 'Waypoint'), lat, lng })
      continue
    }
    let lines: number[][][] = []
    if (g.type === 'LineString') lines = [g.coordinates as number[][]]
    else if (g.type === 'MultiLineString') lines = g.coordinates as number[][][]
    else continue
    lines = lines.filter(l => l.length >= 2)
    if (!lines.length) continue

    const name = String(feat.properties?.name || '').trim() || baseName
    tracks.push(buildTrack(name, lines))
  }

  if (!tracks.length && !waypoints.length) throw new Error('Sem trilhas ou pontos no arquivo')
  return { hash, text, tracks, waypoints }
}

function buildTrack(name: string, lines: number[][][]): ParsedTrack {
  const bbox = emptyBBox()
  let dist = 0
  const elevations: number[] = []

  for (const line of lines) {
    for (let i = 0; i < line.length; i++) {
      const [lng, lat, ele] = line[i]
      extendBBox(bbox, lng, lat)
      if (typeof ele === 'number' && isFinite(ele)) elevations.push(ele)
      if (i > 0) dist += haversine(line[i - 1][1], line[i - 1][0], lat, lng)
    }
  }

  const smoothed = movingAverage(elevations, 5)
  let gain = 0
  for (let i = 1; i < smoothed.length; i++) {
    const d = smoothed[i] - smoothed[i - 1]
    if (d > 0) gain += d
  }

  const profile = resample(smoothed, 60)

  const coordinates = lines.map(line => {
    if (line.length <= MAX_POINTS) return line.map(p => [p[0], p[1]] as [number, number])
    let tol = 0.00002
    let pts = line.map(p => ({ x: p[0], y: p[1] }))
    let out = pts
    for (let i = 0; i < 12 && out.length > MAX_POINTS; i++) {
      out = simplify(pts, tol, true)
      tol *= 1.8
    }
    return out.map(p => [p.x, p.y] as [number, number])
  })

  return {
    name,
    geometry: { type: 'MultiLineString', coordinates },
    distanceM: dist,
    gainM: gain,
    bbox,
    profile,
  }
}

function movingAverage(v: number[], w: number): number[] {
  if (v.length < w) return v.slice()
  const out: number[] = []
  let sum = 0
  for (let i = 0; i < v.length; i++) {
    sum += v[i]
    if (i >= w) sum -= v[i - w]
    out.push(sum / Math.min(i + 1, w))
  }
  return out
}

function resample(v: number[], n: number): number[] {
  if (v.length === 0) return []
  if (v.length <= n) return v.slice()
  const out: number[] = []
  for (let i = 0; i < n; i++) out.push(v[Math.round((i * (v.length - 1)) / (n - 1))])
  return out
}
