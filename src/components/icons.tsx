import type { CSSProperties } from 'react'
import type { Cat } from '../types'

export function EyeIcon({ slashed, size = 15 }: { slashed: boolean; size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M2.5 12S6 5.5 12 5.5 21.5 12 21.5 12 18 18.5 12 18.5 2.5 12 2.5 12Z" />
      <circle cx="12" cy="12" r="3" />
      <path d="M4 3.5 20 20.5" strokeWidth="2.2" opacity={slashed ? 1 : 0} />
    </svg>
  )
}

export function ChevronIcon({ size = 13 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
      <path d="m9 6 6 6-6 6" />
    </svg>
  )
}

export function CloseIcon({ size = 13 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round">
      <path d="M6 6l12 12M18 6 6 18" />
    </svg>
  )
}

export function PlusIcon({ size = 12, stroke = '#f59e0b' }: { size?: number; stroke?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={stroke} strokeWidth="2.6" strokeLinecap="round">
      <path d="M12 5v14M5 12h14" />
    </svg>
  )
}

export function TrashIcon({ size = 14, bars = true }: { size?: number; bars?: boolean }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M4 7h16" />
      <path d="M9 7V5a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2" />
      <path d="m6 7 1 13a2 2 0 0 0 2 2h6a2 2 0 0 0 2-2l1-13" />
      {bars && <path d="M10 11v6M14 11v6" />}
    </svg>
  )
}

export function PencilIcon({ size = 13 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M17 3a2.8 2.8 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z" />
    </svg>
  )
}

export function GotoIcon({ size = 14 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round">
      <circle cx="12" cy="12" r="7" />
      <path d="M12 2v3M12 19v3M2 12h3M19 12h3" />
      <circle cx="12" cy="12" r="1.5" fill="currentColor" stroke="none" />
    </svg>
  )
}

export function FolderIcon({ size = 13, stroke = '#8b93a0' }: { size?: number; stroke?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={stroke} strokeWidth="2" style={{ flex: '0 0 auto' }}>
      <path d="M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2Z" />
    </svg>
  )
}

export function ImportIcon({ size = 13, stroke = 'currentColor' }: { size?: number; stroke?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={stroke} strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 4v11" />
      <path d="m7 10 5 5 5-5" />
      <path d="M4 20h16" />
    </svg>
  )
}

/** Category glyph (no tile behind it). */
export function CatGlyph({ cat, size = 14, pinColor = '#f59e0b' }: { cat: Cat; size?: number; pinColor?: string }) {
  if (cat === 'agua')
    return (
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none" style={{ flex: '0 0 auto' }}>
        <path d="M12 3s6 6.4 6 10.4A6 6 0 0 1 6 13.4C6 9.4 12 3 12 3Z" fill="#7dd3fc" />
      </svg>
    )
  if (cat === 'cidade')
    return (
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="#dfe3e9" strokeWidth="1.8" style={{ flex: '0 0 auto' }}>
        <path d="M7 21V5a1 1 0 0 1 1-1h8a1 1 0 0 1 1 1v16" />
        <path d="M4 21h16" />
        <path d="M10 8h1M13 8h1M10 12h1M13 12h1M10 16h1M13 16h1" strokeLinecap="round" />
      </svg>
    )
  if (cat === 'park')
    return (
      <svg width={size} height={size} viewBox="0 0 24 24" style={{ flex: '0 0 auto' }}>
        <rect x="3" y="3" width="18" height="18" rx="5" fill="#2f6bdb" />
        <text x="12" y="16.4" textAnchor="middle" fontSize="12.5" fontWeight="800" fill="#fff" fontFamily="Inter,system-ui,sans-serif">P</text>
      </svg>
    )
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={pinColor} strokeWidth="2" style={{ flex: '0 0 auto' }}>
      <path d="M20 10c0 6-8 12-8 12S4 16 4 10a8 8 0 0 1 16 0Z" />
      <circle cx="12" cy="10" r="3" />
    </svg>
  )
}

/** Category icon inside its dark tile — used in point panel header (28px). */
export function CatBadge({ cat, color }: { cat: Cat; color: string }) {
  return (
    <svg width="28" height="28" viewBox="-14 -14 28 28" style={{ flex: '0 0 auto' }}>
      {cat === 'agua' && (
        <g>
          <rect x="-12" y="-12" width="24" height="24" rx="7" fill="rgba(125,211,252,.12)" stroke="rgba(125,211,252,.4)" />
          <path d="M0 -6.6 C 3.4 -2.7 5.2 0.2 5.2 2.6 A 5.2 5.2 0 1 1 -5.2 2.6 C -5.2 0.2 -3.4 -2.7 0 -6.6 Z" fill="#7dd3fc" />
        </g>
      )}
      {cat === 'cidade' && (
        <g>
          <rect x="-12" y="-12" width="24" height="24" rx="7" fill="rgba(255,255,255,.08)" stroke="rgba(255,255,255,.3)" />
          <path d="M -4.6 6 V -4.6 H 4.6 V 6 M -7 6 H 7" stroke="#fff" strokeWidth="1.5" fill="none" />
          <rect x="-2.9" y="-2.6" width="1.8" height="1.8" fill="#fff" />
          <rect x="1.1" y="-2.6" width="1.8" height="1.8" fill="#fff" />
          <rect x="-2.9" y="0.6" width="1.8" height="1.8" fill="#fff" />
          <rect x="1.1" y="0.6" width="1.8" height="1.8" fill="#fff" />
        </g>
      )}
      {cat === 'park' && (
        <g>
          <rect x="-12" y="-12" width="24" height="24" rx="7" fill="#2f6bdb" />
          <text y="5.8" textAnchor="middle" fontSize="15" fontWeight="800" fill="#fff" fontFamily="Inter,system-ui,sans-serif">P</text>
        </g>
      )}
      {cat === 'pin' && (
        <g>
          <path d="M0 6 C 0 6 -8.4 -2.6 -8.4 -8 A 8.4 8.4 0 1 1 8.4 -8 C 8.4 -2.6 0 6 0 6 Z" fill={color} stroke="rgba(8,10,10,.6)" strokeWidth="1.4" />
          <circle cy="-8" r="3" fill="rgba(255,255,255,.95)" />
        </g>
      )}
    </svg>
  )
}

/** Map marker SVG markup (string — used for MapLibre marker DOM elements). */
export function markerSVG(cat: Cat, color: string): string {
  if (cat === 'agua')
    return `<svg width="22" height="22" viewBox="-11 -11 22 22"><rect x="-11" y="-11" width="22" height="22" rx="6" fill="rgba(10,14,18,.82)" stroke="rgba(255,255,255,.3)"/><path d="M0 -6.6 C 3.4 -2.7 5.2 0.2 5.2 2.6 A 5.2 5.2 0 1 1 -5.2 2.6 C -5.2 0.2 -3.4 -2.7 0 -6.6 Z" fill="#7dd3fc"/></svg>`
  if (cat === 'cidade')
    return `<svg width="22" height="22" viewBox="-11 -11 22 22"><rect x="-11" y="-11" width="22" height="22" rx="6" fill="rgba(10,14,18,.82)" stroke="rgba(255,255,255,.3)"/><path d="M -4.6 6 V -4.6 H 4.6 V 6 M -7 6 H 7" stroke="#fff" stroke-width="1.5" fill="none"/><rect x="-2.9" y="-2.6" width="1.8" height="1.8" fill="#fff"/><rect x="1.1" y="-2.6" width="1.8" height="1.8" fill="#fff"/><rect x="-2.9" y="0.6" width="1.8" height="1.8" fill="#fff"/><rect x="1.1" y="0.6" width="1.8" height="1.8" fill="#fff"/></svg>`
  if (cat === 'park')
    return `<svg width="21" height="21" viewBox="-10.5 -10.5 21 21"><rect x="-10.5" y="-10.5" width="21" height="21" rx="5.5" fill="#2f6bdb" stroke="rgba(6,12,24,.6)" stroke-width="1.2"/><text y="5.4" text-anchor="middle" font-size="13.5" font-weight="800" fill="#fff" font-family="Inter,system-ui,sans-serif">P</text></svg>`
  return `<svg width="18" height="23" viewBox="-9 -23 18 23"><path d="M0 0 C 0 0 -8.4 -8.6 -8.4 -14 A 8.4 8.4 0 1 1 8.4 -14 C 8.4 -8.6 0 0 0 0 Z" fill="${color}" stroke="rgba(8,10,10,.6)" stroke-width="1.4"/><circle cy="-14" r="3" fill="rgba(255,255,255,.95)"/></svg>`
}

export const iconBtnStyle: CSSProperties = {}
