import { useState, useRef, useEffect, useId, type ReactNode } from 'react'
import { C } from '../tokens'
import { TopBar, ConnectorHealthBanner, Mono } from './Shell'

// ─── Shared agent page header ─────────────────────────────────────────────────

type AgentHeaderStat = { label: string; val: string; highlight?: boolean; warn?: boolean }

export function AgentHeader({ role, sprint, accent, accentDim, stats }: {
  role: string; sprint: string
  accent: string; accentDim: string
  stats: AgentHeaderStat[]
}) {
  return (
    <div style={{
      background: 'linear-gradient(135deg, #18181B 0%, #1E1B3A 100%)',
      padding: '14px 28px',
      display: 'flex', alignItems: 'center', gap: 20, flexShrink: 0,
    }}>
      {/* Role badge + label */}
      <div>
        <div style={{
          display: 'inline-flex', alignItems: 'center', gap: 5, marginBottom: 5,
          backgroundColor: accentDim, borderRadius: 4,
          padding: '2px 8px', border: `1px solid ${accent}40`,
        }}>
          <div style={{ width: 5, height: 5, borderRadius: '50%', backgroundColor: accent }} />
          <span style={{ fontSize: 10, fontWeight: 700, color: accent, letterSpacing: '0.08em', textTransform: 'uppercase' }}>
            {sprint}
          </span>
        </div>
        <div style={{ fontSize: 16, fontWeight: 700, color: '#F9FAFB', letterSpacing: '-0.2px' }}>{role}</div>
      </div>

      {/* Divider */}
      <div style={{ width: 1, height: 36, backgroundColor: 'rgba(255,255,255,0.1)', flexShrink: 0 }} />

      {/* Stats */}
      <div style={{ display: 'flex', gap: 6 }}>
        {stats.map(s => (
          <div key={s.label} style={{
            padding: '6px 12px', borderRadius: 7,
            backgroundColor: 'rgba(255,255,255,0.07)',
            border: '1px solid rgba(255,255,255,0.1)',
          }}>
            <div style={{ fontSize: 9, fontWeight: 600, color: 'rgba(255,255,255,0.45)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 2 }}>
              {s.label}
            </div>
            <div style={{
              fontSize: 15, fontWeight: 700, lineHeight: 1,
              color: s.warn ? '#FCD34D' : s.highlight ? accent : '#F9FAFB',
            }}>
              {s.val}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

// ─── Types ────────────────────────────────────────────────────────────────────

export type FileDiffLine = { type: 'add' | 'del' | 'ctx'; text: string }
export type FileDiffHunk = { header: string; lines: FileDiffLine[] }
export type FileDiff    = { file: string; additions: number; deletions: number; hunks: FileDiffHunk[] }

export type ChatMsg = {
  id: string
  role: 'user' | 'assistant' | 'system'
  content: string
  ts: string
  fileDiffs?: FileDiff[]
}

export type QueueItem = {
  id: string
  storyKey: string
  title: string
  status: 'open' | 'decided' | 'stale'
  isAwaiting: boolean
}

export type AgentAction = {
  label: string
  variant: 'approve' | 'kickback' | 'secondary'
  onClick: () => void
  disabled?: boolean
  disabledReason?: string
}

type KickBackConfig = {
  label: string
  toStage: string
  storyKey: string
  onConfirm: (note: string) => void
}

type Props = {
  agentLabel: string
  agentContext: 'ba' | 'dev' | 'qa'
  queue: QueueItem[]
  selectedId: string
  onSelect: (id: string) => void
  // Artifact card shown above chat — collapsed by default
  artifactTitle: string
  artifactMeta: string
  artifactBody: ReactNode
  // Chat
  seedMessages: ChatMsg[]
  placeholder?: string
  // Actions
  actions?: AgentAction[]
  kickBack?: KickBackConfig
  // Optional side panel (e.g. Take Over / VS Code split)
  sidePanel?: ReactNode
  // Optional full-width header rendered below TopBar
  header?: ReactNode
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function uid() { return Math.random().toString(36).slice(2, 9) }
function nowStr() { return new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) }

const CONTEXT_REPLIES: Record<string, string[]> = {
  ba: [
    "I can revise those acceptance criteria — should I keep the current structure or rewrite from the ask?",
    "That ambiguity in the requirement would cause rework downstream. Let me tighten the wording and re-run the duplicate check.",
    "Good point. The related story from last sprint is superseded — safe to proceed without a dependency link.",
    "I've updated the AC. Want me to cross-check against the project skill before you submit for approval?",
    "Understood. I'll draft a cleaner version of that criterion and flag it for your review.",
  ],
  dev: [
    "That's a reasonable risk concern. I can scope the change more narrowly — an adapter layer instead of modifying the core path directly.",
    "The reuse candidate from last sprint covers the basic case but not filter projection. I'd extend it rather than replace it.",
    "Step 4 carries the most risk. I'd recommend a dedicated code review for that file before the MR is merged.",
    "I've updated the plan step. The adapter approach is reversible and keeps the serializer untouched.",
    "Good catch. I'll add an explicit rollback note to that step so the reviewer knows what to watch for.",
  ],
  qa: [
    "I can add a Cypress spec for that edge case — I'll seed an empty dataset and assert the no-results UI.",
    "The Parquet gap is a known filesystem constraint. The mock validates the interface; full E2E would need an integration environment.",
    "Coverage would jump to 94% with those two additional specs. Want me to add them and re-run the coverage report?",
    "I'll tighten the assertion on that spec so it catches the exact error state rather than just the HTTP status.",
    "The existing spec for that case is flaky under concurrent load. I can rewrite it with a deterministic seed.",
  ],
}

function pickReply(text: string, context: 'ba' | 'dev' | 'qa'): string {
  const l = text.toLowerCase()
  if (l.includes('approv') || l.includes('lgtm') || l.includes('ship') || l.includes('good'))
    return "Perfect. Once you click Approve below, the work advances to the next stage and the handoff message goes out automatically."
  if (l.includes('reject') || l.includes('kick') || l.includes('back') || l.includes('return') || l.includes('redo'))
    return "Understood. Use the Return button below to formally record the regression — I'll attach your reason so the previous stage owner knows exactly what to fix."
  if (l.includes('why') || l.includes('explain') || l.includes('what') || l.includes('how'))
    return "Good question — " + (CONTEXT_REPLIES[context]?.[0] ?? "let me dig into that.")
  const replies = CONTEXT_REPLIES[context] ?? []
  return replies[Math.floor(Math.random() * replies.length)] ?? "Got it. Let me know how you'd like to proceed."
}

// ─── Kick-back dialog ─────────────────────────────────────────────────────────

function KickBackDialog({ config, onCancel }: { config: KickBackConfig; onCancel: () => void }) {
  const [note, setNote] = useState('')
  return (
    <div style={{
      position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.4)',
      display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 60,
    }}>
      <div style={{
        backgroundColor: '#FFF', borderRadius: 10, padding: 24, width: 380,
        boxShadow: '0 16px 48px rgba(0,0,0,0.2)', border: `1px solid ${C.border}`,
      }}>
        <div style={{ fontSize: 14, fontWeight: 600, color: C.text1, marginBottom: 4 }}>
          {config.label}
        </div>
        <div style={{ fontSize: 12, color: C.text2, marginBottom: 16, lineHeight: 1.6 }}>
          This story returns to <strong>{config.toStage}</strong>. The agent will notify the previous stage owner with your note.
        </div>
        <textarea
          autoFocus
          value={note}
          onChange={e => setNote(e.target.value)}
          placeholder="What needs to change before this comes back? (required)"
          style={{
            width: '100%', height: 90, padding: '9px 11px', boxSizing: 'border-box',
            border: `1px solid ${C.border}`, borderRadius: 6, fontSize: 13,
            resize: 'none', outline: 'none', fontFamily: 'inherit',
            color: C.text1, backgroundColor: C.surfaceSubtle, lineHeight: 1.55,
          }}
        />
        <div style={{ display: 'flex', gap: 8, marginTop: 14, justifyContent: 'flex-end' }}>
          <button onClick={onCancel} style={{
            padding: '7px 16px', fontSize: 12, border: `1px solid ${C.border}`,
            borderRadius: 5, backgroundColor: 'transparent', color: C.text2, cursor: 'pointer',
          }}>
            Cancel
          </button>
          <button
            onClick={() => { if (note.trim()) config.onConfirm(note.trim()) }}
            disabled={!note.trim()}
            style={{
              padding: '7px 16px', fontSize: 12, fontWeight: 600, border: 'none',
              borderRadius: 5, cursor: note.trim() ? 'pointer' : 'not-allowed',
              backgroundColor: note.trim() ? '#DC2626' : C.border,
              color: note.trim() ? '#FFF' : C.text3,
            }}
          >
            ↩ Return work
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── File diff card ───────────────────────────────────────────────────────────

function FileDiffCard({ diff }: { diff: FileDiff }) {
  const [open, setOpen] = useState(false)
  return (
    <div style={{
      border: `1px solid ${C.border}`, borderRadius: 6,
      overflow: 'hidden', fontFamily: 'JetBrains Mono, monospace',
      backgroundColor: C.surface, marginTop: 6,
    }}>
      <button
        onClick={() => setOpen(o => !o)}
        style={{
          display: 'flex', alignItems: 'center', gap: 8,
          width: '100%', padding: '7px 10px', textAlign: 'left',
          background: C.surfaceSubtle, border: 'none', cursor: 'pointer',
          borderBottom: open ? `1px solid ${C.border}` : 'none',
        }}
      >
        <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
          <rect x="1" y="2" width="4" height="4" rx="1" stroke={C.text3} strokeWidth="1.1" />
          <rect x="7" y="6" width="4" height="4" rx="1" stroke="#16A34A" strokeWidth="1.1" />
          <path d="M3 6v1.5M3 7.5H5.5M5.5 7.5V6" stroke={C.text3} strokeWidth="1" strokeLinecap="round" />
        </svg>
        <span style={{ fontSize: 11, color: C.text1, flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {diff.file}
        </span>
        <span style={{ fontSize: 10, color: '#16A34A', fontWeight: 700 }}>+{diff.additions}</span>
        <span style={{ fontSize: 10, color: '#DC2626', fontWeight: 700, marginLeft: 4 }}>−{diff.deletions}</span>
        <span style={{ fontSize: 10, color: C.text3, marginLeft: 8 }}>{open ? '▾' : '▸'}</span>
      </button>
      {open && (
        <div style={{ maxHeight: 280, overflowY: 'auto' }}>
          {diff.hunks.map((hunk, hi) => (
            <div key={hi}>
              <div style={{ padding: '3px 10px', backgroundColor: '#EFF6FF', fontSize: 10, color: '#3B82F6' }}>
                {hunk.header}
              </div>
              {hunk.lines.map((line, li) => (
                <div key={li} style={{
                  display: 'flex', minHeight: 20,
                  backgroundColor: line.type === 'add' ? '#F0FDF4' : line.type === 'del' ? '#FFF5F5' : 'transparent',
                  borderLeft: `3px solid ${line.type === 'add' ? '#16A34A' : line.type === 'del' ? '#DC2626' : 'transparent'}`,
                }}>
                  <span style={{
                    width: 18, textAlign: 'center', flexShrink: 0, fontSize: 10, lineHeight: '20px',
                    color: line.type === 'add' ? '#16A34A' : line.type === 'del' ? '#DC2626' : C.text3,
                    userSelect: 'none',
                  }}>
                    {line.type === 'add' ? '+' : line.type === 'del' ? '−' : ' '}
                  </span>
                  <span style={{ fontSize: 11, lineHeight: '20px', color: C.text1, whiteSpace: 'pre', flex: 1, paddingRight: 8 }}>
                    {line.text}
                  </span>
                </div>
              ))}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

// ─── Message bubble ───────────────────────────────────────────────────────────

function Bubble({ msg }: { msg: ChatMsg }) {
  if (msg.role === 'system') {
    // A system msg with only fileDiffs and no text renders as a standalone diff block
    if (!msg.content && msg.fileDiffs?.length) {
      return (
        <div style={{ margin: '4px 20px' }}>
          {msg.fileDiffs.map((d, i) => <FileDiffCard key={i} diff={d} />)}
        </div>
      )
    }
    return (
      <div style={{
        margin: '8px 24px', padding: '6px 14px',
        backgroundColor: C.surfaceSubtle, border: `1px solid ${C.border}`,
        borderRadius: 5, fontSize: 11, color: C.text3, textAlign: 'center', fontStyle: 'italic',
      }}>
        {msg.content}
        {msg.fileDiffs?.map((d, i) => <FileDiffCard key={i} diff={d} />)}
      </div>
    )
  }

  const isUser = msg.role === 'user'
  return (
    <div style={{
      display: 'flex',
      flexDirection: isUser ? 'row-reverse' : 'row',
      gap: 10, padding: '4px 20px', alignItems: 'flex-start',
    }}>
      {!isUser && (
        <div style={{
          width: 30, height: 30, borderRadius: '50%', flexShrink: 0,
          background: 'linear-gradient(135deg, #7C3AED 0%, #4F46E5 100%)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 11, fontWeight: 700, color: '#FFF', marginTop: 2,
        }}>
          AI
        </div>
      )}
      <div style={{ maxWidth: '78%', minWidth: 0 }}>
        {!isUser && (
          <div style={{ fontSize: 10, fontWeight: 600, color: C.text3, marginBottom: 4, letterSpacing: '0.03em' }}>
            Agent · {msg.ts}
          </div>
        )}
        {msg.content && (
          <div style={{
            padding: '11px 14px',
            backgroundColor: isUser ? C.text1 : '#FFF',
            color: isUser ? '#FFF' : C.text1,
            border: isUser ? 'none' : `1px solid ${C.border}`,
            borderRadius: isUser ? '14px 14px 4px 14px' : '4px 14px 14px 14px',
            fontSize: 13, lineHeight: 1.65,
            boxShadow: isUser ? 'none' : '0 1px 3px rgba(0,0,0,0.06)',
            whiteSpace: 'pre-wrap',
          }}>
            {msg.content}
          </div>
        )}
        {msg.fileDiffs?.map((d, i) => <FileDiffCard key={i} diff={d} />)}
        {isUser && (
          <div style={{ fontSize: 10, color: C.text3, marginTop: 3, textAlign: 'right' }}>
            {msg.ts}
          </div>
        )}
      </div>
    </div>
  )
}

function TypingIndicator() {
  return (
    <div style={{ display: 'flex', gap: 10, padding: '4px 20px', alignItems: 'flex-start' }}>
      <div style={{
        width: 30, height: 30, borderRadius: '50%', flexShrink: 0,
        background: 'linear-gradient(135deg, #7C3AED 0%, #4F46E5 100%)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize: 11, fontWeight: 700, color: '#FFF', marginTop: 2,
      }}>
        AI
      </div>
      <div style={{
        marginTop: 18,
        padding: '10px 14px', backgroundColor: '#FFF',
        border: `1px solid ${C.border}`, borderRadius: '4px 14px 14px 14px',
        display: 'flex', gap: 5, alignItems: 'center',
        boxShadow: '0 1px 3px rgba(0,0,0,0.06)',
      }}>
        {[0, 1, 2].map(i => (
          <span key={i} style={{
            width: 5, height: 5, borderRadius: '50%', backgroundColor: '#A78BFA',
            animation: `typing-dot 1.3s ease-in-out ${i * 0.2}s infinite`,
            display: 'inline-block',
          }} />
        ))}
      </div>
    </div>
  )
}

// ─── Queue panel ──────────────────────────────────────────────────────────────

function QueuePanel({
  items, selectedId, onSelect, agentLabel,
}: { items: QueueItem[]; selectedId: string; onSelect: (id: string) => void; agentLabel: string }) {
  const statusColor = (s: QueueItem['status'], awaiting: boolean) => {
    if (s === 'decided') return C.borderStrong
    if (s === 'stale') return '#D97706'
    if (awaiting) return '#7C3AED'
    return '#9CA3AF'
  }

  return (
    <div style={{
      width: 240, flexShrink: 0,
      borderRight: `1px solid ${C.border}`,
      backgroundColor: C.surfaceSubtle,
      display: 'flex', flexDirection: 'column',
      overflow: 'hidden',
    }}>
      <div style={{
        padding: '14px 16px 10px',
        borderBottom: `1px solid ${C.border}`,
        flexShrink: 0,
      }}>
        <div style={{ fontSize: 10, fontWeight: 700, color: C.text3, textTransform: 'uppercase', letterSpacing: '0.07em' }}>
          {agentLabel}
        </div>
        <div style={{ fontSize: 12, color: C.text2, marginTop: 2 }}>
          {items.filter(i => i.isAwaiting).length} awaiting your review
        </div>
      </div>

      <div style={{ flex: 1, overflowY: 'auto' }}>
        {items.length === 0 && (
          <div style={{ padding: '20px 16px', fontSize: 12, color: C.text3, textAlign: 'center' }}>
            Nothing in queue
          </div>
        )}
        {items.map(item => {
          const active = item.id === selectedId
          return (
            <button
              key={item.id}
              onClick={() => onSelect(item.id)}
              style={{
                display: 'block', width: '100%', textAlign: 'left',
                padding: '11px 16px',
                backgroundColor: active ? C.surface : 'transparent',
                borderLeft: `3px solid ${active ? C.text1 : 'transparent'}`,
                borderRight: 'none', borderTop: 'none',
                borderBottom: `1px solid ${C.border}`,
                cursor: 'pointer',
                transition: 'all 80ms',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 3 }}>
                <span style={{
                  width: 6, height: 6, borderRadius: '50%', flexShrink: 0,
                  backgroundColor: statusColor(item.status, item.isAwaiting),
                }} />
                <Mono size={10} color={active ? C.text1 : C.text3}>{item.storyKey}</Mono>
                {item.isAwaiting && item.status === 'open' && (
                  <span style={{
                    marginLeft: 'auto', fontSize: 9, fontWeight: 700,
                    color: '#7C3AED', backgroundColor: '#F5F3FF',
                    border: '1px solid #DDD6FE', padding: '0 4px', borderRadius: 3,
                  }}>
                    FOR YOU
                  </span>
                )}
                {item.status === 'stale' && (
                  <span style={{
                    marginLeft: 'auto', fontSize: 9, fontWeight: 700,
                    color: '#D97706', backgroundColor: '#FFFBEB',
                    border: '1px solid #FDE68A', padding: '0 4px', borderRadius: 3,
                  }}>
                    STALE
                  </span>
                )}
                {item.status === 'decided' && (
                  <span style={{ marginLeft: 'auto', fontSize: 9, color: C.text3 }}>✓</span>
                )}
              </div>
              <div style={{
                fontSize: 12, color: active ? C.text1 : C.text2,
                lineHeight: 1.4, fontWeight: active ? 500 : 400,
                overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
              }}>
                {item.title}
              </div>
            </button>
          )
        })}
      </div>
    </div>
  )
}

// ─── Artifact card ────────────────────────────────────────────────────────────

function ArtifactCard({
  title, meta, children,
}: { title: string; meta: string; children: ReactNode }) {
  const [open, setOpen] = useState(false)

  return (
    <div style={{
      borderBottom: `1px solid ${C.border}`,
      backgroundColor: '#FAFAFA',
      flexShrink: 0,
    }}>
      <button
        onClick={() => setOpen(v => !v)}
        style={{
          display: 'flex', alignItems: 'center', gap: 10,
          width: '100%', padding: '10px 20px', textAlign: 'left',
          background: 'none', border: 'none', cursor: 'pointer',
        }}
      >
        <div style={{
          width: 28, height: 28, borderRadius: 6, flexShrink: 0,
          background: 'linear-gradient(135deg, #7C3AED 0%, #4F46E5 100%)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <svg width="13" height="13" viewBox="0 0 13 13" fill="none">
            <rect x="1" y="1" width="11" height="11" rx="2" stroke="white" strokeWidth="1.3" />
            <line x1="3.5" y1="4.5" x2="9.5" y2="4.5" stroke="white" strokeWidth="1.1" strokeLinecap="round" />
            <line x1="3.5" y1="6.5" x2="9.5" y2="6.5" stroke="white" strokeWidth="1.1" strokeLinecap="round" />
            <line x1="3.5" y1="8.5" x2="7" y2="8.5" stroke="white" strokeWidth="1.1" strokeLinecap="round" />
          </svg>
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 12, fontWeight: 600, color: C.text1 }}>{title}</div>
          <div style={{ fontSize: 11, color: C.text3, marginTop: 1 }}>{meta}</div>
        </div>
        <span style={{
          fontSize: 10, color: C.text3, fontWeight: 500,
          display: 'flex', alignItems: 'center', gap: 3,
        }}>
          {open ? 'Hide' : 'View artifact'}
          <span style={{ transform: open ? 'rotate(180deg)' : 'none', display: 'inline-block', transition: 'transform 150ms' }}>▾</span>
        </span>
      </button>
      {open && (
        <div style={{
          maxHeight: 340, overflowY: 'auto',
          borderTop: `1px solid ${C.border}`,
          backgroundColor: '#FFF',
          padding: '16px 20px',
        }}>
          {children}
        </div>
      )}
    </div>
  )
}

// ─── Action bar ───────────────────────────────────────────────────────────────

function ActionBar({ actions, kickBack, onKickBack }: {
  actions?: AgentAction[]
  kickBack?: KickBackConfig
  onKickBack: () => void
}) {
  if (!actions?.length && !kickBack) return null
  return (
    <div style={{
      padding: '10px 20px',
      borderTop: `1px solid ${C.border}`,
      backgroundColor: '#FAFAFA',
      display: 'flex', gap: 8, alignItems: 'center',
      flexShrink: 0,
    }}>
      <div style={{ fontSize: 10, fontWeight: 600, color: C.text3, textTransform: 'uppercase', letterSpacing: '0.06em', marginRight: 4 }}>
        Decide
      </div>
      {actions?.map((a, i) => {
        const isApprove = a.variant === 'approve'
        const isSecondary = a.variant === 'secondary'
        const bg = isApprove
          ? (a.disabled ? C.border : C.approve)
          : 'transparent'
        const fg = isApprove
          ? (a.disabled ? C.text3 : C.approveFg)
          : isSecondary
            ? (a.disabled ? C.text3 : C.text2)
            : (a.disabled ? C.text3 : '#16A34A')
        const border = isApprove
          ? 'none'
          : `1.5px solid ${a.disabled ? C.border : C.borderStrong}`
        return (
          <div key={i} style={{ position: 'relative' }}>
            <button
              onClick={a.disabled ? undefined : a.onClick}
              disabled={a.disabled}
              title={a.disabledReason}
              style={{
                padding: '7px 16px', fontSize: 12, fontWeight: 600,
                border, borderRadius: 6, backgroundColor: bg, color: fg,
                cursor: a.disabled ? 'not-allowed' : 'pointer',
                opacity: a.disabled ? 0.6 : 1,
                display: 'flex', alignItems: 'center', gap: 5,
                transition: 'background 120ms, color 120ms, border-color 120ms',
              }}
            >
              {isApprove && <span>✓</span>}
              {a.label}
            </button>
          </div>
        )
      })}
      {kickBack && (
        <button
          onClick={onKickBack}
          style={{
            padding: '7px 16px', fontSize: 12, fontWeight: 600,
            border: `1.5px solid #DC2626`,
            borderRadius: 6, backgroundColor: 'transparent',
            color: '#DC2626', cursor: 'pointer',
            display: 'flex', alignItems: 'center', gap: 5,
          }}
        >
          ↩ {kickBack.label}
        </button>
      )}
    </div>
  )
}

// ─── Main component ───────────────────────────────────────────────────────────

export default function AgentChatPage({
  agentLabel, agentContext,
  queue, selectedId, onSelect,
  artifactTitle, artifactMeta, artifactBody,
  seedMessages,
  placeholder,
  actions,
  kickBack,
  sidePanel,
  header,
}: Props) {
  const [messages, setMessages] = useState<ChatMsg[]>(seedMessages)
  const [input, setInput] = useState('')
  const [typing, setTyping] = useState(false)
  const [kickBackOpen, setKickBackOpen] = useState(false)
  const bottomRef = useRef<HTMLDivElement>(null)
  const inputId = useId()

  // Reset thread when selected item changes
  const seedKey = seedMessages.map(m => m.id).join(',')
  useEffect(() => {
    setMessages(seedMessages)
    setInput('')
  }, [seedKey])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, typing])

  function send() {
    const text = input.trim()
    if (!text || typing) return
    const userMsg: ChatMsg = { id: uid(), role: 'user', content: text, ts: nowStr() }
    setMessages(prev => [...prev, userMsg])
    setInput('')
    setTyping(true)
    setTimeout(() => {
      const reply: ChatMsg = { id: uid(), role: 'assistant', content: pickReply(text, agentContext), ts: nowStr() }
      setMessages(prev => [...prev, reply])
      setTyping(false)
    }, 800 + Math.random() * 600)
  }

  function handleKickBackConfirm(note: string) {
    setKickBackOpen(false)
    if (kickBack) kickBack.onConfirm(note)
    const sysMsg: ChatMsg = { id: uid(), role: 'system', content: `Work returned to ${kickBack?.toStage ?? 'previous stage'} — "${note}"`, ts: nowStr() }
    const aiMsg: ChatMsg = {
      id: uid(), role: 'assistant',
      content: `Understood. I've recorded the regression reason and notified the ${kickBack?.toStage ?? 'previous'} owner. They'll address your feedback before it comes back for review.`,
      ts: nowStr(),
    }
    setMessages(prev => [...prev, sysMsg, aiMsg])
  }

  return (
    <>
      <style>{`
        @keyframes typing-dot {
          0%, 60%, 100% { opacity: 0.25; transform: scale(0.85); }
          30% { opacity: 1; transform: scale(1); }
        }
      `}</style>

      {kickBackOpen && kickBack && (
        <KickBackDialog config={kickBack} onCancel={() => setKickBackOpen(false)} />
      )}

      <div style={{ display: 'flex', height: '100vh', overflow: 'hidden', backgroundColor: C.ground, flexDirection: 'column' }}>
        <TopBar />
        <ConnectorHealthBanner />
        {header}

        <div style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>
          {/* Agent content — fills remaining space as panel opens */}
          <div style={{
            flex: 1, minWidth: 0,
            display: 'flex', overflow: 'hidden',
          }}>
          {/* Left: queue */}
          <QueuePanel
            items={queue}
            selectedId={selectedId}
            onSelect={onSelect}
            agentLabel={agentLabel}
          />

          {/* Right: chat workspace */}
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', backgroundColor: '#F7F8FA' }}>
            {/* Artifact context card */}
            <ArtifactCard title={artifactTitle} meta={artifactMeta}>
              {artifactBody}
            </ArtifactCard>

            {/* Thread */}
            <div style={{ flex: 1, overflowY: 'auto', padding: '16px 0 8px' }}>
              {messages.map(msg => <Bubble key={msg.id} msg={msg} />)}
              {typing && <TypingIndicator />}
              <div ref={bottomRef} />
            </div>

            {/* Decision buttons */}
            <ActionBar actions={actions} kickBack={kickBack} onKickBack={() => setKickBackOpen(true)} />

            {/* Input */}
            <div style={{
              padding: '12px 20px 14px',
              borderTop: `1px solid ${C.border}`,
              backgroundColor: '#FFF',
              flexShrink: 0,
            }}>
              <div style={{ display: 'flex', gap: 10, alignItems: 'flex-end' }}>
                <label htmlFor={inputId} style={{ display: 'none' }}>Message</label>
                <textarea
                  id={inputId}
                  value={input}
                  onChange={e => setInput(e.target.value)}
                  onKeyDown={e => {
                    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send() }
                  }}
                  placeholder={placeholder ?? 'Ask the agent…'}
                  rows={2}
                  style={{
                    flex: 1, resize: 'none', outline: 'none',
                    border: `1.5px solid ${C.border}`, borderRadius: 8,
                    padding: '10px 13px', fontSize: 13, lineHeight: 1.55,
                    fontFamily: 'inherit', color: C.text1,
                    backgroundColor: C.surfaceSubtle, boxSizing: 'border-box',
                    transition: 'border-color 120ms',
                  }}
                  onFocus={e => { e.currentTarget.style.borderColor = '#7C3AED' }}
                  onBlur={e => { e.currentTarget.style.borderColor = C.border }}
                />
                <button
                  onClick={send}
                  disabled={!input.trim() || typing}
                  style={{
                    flexShrink: 0, padding: '9px 18px', fontSize: 13, fontWeight: 600,
                    background: input.trim() && !typing
                      ? 'linear-gradient(135deg, #7C3AED 0%, #4F46E5 100%)'
                      : C.border,
                    color: input.trim() && !typing ? '#FFF' : C.text3,
                    border: 'none', borderRadius: 8,
                    cursor: input.trim() && !typing ? 'pointer' : 'not-allowed',
                    transition: 'all 120ms',
                  }}
                >
                  Send ↵
                </button>
              </div>
            </div>
          </div>
          </div>{/* end agent content wrapper */}

          {/* Side panel — expands in from the right edge */}
          <div style={{
            width: sidePanel ? '50%' : 0,
            flexShrink: 0,
            overflow: 'hidden',
            borderLeft: sidePanel ? `1px solid ${C.border}` : 'none',
            display: 'flex', flexDirection: 'column',
            transition: 'width 300ms cubic-bezier(0.4, 0, 0.2, 1)',
          }}>
            {sidePanel}
          </div>
        </div>
      </div>
    </>
  )
}
