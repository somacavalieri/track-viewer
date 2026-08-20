import { useEffect, useState } from 'react'
import { deletePhotoBlob, getPhotoBlob, putPhotoBlob } from './db'

const urls = new Map<string, string>()

export async function storePhoto(id: string, blob: Blob) {
  await putPhotoBlob(id, blob)
  urls.set(id, URL.createObjectURL(blob))
}

export async function removePhoto(id: string) {
  const u = urls.get(id)
  if (u) URL.revokeObjectURL(u)
  urls.delete(id)
  await deletePhotoBlob(id)
}

export async function photoURL(id: string): Promise<string | null> {
  const cached = urls.get(id)
  if (cached) return cached
  const blob = await getPhotoBlob(id)
  if (!blob) return null
  const u = URL.createObjectURL(blob)
  urls.set(id, u)
  return u
}

export function usePhotoURL(id: string | null): string | null {
  const [url, setUrl] = useState<string | null>(id ? urls.get(id) ?? null : null)
  useEffect(() => {
    let live = true
    if (!id) { setUrl(null); return }
    const cached = urls.get(id)
    if (cached) { setUrl(cached); return }
    photoURL(id).then(u => { if (live) setUrl(u) })
    return () => { live = false }
  }, [id])
  return url
}
