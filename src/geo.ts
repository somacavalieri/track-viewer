/** Coordinate parsing/formatting + geodesy helpers. */

export interface LatLng { lat: number; lng: number }

/**
 * Accepts decimal ("-20.3040, -46.5250", comma decimals too) and DMS
 * ("20°18'14\"S 46°31'30\"O" — O/W both mean west).
 * Returns null for empty input, undefined for unrecognized input.
 */
export function parseCoords(str: string): LatLng | null | undefined {
  const s = (str || '').trim()
  if (!s) return null
  let m = s.match(/^(-?\d{1,3}(?:\.\d+)?)[\s,;]+(-?\d{1,3}(?:\.\d+)?)$/)
  if (m) return check({ lat: parseFloat(m[1]), lng: parseFloat(m[2]) })
  m = s.match(/^(-?\d{1,3}(?:,\d+)?)[;\s]+(-?\d{1,3}(?:,\d+)?)$/)
  if (m) return check({ lat: parseFloat(m[1].replace(',', '.')), lng: parseFloat(m[2].replace(',', '.')) })
  const dms = /(\d{1,3})[°º]\s*(\d{1,2})['′]\s*(?:(\d{1,2}(?:[.,]\d+)?)["″])?\s*([NSns])[\s,;]+(\d{1,3})[°º]\s*(\d{1,2})['′]\s*(?:(\d{1,2}(?:[.,]\d+)?)["″])?\s*([LOWElowe])/
  m = s.match(dms)
  if (m) {
    const num = (x: string | undefined) => parseFloat((x || '0').replace(',', '.'))
    let lat = num(m[1]) + num(m[2]) / 60 + num(m[3]) / 3600
    let lng = num(m[5]) + num(m[6]) / 60 + num(m[7]) / 3600
    if (/[Ss]/.test(m[4])) lat = -lat
    if (/[OoWw]/.test(m[8])) lng = -lng
    return check({ lat, lng })
  }
  return undefined
}

function check(p: LatLng): LatLng | undefined {
  if (!isFinite(p.lat) || !isFinite(p.lng)) return undefined
  if (Math.abs(p.lat) > 90 || Math.abs(p.lng) > 180) return undefined
  return p
}

export function fmtCoord(lat: number, lng: number): string {
  return lat.toFixed(4) + ', ' + lng.toFixed(4)
}

const nf1 = new Intl.NumberFormat('pt-BR', { minimumFractionDigits: 1, maximumFractionDigits: 1 })
const nf0 = new Intl.NumberFormat('pt-BR', { maximumFractionDigits: 0 })

export function fmtKm(distanceM: number): string {
  return nf1.format(distanceM / 1000) + ' km'
}

export function fmtGain(gainM: number): string {
  return '+' + nf0.format(Math.round(gainM)) + ' m'
}

const R = 6371000
export function haversine(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const toRad = (d: number) => (d * Math.PI) / 180
  const dLat = toRad(lat2 - lat1)
  const dLon = toRad(lon2 - lon1)
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2
  return 2 * R * Math.asin(Math.sqrt(a))
}

export type BBox = [number, number, number, number]

export function emptyBBox(): BBox {
  return [Infinity, Infinity, -Infinity, -Infinity]
}

export function extendBBox(b: BBox, lng: number, lat: number): void {
  if (lng < b[0]) b[0] = lng
  if (lat < b[1]) b[1] = lat
  if (lng > b[2]) b[2] = lng
  if (lat > b[3]) b[3] = lat
}

export function unionBBox(a: BBox, b: BBox): BBox {
  return [Math.min(a[0], b[0]), Math.min(a[1], b[1]), Math.max(a[2], b[2]), Math.max(a[3], b[3])]
}

export function bboxValid(b: BBox): boolean {
  return isFinite(b[0]) && isFinite(b[1]) && isFinite(b[2]) && isFinite(b[3])
}
