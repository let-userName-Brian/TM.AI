import { useState, useMemo } from 'react'
import { C } from '../tokens'
import { useStore } from '../store'
import { useToast } from '../components/Toast'
import AgentChatPage, { AgentHeader, type ChatMsg, type QueueItem, type AgentAction } from '../components/AgentChatPage'

// ─── Fixtures ─────────────────────────────────────────────────────────────────

type AcRow = { id: string; text: string; editedBy: string | null }

const STORIES: Array<{
  id: string; storyKey: string; title: string; stage: string;
  epic: string; points: number; priority: 'High' | 'Medium' | 'Low'
  ac: AcRow[]; status: 'open' | 'decided' | 'stale'; isAwaiting: boolean
}> = [
  {
    id: 'ba-g1', storyKey: 'FACTS-17', stage: 'requirements', status: 'open', isAwaiting: true,
    title: 'Export filtered facts to CSV and Parquet',
    epic: 'Data Export', points: 5, priority: 'High',
    ac: [
      { id: 'AC-1', text: 'Export respects all currently applied filters (date range, status, category, tag)', editedBy: null },
      { id: 'AC-2', text: 'CSV produces a well-formed file with column headers matching the dashboard; empty result set yields a header-only file, not an error', editedBy: 'L. Park' },
      { id: 'AC-3', text: 'Parquet export produces a valid schema-compliant file readable by pandas ≥ 1.5 and pyarrow ≥ 12', editedBy: null },
      { id: 'AC-4', text: 'Export control is disabled with an explanatory tooltip when the result set is empty', editedBy: null },
      { id: 'AC-5', text: 'Exports larger than 50 000 rows are handled asynchronously; user receives a download link via in-app notification when ready', editedBy: 'D. Marsh' },
      { id: 'AC-6', text: 'Exported file names include a UTC timestamp and a short slug derived from the active filter state', editedBy: null },
    ],
  },
  {
    id: 'ba-g2', storyKey: 'FACTS-18', stage: 'requirements', status: 'open', isAwaiting: true,
    title: 'Bulk tag assignment from filtered selection',
    epic: 'Bulk Operations', points: 3, priority: 'Medium',
    ac: [
      { id: 'AC-1', text: 'Tag assignment applies to all rows in the current filtered view, not just the visible page', editedBy: null },
      { id: 'AC-2', text: 'User sees a confirmation dialog with row count before the operation is committed', editedBy: null },
      { id: 'AC-3', text: 'Operation is reversible within 60 seconds via an undo banner', editedBy: null },
      { id: 'AC-4', text: 'Every bulk tag operation is recorded in the audit log with actor, timestamp, filter state, and row count', editedBy: null },
    ],
  },
  {
    id: 'ba-g3', storyKey: 'FACTS-19', stage: 'requirements', status: 'stale', isAwaiting: false,
    title: 'Dashboard query performance budget',
    epic: 'Performance', points: 8, priority: 'High',
    ac: [
      { id: 'AC-1', text: 'All dashboard queries must complete in under 800ms at P95 for datasets up to 100k rows', editedBy: null },
      { id: 'AC-2', text: 'Queries exceeding the budget log a structured warning that includes query shape and row count', editedBy: null },
    ],
  },
]

// ─── Seed messages ────────────────────────────────────────────────────────────

const SEED: Record<string, ChatMsg[]> = {
  'ba-g1': [
    { id: 'bs1', role: 'assistant', ts: '9:02 AM', content: "I've analyzed the ask from D. Marsh and drafted FACTS-17. The core requirement is export functionality — CSV at minimum, Parquet for the audit team — that respects whatever filters are active at the time of export.\n\nI've written 6 acceptance criteria. Two needed your input before this was ready for sign-off:\n\n• AC-2: Should an empty result set produce an error or a header-only file? I've defaulted to header-only.\n• AC-5: The async threshold is set to 50,000 rows based on prior sprint data." },
    { id: 'bs2', role: 'user', ts: '9:06 AM', content: "Header-only is correct. 50k is fine — infra confirmed that last week." },
    { id: 'bs3', role: 'assistant', ts: '9:06 AM', content: "Got it. Both confirmed — AC-2 and AC-5 are locked. I also checked Jira for duplicates: FACT-123 from Sprint 12 has 87% overlap on the CSV export scope. It's closed and superseded, so we're safe to proceed.\n\nThe ticket is ready. Preview it, then approve to push to Jira and route to the Scrum Master for assignment." },
  ],
  'ba-g2': [
    { id: 'bs4', role: 'assistant', ts: '9:40 AM', content: "FACTS-18 is drafted. Bulk tag assignment from a filtered selection — 4 acceptance criteria covering scope, confirmation, undo, and audit logging.\n\nNo strong duplicates found in Jira. The undo window (AC-3) is set to 60 seconds, consistent with Sprint 11's bulk status update." },
    { id: 'bs5', role: 'user', ts: '9:42 AM', content: "Yes, link it. And add an AC for audit logging — every bulk operation should be logged." },
    { id: 'bs6', role: 'assistant', ts: '9:42 AM', content: "Done. Linked FACTS-09 (bulk status update) as a reference implementation. Added AC-4 for audit logging.\n\nStory has 4 acceptance criteria. Preview the ticket and approve when ready — it'll route to Scott for sprint assignment." },
  ],
  'ba-g3': [
    { id: 'bs7', role: 'assistant', ts: '2 days ago', content: "FACTS-19 has been waiting for PM sign-off on the P95 threshold — the original ask said 'fast' without a number, so I defaulted to 800ms based on industry benchmarks.\n\nThis has been open 48 hours without action. Do you want to approve as-is, adjust the threshold, or flag it for PM review first?" },
  ],
}

// ─── Jira ticket preview — split edit + diff ──────────────────────────────────

const PRIORITY_OPTS = ['High', 'Medium', 'Low'] as const
const PRIORITY_ICON: Record<string, { color: string; symbol: string }> = {
  High:   { color: '#DC2626', symbol: '↑' },
  Medium: { color: '#D97706', symbol: '→' },
  Low:    { color: '#2563EB', symbol: '↓' },
}

const STORY_DESCRIPTION = "As a data analyst, I need to export the currently filtered dataset to CSV or Parquet format so that I can share results with stakeholders and run offline analysis without re-querying the dashboard."

type EditState = {
  title: string
  points: number
  priority: typeof PRIORITY_OPTS[number]
  description: string
  ac: Array<{ id: string; text: string }>
}

type DiffRow = { field: string; original: string; edited: string }

function computeDiffRows(story: typeof STORIES[0], edit: EditState): DiffRow[] {
  const rows: DiffRow[] = []
  if (story.title !== edit.title) rows.push({ field: 'Title', original: story.title, edited: edit.title })
  if (story.priority !== edit.priority) rows.push({ field: 'Priority', original: story.priority, edited: edit.priority })
  if (story.points !== edit.points) rows.push({ field: 'Points', original: String(story.points), edited: String(edit.points) })
  if (STORY_DESCRIPTION !== edit.description) rows.push({ field: 'Description', original: STORY_DESCRIPTION, edited: edit.description })
  story.ac.forEach((orig, i) => {
    const ed = edit.ac[i]
    if (ed && orig.text !== ed.text) rows.push({ field: orig.id, original: orig.text, edited: ed.text })
  })
  return rows
}

// Shared Jira card structure (read-only display)
function JiraCard({
  title, storyKey, epic, points, priority, description, ac, editable, onEdit,
}: {
  title: string; storyKey: string; epic: string; points: number
  priority: typeof PRIORITY_OPTS[number]; description: string
  ac: Array<{ id: string; text: string }>
  editable?: boolean
  onEdit?: (field: string, value: string, acIndex?: number) => void
}) {
  const pri = PRIORITY_ICON[priority]
  const inputBase: React.CSSProperties = {
    width: '100%', boxSizing: 'border-box', fontSize: 13, fontFamily: 'inherit',
    border: editable ? '1.5px solid #BFDBFE' : 'none',
    borderRadius: 4, outline: 'none', backgroundColor: editable ? '#F0F9FF' : 'transparent',
    color: '#111827', lineHeight: 1.4,
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', overflowY: 'auto' }}>
      {/* Header */}
      <div style={{ padding: '16px 18px 12px', borderBottom: '1px solid #E5E7EB', flexShrink: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 4, backgroundColor: '#E3F2FD', borderRadius: 3, padding: '2px 7px' }}>
            <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
              <rect x="1" y="1" width="8" height="8" rx="1.5" fill="#0052CC" />
              <path d="M3 5h4M3 3.5h4M3 6.5h2.5" stroke="#FFF" strokeWidth="0.9" strokeLinecap="round" />
            </svg>
            <span style={{ fontSize: 10, fontWeight: 600, color: '#0052CC' }}>Story</span>
          </div>
          <span style={{ fontSize: 11, color: '#6B7280', fontFamily: 'JetBrains Mono, monospace' }}>{storyKey}</span>
          {editable ? (
            <select
              value={priority}
              onChange={e => onEdit?.('priority', e.target.value)}
              style={{ marginLeft: 'auto', fontSize: 11, border: '1.5px solid #BFDBFE', borderRadius: 4, padding: '2px 6px', backgroundColor: '#F0F9FF', color: PRIORITY_ICON[priority].color, fontWeight: 700, cursor: 'pointer' }}
            >
              {PRIORITY_OPTS.map(p => <option key={p}>{p}</option>)}
            </select>
          ) : (
            <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 4 }}>
              <span style={{ fontSize: 10, fontWeight: 700, color: pri.color }}>{pri.symbol}</span>
              <span style={{ fontSize: 10, color: '#6B7280' }}>{priority} priority</span>
            </div>
          )}
        </div>

        {editable ? (
          <input
            value={title}
            onChange={e => onEdit?.('title', e.target.value)}
            style={{ ...inputBase, fontSize: 16, fontWeight: 600, padding: '4px 6px', marginBottom: 12 }}
          />
        ) : (
          <h2 style={{ fontSize: 16, fontWeight: 600, color: '#111827', margin: '0 0 12px', lineHeight: 1.3 }}>{title}</h2>
        )}

        <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
          {[
            { label: 'Status',   val: 'Backlog', editable: false },
            { label: 'Epic',     val: epic, editable: false },
            { label: 'Points',   val: String(points), editable: true, field: 'points' },
            { label: 'Reporter', val: 'Kyle (BA Agent)', editable: false },
            { label: 'Sprint',   val: 'Sprint 15 (proposed)', editable: false },
          ].map(f => (
            <div key={f.label}>
              <div style={{ fontSize: 9, fontWeight: 700, color: '#9CA3AF', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 2 }}>{f.label}</div>
              {editable && f.editable ? (
                <input
                  type="number" min={1} max={13}
                  value={points}
                  onChange={e => onEdit?.('points', e.target.value)}
                  style={{ ...inputBase, width: 48, padding: '1px 4px', fontSize: 12 }}
                />
              ) : (
                <div style={{ fontSize: 12, color: '#374151' }}>{f.val}</div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Description */}
      <div style={{ padding: '12px 18px', borderBottom: '1px solid #E5E7EB', flexShrink: 0 }}>
        <div style={{ fontSize: 10, fontWeight: 700, color: '#9CA3AF', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 8 }}>Description</div>
        {editable ? (
          <textarea
            value={description}
            onChange={e => onEdit?.('description', e.target.value)}
            rows={3}
            style={{ ...inputBase, resize: 'vertical', padding: '6px 8px' }}
          />
        ) : (
          <p style={{ fontSize: 13, color: '#374151', margin: 0, lineHeight: 1.7 }}>{description}</p>
        )}
      </div>

      {/* AC */}
      <div style={{ padding: '12px 18px', flex: 1 }}>
        <div style={{ fontSize: 10, fontWeight: 700, color: '#9CA3AF', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 8 }}>
          Acceptance criteria · {ac.length} items
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
          {ac.map((row, i) => (
            <div key={row.id} style={{
              display: 'flex', gap: 8, alignItems: 'flex-start',
              padding: '7px 9px', backgroundColor: '#F9FAFB', border: '1px solid #E5E7EB', borderRadius: 4,
            }}>
              <span style={{ flexShrink: 0, fontSize: 10, fontWeight: 700, color: '#6B7280', fontFamily: 'JetBrains Mono, monospace', marginTop: 2 }}>{row.id}</span>
              {editable ? (
                <textarea
                  value={row.text}
                  onChange={e => onEdit?.('ac', e.target.value, i)}
                  rows={2}
                  style={{ ...inputBase, fontSize: 12, flex: 1, resize: 'vertical', padding: '2px 4px' }}
                />
              ) : (
                <span style={{ fontSize: 12, color: '#111827', lineHeight: 1.55, flex: 1 }}>{row.text}</span>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

function JiraPreview({
  story,
  onClose,
  onPush,
}: {
  story: typeof STORIES[0]
  onClose: () => void
  onPush: (edit: EditState) => void
}) {
  const [pushing, setPushing] = useState(false)
  const [activeTab, setActiveTab] = useState<'edit' | 'diff'>('edit')
  const [edit, setEdit] = useState<EditState>({
    title: story.title,
    points: story.points,
    priority: story.priority,
    description: STORY_DESCRIPTION,
    ac: story.ac.map(r => ({ id: r.id, text: r.text })),
  })

  function handleField(field: string, value: string, acIndex?: number) {
    setEdit(prev => {
      if (field === 'ac' && acIndex !== undefined) {
        const newAc = prev.ac.map((r, i) => i === acIndex ? { ...r, text: value } : r)
        return { ...prev, ac: newAc }
      }
      if (field === 'points') return { ...prev, points: Math.max(1, Number(value) || 1) }
      if (field === 'priority') return { ...prev, priority: value as typeof PRIORITY_OPTS[number] }
      return { ...prev, [field]: value }
    })
  }

  const diffRows = computeDiffRows(story, edit)
  const hasChanges = diffRows.length > 0

  function handlePush() {
    setPushing(true)
    setTimeout(() => { setPushing(false); onPush(edit) }, 900)
  }

  const tabStyle = (active: boolean): React.CSSProperties => ({
    padding: '6px 14px', fontSize: 12, fontWeight: 600, border: 'none', cursor: 'pointer',
    backgroundColor: active ? 'rgba(255,255,255,0.18)' : 'transparent',
    color: active ? '#FFF' : 'rgba(255,255,255,0.6)',
    borderRadius: 4, transition: 'background 120ms',
  })

  return (
    <>
      <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(17,19,24,0.5)', zIndex: 200 }} onClick={onClose} />
      <div style={{
        position: 'fixed', top: '50%', left: '50%', transform: 'translate(-50%,-50%)',
        zIndex: 210, width: 'min(1120px, 96vw)', height: '88vh',
        backgroundColor: '#FFF', borderRadius: 10,
        boxShadow: '0 24px 64px rgba(0,0,0,0.28)',
        display: 'flex', flexDirection: 'column', overflow: 'hidden',
      }}>
        {/* Jira header with tabs */}
        <div style={{ backgroundColor: '#0052CC', padding: '0 20px', display: 'flex', alignItems: 'center', gap: 12, height: 48, flexShrink: 0 }}>
          <svg width="16" height="16" viewBox="0 0 20 20" fill="none">
            <path d="M10.5 2L2 10.5l3 3L10.5 8l5.5 5.5 3-3L10.5 2Z" fill="#4C9AFF" />
            <path d="M10.5 8l-2.5 2.5L10.5 13l2.5-2.5L10.5 8Z" fill="#FFF" />
          </svg>
          <span style={{ fontSize: 13, fontWeight: 600, color: '#FFF' }}>Jira · {story.storyKey}</span>
          <div style={{ display: 'flex', gap: 4, marginLeft: 16 }}>
            <button style={tabStyle(activeTab === 'edit')} onClick={() => setActiveTab('edit')}>Side by side</button>
            <button style={tabStyle(activeTab === 'diff')} onClick={() => setActiveTab('diff')}>
              Diff {hasChanges && <span style={{ marginLeft: 4, backgroundColor: 'rgba(255,255,255,0.25)', borderRadius: 10, padding: '0 5px', fontSize: 10 }}>{diffRows.length}</span>}
            </button>
          </div>
          <button onClick={onClose} style={{ marginLeft: 'auto', color: 'rgba(255,255,255,0.7)', background: 'none', border: 'none', fontSize: 18, cursor: 'pointer' }}>×</button>
        </div>

        {/* Content */}
        <div style={{ flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
          {activeTab === 'edit' ? (
            <div style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>
              {/* Original */}
              <div style={{ flex: 1, borderRight: '1px solid #E5E7EB', overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
                <div style={{ padding: '8px 18px', backgroundColor: '#F9FAFB', borderBottom: '1px solid #E5E7EB', flexShrink: 0 }}>
                  <span style={{ fontSize: 10, fontWeight: 700, color: '#6B7280', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Original</span>
                </div>
                <div style={{ flex: 1, overflow: 'hidden' }}>
                  <JiraCard title={story.title} storyKey={story.storyKey} epic={story.epic} points={story.points} priority={story.priority} description={STORY_DESCRIPTION} ac={story.ac.map(r => ({ id: r.id, text: r.text }))} />
                </div>
              </div>

              {/* Edited */}
              <div style={{ flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
                <div style={{ padding: '8px 18px', backgroundColor: '#F0F9FF', borderBottom: '1px solid #BFDBFE', display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
                  <span style={{ fontSize: 10, fontWeight: 700, color: '#1D4ED8', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Editing</span>
                  {hasChanges && (
                    <span style={{ fontSize: 10, color: '#1D4ED8', backgroundColor: '#DBEAFE', borderRadius: 10, padding: '1px 7px', fontWeight: 600 }}>
                      {diffRows.length} change{diffRows.length !== 1 ? 's' : ''}
                    </span>
                  )}
                </div>
                <div style={{ flex: 1, overflow: 'hidden' }}>
                  <JiraCard
                    title={edit.title} storyKey={story.storyKey} epic={story.epic}
                    points={edit.points} priority={edit.priority} description={edit.description}
                    ac={edit.ac} editable onEdit={handleField}
                  />
                </div>
              </div>
            </div>
          ) : (
            /* Diff tab */
            <div style={{ flex: 1, overflowY: 'auto', padding: '20px 28px' }}>
              {!hasChanges ? (
                <div style={{ textAlign: 'center', color: '#9CA3AF', fontSize: 13, marginTop: 40 }}>
                  No changes yet — switch to "Side by side" to edit the ticket.
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                  {diffRows.map(row => (
                    <div key={row.field} style={{ border: '1px solid #E5E7EB', borderRadius: 6, overflow: 'hidden', fontFamily: 'JetBrains Mono, monospace' }}>
                      <div style={{ padding: '5px 12px', backgroundColor: '#F9FAFB', borderBottom: '1px solid #E5E7EB', fontSize: 10, fontWeight: 700, color: '#6B7280', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                        {row.field}
                      </div>
                      <div style={{ backgroundColor: '#FFF5F5', borderLeft: '3px solid #DC2626', padding: '7px 12px', display: 'flex', gap: 10 }}>
                        <span style={{ color: '#DC2626', fontWeight: 700, flexShrink: 0, fontSize: 12 }}>−</span>
                        <span style={{ fontSize: 12, color: '#374151', lineHeight: 1.6 }}>{row.original}</span>
                      </div>
                      <div style={{ backgroundColor: '#F0FDF4', borderLeft: '3px solid #16A34A', padding: '7px 12px', display: 'flex', gap: 10 }}>
                        <span style={{ color: '#16A34A', fontWeight: 700, flexShrink: 0, fontSize: 12 }}>+</span>
                        <span style={{ fontSize: 12, color: '#374151', lineHeight: 1.6 }}>{row.edited}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div style={{ padding: '12px 24px', borderTop: '1px solid #E5E7EB', display: 'flex', justifyContent: 'flex-end', alignItems: 'center', gap: 10, backgroundColor: '#F9FAFB', flexShrink: 0 }}>
          {hasChanges && (
            <span style={{ fontSize: 12, color: '#6B7280', marginRight: 'auto' }}>
              {diffRows.length} field{diffRows.length !== 1 ? 's' : ''} edited
            </span>
          )}
          <button onClick={onClose} style={{ padding: '8px 16px', borderRadius: 5, fontSize: 13, border: '1px solid #D1D5DB', background: '#FFF', cursor: 'pointer', color: '#374151' }}>
            Close
          </button>
          <button
            onClick={handlePush} disabled={pushing}
            style={{
              padding: '8px 18px', borderRadius: 5, fontSize: 13, fontWeight: 600, border: 'none',
              backgroundColor: pushing ? '#93C5FD' : '#0052CC',
              color: '#FFF', cursor: pushing ? 'default' : 'pointer',
              display: 'flex', alignItems: 'center', gap: 6,
            }}
          >
            {pushing ? (
              <>
                <svg width="12" height="12" viewBox="0 0 12 12" fill="none" style={{ animation: 'spin 1s linear infinite' }}>
                  <circle cx="6" cy="6" r="4.5" stroke="rgba(255,255,255,0.4)" strokeWidth="1.4" strokeDasharray="16 8" />
                </svg>
                Pushing to Jira…
              </>
            ) : (hasChanges ? 'Approve edited ticket & Push →' : 'Approve & Push to Jira →')}
          </button>
        </div>
      </div>
      <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
    </>
  )
}

// ─── Artifact card body ───────────────────────────────────────────────────────

function StoryArtifact({ ac }: { ac: AcRow[] }) {
  return (
    <div>
      <div style={{ fontSize: 11, fontWeight: 600, color: C.text3, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 10 }}>
        Acceptance criteria
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        {ac.map(row => (
          <div key={row.id} style={{
            display: 'flex', gap: 10, alignItems: 'flex-start',
            padding: '8px 10px',
            backgroundColor: C.surfaceSubtle, border: `1px solid ${C.border}`, borderRadius: 5,
          }}>
            <span style={{ flexShrink: 0, marginTop: 1, fontFamily: 'JetBrains Mono, monospace', fontSize: 10, color: C.text3 }}>{row.id}</span>
            <span style={{ fontSize: 12, color: C.text1, lineHeight: 1.55, flex: 1 }}>{row.text}</span>
            {row.editedBy && (
              <span style={{
                flexShrink: 0, fontSize: 9.5, color: C.text3,
                backgroundColor: '#FFFBEB', border: '1px solid #FDE68A',
                padding: '1px 5px', borderRadius: 3, whiteSpace: 'nowrap',
              }}>
                edited · {row.editedBy}
              </span>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}

// ─── Root ─────────────────────────────────────────────────────────────────────

export default function BAAgent() {
  const { state } = useStore()
  const { showToast } = useToast()
  const [selectedId, setSelectedId] = useState('ba-g1')
  const [approvedIds, setApprovedIds] = useState<Set<string>>(new Set())
  const [previewOpen, setPreviewOpen] = useState(false)

  const currentUser = state.currentUser
  const isBa = currentUser?.role === 'ba'

  const selected = STORIES.find(s => s.id === selectedId) ?? STORIES[0]
  const isDecided = approvedIds.has(selectedId)

  const queue: QueueItem[] = STORIES.map(s => ({
    id: s.id, storyKey: s.storyKey, title: s.title,
    status: approvedIds.has(s.id) ? 'decided' : s.status,
    isAwaiting: s.isAwaiting && isBa,
  }))

  function handlePush(_edit: EditState) {
    setPreviewOpen(false)
    setApprovedIds(prev => new Set([...prev, selectedId]))
    showToast(`${selected.storyKey} pushed to Jira · routing to Scrum Master for assignment`, 'success')
  }

  const actions: AgentAction[] = isBa && !isDecided ? [
    {
      label: 'Preview Ticket',
      variant: 'approve',
      onClick: () => setPreviewOpen(true),
    },
  ] : []

  const seedMessages = useMemo(() => SEED[selectedId] ?? SEED['ba-g1'], [selectedId])

  return (
    <>
      {previewOpen && (
        <JiraPreview
          story={selected}
          onClose={() => setPreviewOpen(false)}
          onPush={handlePush}
        />
      )}

      <AgentChatPage
        agentLabel="BA Agent"
        agentContext="ba"
        queue={queue}
        selectedId={selectedId}
        onSelect={setSelectedId}
        artifactTitle={`${selected.storyKey} · User Story`}
        artifactMeta={`${selected.ac.length} acceptance criteria · ${selected.stage} · ${selected.points} pts`}
        artifactBody={<StoryArtifact ac={selected.ac} />}
        seedMessages={seedMessages}
        placeholder="Ask the BA agent to revise criteria, check duplicates, or explain a decision…"
        actions={actions}
        header={<AgentHeader
          role="BA Agent"
          sprint="Sprint 15 · FACTS"
          accent="#A78BFA"
          accentDim="rgba(124,58,237,0.25)"
          stats={[
            { label: 'Stories', val: String(STORIES.length) },
            { label: 'Awaiting review', val: String(STORIES.filter(s => s.isAwaiting).length) },
            { label: 'Approved', val: String(approvedIds.size), highlight: approvedIds.size > 0 },
            { label: 'Total pts', val: String(STORIES.reduce((n, s) => n + s.points, 0)) },
          ]}
        />}
        kickBack={isBa && !isDecided && selected.id !== 'ba-g3' ? {
          label: 'Return to Ask',
          toStage: 'Ask',
          storyKey: selected.storyKey,
          onConfirm: (note) => {
            showToast(`${selected.storyKey} returned to Ask stage — "${note}"`, 'info')
          },
        } : undefined}
      />
    </>
  )
}
