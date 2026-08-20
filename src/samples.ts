import { remoteEnabled } from './config'
import { saveFolders } from './db'
import { useStore } from './store'
import { uid, type Folder } from './types'

const SAMPLES = ['rio-acima.gpx', 'serra-do-curral.gpx', 'vale-do-sol.gpx']
const SEEDED_KEY = 'tv-samples-seeded'

/** Demo mode: sem backend configurado a biblioteca começa vazia e o visitante
 *  cairia num mapa em branco. Carrega as trilhas de exemplo uma única vez — se
 *  ele apagar, ficam apagadas. No-op quando há backend (aí a biblioteca é real). */
export async function seedSamples(): Promise<void> {
  if (remoteEnabled) return
  const st = useStore.getState()
  if (st.tracks.length || st.folders.length) return
  if (localStorage.getItem(SEEDED_KEY)) return
  localStorage.setItem(SEEDED_KEY, '1')

  try {
    const files = await Promise.all(
      SAMPLES.map(async name => {
        const res = await fetch(`${import.meta.env.BASE_URL}samples/${name}`)
        if (!res.ok) throw new Error(`${name}: HTTP ${res.status}`)
        return new File([await res.text()], name, { type: 'application/gpx+xml' })
      }),
    )
    const folder: Folder = {
      id: uid(),
      parentId: null,
      name: 'Trilhas de exemplo',
      visible: true,
      expanded: true,
      createdAt: Date.now(),
    }
    useStore.setState(s => ({ folders: [...s.folders, folder] }))
    // dinâmico: importer.ts importa o store, import estático fecharia um ciclo
    const { runImport } = await import('./importer')
    await runImport(files, folder.id)
    // addTracks só persiste pastas quando há pontos; estas trilhas não têm waypoints
    await saveFolders(useStore.getState().folders)
  } catch (e) {
    console.warn('[samples] falha ao carregar trilhas de exemplo:', e)
  }
}
