import { useEffect } from 'react'
import { ConfirmModal } from './components/ConfirmModal'
import { ContextMenu } from './components/ContextMenu'
import { ImportModal } from './components/ImportModal'
import { Lightbox } from './components/Lightbox'
import { Login } from './components/Login'
import { MapView } from './components/MapView'
import { PickBar } from './components/PickBar'
import { PointModal } from './components/PointModal'
import { PointPanel } from './components/PointPanel'
import { Sidebar } from './components/Sidebar'
import { Toast } from './components/Toast'
import { TrackPanel } from './components/TrackPanel'
import { useStore } from './store'

export default function App() {
  const s = useStore()

  useEffect(() => {
    useStore.getState().init()
  }, [])

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const st = useStore.getState()
      if (e.key === 'Escape') {
        if (st.lightbox) st.set({ lightbox: null })
        else if (st.confirm) st.set({ confirm: null })
        else if (st.ctx) st.set({ ctx: null })
        else if (st.modal === 'point' && st.pm.picking) st.cancelPick()
        else if (st.modal) st.set({ modal: null })
        else if (st.renameId) st.set({ renameId: null })
        else if (st.pDel) st.set({ pDel: null })
        else if (st.selP || st.selT) st.set({ selP: null, selT: null, palOpen: false })
        return
      }
      if (!st.lightbox || (e.key !== 'ArrowRight' && e.key !== 'ArrowLeft')) return
      const p = st.points.find(q => q.id === st.lightbox!.pid)
      const n = p?.photos.length ?? 0
      if (n < 2) return
      const i = (st.lightbox.idx + (e.key === 'ArrowRight' ? 1 : -1) + n) % n
      st.set({ lightbox: { pid: st.lightbox.pid, idx: i }, photoIdx: { ...st.photoIdx, [st.lightbox.pid]: i } })
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  const picking = s.modal === 'point' && s.pm.picking

  if (s.authState === 'signedout') return <Login />
  if (s.authState === 'checking') {
    return <div className="login-screen"><div style={{ color: '#7d8590', fontSize: 13 }}>Carregando…</div></div>
  }

  return (
    <div className="app">
      <Sidebar />
      <div style={{ flex: 1, position: 'relative', minWidth: 0, display: 'flex' }}>
        <MapView />
        {s.selT && <TrackPanel />}
        {s.selP && !s.selT && <PointPanel />}
        {picking && <PickBar />}
      </div>
      {s.lightbox && <Lightbox />}
      {s.modal === 'point' && !picking && <PointModal />}
      {s.modal === 'import' && <ImportModal />}
      <ContextMenu />
      <ConfirmModal />
      <Toast />
    </div>
  )
}
