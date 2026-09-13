import { useState, useEffect, useRef, type ReactNode } from 'react'
import { Link, useParams, useNavigate, useLocation } from 'react-router'
import { C, SEMANTIC, type Status } from '../tokens'
import { useStore } from '../store'
import { selectAgentStatus } from '../store/selectors'
import { PERSONAS, ROLE_HOME, buildUserSession } from '../personas'
import { ROLE_NAV, canDecideRole } from '../store/types'
import type { UserRole, ReviewerRole } from '../store/types'

// ─── Shared types ─────────────────────────────────────────────────────────────

export type { Status }
export type AgentStatus = 'idle' | 'running' | 'blocked'
export type AgentEntry  = { id: string; label: string; status: AgentStatus }
export type SummaryStat = { label: string; value: string; sub: string }

export type ChainLink = {
  type: string
  label: string
  id: string
  textColor: string
  bg: string
  accent: string
  summary: string
  linkStatus: 'done' | 'current' | 'pending'
}

// Agent IDs that have pages; others are disabled
const ROUTABLE_AGENTS = new Set(['onboarding', 'ba', 'dev', 'qa', 'flow', 'assign', 'always-on', 'setup'])

// Role-scoped top-nav: which page tabs each role can see
const ROLE_PAGES: Record<UserRole, string[]> = {
  ba:            ['ba'],
  dev:           ['dev'],
  qa:            ['qa'],
  scrum_master:  ['assign'],
  delivery_lead: ['always-on'],
}
const PAGE_ORDER = ['ba', 'dev', 'qa', 'assign', 'flow', 'setup', 'always-on'] as const
const PAGE_LABELS: Record<string, string> = {
  ba: 'BA Agent', dev: 'Dev Agent', qa: 'QA Agent',
  assign: 'Assign', flow: 'Flow Agent', setup: 'Onboarding', 'always-on': 'Always On',
}

function roleToReviewerRole(role: UserRole): ReviewerRole | null {
  if (role === 'scrum_master' || role === 'ba') return role
  return null
}

// ─── Atoms ────────────────────────────────────────────────────────────────────

export function Mono({
  children, size = 12, color,
}: { children: ReactNode; size?: number; color?: string }) {
  return (
    <span style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: size, color: color ?? C.text2 }}>
      {children}
    </span>
  )
}

export function StatusBadge({ status }: { status: Status }) {
  const s = SEMANTIC[status]
  return (
    <span
      style={{ backgroundColor: s.bg, color: s.text, boxShadow: `0 0 0 1px ${s.ring}` }}
      className="inline-flex items-center px-1.5 py-px rounded-sm text-[11px] font-medium leading-4"
    >
      {s.label}
    </span>
  )
}

export function Btn({
  variant = 'default', size = 'md', children, onClick, disabled,
}: {
  variant?: 'default' | 'primary' | 'ghost' | 'approve' | 'reject'
  size?: 'sm' | 'md' | 'lg'
  children: ReactNode
  onClick?: () => void
  disabled?: boolean
}) {
  const base = {
    default: { backgroundColor: C.surface, color: C.text1, boxShadow: `0 0 0 1px ${C.border}` },
    primary: { backgroundColor: C.text1, color: '#FFFFFF' },
    ghost:   { backgroundColor: 'transparent', color: C.text2 },
    approve: { backgroundColor: disabled ? C.surfaceSubtle : C.approve, color: disabled ? C.text3 : C.approveFg },
    reject:  { backgroundColor: disabled ? C.surfaceSubtle : C.reject,  color: disabled ? C.text3 : C.rejectFg },
  }
  const pad = { sm: 'px-2 py-0.5 text-[12px]', md: 'px-3 py-1.5 text-[13px]', lg: 'px-5 py-2 text-[13px]' }
  return (
    <button
      style={{ ...base[variant], cursor: disabled ? 'not-allowed' : 'pointer', opacity: disabled ? 0.6 : 1 }}
      onClick={disabled ? undefined : onClick}
      disabled={disabled}
      className={`inline-flex items-center gap-1.5 rounded font-medium leading-5 transition-opacity hover:opacity-80 ${pad[size]}`}
    >
      {children}
    </button>
  )
}

export function StatusDot({ status }: { status: AgentStatus }) {
  const color = status === 'running' ? '#16A34A' : status === 'blocked' ? '#D97706' : C.borderStrong
  return (
    <span style={{
      display: 'inline-block', width: 6, height: 6,
      borderRadius: '50%', backgroundColor: color, flexShrink: 0,
    }} />
  )
}

// ─── Icons ────────────────────────────────────────────────────────────────────

export function ChevronDown({ color = C.text3, size = 12 }: { color?: string; size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 12 12" fill="none">
      <path d="M3 5l3 3 3-3" stroke={color} strokeWidth="1.25" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

export function ChevronRight({ color = C.text3, size = 10 }: { color?: string; size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 10 10" fill="none">
      <path d="M3.5 2l4 3-4 3" stroke={color} strokeWidth="1.25" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

export function WarnIcon({ size = 14 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 14 14" fill="none">
      <path d="M7 1.75L13 12.25H1L7 1.75Z" stroke="#D97706" strokeWidth="1.5" strokeLinejoin="round" />
      <line x1="7" y1="5.5" x2="7" y2="8.5" stroke="#D97706" strokeWidth="1.5" strokeLinecap="round" />
      <circle cx="7" cy="10.25" r="0.75" fill="#D97706" />
    </svg>
  )
}

function GearIcon() {
  return (
    <svg width="13" height="13" viewBox="0 0 13 13" fill="none">
      <circle cx="6.5" cy="6.5" r="2" stroke={C.text3} strokeWidth="1.2" />
      <path d="M6.5 1v1.5M6.5 10.5V12M1 6.5h1.5M10.5 6.5H12M2.72 2.72l1.06 1.06M9.22 9.22l1.06 1.06M2.72 10.28l1.06-1.06M9.22 3.78l1.06-1.06"
        stroke={C.text3} strokeWidth="1.2" strokeLinecap="round" />
    </svg>
  )
}

function BellIcon({ color = C.text2 }: { color?: string }) {
  return (
    <svg width="15" height="15" viewBox="0 0 15 15" fill="none">
      <path d="M7.5 2A3.5 3.5 0 0 0 4 5.5V8L2.5 10h10L11 8V5.5A3.5 3.5 0 0 0 7.5 2Z" stroke={color} strokeWidth="1.2" />
      <path d="M6 12a1.5 1.5 0 0 0 3 0" stroke={color} strokeWidth="1.2" />
    </svg>
  )
}

// The product's chain trail arrow — refined, intentional
export function ChainArrow() {
  return (
    <svg width="32" height="18" viewBox="0 0 32 18" fill="none" className="flex-none">
      <line x1="2" y1="9" x2="24" y2="9" stroke={C.borderStrong} strokeWidth="1.25" strokeLinecap="round" />
      <path d="M20 5L25.5 9L20 13" stroke={C.borderStrong} strokeWidth="1.25" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

// ─── Disabled tooltip wrapper ─────────────────────────────────────────────────

function DisabledTooltip({ children }: { children: ReactNode }) {
  const [show, setShow] = useState(false)
  return (
    <div
      style={{ position: 'relative' }}
      onMouseEnter={() => setShow(true)}
      onMouseLeave={() => setShow(false)}
    >
      {children}
      {show && (
        <div style={{
          position: 'absolute', left: '100%', top: '50%', transform: 'translateY(-50%)',
          marginLeft: 8, zIndex: 100,
          backgroundColor: C.text1, color: '#FFF',
          fontSize: 11, padding: '4px 8px', borderRadius: 4,
          whiteSpace: 'nowrap', pointerEvents: 'none',
          boxShadow: '0 2px 8px rgba(0,0,0,0.18)',
        }}>
          Not in this prototype
        </div>
      )}
    </div>
  )
}

// ─── Notifications panel ──────────────────────────────────────────────────────

function NotificationsPanel({ onClose }: { onClose: () => void }) {
  const { state } = useStore()
  const navigate = useNavigate()
  const params = useParams()
  const project = params.project ?? 'FACTS'
  const currentRole = state.currentUser?.role

  const myGates = state.gates.filter(g =>
    g.status === 'open' && currentRole && canDecideRole(currentRole, g.role)
  )

  useEffect(() => {
    function handleKey(e: KeyboardEvent) { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', handleKey)
    return () => window.removeEventListener('keydown', handleKey)
  }, [onClose])

  return (
    <>
      <div
        style={{ position: 'fixed', inset: 0, zIndex: 90 }}
        onClick={onClose}
      />
      <div style={{
        position: 'absolute', top: '100%', right: 0, marginTop: 6,
        width: 340,
        backgroundColor: C.surface,
        border: `1px solid ${C.border}`,
        borderRadius: 6,
        boxShadow: '0 4px 20px rgba(0,0,0,0.12)',
        zIndex: 100,
        overflow: 'hidden',
      }}>
        <div style={{ padding: '12px 16px', borderBottom: `1px solid ${C.border}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ fontSize: 13, fontWeight: 600, color: C.text1 }}>Awaiting review</span>
          <button onClick={onClose} style={{ color: C.text3, fontSize: 16, cursor: 'pointer', background: 'none', border: 'none' }}>×</button>
        </div>
        {myGates.length === 0 ? (
          <div style={{ padding: '20px 16px', fontSize: 12, color: C.text3, textAlign: 'center' }}>No pending reviews</div>
        ) : (
          myGates.map(gate => {
            const story = state.stories.find(s => s.key === gate.storyKey)
            const agentPath = gate.agent === 'qa' ? 'qa' : gate.agent === 'dev' ? 'dev' : gate.agent
            return (
              <button
                key={gate.id}
                onClick={() => {
                  navigate(`/p/${project}/${agentPath}`)
                  onClose()
                }}
                style={{
                  width: '100%', textAlign: 'left',
                  padding: '10px 16px',
                  borderBottom: `1px solid ${C.border}`,
                  backgroundColor: 'transparent',
                  cursor: 'pointer',
                  display: 'block',
                }}
                className="hover:bg-[#F3F4F6] transition-colors"
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 3 }}>
                  <Mono size={11} color={C.text2}>{gate.storyKey}</Mono>
                  <span style={{ fontSize: 10, fontWeight: 600, color: '#D97706', textTransform: 'uppercase' }}>{gate.agent.toUpperCase()}</span>
                </div>
                <div style={{ fontSize: 12, color: C.text1, lineHeight: 1.4 }}>
                  {story?.title ?? gate.storyKey}
                </div>
                <div style={{ fontSize: 11, color: C.text3, marginTop: 3 }}>{state.currentUser?.roleLabel ?? 'Reviewer'} sign-off required</div>
              </button>
            )
          })
        )}
        <div style={{ padding: '8px 16px', fontSize: 11, color: C.text3 }}>
          Showing gates awaiting {state.currentUser?.name ?? 'you'}
        </div>
      </div>
    </>
  )
}

// ─── R0: Left rail ────────────────────────────────────────────────────────────

export function LeftRail({ agents, activeAgent }: { agents: AgentEntry[]; activeAgent: string }) {
  const params = useParams()
  const project = params.project ?? 'FACTS'
  const [switcherOpen, setSwitcherOpen] = useState(false)
  const { state } = useStore()
  const userRole = state.currentUser?.role

  // Filter agents to only those accessible to the current role (omit inaccessible entirely)
  const allowedNav = userRole ? ROLE_NAV[userRole] : []
  const visibleAgents = agents.filter(a => allowedNav.includes(a.id as typeof allowedNav[number]))

  useEffect(() => {
    if (!switcherOpen) return
    function handleKey(e: KeyboardEvent) { if (e.key === 'Escape') setSwitcherOpen(false) }
    window.addEventListener('keydown', handleKey)
    return () => window.removeEventListener('keydown', handleKey)
  }, [switcherOpen])

  return (
    <aside
      style={{ width: 220, flexShrink: 0, backgroundColor: C.surface, borderRight: `1px solid ${C.border}` }}
      className="flex flex-col h-full overflow-y-auto"
    >
      {/* Project switcher */}
      <div style={{ position: 'relative' }}>
        <button
          style={{ borderBottom: `1px solid ${C.border}`, padding: '11px 14px', width: '100%', background: 'none', cursor: 'pointer' }}
          className="flex items-center justify-between flex-none hover:bg-[#F3F4F6] transition-colors"
          onClick={() => setSwitcherOpen(o => !o)}
        >
          <div className="flex items-center gap-2">
            <div
              style={{ width: 22, height: 22, backgroundColor: C.text1, borderRadius: 4 }}
              className="flex items-center justify-center flex-none"
            >
              <span style={{ color: '#FFF', fontSize: 10, fontWeight: 700 }}>F</span>
            </div>
            <span className="text-[13px] font-semibold" style={{ color: C.text1 }}>FACTS</span>
          </div>
          <ChevronDown />
        </button>

        {switcherOpen && (
          <>
            <div style={{ position: 'fixed', inset: 0, zIndex: 90 }} onClick={() => setSwitcherOpen(false)} />
            <div style={{
              position: 'absolute', top: '100%', left: 0, right: 0,
              backgroundColor: C.surface, border: `1px solid ${C.border}`,
              borderTop: 'none', zIndex: 100, boxShadow: '0 4px 12px rgba(0,0,0,0.10)',
            }}>
              {/* Active project */}
              <button
                onClick={() => setSwitcherOpen(false)}
                style={{
                  padding: '8px 14px', display: 'flex', alignItems: 'center', gap: 8,
                  backgroundColor: C.surfaceSubtle, width: '100%',
                  border: 'none', cursor: 'pointer',
                }}
                className="hover:bg-[#ECEDF1] transition-colors"
              >
                <div style={{ width: 18, height: 18, backgroundColor: C.text1, borderRadius: 3, flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <span style={{ color: '#FFF', fontSize: 9, fontWeight: 700 }}>F</span>
                </div>
                <div style={{ textAlign: 'left' }}>
                  <div style={{ fontSize: 12, fontWeight: 500, color: C.text1 }}>FACTS</div>
                  <div style={{ fontSize: 10, color: C.text3 }}>Active project</div>
                </div>
                <svg width="10" height="10" viewBox="0 0 10 10" fill="none" style={{ marginLeft: 'auto' }}>
                  <path d="M2 5l2.5 2.5 3.5-4" stroke="#15803D" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </button>
              {/* Disabled second project */}
              <DisabledTooltip>
                <div style={{ padding: '8px 14px', display: 'flex', alignItems: 'center', gap: 8, opacity: 0.45, cursor: 'not-allowed' }}>
                  <div style={{ width: 18, height: 18, backgroundColor: C.borderStrong, borderRadius: 3, flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <span style={{ color: '#FFF', fontSize: 9, fontWeight: 700 }}>A</span>
                  </div>
                  <div>
                    <div style={{ fontSize: 12, fontWeight: 500, color: C.text1 }}>ATLAS</div>
                    <div style={{ fontSize: 10, color: C.text3 }}>Separate workspace</div>
                  </div>
                </div>
              </DisabledTooltip>
            </div>
          </>
        )}
      </div>

      {/* Agent nav */}
      <nav className="flex-1 pt-2 pb-1">
        <div className="px-4 pb-1 text-[11px] font-medium" style={{ color: C.text3 }}>Agents</div>
        {visibleAgents.map(agent => {
          const active = agent.id === activeAgent
          const routable = ROUTABLE_AGENTS.has(agent.id)

          const content = (
            <div
              style={{
                padding: '7px 14px 7px 12px',
                borderLeft: active ? `2px solid ${C.text1}` : '2px solid transparent',
                backgroundColor: active ? C.surfaceSubtle : 'transparent',
                opacity: routable ? 1 : 0.45,
              }}
              className="flex items-center justify-between"
            >
              <span className="text-[13px]" style={{ color: active ? C.text1 : C.text2, fontWeight: active ? 500 : 400 }}>
                {agent.label}
              </span>
              <StatusDot status={agent.status} />
            </div>
          )

          if (!routable) {
            return (
              <DisabledTooltip key={agent.id}>
                <div style={{ cursor: 'not-allowed' }}>{content}</div>
              </DisabledTooltip>
            )
          }

          return (
            <Link
              key={agent.id}
              to={`/p/${project}/${agent.id}`}
              style={{ display: 'block', textDecoration: 'none' }}
              className="hover:bg-[#F3F4F6] transition-colors"
            >
              {content}
            </Link>
          )
        })}
      </nav>

      {/* Bottom links */}
      <div style={{ borderTop: `1px solid ${C.border}` }} className="pb-1 pt-1 flex-none">
        {[{ label: 'Admin' }, { label: 'Settings', icon: <GearIcon /> }].map(item => (
          <DisabledTooltip key={item.label}>
            <div
              style={{ padding: '7px 14px', cursor: 'not-allowed', opacity: 0.5 }}
              className="flex items-center gap-2"
            >
              {item.icon}
              <span className="text-[12px]" style={{ color: C.text3 }}>{item.label}</span>
            </div>
          </DisabledTooltip>
        ))}
      </div>
    </aside>
  )
}

// ─── R1: Top bar ──────────────────────────────────────────────────────────────

// ─── Persona switcher (prototype affordance) ──────────────────────────────────

function PersonaSwitcher() {
  const { state, dispatch } = useStore()
  const [open, setOpen] = useState(false)
  const navigate = useNavigate()
  const current = state.currentUser

  useEffect(() => {
    if (!open) return
    function handleKey(e: KeyboardEvent) { if (e.key === 'Escape') setOpen(false) }
    window.addEventListener('keydown', handleKey)
    return () => window.removeEventListener('keydown', handleKey)
  }, [open])

  function switchTo(persona: typeof PERSONAS[number]) {
    dispatch({ type: 'SIGN_IN', user: buildUserSession(persona) })
    setOpen(false)
    navigate(ROLE_HOME[persona.role], { replace: true })
  }

  return (
    <div style={{ position: 'relative' }}>
      <button
        onClick={() => setOpen(o => !o)}
        title="Switch persona (prototype)"
        style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '2px 4px', borderRadius: 4 }}
        className="flex items-center gap-1.5 hover:bg-[#F3F4F6] transition-colors"
      >
        {/* Prototype label */}
        <span style={{
          fontFamily: 'JetBrains Mono, monospace',
          fontSize: 9, fontWeight: 600,
          color: '#6D28D9',
          backgroundColor: '#F5F3FF',
          border: '1px solid #DDD6FE',
          padding: '1px 4px', borderRadius: 3,
          letterSpacing: '0.04em',
          textTransform: 'uppercase',
        }}>
          DEMO
        </span>
        <span style={{ fontSize: 12, color: C.text2 }}>{current?.name ?? '—'}</span>
        <ChevronDown size={10} color={C.text3} />
      </button>

      {open && (
        <>
          <div style={{ position: 'fixed', inset: 0, zIndex: 90 }} onClick={() => setOpen(false)} />
          <div style={{
            position: 'absolute', top: 'calc(100% + 4px)', right: 0,
            backgroundColor: C.surface, border: `1px solid ${C.border}`,
            borderRadius: 6, boxShadow: '0 4px 16px rgba(0,0,0,0.12)',
            zIndex: 100, minWidth: 220, overflow: 'hidden',
          }}>
            {/* Header */}
            <div style={{ padding: '8px 12px 6px', borderBottom: `1px solid ${C.border}` }}>
              <div className="flex items-center gap-1.5">
                <span style={{
                  fontFamily: 'JetBrains Mono, monospace',
                  fontSize: 9, fontWeight: 600,
                  color: '#6D28D9', backgroundColor: '#F5F3FF',
                  border: '1px solid #DDD6FE',
                  padding: '1px 5px', borderRadius: 3,
                  letterSpacing: '0.04em', textTransform: 'uppercase',
                }}>
                  PROTOTYPE
                </span>
                <span style={{ fontSize: 11, color: C.text3 }}>Switch signed-in persona</span>
              </div>
            </div>
            {/* Persona list */}
            {PERSONAS.map(persona => {
              const isCurrent = current?.name === persona.name
              return (
                <button
                  key={persona.name}
                  onClick={() => switchTo(persona)}
                  style={{
                    width: '100%', textAlign: 'left',
                    padding: '8px 12px',
                    backgroundColor: isCurrent ? C.surfaceSubtle : 'transparent',
                    border: 'none', cursor: 'pointer',
                    display: 'flex', alignItems: 'center', gap: 10,
                    borderBottom: `1px solid ${C.border}`,
                  }}
                  className="hover:bg-[#F3F4F6] transition-colors"
                >
                  <div style={{
                    width: 26, height: 26, borderRadius: '50%',
                    backgroundColor: isCurrent ? C.text1 : C.borderStrong,
                    color: '#FFF',
                    fontSize: 9, fontWeight: 700, flexShrink: 0,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                  }}>
                    {persona.initials}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 12, fontWeight: isCurrent ? 600 : 400, color: C.text1 }}>
                      {persona.name}
                    </div>
                    <div style={{ fontSize: 10, color: C.text3 }}>{persona.roleLabel}</div>
                  </div>
                  {isCurrent && (
                    <svg width="10" height="10" viewBox="0 0 10 10" fill="none" style={{ flexShrink: 0 }}>
                      <path d="M2 5l2.5 2.5 3.5-4" stroke="#15803D" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  )}
                </button>
              )
            })}
          </div>
        </>
      )}
    </div>
  )
}

export function TopBar() {
  const { state, dispatch } = useStore()
  const navigate = useNavigate()
  const location = useLocation()
  const [sprintOpen, setSprintOpen] = useState(false)
  const [notifOpen, setNotifOpen] = useState(false)
  const [reindexing, setReindexing] = useState(false)
  const prevDecidedRef = useRef(state.gates.filter(g => g.status === 'decided').length)
  const reindexTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const currentRole = state.currentUser?.role
  const myGates = state.gates.filter(g =>
    g.status === 'open' && currentRole && canDecideRole(currentRole, g.role)
  )
  const notifCount = myGates.length

  // Persona switcher state
  const [personaOpen, setPersonaOpen] = useState(false)

  useEffect(() => {
    if (!personaOpen) return
    function handleKey(e: KeyboardEvent) { if (e.key === 'Escape') setPersonaOpen(false) }
    window.addEventListener('keydown', handleKey)
    return () => window.removeEventListener('keydown', handleKey)
  }, [personaOpen])

  const [overflowOpen, setOverflowOpen] = useState(false)
  const [resetOpen, setResetOpen] = useState(false)

  const decidedCount = state.gates.filter(g => g.status === 'decided').length
  useEffect(() => {
    if (decidedCount > prevDecidedRef.current) {
      prevDecidedRef.current = decidedCount
      setReindexing(true)
      if (reindexTimerRef.current) clearTimeout(reindexTimerRef.current)
      reindexTimerRef.current = setTimeout(() => setReindexing(false), 5000)
    }
  }, [decidedCount])

  useEffect(() => {
    if (!sprintOpen) return
    function handleKey(e: KeyboardEvent) { if (e.key === 'Escape') setSprintOpen(false) }
    window.addEventListener('keydown', handleKey)
    return () => window.removeEventListener('keydown', handleKey)
  }, [sprintOpen])

  useEffect(() => {
    if (!overflowOpen) return
    function handleKey(e: KeyboardEvent) { if (e.key === 'Escape') setOverflowOpen(false) }
    window.addEventListener('keydown', handleKey)
    return () => window.removeEventListener('keydown', handleKey)
  }, [overflowOpen])

  useEffect(() => {
    if (!resetOpen) return
    function handleKey(e: KeyboardEvent) { if (e.key === 'Escape') setResetOpen(false) }
    window.addEventListener('keydown', handleKey)
    return () => window.removeEventListener('keydown', handleKey)
  }, [resetOpen])

  return (
    <>
    <div
      style={{ backgroundColor: C.surface, borderBottom: `1px solid ${C.border}`, height: 46, position: 'relative' }}
      className="flex items-center justify-between px-5 flex-none"
    >
      {/* Home link + Sprint switcher */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
      {/* Sprint switcher */}
      <div style={{ position: 'relative' }}>
        <button
          onClick={() => setSprintOpen(o => !o)}
          style={{ background: 'none', cursor: 'pointer', padding: '2px 4px', borderRadius: 4 }}
          className="flex items-center gap-1.5 hover:bg-[#F3F4F6] transition-colors"
        >
          <span className="text-[13px] font-semibold" style={{ color: C.text1 }}>FACTS</span>
          <span className="text-[13px]" style={{ color: C.text3 }}>·</span>
          <span className="text-[13px]" style={{ color: C.text2 }}>Sprint 14</span>
          <ChevronDown />
        </button>

        {sprintOpen && (
          <>
            <div style={{ position: 'fixed', inset: 0, zIndex: 90 }} onClick={() => setSprintOpen(false)} />
            <div style={{
              position: 'absolute', top: '100%', left: 0, marginTop: 4,
              backgroundColor: C.surface, border: `1px solid ${C.border}`,
              borderRadius: 6, boxShadow: '0 4px 12px rgba(0,0,0,0.10)', zIndex: 100,
              minWidth: 200, overflow: 'hidden',
            }}>
              {/* Active sprint */}
              <button
                onClick={() => setSprintOpen(false)}
                style={{ width: '100%', textAlign: 'left', padding: '9px 14px', background: C.surfaceSubtle, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 8 }}
                className="hover:bg-[#ECEDF1] transition-colors"
              >
                <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
                  <path d="M2 5l2.5 2.5 3.5-4" stroke="#15803D" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
                <div>
                  <div style={{ fontSize: 12, fontWeight: 500, color: C.text1 }}>Sprint 14</div>
                  <div style={{ fontSize: 10, color: C.text3 }}>Current · Sep 9–22, 2026</div>
                </div>
              </button>
              {/* Disabled past sprint */}
              <DisabledTooltip>
                <div style={{ padding: '9px 14px', opacity: 0.45, cursor: 'not-allowed' }}>
                  <div style={{ fontSize: 12, fontWeight: 500, color: C.text1 }}>Sprint 13</div>
                  <div style={{ fontSize: 10, color: C.text3 }}>Closed · Aug 26–Sep 8</div>
                </div>
              </DisabledTooltip>
            </div>
          </>
        )}
      </div>
      </div>{/* end Home + Sprint wrapper */}

      {/* Role-scoped nav tabs */}
      {state.currentUser && (() => {
        const role = state.currentUser.role
        const pages = ROLE_PAGES[role]
        if (pages.length <= 1) return null
        const segments = location.pathname.split('/')
        const activePage = segments[segments.length - 1] || 'home'
        const project = segments[2] ?? 'FACTS'
        return (
          <div className="flex items-center gap-0.5" style={{ position: 'absolute', left: '50%', transform: 'translateX(-50%)' }}>
            {PAGE_ORDER.filter(p => pages.includes(p)).map(page => {
              const isActive = activePage === page
              return (
                <Link
                  key={page}
                  to={`/p/${project}/${page}`}
                  style={{
                    fontSize: 12, fontWeight: isActive ? 500 : 400,
                    padding: '4px 10px', borderRadius: 4,
                    backgroundColor: isActive ? C.text1 : 'transparent',
                    color: isActive ? '#FFF' : C.text2,
                    textDecoration: 'none',
                    transition: 'all 100ms',
                  }}
                  className={isActive ? '' : 'hover:bg-[#F3F4F6]'}
                >
                  {PAGE_LABELS[page]}
                </Link>
              )
            })}
          </div>
        )
      })()}

      <div className="flex items-center gap-4">
        {/* Connector health dots */}
        <div className="flex items-center gap-3">
          {[
            { id: 'Jira',   ok: state.project.connectors.jira   === 'ok' },
            { id: 'GitLab', ok: state.project.connectors.gitlab === 'ok' },
          ].map(c => (
            <div key={c.id} className="flex items-center gap-1.5">
              <span style={{ display: 'inline-block', width: 6, height: 6, borderRadius: '50%', backgroundColor: c.ok ? '#16A34A' : '#EF4444' }} />
              <span className="text-[11px]" style={{ color: C.text3 }}>{c.id}</span>
            </div>
          ))}
        </div>
        <div style={{ width: 1, height: 18, backgroundColor: C.border }} />
        {/* Index status chip */}
        <div className="flex items-center gap-1.5">
          <span
            style={{ display: 'inline-block', width: 6, height: 6, borderRadius: '50%', backgroundColor: reindexing ? '#D97706' : C.borderStrong }}
            className={reindexing ? 'animate-pulse' : ''}
          />
          <span className="text-[11px]" style={{ color: reindexing ? '#D97706' : C.text3, transition: 'color 200ms' }}>
            {reindexing ? 'Indexing…' : 'Index fresh'}
          </span>
        </div>
        <div style={{ width: 1, height: 18, backgroundColor: C.border }} />

        {/* Notifications bell */}
        <div style={{ position: 'relative' }}>
          <button
            onClick={() => setNotifOpen(o => !o)}
            className="relative cursor-pointer leading-none"
            style={{ background: 'none', border: 'none', padding: 0 }}
          >
            <BellIcon color={notifOpen ? C.text1 : C.text2} />
            {notifCount > 0 && (
              <span
                style={{
                  position: 'absolute', top: -5, right: -5,
                  backgroundColor: C.reject, color: '#FFF',
                  width: 14, height: 14, borderRadius: '50%',
                  fontSize: 8.5, fontWeight: 700,
                }}
                className="flex items-center justify-center"
              >
                {notifCount}
              </span>
            )}
          </button>

          {notifOpen && <NotificationsPanel onClose={() => setNotifOpen(false)} />}
        </div>

        {/* Persona switcher (prototype affordance) */}
        <PersonaSwitcher />

        <div style={{ width: 1, height: 18, backgroundColor: C.border }} />

        {/* Avatar — reads from currentUser */}
        <div
          style={{
            width: 26, height: 26, borderRadius: '50%',
            backgroundColor: C.text1, color: '#FFF',
            fontSize: 10, fontWeight: 600,
          }}
          className="flex items-center justify-center"
          title={state.currentUser ? `${state.currentUser.name} · ${state.currentUser.roleLabel}` : undefined}
        >
          {state.currentUser?.initials ?? '??'}
        </div>

        {/* Overflow menu */}
        <div style={{ position: 'relative' }}>
          <button
            onClick={() => setOverflowOpen(o => !o)}
            aria-label="More options"
            style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '3px 5px', borderRadius: 4, lineHeight: 1 }}
            className="hover:bg-[#F3F4F6] transition-colors"
          >
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
              <circle cx="2.5" cy="7" r="1.25" fill={C.text3} />
              <circle cx="7"   cy="7" r="1.25" fill={C.text3} />
              <circle cx="11.5" cy="7" r="1.25" fill={C.text3} />
            </svg>
          </button>

          {overflowOpen && (
            <>
              <div style={{ position: 'fixed', inset: 0, zIndex: 90 }} onClick={() => setOverflowOpen(false)} />
              <div style={{
                position: 'absolute', top: '100%', right: 0, marginTop: 4,
                backgroundColor: C.surface, border: `1px solid ${C.border}`,
                borderRadius: 6, boxShadow: '0 4px 12px rgba(0,0,0,0.10)',
                zIndex: 100, minWidth: 160, overflow: 'hidden',
              }}>
                <button
                  onClick={() => {
                    setOverflowOpen(false)
                    dispatch({ type: 'SIGN_OUT' })
                    navigate('/', { replace: true })
                  }}
                  style={{
                    width: '100%', textAlign: 'left', padding: '8px 12px',
                    fontSize: 13, color: C.text1, cursor: 'pointer',
                    background: 'none', border: 'none', display: 'block',
                    borderTop: `1px solid ${C.border}`,
                  }}
                  className="hover:bg-[#F3F4F6] transition-colors"
                >
                  Sign out
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>

    {/* Reset confirm dialog */}
    {resetOpen && (
      <>
        <div
          style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(17,19,24,0.35)', zIndex: 200 }}
          onClick={() => setResetOpen(false)}
        />
        <div
          style={{
            position: 'fixed', top: '50%', left: '50%', transform: 'translate(-50%,-50%)',
            zIndex: 210, backgroundColor: C.surface, border: `1px solid ${C.border}`,
            borderRadius: 8, boxShadow: '0 8px 32px rgba(0,0,0,0.18)',
            width: 340, padding: '22px 24px',
          }}
          role="dialog"
          aria-modal="true"
          aria-labelledby="reset-dialog-title"
        >
          <h3 id="reset-dialog-title" style={{ fontSize: 15, fontWeight: 600, color: C.text1, margin: '0 0 8px' }}>
            Reset demo?
          </h3>
          <p style={{ fontSize: 12, color: C.text2, margin: '0 0 20px', lineHeight: 1.6 }}>
            All changes will be discarded and the guided tour will reopen from step 1.
          </p>
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
            <button
              onClick={() => setResetOpen(false)}
              style={{
                fontSize: 13, padding: '6px 12px', borderRadius: 4,
                border: `1px solid ${C.border}`, cursor: 'pointer',
                background: C.surface, color: C.text1,
              }}
            >
              Cancel
            </button>
            <button
              onClick={() => {
                try { localStorage.removeItem('guided-demo-dismissed') } catch { /* ignore */ }
                window.location.reload()
              }}
              style={{
                fontSize: 13, fontWeight: 500, padding: '6px 12px', borderRadius: 4,
                border: 'none', cursor: 'pointer', backgroundColor: C.text1, color: '#FFF',
              }}
            >
              Reset
            </button>
          </div>
        </div>
      </>
    )}
  </>
  )
}

// ─── Connector health banner (dismissible, reappears on reload) ───────────────

export function ConnectorHealthBanner() {
  const { state } = useStore()
  const [dismissed, setDismissed] = useState(false)

  const broken = Object.entries(state.project.connectors)
    .filter(([, v]) => v === 'error')
    .map(([k]) => k)

  if (dismissed || broken.length === 0) return null

  return (
    <div style={{
      backgroundColor: '#FFFBEB',
      borderBottom: `1px solid #FDE68A`,
      borderLeft: `4px solid #D97706`,
      padding: '8px 20px',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: 12,
      flexShrink: 0,
    }}>
      <div className="flex items-center gap-2">
        <WarnIcon size={13} />
        <span style={{ fontSize: 12, color: '#92400E' }}>
          Connector health degraded — {broken.join(', ')} unreachable. Agent runs may be incomplete.
        </span>
      </div>
      <button
        onClick={() => setDismissed(true)}
        style={{ fontSize: 13, color: '#92400E', background: 'none', border: 'none', cursor: 'pointer', flexShrink: 0 }}
      >
        Dismiss
      </button>
    </div>
  )
}

// ─── R1b: Chain trail — the product's signature element ───────────────────────

export function ChainTrail({
  chain,
  onChipClick,
}: {
  chain: ChainLink[]
  onChipClick: (link: ChainLink) => void
}) {
  const [hovered, setHovered] = useState<string | null>(null)

  return (
    <div
      style={{
        backgroundColor: C.surfaceSubtle,
        borderBottom: `1px solid ${C.border}`,
        borderTop: `1px solid ${C.border}`,
        padding: '10px 20px',
      }}
      className="flex-none"
    >
      <div className="flex items-center justify-between mb-2.5">
        <span className="text-[11px] font-medium" style={{ color: C.text3 }}>Traceability chain</span>
        {chain[0] && (
          <span className="text-[11px]" style={{ color: C.text3 }}>
            for story in focus:&nbsp;
            <Mono size={11} color={C.text2}>{chain[0].id.startsWith('FACT') ? chain[0].id : '—'}</Mono>
          </span>
        )}
      </div>

      <div className="flex items-center">
        {chain.map((link, i) => {
          const isCurrent = link.linkStatus === 'current'
          const isDone    = link.linkStatus === 'done'
          const isPending = link.linkStatus === 'pending'
          const isHovered = hovered === link.type && !isPending

          return (
            <div key={link.type} className="flex items-center">
              {i > 0 && (
                <div style={{ opacity: isPending ? 0.35 : 1 }}>
                  <ChainArrow />
                </div>
              )}
              <button
                onMouseEnter={() => !isPending && setHovered(link.type)}
                onMouseLeave={() => setHovered(null)}
                onClick={() => !isPending && onChipClick(link)}
                disabled={isPending}
                style={{
                  display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: 2,
                  padding: '6px 10px', borderRadius: 4,
                  cursor: isPending ? 'default' : 'pointer',
                  transition: 'all 120ms ease', opacity: isPending ? 0.42 : 1,
                  borderLeft: `3px solid ${isPending ? C.borderStrong : link.accent}`,
                  boxShadow: isCurrent
                    ? `0 0 0 1px ${link.accent}`
                    : isHovered
                    ? `0 0 0 1px ${C.borderStrong}`
                    : `0 0 0 1px ${C.border}`,
                  backgroundColor: isCurrent ? link.bg : C.surface,
                  position: 'relative',
                }}
              >
                <div className="flex items-center gap-1.5">
                  <span style={{ fontSize: 9.5, fontWeight: 600, letterSpacing: '0.04em', color: isPending ? C.text3 : link.textColor, lineHeight: 1 }}>
                    {link.type}
                  </span>
                  {isDone && (
                    <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
                      <circle cx="5" cy="5" r="4" fill={link.accent} fillOpacity="0.15" />
                      <path d="M2.5 5.5l2 2 3-4" stroke={link.accent} strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  )}
                  {isCurrent && (
                    <span style={{ fontSize: 9, fontWeight: 600, color: link.accent, backgroundColor: `${link.accent}1A`, padding: '1px 4px', borderRadius: 3 }}>
                      current
                    </span>
                  )}
                  {isPending && <span style={{ fontSize: 9, color: C.text3 }}>—</span>}
                </div>
                <span style={{
                  fontFamily: 'JetBrains Mono, monospace', fontSize: 12,
                  fontWeight: isCurrent ? 500 : 400,
                  color: isCurrent ? link.textColor : isPending ? C.text3 : C.text1, lineHeight: 1,
                }}>
                  {link.id}
                </span>
                {isHovered && (
                  <div style={{
                    position: 'absolute', top: 'calc(100% + 6px)', left: 0, zIndex: 50,
                    backgroundColor: C.text1, color: '#FFF', fontSize: 11,
                    padding: '5px 8px', borderRadius: 4, whiteSpace: 'nowrap',
                    pointerEvents: 'none', boxShadow: '0 2px 8px rgba(0,0,0,0.18)',
                  }}>
                    {link.summary}
                    <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.5)', marginTop: 2 }}>Click to inspect</div>
                  </div>
                )}
              </button>
            </div>
          )
        })}
      </div>
    </div>
  )
}

// ─── R2: Agent contract ───────────────────────────────────────────────────────

export function AgentContract({ text }: { text: string }) {
  const parts = text.split(' · ')
  return (
    <div
      style={{ backgroundColor: C.surface, borderBottom: `1px solid ${C.border}`, padding: '0 20px', height: 34 }}
      className="flex items-center flex-none"
    >
      <span className="text-[11px]" style={{ color: C.text3 }}>
        {parts.map((p, i) => (
          <span key={i}>
            {i > 0 && <span style={{ margin: '0 6px', color: C.border }}>·</span>}
            {p}
          </span>
        ))}
      </span>
    </div>
  )
}

// ─── R4: Summary cards ────────────────────────────────────────────────────────

export function SummaryCards({ stats }: { stats: SummaryStat[] }) {
  return (
    <div className="flex gap-3 px-5 pb-4">
      {stats.map((s, i) => (
        <div
          key={i}
          style={{ flex: 1, backgroundColor: C.surface, border: `1px solid ${C.border}`, borderRadius: 4, padding: '10px 14px' }}
        >
          <div className="text-[11px] mb-1.5" style={{ color: C.text3 }}>{s.label}</div>
          <div className="text-[22px] font-semibold leading-none tracking-tight" style={{ color: C.text1 }}>{s.value}</div>
          <div className="text-[11px] mt-1.5" style={{ color: C.text3 }}>{s.sub}</div>
        </div>
      ))}
    </div>
  )
}

// ─── Quality bar (generic, used by both pages) ────────────────────────────────

export function QualityBar({ items }: {
  items: { label: string; value: string; detail: string; status: Status }[]
}) {
  return (
    <div
      style={{ backgroundColor: C.surfaceSubtle, borderBottom: `1px solid ${C.border}`, padding: '0 20px', height: 40, flexShrink: 0 }}
      className="flex items-center gap-6"
    >
      {items.map((q, i) => {
        const s = SEMANTIC[q.status]
        return (
          <div key={i} className="flex items-center gap-2">
            <span style={{ display: 'inline-block', width: 7, height: 7, borderRadius: '50%', backgroundColor: s.text }} />
            <span className="text-[12px]" style={{ color: C.text3 }}>{q.label}</span>
            <span className="text-[12px] font-medium" style={{ color: C.text1 }}>{q.value}</span>
            <span className="text-[11px]" style={{ color: C.text3 }}>{q.detail}</span>
            {i < items.length - 1 && (
              <div style={{ width: 1, height: 14, backgroundColor: C.border, marginLeft: 8 }} />
            )}
          </div>
        )
      })}
    </div>
  )
}

// ─── Gate queue (shared structure) ───────────────────────────────────────────

export function GateQueue({
  rows,
  selected,
  onSelect,
  userRole,
}: {
  rows: { key: string; gateId: string; title: string; assignee: string; waiting: string; status: Status; reason?: string | null; gateRole?: ReviewerRole; submittedBy?: string | null }[]
  selected: string
  onSelect: (gateId: string) => void
  userRole?: UserRole
}) {
  const { state } = useStore()
  const [tab, setTab] = useState<'awaiting' | 'all' | 'decided'>('awaiting')

  // Decide which gates are "mine" based on current user's reviewer role
  const userReviewerRole = state.currentUser ? roleToReviewerRole(state.currentUser.role) : null
  const hasGatesAll = state.currentUser?.permissions.includes('gates.all') ?? false

  // Decided gates from the same agent context
  const agentOfFirstRow = rows[0] ? state.gates.find(g => g.id === rows[0].gateId)?.agent : undefined
  const decidedGates = agentOfFirstRow
    ? state.gates.filter(g => g.agent === agentOfFirstRow && g.status === 'decided')
    : []

  // "Awaiting me" = gates this role can decide
  const awaitingRows = userRole
    ? rows.filter(r => r.gateRole && canDecideRole(userRole, r.gateRole))
    : rows.filter(r => r.status !== 'stale')
  const allRows = rows
  const decidedRows = decidedGates.map(g => {
    const story = state.stories.find(s => s.key === g.storyKey)
    return {
      key: g.storyKey, gateId: g.id,
      title: story?.title ?? g.storyKey,
      assignee: g.decider ?? '—', waiting: g.decidedAt ?? '—',
      status: (g.decision === 'approved' ? 'pass' : 'fail') as Status,
      reason: g.reason,
      decided: true, decision: g.decision, decider: g.decider,
    }
  })

  const tabs = [
    { key: 'awaiting' as const, label: 'Awaiting me', count: awaitingRows.length },
    { key: 'all'      as const, label: 'All open',    count: allRows.length },
    { key: 'decided'  as const, label: 'Decided',     count: decidedRows.length },
  ]

  const visibleRows = tab === 'decided' ? decidedRows : tab === 'awaiting' ? awaitingRows : allRows

  return (
    <div
      style={{ width: 310, flexShrink: 0, borderRight: `1px solid ${C.border}`, backgroundColor: C.surface }}
      className="flex flex-col h-full overflow-hidden"
    >
      <div style={{ borderBottom: `1px solid ${C.border}` }} className="flex flex-none">
        {tabs.map(t => {
          const active = t.key === tab
          return (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              style={{
                flex: 1, padding: '9px 6px', fontSize: 12,
                fontWeight: active ? 500 : 400,
                color: active ? C.text1 : C.text3,
                borderBottom: active ? `2px solid ${C.text1}` : '2px solid transparent',
                marginBottom: -1, cursor: 'pointer', backgroundColor: 'transparent',
                transition: 'color 100ms',
              }}
              className="flex items-center justify-center gap-1"
            >
              {t.label}
              <span style={{
                fontSize: 10, fontWeight: 500,
                backgroundColor: active ? C.text1 : C.surfaceSubtle,
                color: active ? '#FFF' : C.text3,
                padding: '0px 4px', borderRadius: 3,
              }}>
                {t.count}
              </span>
            </button>
          )
        })}
      </div>

      <div className="flex-1 overflow-y-auto">
        {visibleRows.length === 0 && (
          <div style={{ padding: '24px 14px', fontSize: 12, color: C.text3, textAlign: 'center' }}>
            {tab === 'decided' ? 'No decisions yet' : 'Queue empty'}
          </div>
        )}
        {visibleRows.map((row) => {
          const isSelected = row.gateId === selected
          const decidedRow = 'decided' in row ? (row as { decided: boolean; decision?: string; decider?: string; reason?: string | null }) : null
          const reasonStr = decidedRow?.reason ?? ''
          const rowGateRole = 'gateRole' in row ? (row as { gateRole?: ReviewerRole }).gateRole : undefined
          const canAct = !userRole || !rowGateRole || canDecideRole(userRole, rowGateRole)
          const readOnly = tab === 'all' && !canAct
          return (
            <div
              key={row.gateId}
              onClick={() => onSelect(row.gateId)}
              style={{
                padding: '10px 14px',
                borderBottom: `1px solid ${C.border}`,
                backgroundColor: isSelected ? C.surfaceSubtle : 'transparent',
                borderLeft: isSelected ? `2px solid ${readOnly ? C.border : C.text1}` : '2px solid transparent',
                cursor: 'pointer',
                opacity: readOnly ? 0.7 : 1,
              }}
              className="hover:bg-[#F3F4F6] transition-colors"
            >
              <div className="flex items-center justify-between mb-1">
                <Mono size={11} color={C.text2}>{row.key}</Mono>
                <div className="flex items-center gap-1.5">
                  {readOnly && (
                    <span style={{
                      fontSize: 9, color: C.text3,
                      fontFamily: 'JetBrains Mono, monospace',
                      textTransform: 'uppercase', letterSpacing: '0.04em',
                    }}>
                      view only
                    </span>
                  )}
                  <StatusBadge status={row.status} />
                </div>
              </div>
              <div className="text-[12px] leading-4 mb-2" style={{ color: C.text1 }}>{row.title}</div>
              <div className="flex items-center justify-between">
                {decidedRow ? (
                  <span className="text-[11px]" style={{ color: C.text3 }}>
                    {decidedRow.decision === 'approved' ? 'Approved' : 'Rejected'} by {decidedRow.decider ?? '—'}
                  </span>
                ) : (
                  <span className="text-[11px]" style={{ color: C.text3 }}>→ {row.assignee}</span>
                )}
                <span className="text-[11px]" style={{ color: row.status === 'stale' ? '#D97706' : C.text3 }}>
                  {row.waiting}
                </span>
              </div>
              {decidedRow && reasonStr ? (
                <div style={{ marginTop: 6, padding: '5px 8px', backgroundColor: '#FFF5F5', borderRadius: 3, borderLeft: `2px solid #FECACA` }}>
                  <span style={{ fontSize: 10, color: '#991B1B', lineHeight: 1.5 }}>{reasonStr}</span>
                </div>
              ) : null}
            </div>
          )
        })}
      </div>
    </div>
  )
}
