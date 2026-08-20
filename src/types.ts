export type Cat = 'agua' | 'cidade' | 'park' | 'pin'

export interface Folder {
  id: string
  parentId: string | null
  name: string
  visible: boolean
  expanded: boolean
  createdAt: number
}

export interface TrackGeometry {
  type: 'MultiLineString'
  coordinates: [number, number][][]
}

export interface Track {
  id: string
  folderId: string | null
  name: string
  color: string
  visible: boolean
  distanceM: number
  gainM: number
  /** [west, south, east, north] */
  bbox: [number, number, number, number]
  /** elevation profile, ~60 samples (m); empty when the file has no elevation */
  profile: number[]
  geometry: TrackGeometry
  fileHash: string
  createdAt: number
}

export interface Photo {
  id: string
  cap: string
}

export interface PointComment {
  id: string
  author: string
  when: string
  text: string
}

export interface Point {
  id: string
  trackId: string | null
  cat: Cat
  name: string
  notes: string
  lat: number
  lng: number
  color: string
  visible: boolean
  photos: Photo[]
  comments: PointComment[]
  createdAt: number
}

export const PAL = ['#ff8a1a', '#fde047', '#a3e635', '#2dd4bf', '#22d3ee', '#5b8cff', '#f23fd0', '#ff4d4d']

export const CAT_LABEL: Record<Cat, string> = { agua: 'Cachoeira', cidade: 'Cidade', park: 'Estacionamento', pin: 'Pin' }
export const CAT_PLURAL: Record<Cat, string> = { agua: 'Cachoeiras', cidade: 'Cidades', park: 'Estacionamentos', pin: 'Pins' }
export const CATS: Cat[] = ['agua', 'cidade', 'park', 'pin']
export const CAT_DOT: Record<Cat, string> = { agua: '#7dd3fc', cidade: '#e6e8ec', park: '#2f6bdb', pin: '#f59e0b' }

export function uid(): string {
  return crypto.randomUUID()
}
