import { createContext, useContext, useState, useCallback, type ReactNode } from 'react'
import { C } from '../tokens'

// ─── Types ────────────────────────────────────────────────────────────────────

type ToastKind = 'success' | 'error' | 'info'

type ToastEntry = {
  id: number
  message: string
  kind: ToastKind
}

type ToastCtxType = {
  showToast: (message: string, kind?: ToastKind) => void
}

// ─── Context ──────────────────────────────────────────────────────────────────

const ToastCtx = createContext<ToastCtxType | null>(null)

export function useToast(): ToastCtxType {
  const ctx = useContext(ToastCtx)
  if (!ctx) throw new Error('useToast must be called inside ToastProvider')
  return ctx
}

// ─── Toast item ───────────────────────────────────────────────────────────────

const KIND_STYLE: Record<ToastKind, { border: string; icon: string; iconColor: string }> = {
  success: { border: '#BBF7D0', icon: '✓', iconColor: '#15803D' },
  error:   { border: '#FECACA', icon: '✗', iconColor: '#B91C1C' },
  info:    { border: C.border,  icon: '·', iconColor: C.text3 },
}

function ToastItem({ entry, onDismiss }: { entry: ToastEntry; onDismiss: () => void }) {
  const s = KIND_STYLE[entry.kind]
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 10,
        backgroundColor: C.surface,
        border: `1px solid ${s.border}`,
        borderLeft: `3px solid ${s.iconColor}`,
        borderRadius: 5,
        padding: '10px 14px',
        boxShadow: '0 4px 16px rgba(0,0,0,0.10)',
        minWidth: 280,
        maxWidth: 400,
        pointerEvents: 'all',
      }}
    >
      <span style={{ fontSize: 14, fontWeight: 700, color: s.iconColor, flexShrink: 0 }}>
        {s.icon}
      </span>
      <span style={{ fontSize: 13, color: C.text1, flex: 1, lineHeight: 1.4 }}>
        {entry.message}
      </span>
      <button
        onClick={onDismiss}
        style={{ color: C.text3, fontSize: 16, cursor: 'pointer', lineHeight: 1, background: 'none', border: 'none', padding: 0 }}
      >
        ×
      </button>
    </div>
  )
}

// ─── Provider ─────────────────────────────────────────────────────────────────

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastEntry[]>([])
  let counter = 0

  const showToast = useCallback((message: string, kind: ToastKind = 'info') => {
    const id = ++counter + Date.now()
    setToasts(prev => [...prev, { id, message, kind }])
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id))
    }, 3200)
  }, [])

  const dismiss = (id: number) => setToasts(prev => prev.filter(t => t.id !== id))

  return (
    <ToastCtx.Provider value={{ showToast }}>
      {children}
      {/* Portal target — fixed overlay, pointer-events none so it doesn't block */}
      <div
        style={{
          position: 'fixed',
          bottom: 24,
          right: 24,
          zIndex: 200,
          display: 'flex',
          flexDirection: 'column',
          gap: 8,
          pointerEvents: 'none',
        }}
      >
        {toasts.map(t => (
          <ToastItem key={t.id} entry={t} onDismiss={() => dismiss(t.id)} />
        ))}
      </div>
    </ToastCtx.Provider>
  )
}
