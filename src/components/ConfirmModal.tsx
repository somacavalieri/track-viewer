import { useStore } from '../store'
import { CloseIcon } from './icons'

export function ConfirmModal() {
  const s = useStore()
  const c = s.confirm
  if (!c) return null
  return (
    <div className="overlay" style={{ zIndex: 115 }} onMouseDown={() => s.set({ confirm: null })}>
      <div className="modal confirm" onMouseDown={e => e.stopPropagation()}>
        <div className="modal-head">
          <div className="modal-title">{c.title}</div>
          <button className="icon-btn" style={{ width: 24, height: 24 }} onClick={() => s.set({ confirm: null })}>
            <CloseIcon size={14} />
          </button>
        </div>
        <div style={{ fontSize: 12.5, color: '#c3c9d2', lineHeight: 1.5 }}>{c.msg}</div>
        <div className="modal-footer">
          <button className="btn-cancel" onClick={() => s.set({ confirm: null })}>Cancelar</button>
          <button className="btn-submit red" onClick={c.onOk}>{c.okLabel}</button>
        </div>
      </div>
    </div>
  )
}
