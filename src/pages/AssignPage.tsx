import { useState, useRef, useId } from 'react'
import { C } from '../tokens'
import { TopBar, ConnectorHealthBanner } from '../components/Shell'
import { useToast } from '../components/Toast'
import { FlowInner } from './FlowPage'
import { useStore } from '../store'

// ─── Types ────────────────────────────────────────────────────────────────────

type Priority = 'High' | 'Medium' | 'Low'
type Stage    = 'unassigned' | 'in-sprint' | 'in-progress' | 'done'

type Member = { name: string; initials: string; role: 'dev' | 'qa'; roleLabel: string }

type Story = {
  id: string
  key: string
  title: string
  epic: string
  points: number
  priority: Priority
  acCount: number
  pushedAt: string
  stage: Stage
  // Sequential assignment state
  devAssigned: boolean   // Dev has been assigned
  devDone: boolean       // Scrum master has confirmed dev work is complete
  qaAssigned: boolean    // QA has been assigned (only possible when devDone)
  // Reporting flags (done stories only)
  flagWAR: boolean       // Weekly Action Report
  flagWMB: boolean       // Weekly Management Briefing
}

// ─── Fixtures ─────────────────────────────────────────────────────────────────

const DEV: Member = { name: 'Vikas',  initials: 'VK', role: 'dev', roleLabel: 'Dev' }
const QA:  Member = { name: 'Sachin', initials: 'SC', role: 'qa',  roleLabel: 'QA'  }

const INIT_STORIES: Story[] = [
  // New from BA — nothing assigned yet
  {
    id: 's1', key: 'FACTS-17', epic: 'Data Export', points: 5, priority: 'High', acCount: 6,
    title: 'Export filtered facts to CSV and Parquet',
    pushedAt: 'Today, 9:06 AM', stage: 'unassigned',
    devAssigned: false, devDone: false, qaAssigned: false, flagWAR: false, flagWMB: false,
  },
  {
    id: 's2', key: 'FACTS-18', epic: 'Bulk Operations', points: 3, priority: 'Medium', acCount: 4,
    title: 'Bulk tag assignment from filtered selection',
    pushedAt: 'Today, 9:42 AM', stage: 'unassigned',
    devAssigned: false, devDone: false, qaAssigned: false, flagWAR: false, flagWMB: false,
  },
  {
    id: 's3', key: 'FACTS-14', epic: 'Auth', points: 2, priority: 'High', acCount: 3,
    title: 'SSO token handoff for mobile API client',
    pushedAt: 'Yesterday', stage: 'in-sprint',
    devAssigned: true, devDone: false, qaAssigned: false, flagWAR: false, flagWMB: false,
  },
  {
    id: 's4', key: 'FACTS-11', epic: 'Data Export', points: 3, priority: 'Low', acCount: 5,
    title: 'CSV export for dashboard row selection',
    pushedAt: '2 days ago', stage: 'in-sprint',
    devAssigned: true, devDone: true, qaAssigned: false, flagWAR: false, flagWMB: false,
  },
  {
    id: 's5', key: 'FACTS-09', epic: 'Bulk Operations', points: 5, priority: 'Medium', acCount: 6,
    title: 'Bulk status update from filtered view',
    pushedAt: 'Sprint 14', stage: 'done',
    devAssigned: true, devDone: true, qaAssigned: true, flagWAR: true, flagWMB: false,
  },
]

// ─── Design tokens ────────────────────────────────────────────────────────────

const PRIORITY_STYLE: Record<Priority, { color: string; bg: string; symbol: string }> = {
  High:   { color: '#DC2626', bg: '#FFF5F5', symbol: '↑' },
  Medium: { color: '#D97706', bg: '#FFFBEB', symbol: '→' },
  Low:    { color: '#2563EB', bg: '#EFF6FF', symbol: '↓' },
}

const STAGE_META: Record<Stage, { label: string; color: string; bg: string }> = {
  'unassigned':  { label: 'Needs assignment', color: '#7C3AED', bg: '#F5F3FF' },
  'in-sprint':   { label: 'In Sprint 15',     color: '#1D4ED8', bg: '#EFF6FF' },
  'in-progress': { label: 'In progress',       color: '#D97706', bg: '#FFFBEB' },
  'done':        { label: 'Done',              color: '#16A34A', bg: '#F0FDF4' },
}

const ROLE_STYLE: Record<Member['role'], { bg: string; text: string; border: string }> = {
  dev: { bg: '#EFF6FF', text: '#1D4ED8', border: '#BFDBFE' },
  qa:  { bg: '#F5F3FF', text: '#7C3AED', border: '#DDD6FE' },
}

// ─── Avatar ───────────────────────────────────────────────────────────────────

function Avatar({ m, size = 26, faded }: { m: Member; size?: number; faded?: boolean }) {
  const rs = ROLE_STYLE[m.role]
  return (
    <div
      title={`${m.name} · ${m.roleLabel}`}
      style={{
        width: size, height: size, borderRadius: '50%', flexShrink: 0,
        backgroundColor: rs.bg, color: rs.text,
        fontSize: size * 0.38, fontWeight: 700,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        border: `1.5px solid ${C.surface}`,
        opacity: faded ? 0.35 : 1,
      }}
    >
      {m.initials}
    </div>
  )
}

// ─── Assign popover ───────────────────────────────────────────────────────────

function AssignPopover({
  story, onAssign, onClose,
}: {
  story: Story
  onAssign: (role: 'dev' | 'qa') => void
  onClose: () => void
}) {
  type Row = {
    member: Member
    state: 'done' | 'available' | 'locked'
    lockReason?: string
  }

  const rows: Row[] = [
    {
      member: DEV,
      state: story.devAssigned ? 'done' : 'available',
    },
    {
      member: QA,
      state: story.qaAssigned
        ? 'done'
        : story.devDone
          ? 'available'
          : 'locked',
      lockReason: 'Dev work must be complete first',
    },
  ]

  return (
    <>
      <div style={{ position: 'fixed', inset: 0, zIndex: 50 }} onClick={onClose} />
      <div style={{
        position: 'absolute', top: 'calc(100% + 6px)', right: 0, zIndex: 60,
        backgroundColor: C.surface, border: `1px solid ${C.border}`,
        borderRadius: 8, boxShadow: '0 8px 24px rgba(0,0,0,0.13)',
        minWidth: 230, overflow: 'hidden',
      }}>
        <div style={{ padding: '8px 12px 6px', borderBottom: `1px solid ${C.border}` }}>
          <div style={{ fontSize: 10, fontWeight: 700, color: C.text3, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
            Assign to
          </div>
        </div>

        {rows.map(({ member: m, state, lockReason }) => {
          const rs = ROLE_STYLE[m.role]
          const clickable = state === 'available'
          return (
            <button
              key={m.role}
              onClick={clickable ? () => { onAssign(m.role); onClose() } : undefined}
              disabled={!clickable}
              style={{
                display: 'flex', alignItems: 'center', gap: 10,
                width: '100%', padding: '10px 12px', textAlign: 'left', border: 'none',
                cursor: clickable ? 'pointer' : 'default',
                backgroundColor: state === 'done' ? C.surfaceSubtle : 'transparent',
                opacity: state === 'locked' ? 0.55 : 1,
                transition: 'background 80ms',
              }}
            >
              <Avatar m={m} size={30} faded={state === 'locked'} />
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 13, fontWeight: 500, color: C.text1 }}>{m.name}</div>
                {state === 'locked'
                  ? <div style={{ fontSize: 10, color: '#D97706' }}>🔒 {lockReason}</div>
                  : <div style={{ fontSize: 10, color: C.text3 }}>{m.roleLabel}</div>
                }
              </div>
              {state === 'done' && (
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                  <circle cx="8" cy="8" r="7" fill="#16A34A" />
                  <path d="M5 8l2.5 2.5L11 5.5" stroke="#FFF" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              )}
              {state === 'available' && (
                <span style={{
                  fontSize: 9, fontWeight: 700, textTransform: 'uppercase',
                  color: rs.text, backgroundColor: rs.bg, border: `1px solid ${rs.border}`,
                  padding: '1px 6px', borderRadius: 3,
                }}>
                  Assign
                </span>
              )}
            </button>
          )
        })}
      </div>
    </>
  )
}

// ─── Story card ───────────────────────────────────────────────────────────────

function WorkflowPip({ label, done, active, locked }: { label: string; done: boolean; active: boolean; locked: boolean }) {
  const color = done ? '#16A34A' : active ? '#1D4ED8' : locked ? C.text3 : C.text3
  const bg    = done ? '#F0FDF4' : active ? '#EFF6FF' : C.surfaceSubtle
  const border = done ? '#BBF7D0' : active ? '#BFDBFE' : C.border
  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 5,
      padding: '3px 8px', borderRadius: 4,
      backgroundColor: bg, border: `1px solid ${border}`,
      fontSize: 10, fontWeight: 600, color,
    }}>
      {done && <svg width="10" height="10" viewBox="0 0 10 10" fill="none"><circle cx="5" cy="5" r="4.5" fill="#16A34A" /><path d="M3 5l1.5 1.5L7 3.5" stroke="#FFF" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" /></svg>}
      {!done && !locked && <div style={{ width: 6, height: 6, borderRadius: '50%', backgroundColor: active ? '#1D4ED8' : C.border }} />}
      {locked && <span style={{ opacity: 0.5 }}>🔒</span>}
      {label}
    </div>
  )
}

function FlagToggle({ active, label, color, bg, border, onClick }: {
  active: boolean; label: string; color: string; bg: string; border: string; onClick: () => void
}) {
  return (
    <button
      onClick={onClick}
      title={active ? `Remove from ${label}` : `Flag for ${label}`}
      style={{
        display: 'flex', alignItems: 'center', gap: 5,
        padding: '4px 10px', fontSize: 11, fontWeight: 700,
        borderRadius: 5, cursor: 'pointer',
        border: `1.5px solid ${active ? border : C.border}`,
        backgroundColor: active ? bg : 'transparent',
        color: active ? color : C.text3,
        transition: 'all 120ms',
      }}
    >
      {active && (
        <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
          <path d="M2 2h6v5.5L5 6 2 7.5V2Z" fill={color} stroke={color} strokeWidth="0.8" strokeLinejoin="round" />
        </svg>
      )}
      {!active && (
        <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
          <path d="M2 2h6v5.5L5 6 2 7.5V2Z" stroke={C.text3} strokeWidth="1" strokeLinejoin="round" fill="none" />
        </svg>
      )}
      {label}
    </button>
  )
}

function StoryCard({
  story, onAssign, onMarkDevDone, onToggleFlag,
}: {
  story: Story
  onAssign: (storyId: string, role: 'dev' | 'qa') => void
  onMarkDevDone: (storyId: string) => void
  onToggleFlag: (storyId: string, flag: 'WAR' | 'WMB') => void
}) {
  const [popoverOpen, setPopoverOpen] = useState(false)
  const pri       = PRIORITY_STYLE[story.priority]
  const stageMeta = STAGE_META[story.stage]

  // Who's visually shown in the avatar stack
  const avatars: Member[] = [
    ...(story.devAssigned ? [DEV] : []),
    ...(story.qaAssigned  ? [QA]  : []),
  ]

  const canOpenAssign = story.stage !== 'done' && (!story.devAssigned || (story.devDone && !story.qaAssigned))
  const showMarkDevDone = story.devAssigned && !story.devDone && story.stage !== 'done'
  const showAddToSprint = !story.devAssigned && story.stage === 'unassigned'

  return (
    <div style={{
      backgroundColor: C.surface, border: `1px solid ${C.border}`,
      borderRadius: 8, padding: '14px 16px',
      boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
      display: 'flex', flexDirection: 'column', gap: 10,
    }}>
      {/* Top row */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <span style={{ fontSize: 10, fontWeight: 700, color: C.text3, fontFamily: 'JetBrains Mono, monospace' }}>{story.key}</span>
        <span style={{ fontSize: 10, fontWeight: 700, color: pri.color, backgroundColor: pri.bg, padding: '1px 6px', borderRadius: 3 }}>
          {pri.symbol} {story.priority}
        </span>
        <span style={{ fontSize: 10, color: C.text3, fontStyle: 'italic' }}>{story.epic}</span>
        <span style={{ marginLeft: 'auto', fontSize: 10, fontWeight: 600, color: stageMeta.color, backgroundColor: stageMeta.bg, padding: '1px 7px', borderRadius: 10 }}>
          {stageMeta.label}
        </span>
      </div>

      {/* Title */}
      <div style={{ fontSize: 13.5, fontWeight: 500, color: C.text1, lineHeight: 1.4 }}>{story.title}</div>

      {/* Workflow pipeline */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
        <WorkflowPip
          label="Dev"
          done={story.devDone}
          active={story.devAssigned && !story.devDone}
          locked={false}
        />
        <div style={{ width: 16, height: 1, backgroundColor: story.devAssigned ? '#BFDBFE' : C.border }} />
        <WorkflowPip
          label="QA"
          done={story.qaAssigned}
          active={story.devDone && !story.qaAssigned}
          locked={!story.devDone}
        />
        <div style={{ flex: 1 }} />
        {[
          { label: 'Points', val: String(story.points) },
          { label: 'ACs',    val: String(story.acCount) },
          { label: 'From BA', val: story.pushedAt },
        ].map(f => (
          <div key={f.label} style={{ textAlign: 'right' }}>
            <div style={{ fontSize: 9, fontWeight: 700, color: C.text3, textTransform: 'uppercase', letterSpacing: '0.05em' }}>{f.label}</div>
            <div style={{ fontSize: 11, color: C.text2 }}>{f.val}</div>
          </div>
        ))}
      </div>

      {/* Assignment row */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, paddingTop: 2, borderTop: `1px solid ${C.border}`, marginTop: 2 }}>
        {/* Avatar stack */}
        <div style={{ display: 'flex' }}>
          {avatars.map((m, i) => (
            <div key={m.role} style={{ marginLeft: i > 0 ? -6 : 0 }}>
              <Avatar m={m} size={26} />
            </div>
          ))}
        </div>
        {avatars.length === 0 && (
          <span style={{ fontSize: 12, color: C.text3, fontStyle: 'italic' }}>Unassigned</span>
        )}
        {story.devAssigned && !story.devDone && (
          <span style={{ fontSize: 11, color: '#1D4ED8' }}>Vikas · Dev in progress</span>
        )}
        {story.devDone && !story.qaAssigned && (
          <span style={{ fontSize: 11, color: '#7C3AED' }}>Dev complete · QA ready to assign</span>
        )}
        {story.qaAssigned && story.stage !== 'done' && (
          <span style={{ fontSize: 11, color: '#D97706' }}>Sachin · QA in review</span>
        )}
        {story.stage === 'done' && (
          <span style={{ fontSize: 11, color: '#16A34A', fontWeight: 600 }}>✓ Complete</span>
        )}

        {/* Actions — right side */}
        <div style={{ marginLeft: 'auto', display: 'flex', gap: 8, alignItems: 'center' }}>
          {/* Mark dev done */}
          {showMarkDevDone && (
            <button
              onClick={() => onMarkDevDone(story.id)}
              style={{
                padding: '5px 12px', fontSize: 11, fontWeight: 600,
                border: `1.5px solid #BFDBFE`, borderRadius: 5,
                backgroundColor: '#EFF6FF', color: '#1D4ED8', cursor: 'pointer',
                transition: 'background 100ms',
              }}
            >
              Mark dev done ✓
            </button>
          )}

          {/* Assign popover trigger */}
          {canOpenAssign && (
            <div style={{ position: 'relative' }}>
              <button
                onClick={() => setPopoverOpen(o => !o)}
                style={{
                  display: 'flex', alignItems: 'center', gap: 5,
                  padding: '5px 12px', fontSize: 11, fontWeight: 600,
                  border: `1.5px solid ${C.border}`, borderRadius: 5,
                  backgroundColor: C.text1, color: '#FFF', cursor: 'pointer',
                  transition: 'opacity 100ms',
                }}
              >
                <svg width="11" height="11" viewBox="0 0 11 11" fill="none">
                  <circle cx="5.5" cy="5.5" r="4.5" stroke="currentColor" strokeWidth="1.2" />
                  <path d="M5.5 3.5v4M3.5 5.5h4" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
                </svg>
                {!story.devAssigned ? 'Assign Dev' : 'Assign QA'}
              </button>
              {popoverOpen && (
                <AssignPopover
                  story={story}
                  onAssign={role => onAssign(story.id, role)}
                  onClose={() => setPopoverOpen(false)}
                />
              )}
            </div>
          )}

          {/* Unassigned with no action yet */}
          {showAddToSprint && !canOpenAssign && (
            <span style={{ fontSize: 11, color: C.text3 }}>Assign Dev to begin</span>
          )}
        </div>
      </div>

      {/* Reporting flags — done stories only */}
      {story.stage === 'done' && (
        <div style={{
          display: 'flex', alignItems: 'center', gap: 8,
          paddingTop: 10, borderTop: `1px solid ${C.border}`, marginTop: 2,
        }}>
          <span style={{ fontSize: 10, fontWeight: 700, color: C.text3, textTransform: 'uppercase', letterSpacing: '0.06em', marginRight: 4 }}>
            Flag for
          </span>
          <FlagToggle
            active={story.flagWAR}
            label="WAR"
            color="#B45309"
            bg="#FFFBEB"
            border="#FDE68A"
            onClick={() => onToggleFlag(story.id, 'WAR')}
          />
          <FlagToggle
            active={story.flagWMB}
            label="WMB"
            color="#6D28D9"
            bg="#F5F3FF"
            border="#DDD6FE"
            onClick={() => onToggleFlag(story.id, 'WMB')}
          />
          {(story.flagWAR || story.flagWMB) && (
            <span style={{ fontSize: 11, color: C.text3, marginLeft: 4 }}>
              Flagged for {[story.flagWAR && 'WAR', story.flagWMB && 'WMB'].filter(Boolean).join(' & ')}
            </span>
          )}
        </div>
      )}
    </div>
  )
}

// ─── Root ─────────────────────────────────────────────────────────────────────

// ─── Inline Flow Agent state (mirrors FlowPage internals) ────────────────────

type FlowMsg = { id: string; role: 'user' | 'assistant'; content: string; ts: string }
function flowUid() { return Math.random().toString(36).slice(2, 9) }
function flowNow() { return new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) }
const FLOW_SEED: FlowMsg[] = [
  { id: 'f1', role: 'assistant', ts: '9:00 AM', content: "Sprint 15 is running on track. FACTS-17 and FACTS-21 are in build, FACTS-22 has cleared QA. You have 8 pts unassigned — assign them before the sprint locks tomorrow." },
]

export default function AssignPage() {
  const { showToast } = useToast()
  const { state } = useStore()
const [stories, setStories] = useState<Story[]>(INIT_STORIES)
  const [filter, setFilter] = useState<'all' | 'unassigned' | 'in-sprint' | 'in-progress' | 'done' | 'flow'>('all')

  // Flow agent inline state
  const [flowMessages, setFlowMessages] = useState<FlowMsg[]>(FLOW_SEED)
  const [flowInput, setFlowInput] = useState('')
  const [flowTyping, setFlowTyping] = useState(false)
  const flowBottomRef = useRef<HTMLDivElement>(null)
  const flowInputId = useId()

  const flowName = state.currentUser?.name ?? ''
  const flowRole = state.currentUser?.role ?? 'scrum_master'
  const flowRoleLabel = { scrum_master: 'Scrum Master', delivery_lead: 'Delivery Lead', ba: 'Business Analyst', dev: 'Developer', qa: 'QA Engineer' }[flowRole] ?? 'Manager'

  function sendFlowMessage() {
    const text = flowInput.trim()
    if (!text || flowTyping) return
    setFlowMessages(prev => [...prev, { id: flowUid(), role: 'user', content: text, ts: flowNow() }])
    setFlowInput('')
    setFlowTyping(true)
    setTimeout(() => {
      setFlowMessages(prev => [...prev, { id: flowUid(), role: 'assistant', content: "I'm tracking that — I'll surface the relevant sprint data and blockers now.", ts: flowNow() }])
      setFlowTyping(false)
    }, 900)
  }

  function handleAssign(storyId: string, role: 'dev' | 'qa') {
    setStories(prev => prev.map(s => {
      if (s.id !== storyId) return s
      if (role === 'dev') {
        showToast(`${s.key} assigned to Vikas · moved to Sprint 15`, 'success')
        return { ...s, devAssigned: true, stage: 'in-sprint' }
      }
      // QA — only reachable when devDone
      showToast(`${s.key} assigned to Sachin · QA review starting`, 'success')
      return { ...s, qaAssigned: true, stage: 'in-progress' }
    }))
  }

  function handleToggleFlag(storyId: string, flag: 'WAR' | 'WMB') {
    const story = stories.find(s => s.id === storyId)
    if (!story) return
    const currentlyOn = flag === 'WAR' ? story.flagWAR : story.flagWMB
    setStories(prev => prev.map(s => {
      if (s.id !== storyId) return s
      return flag === 'WAR' ? { ...s, flagWAR: !s.flagWAR } : { ...s, flagWMB: !s.flagWMB }
    }))
    showToast(`${story.key} ${currentlyOn ? 'removed from' : 'flagged for'} ${flag}`, currentlyOn ? 'info' : 'success')
  }

  function handleMarkDevDone(storyId: string) {
    setStories(prev => prev.map(s => {
      if (s.id !== storyId) return s
      showToast(`${s.key} dev work confirmed complete · QA now assignable`, 'success')
      return { ...s, devDone: true }
    }))
  }

  const unassigned  = stories.filter(s => s.stage === 'unassigned')
  const inSprint    = stories.filter(s => s.stage === 'in-sprint')
  const inProgress  = stories.filter(s => s.stage === 'in-progress')
  const done        = stories.filter(s => s.stage === 'done')

  const STORY_FILTERS = ['all', 'unassigned', 'in-sprint', 'in-progress', 'done'] as const
  const FILTERS: Array<{ key: typeof filter; label: string; count?: number; isFlow?: boolean }> = [
    { key: 'all',         label: 'All',              count: stories.length },
    { key: 'unassigned',  label: 'Needs assignment',  count: unassigned.length },
    { key: 'in-sprint',   label: 'In Sprint 15',      count: inSprint.length },
    { key: 'in-progress', label: 'In progress',       count: inProgress.length },
    { key: 'done',        label: 'Done',              count: done.length },
    { key: 'flow',        label: 'Flow Agent',        isFlow: true },
  ]

  const filtered = filter === 'all' ? stories : stories.filter(s => s.stage === (filter as string))

  return (
    <div style={{ display: 'flex', height: '100vh', flexDirection: 'column', overflow: 'hidden', backgroundColor: C.ground }}>
      <TopBar />
      <ConnectorHealthBanner />

      <div style={{ flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
        {/* Page header */}
        <div style={{ flexShrink: 0 }}>
          {/* Title + stats band */}
          <div style={{
            background: 'linear-gradient(135deg, #18181B 0%, #1E1B3A 100%)',
            padding: '18px 28px 16px',
            display: 'flex', alignItems: 'center', gap: 24,
          }}>
            {/* Left: title */}
            <div>
              <div style={{
                display: 'inline-flex', alignItems: 'center', gap: 6, marginBottom: 6,
                backgroundColor: 'rgba(124,58,237,0.25)', borderRadius: 4,
                padding: '2px 8px', border: '1px solid rgba(167,139,250,0.3)',
              }}>
                <div style={{ width: 5, height: 5, borderRadius: '50%', backgroundColor: '#A78BFA' }} />
                <span style={{ fontSize: 10, fontWeight: 700, color: '#C4B5FD', letterSpacing: '0.08em', textTransform: 'uppercase' }}>
                  Sprint 15 · FACTS
                </span>
              </div>
              <h1 style={{ fontSize: 22, fontWeight: 700, color: '#F9FAFB', margin: 0, letterSpacing: '-0.3px' }}>
                Assign Stories
              </h1>
            </div>

            {/* Divider */}
            <div style={{ width: 1, height: 40, backgroundColor: 'rgba(255,255,255,0.1)', flexShrink: 0 }} />

            {/* Stats */}
            <div style={{ display: 'flex', gap: 6 }}>
              {[
                { label: 'Capacity',   val: '18 pts',    color: 'rgba(255,255,255,0.5)',  valColor: '#F9FAFB' },
                { label: 'Committed',  val: `${stories.filter(s => s.stage !== 'unassigned').reduce((n, s) => n + s.points, 0)} pts`, color: 'rgba(255,255,255,0.5)', valColor: '#F9FAFB' },
                { label: 'Unassigned', val: `${unassigned.reduce((n, s) => n + s.points, 0)} pts`, color: 'rgba(255,255,255,0.5)', valColor: unassigned.length > 0 ? '#FCD34D' : '#F9FAFB' },
              ].map(m => (
                <div key={m.label} style={{
                  padding: '8px 14px', borderRadius: 7,
                  backgroundColor: 'rgba(255,255,255,0.07)',
                  border: '1px solid rgba(255,255,255,0.1)',
                }}>
                  <div style={{ fontSize: 9, fontWeight: 600, color: m.color, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 3 }}>{m.label}</div>
                  <div style={{ fontSize: 17, fontWeight: 700, color: m.valColor, lineHeight: 1 }}>{m.val}</div>
                </div>
              ))}
            </div>

            {/* Spacer + team avatars */}
            <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 10 }}>
              <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)' }}>Team</span>
              <div style={{ display: 'flex' }}>
                {[DEV, QA].map((m, i) => {
                  const rs = ROLE_STYLE[m.role]
                  return (
                    <div key={m.role} title={`${m.name} · ${m.roleLabel}`} style={{
                      marginLeft: i > 0 ? -6 : 0,
                      width: 30, height: 30, borderRadius: '50%', flexShrink: 0,
                      backgroundColor: rs.bg, color: rs.text,
                      fontSize: 11, fontWeight: 700,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      border: '2px solid #18181B',
                    }}>
                      {m.initials}
                    </div>
                  )
                })}
              </div>
            </div>
          </div>

          {/* Filter tabs + Flow Agent — single band */}
          <div style={{
            backgroundColor: C.surface, borderBottom: `1px solid ${C.border}`,
            padding: '0 24px', display: 'flex', alignItems: 'center', gap: 2,
          }}>
            {/* Story filter tabs */}
            {FILTERS.filter(f => !f.isFlow).map(f => (
              <button
                key={f.key}
                onClick={() => setFilter(f.key)}
                style={{
                  padding: '9px 14px', fontSize: 12, fontWeight: 500, border: 'none', cursor: 'pointer',
                  backgroundColor: 'transparent',
                  color: filter === f.key ? C.text1 : C.text3,
                  borderBottom: `2px solid ${filter === f.key ? '#7C3AED' : 'transparent'}`,
                  display: 'flex', alignItems: 'center', gap: 6, transition: 'color 100ms',
                }}
              >
                {f.label}
                <span style={{
                  fontSize: 10, fontWeight: 700,
                  color: filter === f.key ? '#7C3AED' : C.text3,
                  backgroundColor: filter === f.key ? '#F5F3FF' : C.surfaceSubtle,
                  padding: '1px 6px', borderRadius: 10,
                }}>
                  {f.count}
                </span>
              </button>
            ))}

            {/* Flow Agent tab — far right, same style */}
            <button
              onClick={() => setFilter('flow')}
              style={{
                marginLeft: 'auto',
                padding: '9px 14px', fontSize: 12, fontWeight: 500, border: 'none', cursor: 'pointer',
                backgroundColor: 'transparent',
                color: filter === 'flow' ? C.text1 : C.text3,
                borderBottom: `2px solid ${filter === 'flow' ? '#7C3AED' : 'transparent'}`,
                display: 'flex', alignItems: 'center', gap: 6, transition: 'color 100ms',
                borderLeft: `1px solid ${C.border}`,
              }}
            >
              <svg width="12" height="12" viewBox="0 0 16 16" fill="none" style={{ opacity: 0.7 }}>
                <path d="M3 8h10M9 4l4 4-4 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
              Flow Agent
            </button>
          </div>
        </div>

        {/* Body — story list or Flow Agent */}
        {filter === 'flow' ? (
          <FlowInner
            name={flowName} role={flowRole} roleLabel={flowRoleLabel}
            messages={flowMessages as any} typing={flowTyping}
            input={flowInput} inputId={flowInputId}
            bottomRef={flowBottomRef}
            onInput={setFlowInput} onSend={sendFlowMessage}
          />
        ) : (
        <div style={{ flex: 1, overflowY: 'auto', padding: '20px 28px' }}>
          {filter === 'all' ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 28 }}>
              {unassigned.length > 0 && <Section label="Needs assignment" accent="#7C3AED" stories={unassigned} onAssign={handleAssign} onMarkDevDone={handleMarkDevDone} onToggleFlag={handleToggleFlag} />}
              {inSprint.length   > 0 && <Section label="In Sprint 15"     accent="#1D4ED8" stories={inSprint}   onAssign={handleAssign} onMarkDevDone={handleMarkDevDone} onToggleFlag={handleToggleFlag} />}
              {inProgress.length > 0 && <Section label="In progress"       accent="#D97706" stories={inProgress} onAssign={handleAssign} onMarkDevDone={handleMarkDevDone} onToggleFlag={handleToggleFlag} />}
              {done.length       > 0 && <Section label="Done"              accent="#16A34A" stories={done}       onAssign={handleAssign} onMarkDevDone={handleMarkDevDone} onToggleFlag={handleToggleFlag} />}
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {filtered.length === 0
                ? <div style={{ textAlign: 'center', color: C.text3, fontSize: 13, marginTop: 48 }}>Nothing here.</div>
                : filtered.map(s => <StoryCard key={s.id} story={s} onAssign={handleAssign} onMarkDevDone={handleMarkDevDone} onToggleFlag={handleToggleFlag} />)
              }
            </div>
          )}
        </div>
        )}
      </div>
    </div>
  )
}

function Section({ label, accent, stories, onAssign, onMarkDevDone, onToggleFlag }: {
  label: string; accent: string; stories: Story[]
  onAssign: (id: string, role: 'dev' | 'qa') => void
  onMarkDevDone: (id: string) => void
  onToggleFlag: (id: string, flag: 'WAR' | 'WMB') => void
}) {
  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
        <div style={{ width: 3, height: 14, borderRadius: 2, backgroundColor: accent, flexShrink: 0 }} />
        <span style={{ fontSize: 11, fontWeight: 700, color: accent, textTransform: 'uppercase', letterSpacing: '0.07em' }}>{label}</span>
        <span style={{ fontSize: 11, color: C.text3 }}>· {stories.length} stor{stories.length !== 1 ? 'ies' : 'y'}</span>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {stories.map(s => <StoryCard key={s.id} story={s} onAssign={onAssign} onMarkDevDone={onMarkDevDone} onToggleFlag={onToggleFlag} />)}
      </div>
    </div>
  )
}
