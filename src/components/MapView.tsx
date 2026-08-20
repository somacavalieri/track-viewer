import maplibregl from 'maplibre-gl'
import 'maplibre-gl/dist/maplibre-gl.css'
import { useEffect, useMemo, useRef } from 'react'
import { fmtCoord, unionBBox, bboxValid, emptyBBox, type BBox } from '../geo'
import { mapctl } from '../mapctl'
import { useStore } from '../store'
import { markerSVG } from './icons'

const ESRI = 'https://server.arcgisonline.com/ArcGIS/rest/services'

const DASH_SEQ: number[][] = [
  [0, 4, 3], [0.5, 4, 2.5], [1, 4, 2], [1.5, 4, 1.5], [2, 4, 1], [2.5, 4, 0.5], [3, 4, 0],
  [0, 0.5, 3, 3.5], [0, 1, 3, 3], [0, 1.5, 3, 2.5], [0, 2, 3, 2], [0, 2.5, 3, 1.5], [0, 3, 3, 1], [0, 3.5, 3, 0.5],
]

interface SavedView { lng: number; lat: number; zoom: number }

function savedView(): SavedView | null {
  try {
    const v = localStorage.getItem('tv-view')
    return v ? (JSON.parse(v) as SavedView) : null
  } catch {
    return null
  }
}

export function MapView() {
  const containerRef = useRef<HTMLDivElement>(null)
  const mapRef = useRef<maplibregl.Map | null>(null)
  const readyRef = useRef(false)
  const markersRef = useRef(new Map<string, maplibregl.Marker>())
  const hoverIdRef = useRef<string | null>(null)
  const selIdRef = useRef<string | null>(null)
  const dashTimerRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const ghostRef = useRef<maplibregl.Marker | null>(null)
  const pickPinRef = useRef<maplibregl.Marker | null>(null)
  // primeira visita (sem view salva): enquadra as trilhas assim que existirem
  const autoFitRef = useRef(savedView() === null)

  const folders = useStore(s => s.folders)
  const tracks = useStore(s => s.tracks)
  const points = useStore(s => s.points)
  const catVisible = useStore(s => s.catVisible)
  const hoverT = useStore(s => s.hoverT)
  const selT = useStore(s => s.selT)
  const selP = useStore(s => s.selP)
  const picking = useStore(s => s.modal === 'point' && s.pm.picking)
  const pmLat = useStore(s => s.pm.lat)
  const pmLng = useStore(s => s.pm.lng)

  const eff = useMemo(() => useStore.getState().folderEff(), [folders])

  const visibleTracks = useMemo(
    () => tracks.filter(t => (t.folderId ? eff[t.folderId] : true) && t.visible),
    [tracks, eff],
  )

  const trackEffVisible = (trackId: string | null) => {
    if (!trackId) return true
    const t = tracks.find(x => x.id === trackId)
    if (!t) return true
    return (t.folderId ? eff[t.folderId] : true) && t.visible
  }

  const visiblePoints = useMemo(
    () => points.filter(p => catVisible[p.cat] && p.visible && trackEffVisible(p.trackId)),
    [points, catVisible, tracks, eff],
  )

  const geojson = useMemo(
    () => ({
      type: 'FeatureCollection' as const,
      features: visibleTracks.map(t => ({
        type: 'Feature' as const,
        properties: { id: t.id, color: t.color },
        geometry: t.geometry,
      })),
    }),
    [visibleTracks],
  )

  // ---------- init ----------
  useEffect(() => {
    if (!containerRef.current) return
    const sv = savedView()
    const map = new maplibregl.Map({
      container: containerRef.current,
      center: sv ? [sv.lng, sv.lat] : [-46.8, -20.6],
      zoom: sv ? sv.zoom : 5.2,
      attributionControl: false,
      style: {
        version: 8,
        sources: {
          sat: {
            type: 'raster',
            tiles: [`${ESRI}/World_Imagery/MapServer/tile/{z}/{y}/{x}`],
            tileSize: 256,
            maxzoom: 19,
          },
          roads: {
            type: 'raster',
            tiles: [`${ESRI}/Reference/World_Transportation/MapServer/tile/{z}/{y}/{x}`],
            tileSize: 256,
            maxzoom: 19,
          },
          ref: {
            type: 'raster',
            tiles: [`${ESRI}/Reference/World_Boundaries_and_Places/MapServer/tile/{z}/{y}/{x}`],
            tileSize: 256,
            maxzoom: 19,
          },
          tracks: {
            type: 'geojson',
            data: { type: 'FeatureCollection', features: [] },
            promoteId: 'id',
          },
        },
        layers: [
          { id: 'sat', type: 'raster', source: 'sat' },
          { id: 'roads', type: 'raster', source: 'roads', paint: { 'raster-opacity': 0.85 } },
          { id: 'ref', type: 'raster', source: 'ref' },
        ],
      },
    })
    mapRef.current = map
    mapctl.set(map)

    const bump = (extra: number): maplibregl.ExpressionSpecification => [
      'case',
      ['boolean', ['feature-state', 'sel'], false], 1.8 + extra,
      ['boolean', ['feature-state', 'hover'], false], 1.6 + extra,
      extra,
    ]
    // zoom expressions must be the top-level interpolate; the feature-state
    // bump goes inside each stop's output
    const widthExpr = (extra: number): maplibregl.ExpressionSpecification => [
      'interpolate', ['linear'], ['zoom'],
      6, ['+', 2, bump(extra)],
      10, ['+', 3, bump(extra)],
      13, ['+', 3.9, bump(extra)],
      16, ['+', 5.4, bump(extra)],
    ]

    map.on('load', () => {
      map.addLayer({
        id: 'trk-glow',
        type: 'line',
        source: 'tracks',
        layout: { 'line-cap': 'round', 'line-join': 'round' },
        paint: {
          'line-color': ['get', 'color'],
          'line-width': widthExpr(10),
          'line-blur': 8,
          'line-opacity': [
            'case',
            ['boolean', ['feature-state', 'sel'], false], 0.5,
            ['boolean', ['feature-state', 'hover'], false], 0.4,
            0,
          ],
        },
      })
      map.addLayer({
        id: 'trk-casing',
        type: 'line',
        source: 'tracks',
        layout: { 'line-cap': 'round', 'line-join': 'round' },
        paint: {
          'line-color': [
            'case',
            ['boolean', ['feature-state', 'sel'], false], 'rgba(255,255,255,.9)',
            'rgba(8,10,12,.72)',
          ],
          'line-width': widthExpr(3.4),
          'line-opacity': 0.85,
        },
      })
      map.addLayer({
        id: 'trk-line',
        type: 'line',
        source: 'tracks',
        layout: { 'line-cap': 'round', 'line-join': 'round' },
        paint: {
          'line-color': ['get', 'color'],
          'line-width': widthExpr(0),
        },
      })
      map.addLayer({
        id: 'trk-dash',
        type: 'line',
        source: 'tracks',
        filter: ['==', ['get', 'id'], '___none'],
        layout: { 'line-cap': 'round', 'line-join': 'round' },
        paint: {
          'line-color': '#fff',
          'line-width': 1.3,
          'line-opacity': 0.95,
          'line-dasharray': DASH_SEQ[0],
        },
      })
      map.addLayer({
        id: 'trk-hit',
        type: 'line',
        source: 'tracks',
        layout: { 'line-cap': 'round', 'line-join': 'round' },
        paint: { 'line-color': 'rgba(0,0,0,0)', 'line-width': 20 },
      })
      readyRef.current = true
      const src = map.getSource('tracks') as maplibregl.GeoJSONSource | undefined
      src?.setData(useStore.getState().tracks.length ? buildGeojson() : { type: 'FeatureCollection', features: [] })
      autoFitOnce()
    })

    function buildGeojson() {
      const st = useStore.getState()
      const e = st.folderEff()
      const vis = st.tracks.filter(t => (t.folderId ? e[t.folderId] : true) && t.visible)
      return {
        type: 'FeatureCollection' as const,
        features: vis.map(t => ({
          type: 'Feature' as const,
          properties: { id: t.id, color: t.color },
          geometry: t.geometry,
        })),
      }
    }

    // hover + click on tracks
    map.on('mousemove', e => {
      const st = useStore.getState()
      if (st.modal === 'point' && st.pm.picking) {
        mapctl.writeReadout(fmtCoord(e.lngLat.lat, e.lngLat.lng))
        ghostRef.current?.setLngLat(e.lngLat)
        return
      }
      if (!readyRef.current || !map.getLayer('trk-hit')) return
      const feats = map.queryRenderedFeatures(
        [[e.point.x - 3, e.point.y - 3], [e.point.x + 3, e.point.y + 3]],
        { layers: ['trk-hit'] },
      )
      const id = feats.length ? String(feats[0].properties?.id ?? '') || null : null
      map.getCanvas().style.cursor = id ? 'pointer' : ''
      if (id !== st.hoverT) st.set({ hoverT: id })
    })

    map.on('click', e => {
      const st = useStore.getState()
      if (st.modal === 'point' && st.pm.picking) {
        st.setPmPos(e.lngLat.lat, e.lngLat.lng)
        mapctl.writeReadout(fmtCoord(e.lngLat.lat, e.lngLat.lng))
        return
      }
      if (!readyRef.current || !map.getLayer('trk-hit')) return
      const feats = map.queryRenderedFeatures(
        [[e.point.x - 4, e.point.y - 4], [e.point.x + 4, e.point.y + 4]],
        { layers: ['trk-hit'] },
      )
      if (feats.length) {
        const id = String(feats[0].properties?.id ?? '')
        if (id) {
          st.selectTrack(id)
          return
        }
      }
      st.set({ selT: null, selP: null, palOpen: false })
    })

    // middle-button pan (intercepts browser autoscroll)
    const canvas = map.getCanvas()
    const onMouseDown = (ev: MouseEvent) => {
      if (ev.button !== 1) return
      ev.preventDefault()
      let last = { x: ev.clientX, y: ev.clientY }
      canvas.style.cursor = 'grabbing'
      const onMove = (m: MouseEvent) => {
        map.panBy([last.x - m.clientX, last.y - m.clientY], { animate: false })
        last = { x: m.clientX, y: m.clientY }
      }
      const onUp = () => {
        window.removeEventListener('mousemove', onMove)
        window.removeEventListener('mouseup', onUp)
        canvas.style.cursor = ''
      }
      window.addEventListener('mousemove', onMove)
      window.addEventListener('mouseup', onUp)
    }
    canvas.addEventListener('mousedown', onMouseDown)

    map.on('moveend', () => {
      const c = map.getCenter()
      try {
        localStorage.setItem('tv-view', JSON.stringify({ lng: c.lng, lat: c.lat, zoom: map.getZoom() }))
      } catch { /* ignore */ }
    })

    return () => {
      canvas.removeEventListener('mousedown', onMouseDown)
      mapctl.set(null)
      markersRef.current.forEach(m => m.remove())
      markersRef.current.clear()
      map.remove()
      mapRef.current = null
      readyRef.current = false
    }
  }, [])

  // ---------- track data sync ----------
  useEffect(() => {
    const map = mapRef.current
    if (!map || !readyRef.current) return
    const src = map.getSource('tracks') as maplibregl.GeoJSONSource | undefined
    src?.setData(geojson as GeoJSON.FeatureCollection)
    autoFitOnce()
  }, [geojson])

  // ---------- hover feature-state ----------
  useEffect(() => {
    const map = mapRef.current
    if (!map || !readyRef.current) return
    if (hoverIdRef.current && hoverIdRef.current !== hoverT)
      map.setFeatureState({ source: 'tracks', id: hoverIdRef.current }, { hover: false })
    if (hoverT) map.setFeatureState({ source: 'tracks', id: hoverT }, { hover: true })
    hoverIdRef.current = hoverT
  }, [hoverT])

  // ---------- selection feature-state + animated dash ----------
  useEffect(() => {
    const map = mapRef.current
    if (!map || !readyRef.current) return
    if (selIdRef.current && selIdRef.current !== selT)
      map.setFeatureState({ source: 'tracks', id: selIdRef.current }, { sel: false })
    if (selT) map.setFeatureState({ source: 'tracks', id: selT }, { sel: true })
    selIdRef.current = selT

    if (map.getLayer('trk-dash')) map.setFilter('trk-dash', ['==', ['get', 'id'], selT ?? '___none'])
    if (dashTimerRef.current) {
      clearInterval(dashTimerRef.current)
      dashTimerRef.current = null
    }
    if (selT) {
      let step = 0
      dashTimerRef.current = setInterval(() => {
        step = (step + 1) % DASH_SEQ.length
        if (map.getLayer('trk-dash')) map.setPaintProperty('trk-dash', 'line-dasharray', DASH_SEQ[step])
      }, 70)
    }
    return () => {
      if (dashTimerRef.current) {
        clearInterval(dashTimerRef.current)
        dashTimerRef.current = null
      }
    }
  }, [selT])

  // ---------- point markers ----------
  useEffect(() => {
    const map = mapRef.current
    if (!map) return
    markersRef.current.forEach(m => m.remove())
    markersRef.current.clear()
    for (const p of visiblePoints) {
      const el = document.createElement('div')
      el.className = 'pt-marker' + (p.cat === 'pin' ? ' is-pin' : '') + (selP === p.id ? ' sel' : '')
      el.innerHTML = `<div class="sel-ring"></div><div class="icon-wrap">${markerSVG(p.cat, p.color)}</div><div class="pt-label"></div>`
      ;(el.querySelector('.pt-label') as HTMLElement).textContent = p.name
      el.addEventListener('click', ev => {
        ev.stopPropagation()
        const st = useStore.getState()
        if (st.modal === 'point' && st.pm.picking) return
        st.selectPoint(p.id)
      })
      const marker = new maplibregl.Marker({ element: el, anchor: p.cat === 'pin' ? 'bottom' : 'center' })
        .setLngLat([p.lng, p.lat])
        .addTo(map)
      markersRef.current.set(p.id, marker)
    }
  }, [visiblePoints, selP])

  // ---------- pick mode: crosshair ghost + placed pin ----------
  useEffect(() => {
    const map = mapRef.current
    if (!map) return
    const canvas = map.getCanvas()
    if (picking) {
      canvas.style.cursor = 'crosshair'
      const el = document.createElement('div')
      el.className = 'pick-ghost'
      el.innerHTML = `<svg width="80" height="80" viewBox="-40 -40 80 80"><circle r="14" fill="none" stroke="rgba(251,191,36,.85)" stroke-width="1.5"/><circle r="1.8" fill="rgba(251,191,36,.95)"/><path d="M-28 0h-10M28 0h10M0 -28v-10M0 28v10" stroke="rgba(251,191,36,.7)" stroke-width="1.6" stroke-linecap="round"/></svg>`
      ghostRef.current = new maplibregl.Marker({ element: el, anchor: 'center' })
        .setLngLat(map.getCenter())
        .addTo(map)
    }
    return () => {
      canvas.style.cursor = ''
      ghostRef.current?.remove()
      ghostRef.current = null
    }
  }, [picking])

  useEffect(() => {
    const map = mapRef.current
    if (!map) return
    if (picking && pmLat !== null && pmLng !== null) {
      if (!pickPinRef.current) {
        const el = document.createElement('div')
        el.className = 'pick-pin'
        el.style.position = 'relative'
        el.innerHTML = `<div class="ping"></div><svg width="24" height="26" viewBox="-12 -25 24 26" style="display:block"><ellipse cy="-0.2" rx="5.5" ry="2" fill="rgba(0,0,0,.55)"/><path d="M0 0 C 0 0 -11 -11.6 -11 -19 A 11 11 0 1 1 11 -19 C 11 -11.6 0 0 0 0 Z" fill="#f59e0b" stroke="rgba(6,9,7,.75)" stroke-width="1.6"/><circle cy="-19" r="4" fill="#fff"/></svg>`
        pickPinRef.current = new maplibregl.Marker({ element: el, anchor: 'bottom', draggable: true })
          .setLngLat([pmLng, pmLat])
          .addTo(map)
        pickPinRef.current.on('dragend', () => {
          const ll = pickPinRef.current!.getLngLat()
          useStore.getState().setPmPos(ll.lat, ll.lng)
          mapctl.writeReadout(fmtCoord(ll.lat, ll.lng))
        })
      } else {
        pickPinRef.current.setLngLat([pmLng, pmLat])
      }
      mapctl.writeReadout(fmtCoord(pmLat, pmLng))
    }
    if (!picking && pickPinRef.current) {
      pickPinRef.current.remove()
      pickPinRef.current = null
    }
    return () => {
      if (!picking && pickPinRef.current) {
        pickPinRef.current.remove()
        pickPinRef.current = null
      }
    }
  }, [picking, pmLat, pmLng])

  /** Enquadra as trilhas visíveis uma única vez, na primeira visita. Lê do store
   *  em vez de visibleTracks porque o handler de 'load' fecha sobre o 1º render. */
  const autoFitOnce = () => {
    if (!autoFitRef.current) return
    const st = useStore.getState()
    const e = st.folderEff()
    let bb: BBox = emptyBBox()
    for (const t of st.tracks) {
      if ((t.folderId ? e[t.folderId] : true) && t.visible) bb = unionBBox(bb, t.bbox)
    }
    if (!bboxValid(bb)) return
    autoFitRef.current = false
    mapctl.fitBounds(bb)
  }

  const fitAll = () => {
    let bb: BBox = emptyBBox()
    for (const t of visibleTracks) bb = unionBBox(bb, t.bbox)
    if (bboxValid(bb)) mapctl.fitBounds(bb)
  }

  return (
    <main className="map-wrap">
      <div ref={containerRef} className="map-container" />
      <div className="map-ctls">
        <div className="ctl-box">
          <button className="ctl-btn" title="Aproximar" onClick={() => mapctl.zoomIn()}>
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round">
              <path d="M12 5v14M5 12h14" />
            </svg>
          </button>
          <div className="ctl-sep" />
          <button className="ctl-btn" title="Afastar" onClick={() => mapctl.zoomOut()}>
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round">
              <path d="M5 12h14" />
            </svg>
          </button>
        </div>
        <button className="fit-btn" title="Enquadrar tudo" onClick={fitAll}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.1" strokeLinecap="round" strokeLinejoin="round">
            <path d="M8 3H5a2 2 0 0 0-2 2v3" />
            <path d="M16 3h3a2 2 0 0 1 2 2v3" />
            <path d="M8 21H5a2 2 0 0 1-2-2v-3" />
            <path d="M16 21h3a2 2 0 0 0 2-2v-3" />
          </svg>
        </button>
      </div>
      <div className="attribution">© Esri, Maxar, Earthstar Geographics</div>
    </main>
  )
}
