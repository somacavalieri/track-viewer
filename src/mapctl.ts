import type maplibregl from 'maplibre-gl'
import type { BBox } from './geo'

/** Thin bridge so panels/sidebar can drive the map without owning it. */

let map: maplibregl.Map | null = null
let readoutEl: HTMLElement | null = null

export const mapctl = {
  set(m: maplibregl.Map | null) {
    map = m
  },
  get(): maplibregl.Map | null {
    return map
  },
  fitBounds(bbox: BBox) {
    map?.fitBounds([[bbox[0], bbox[1]], [bbox[2], bbox[3]]], { padding: 90, maxZoom: 14.5, duration: 900 })
  },
  flyTo(lng: number, lat: number, minZoom = 14) {
    if (!map) return
    map.flyTo({ center: [lng, lat], zoom: Math.max(map.getZoom(), minZoom), duration: 900 })
  },
  center(): { lat: number; lng: number } {
    const c = map?.getCenter()
    return c ? { lat: c.lat, lng: c.lng } : { lat: -20.3, lng: -46.5 }
  },
  zoomIn() {
    map?.zoomIn()
  },
  zoomOut() {
    map?.zoomOut()
  },
  setReadout(el: HTMLElement | null) {
    readoutEl = el
    if (el && !el.textContent) el.textContent = '—'
  },
  writeReadout(text: string) {
    if (readoutEl) readoutEl.textContent = text
  },
}
