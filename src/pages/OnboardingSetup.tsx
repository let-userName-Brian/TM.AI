import { useState, useEffect, useRef } from 'react'
import { Link } from 'react-router'
import { C } from '../tokens'
import { TopBar } from '../components/Shell'

// ─── Types ────────────────────────────────────────────────────────────────────

type StepKey = 'welcome' | 'invite' | 'connect' | 'team-config' | 'analysis' | 'baseline'

type InvitedMember = {
  id: string
  name: string
  email: string
  role: 'dev' | 'qa' | 'ba' | 'scrum_master'
  roleLabel: string
  status: 'invited' | 'joined' | 'configured'
  avatar: string
}

type Integration = {
  id: string
  name: string
  category: 'source' | 'planning' | 'knowledge'
  status: 'disconnected' | 'connecting' | 'connected' | 'error'
  detail: string
  icon: React.ReactNode
}

type AnalysisItem = {
  id: string
  label: string
  found: string
  done: boolean
  detail: string
}

// ─── Step config ──────────────────────────────────────────────────────────────

const STEPS: { key: StepKey; label: string; sub: string }[] = [
  { key: 'welcome',     label: 'Project setup',     sub: 'Name, cadence, team size' },
  { key: 'invite',      label: 'Invite team',        sub: 'Assign roles and invite' },
  { key: 'connect',     label: 'Connect sources',    sub: 'Git, Jira, Confluence' },
  { key: 'team-config', label: 'Team configuration', sub: 'Role-specific setup' },
  { key: 'analysis',    label: 'Agent analysis',     sub: 'Scanning your tools' },
  { key: 'baseline',    label: 'Day 1 baseline',     sub: 'Review and launch' },
]

const STEP_KEYS = STEPS.map(s => s.key)

// ─── Seed data ────────────────────────────────────────────────────────────────

const SEED_MEMBERS: InvitedMember[] = [
  { id: 'm1', name: 'Vikas Nair',    email: 'vikas@acmecorp.io',  role: 'dev',          roleLabel: 'Developer',       status: 'configured', avatar: 'VN' },
  { id: 'm2', name: 'Priya Mehta',   email: 'priya@acmecorp.io',  role: 'dev',          roleLabel: 'Developer',       status: 'joined',     avatar: 'PM' },
  { id: 'm3', name: 'Sachin Rao',    email: 'sachin@acmecorp.io', role: 'qa',           roleLabel: 'QA Engineer',     status: 'configured', avatar: 'SR' },
  { id: 'm4', name: 'Kyle Thomas',   email: 'kyle@acmecorp.io',   role: 'ba',           roleLabel: 'Business Analyst', status: 'invited',   avatar: 'KT' },
  { id: 'm5', name: 'Scott Bellamy', email: 'scott@acmecorp.io',  role: 'scrum_master', roleLabel: 'Scrum Master',    status: 'joined',     avatar: 'SB' },
]

const SEED_INTEGRATIONS: Integration[] = [
  { id: 'gitlab',     name: 'GitLab',      category: 'source',    status: 'connected',    detail: 'acmecorp / facts-api · 3 repos',    icon: <GitLabIcon /> },
  { id: 'github',     name: 'GitHub',      category: 'source',    status: 'disconnected', detail: 'Not connected',                     icon: <GitHubIcon /> },
  { id: 'jira',       name: 'Jira',        category: 'planning',  status: 'connected',    detail: 'acmecorp.atlassian.net · FACTS board', icon: <JiraIcon /> },
  { id: 'confluence', name: 'Confluence',  category: 'knowledge', status: 'connected',    detail: '14 spaces indexed · 312 pages',     icon: <ConfluenceIcon /> },
  { id: 'linear',     name: 'Linear',      category: 'planning',  status: 'disconnected', detail: 'Not connected',                     icon: <LinearIcon /> },
  { id: 'notion',     name: 'Notion',      category: 'knowledge', status: 'disconnected', detail: 'Not connected',                     icon: <NotionIcon /> },
]

const ANALYSIS_ITEMS: AnalysisItem[] = [
  { id: 'a1', label: 'GitLab commit history',        found: '2,847 commits · 14 months',       done: true,  detail: 'Detected 3 primary contributors, main branch: main, avg PR size: 220 lines' },
  { id: 'a2', label: 'GitLab MR patterns',           found: '143 merged MRs analyzed',         done: true,  detail: 'Avg review cycle: 2.3 days, 68% first-pass merge rate, test coverage trending up' },
  { id: 'a3', label: 'Jira board structure',         found: '6 epics · 87 stories · 4 sprints', done: true, detail: 'Sprint cadence: 2 weeks, avg story points: 5, 3 active team members' },
  { id: 'a4', label: 'Jira velocity baseline',       found: 'Avg 3 stories/sprint (past 4)',    done: true,  detail: 'Cycle time: 11.2 days, gate latency: 5.2 hrs, carry-forward: 18%' },
  { id: 'a5', label: 'Confluence documentation',     found: '312 pages · 14 spaces',           done: true,  detail: 'Architecture docs, API specs, onboarding runbooks detected and indexed' },
  { id: 'a6', label: 'Test file structure',          found: '94 spec files · Jest + Cypress',  done: true,  detail: 'Coverage: 61% overall, integration test gap identified in auth module' },
  { id: 'a7', label: 'Coding patterns',              found: 'TypeScript · React · Node.js',    done: true,  detail: 'Adapter pattern prevalent, linting enforced, no significant tech debt signals' },
  { id: 'a8', label: 'Skill baseline generation',   found: 'Draft v1 ready',                  done: true,  detail: '6 BA rules, 9 Dev rules, 7 QA rules generated from evidence in connected sources' },
]

const BASELINE_METRICS = [
  { label: 'Avg cycle time',        value: '11.2 d',    note: 'baseline — Sprint 1 target' },
  { label: 'Stories per sprint',    value: '3',          note: 'from last 4 Jira sprints' },
  { label: 'Gate pass rate',        value: '51%',        note: 'estimated from MR history' },
  { label: 'Test coverage',         value: '61%',        note: 'Jest + Cypress combined' },
  { label: 'Carry-forward rate',    value: '18%',        note: 'avg from last 4 sprints' },
  { label: 'Skill rules generated', value: '22',         note: 'across BA, Dev, QA agents' },
]

// ─── Icons ────────────────────────────────────────────────────────────────────

function GitLabIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
      <path d="M10 17.5L3.5 12.5L1 8.5L5 2.5L7 8.5H13L15 2.5L19 8.5L16.5 12.5L10 17.5Z" fill="#FC6D26" />
    </svg>
  )
}
function GitHubIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
      <circle cx="10" cy="10" r="8.5" fill="#1B1F23" />
      <path d="M10 3.5a6.5 6.5 0 0 0-2.055 12.668c.325.06.444-.141.444-.313v-1.1c-1.807.393-2.188-.874-2.188-.874-.295-.75-.72-0.95-.72-.95-.589-.402.045-.394.045-.394.651.046 0.994.669.994.669.578 0.991 1.517.705 1.887.539.058-.419.226-.705.411-.867-1.442-.164-2.958-.721-2.958-3.21 0-.71.253-1.29.669-1.744-.067-.165-.29-.826.064-1.72 0 0 .545-.175 1.785.665A6.22 6.22 0 0 1 10 6.856a6.22 6.22 0 0 1 1.624.218c1.239-.84 1.783-.664 1.783-.664.354.893.132 1.554.065 1.719.418.454.668 1.034.668 1.744 0 2.496-1.519 3.044-2.965 3.205.234.201.442.598.442 1.205v1.786c0 .174.117.376.447.312A6.501 6.501 0 0 0 10 3.5Z" fill="#FFF" />
    </svg>
  )
}
function JiraIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
      <path d="M10.5 2L2 10.5l3 3L10.5 8l5.5 5.5 3-3L10.5 2Z" fill="#2684FF" />
      <path d="M10.5 8l-2.5 2.5L10.5 13l2.5-2.5L10.5 8Z" fill="#0052CC" />
    </svg>
  )
}
function ConfluenceIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
      <path d="M2.5 14.5C5 11 8 9.5 10 9.5s5 1.5 7.5 5c-.5-4-3.5-8-7.5-8s-7 4-7.5 8Z" fill="#2684FF" />
      <path d="M17.5 5.5C15 9 12 10.5 10 10.5s-5-1.5-7.5-5c.5 4 3.5 8 7.5 8s7-4 7.5-8Z" fill="#0052CC" />
    </svg>
  )
}
function LinearIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
      <circle cx="10" cy="10" r="8" fill="#5E6AD2" />
      <path d="M5 13.5l7.5-7.5M5 10l5-5M10 15l5-5M7 15l8-8" stroke="white" strokeWidth="1.2" strokeLinecap="round" />
    </svg>
  )
}
function NotionIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
      <rect width="20" height="20" rx="4" fill="#FFF" />
      <rect width="20" height="20" rx="4" fill="#FFF" stroke="#E5E7EB" />
      <path d="M6 5h5l4 4v7H6V5Z" fill="#111827" />
      <path d="M11 5l4 4h-4V5Z" fill="#6B7280" />
    </svg>
  )
}

function CheckIcon({ color = '#16A34A', size = 14 }: { color?: string; size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 14 14" fill="none">
      <circle cx="7" cy="7" r="6" fill={color} fillOpacity="0.12" />
      <path d="M4 7l2.5 2.5 3.5-4" stroke={color} strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

function SpinnerIcon({ size = 14, color = '#2563EB' }: { size?: number; color?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 14 14" fill="none" style={{ animation: 'spin 1s linear infinite' }}>
      <circle cx="7" cy="7" r="5.5" stroke={color} strokeWidth="1.5" strokeDasharray="20 10" strokeLinecap="round" />
    </svg>
  )
}

// ─── Role config for team-config step ────────────────────────────────────────

const ROLE_CONFIG_TASKS: Record<string, { task: string; done: boolean }[]> = {
  dev: [
    { task: 'Confirm default branch and protected branch rules', done: true },
    { task: 'Verify test runner config (jest.config.ts)', done: true },
    { task: 'Flag any files excluded from agent impact mapping', done: false },
  ],
  qa: [
    { task: 'Map Cypress spec folder to agent context', done: true },
    { task: 'Confirm coverage threshold expectations', done: true },
    { task: 'Link test reporting dashboard (optional)', done: false },
  ],
  ba: [
    { task: 'Link Confluence space for requirements', done: false },
    { task: 'Share story template or acceptance criteria format', done: false },
    { task: 'Confirm Jira story type mapping', done: false },
  ],
  scrum_master: [
    { task: 'Set sprint cadence (2 weeks confirmed)', done: true },
    { task: 'Identify gate reviewer assignments by role', done: true },
    { task: 'Review initial skill draft before analysis', done: false },
  ],
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function StepSidebar({ current, completedUpTo }: { current: StepKey; completedUpTo: number }) {
  const currentIdx = STEP_KEYS.indexOf(current)
  return (
    <aside style={{
      width: 220, flexShrink: 0,
      borderRight: `1px solid ${C.border}`,
      backgroundColor: C.surface,
      padding: '32px 0',
      display: 'flex', flexDirection: 'column',
    }}>
      <div style={{ padding: '0 20px 24px', borderBottom: `1px solid ${C.border}`, marginBottom: 24 }}>
        <div style={{ fontSize: 10, fontWeight: 600, color: C.text3, textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 6 }}>
          FACTS · Onboarding
        </div>
        <div style={{ fontSize: 13, fontWeight: 600, color: C.text1 }}>Project setup</div>
        <div style={{ fontSize: 11, color: C.text3, marginTop: 3 }}>
          Step {currentIdx + 1} of {STEPS.length}
        </div>
        {/* Progress bar */}
        <div style={{ marginTop: 10, height: 3, backgroundColor: C.border, borderRadius: 2 }}>
          <div style={{
            height: '100%', borderRadius: 2,
            width: `${((completedUpTo + 1) / STEPS.length) * 100}%`,
            backgroundColor: C.text1, transition: 'width 400ms ease',
          }} />
        </div>
      </div>
      <nav style={{ flex: 1 }}>
        {STEPS.map((step, i) => {
          const isCurrent = step.key === current
          const isDone = i < completedUpTo
          const isFuture = i > completedUpTo && !isCurrent
          return (
            <div
              key={step.key}
              style={{
                padding: '9px 20px',
                borderLeft: isCurrent ? `2px solid ${C.text1}` : '2px solid transparent',
                backgroundColor: isCurrent ? C.surfaceSubtle : 'transparent',
                opacity: isFuture ? 0.4 : 1,
                display: 'flex', alignItems: 'flex-start', gap: 10,
              }}
            >
              <div style={{
                width: 18, height: 18, borderRadius: '50%', flexShrink: 0, marginTop: 1,
                backgroundColor: isDone ? C.text1 : isCurrent ? 'transparent' : C.surfaceSubtle,
                border: isCurrent ? `1.5px solid ${C.text1}` : isDone ? 'none' : `1.5px solid ${C.border}`,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                {isDone ? (
                  <svg width="9" height="9" viewBox="0 0 9 9" fill="none">
                    <path d="M1.5 4.5l2 2 4-4" stroke="#FFF" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                ) : (
                  <span style={{ fontSize: 9, fontWeight: 600, color: isCurrent ? C.text1 : C.text3 }}>{i + 1}</span>
                )}
              </div>
              <div>
                <div style={{ fontSize: 12, fontWeight: isCurrent ? 600 : 400, color: isCurrent ? C.text1 : C.text2, lineHeight: 1.3 }}>{step.label}</div>
                <div style={{ fontSize: 10, color: C.text3, marginTop: 1 }}>{step.sub}</div>
              </div>
            </div>
          )
        })}
      </nav>
    </aside>
  )
}

// ─── STEP 1: Welcome / Project setup ─────────────────────────────────────────

function StepWelcome({ onNext }: { onNext: () => void }) {
  const [projectName, setProjectName] = useState('FACTS')
  const [cadence, setCadence] = useState('2')
  const [teamSize, setTeamSize] = useState('5–10')

  const labelStyle: React.CSSProperties = { fontSize: 12, fontWeight: 500, color: C.text2, marginBottom: 5, display: 'block' }
  const inputStyle: React.CSSProperties = {
    width: '100%', boxSizing: 'border-box',
    border: `1px solid ${C.border}`, borderRadius: 6,
    padding: '9px 12px', fontSize: 13, color: C.text1,
    backgroundColor: C.surfaceSubtle, outline: 'none',
    fontFamily: 'inherit',
  }

  return (
    <div style={{ maxWidth: 560 }}>
      <div style={{ marginBottom: 32 }}>
        <div style={{
          width: 40, height: 40, borderRadius: 10,
          backgroundColor: C.text1,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          marginBottom: 16,
        }}>
          <span style={{ color: '#FFF', fontSize: 16, fontWeight: 700 }}>F</span>
        </div>
        <h2 style={{ fontSize: 22, fontWeight: 700, color: C.text1, margin: '0 0 10px', letterSpacing: '-0.02em' }}>
          Set up FACTS with AI
        </h2>
        <p style={{ fontSize: 14, color: C.text2, margin: 0, lineHeight: 1.7 }}>
          In a few steps you'll invite your team, connect your tools, and let the agent read your Git, Jira, and Confluence history to build a day-one baseline. This gives the Always On Agent something real to improve from.
        </p>
      </div>

      {/* What happens explainer */}
      <div style={{
        backgroundColor: '#F0F9FF', border: '1px solid #BAE6FD',
        borderRadius: 8, padding: '16px 18px', marginBottom: 28,
        display: 'flex', flexDirection: 'column', gap: 10,
      }}>
        <div style={{ fontSize: 11, fontWeight: 600, color: '#0369A1', textTransform: 'uppercase', letterSpacing: '0.07em' }}>What happens during setup</div>
        {[
          'You invite your team by role — they each connect their specific tools',
          'The agent reads your git history, Jira board, and Confluence docs',
          'A day-one baseline is established across cycle time, throughput, and quality',
          'The Always On Agent starts monitoring from that baseline every sprint',
        ].map((txt, i) => (
          <div key={i} style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
            <div style={{ width: 18, height: 18, borderRadius: '50%', backgroundColor: '#0369A1', flexShrink: 0, marginTop: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <span style={{ fontSize: 9, fontWeight: 700, color: '#FFF' }}>{i + 1}</span>
            </div>
            <span style={{ fontSize: 12, color: '#0C4A6E', lineHeight: 1.6 }}>{txt}</span>
          </div>
        ))}
      </div>

      {/* Form */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 16, marginBottom: 32 }}>
        <div>
          <label style={labelStyle}>Project name</label>
          <input style={inputStyle} value={projectName} onChange={e => setProjectName(e.target.value)} />
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          <div>
            <label style={labelStyle}>Sprint cadence</label>
            <select style={inputStyle} value={cadence} onChange={e => setCadence(e.target.value)}>
              <option value="1">1 week</option>
              <option value="2">2 weeks</option>
              <option value="3">3 weeks</option>
              <option value="4">4 weeks</option>
            </select>
          </div>
          <div>
            <label style={labelStyle}>Team size</label>
            <select style={inputStyle} value={teamSize} onChange={e => setTeamSize(e.target.value)}>
              <option value="1–4">1–4 people</option>
              <option value="5–10">5–10 people</option>
              <option value="11–25">11–25 people</option>
              <option value="25+">25+ people</option>
            </select>
          </div>
        </div>
      </div>

      <button onClick={onNext} style={{
        width: '100%', padding: '13px', borderRadius: 8,
        backgroundColor: C.text1, color: '#FFF', border: 'none',
        fontSize: 14, fontWeight: 600, cursor: 'pointer',
        display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
      }} className="hover:opacity-90 transition-opacity">
        Continue: Invite your team →
      </button>
    </div>
  )
}

// ─── STEP 2: Invite team ──────────────────────────────────────────────────────

const ROLE_OPTIONS = [
  { value: 'dev',          label: 'Developer' },
  { value: 'qa',           label: 'QA Engineer' },
  { value: 'ba',           label: 'Business Analyst' },
  { value: 'scrum_master', label: 'Scrum Master' },
]

const STATUS_STYLE: Record<InvitedMember['status'], { label: string; bg: string; color: string }> = {
  invited:    { label: 'Invited',    bg: '#FFFBEB', color: '#92400E' },
  joined:     { label: 'Joined',     bg: '#F0FDF4', color: '#166534' },
  configured: { label: 'Configured', bg: '#EFF6FF', color: '#1E40AF' },
}

function StepInvite({ onNext }: { onNext: () => void }) {
  const [members, setMembers] = useState<InvitedMember[]>(SEED_MEMBERS)
  const [email, setEmail] = useState('')
  const [role, setRole] = useState<InvitedMember['role']>('dev')
  const [sending, setSending] = useState(false)

  function invite() {
    if (!email.trim()) return
    setSending(true)
    setTimeout(() => {
      const rl = ROLE_OPTIONS.find(r => r.value === role)!
      const initials = email.slice(0, 2).toUpperCase()
      setMembers(prev => [...prev, {
        id: Math.random().toString(36).slice(2),
        name: email.split('@')[0],
        email,
        role,
        roleLabel: rl.label,
        status: 'invited',
        avatar: initials,
      }])
      setEmail('')
      setSending(false)
    }, 600)
  }

  const inputStyle: React.CSSProperties = {
    border: `1px solid ${C.border}`, borderRadius: 6, padding: '8px 11px',
    fontSize: 13, color: C.text1, backgroundColor: C.surfaceSubtle,
    outline: 'none', fontFamily: 'inherit', flex: 1,
  }
  const selectStyle: React.CSSProperties = { ...inputStyle, flex: 'none', width: 160 }

  const configuredCount = members.filter(m => m.status === 'configured').length
  const joinedCount = members.filter(m => m.status !== 'invited').length

  return (
    <div style={{ maxWidth: 580 }}>
      <h2 style={{ fontSize: 20, fontWeight: 700, color: C.text1, margin: '0 0 8px', letterSpacing: '-0.02em' }}>
        Invite your team
      </h2>
      <p style={{ fontSize: 13, color: C.text2, margin: '0 0 24px', lineHeight: 1.6 }}>
        Each person gets a role-scoped view and will be asked to connect their specific tools before the agent runs its analysis.
      </p>

      {/* Invite input */}
      <div style={{
        backgroundColor: C.surface, border: `1px solid ${C.border}`,
        borderRadius: 8, padding: '14px 16px', marginBottom: 20,
      }}>
        <div style={{ fontSize: 11, fontWeight: 600, color: C.text3, textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 10 }}>Add a team member</div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <input
            style={inputStyle}
            placeholder="email@yourcompany.com"
            value={email}
            onChange={e => setEmail(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter') invite() }}
          />
          <select
            style={selectStyle}
            value={role}
            onChange={e => setRole(e.target.value as InvitedMember['role'])}
          >
            {ROLE_OPTIONS.map(r => <option key={r.value} value={r.value}>{r.label}</option>)}
          </select>
          <button
            onClick={invite}
            disabled={sending || !email.trim()}
            style={{
              padding: '8px 14px', borderRadius: 6, border: 'none',
              backgroundColor: sending ? C.surfaceSubtle : C.text1,
              color: sending ? C.text3 : '#FFF',
              fontSize: 12, fontWeight: 600, cursor: sending ? 'not-allowed' : 'pointer',
              flexShrink: 0, whiteSpace: 'nowrap',
            }}
          >
            {sending ? 'Sending…' : 'Send invite'}
          </button>
        </div>
      </div>

      {/* Team list */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 28 }}>
        {members.map(m => {
          const s = STATUS_STYLE[m.status]
          return (
            <div key={m.id} style={{
              display: 'flex', alignItems: 'center', gap: 12,
              backgroundColor: C.surface, border: `1px solid ${C.border}`,
              borderRadius: 6, padding: '10px 14px',
            }}>
              <div style={{
                width: 30, height: 30, borderRadius: '50%',
                backgroundColor: m.status === 'configured' ? C.text1 : m.status === 'joined' ? '#0891B2' : C.borderStrong,
                color: '#FFF', fontSize: 10, fontWeight: 700,
                display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
              }}>
                {m.avatar}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 12, fontWeight: 500, color: C.text1 }}>{m.name}</div>
                <div style={{ fontSize: 11, color: C.text3 }}>{m.email} · {m.roleLabel}</div>
              </div>
              <span style={{
                fontSize: 10, fontWeight: 600, padding: '2px 7px', borderRadius: 3,
                backgroundColor: s.bg, color: s.color,
              }}>
                {s.label}
              </span>
            </div>
          )
        })}
      </div>

      {/* Progress */}
      <div style={{
        backgroundColor: C.surfaceSubtle, border: `1px solid ${C.border}`,
        borderRadius: 6, padding: '10px 14px', marginBottom: 24,
        display: 'flex', gap: 20,
      }}>
        {[
          { label: 'Invited', val: members.length },
          { label: 'Joined', val: joinedCount },
          { label: 'Configured', val: configuredCount },
        ].map(s => (
          <div key={s.label}>
            <div style={{ fontSize: 18, fontWeight: 700, color: C.text1, lineHeight: 1 }}>{s.val}</div>
            <div style={{ fontSize: 10, color: C.text3, marginTop: 3 }}>{s.label}</div>
          </div>
        ))}
      </div>

      <button onClick={onNext} style={{
        width: '100%', padding: '13px', borderRadius: 8,
        backgroundColor: C.text1, color: '#FFF', border: 'none',
        fontSize: 14, fontWeight: 600, cursor: 'pointer',
      }} className="hover:opacity-90 transition-opacity">
        Continue: Connect sources →
      </button>
    </div>
  )
}

// ─── STEP 3: Connect sources ──────────────────────────────────────────────────

function IntegrationCard({
  intg,
  onConnect,
}: {
  intg: Integration
  onConnect: (id: string) => void
}) {
  const isConnected = intg.status === 'connected'
  const isConnecting = intg.status === 'connecting'

  const catLabel: Record<Integration['category'], string> = {
    source: 'Source control', planning: 'Project planning', knowledge: 'Knowledge base',
  }

  return (
    <div style={{
      backgroundColor: C.surface,
      border: `1px solid ${isConnected ? '#BBF7D0' : C.border}`,
      borderRadius: 8, padding: '14px 16px',
      display: 'flex', alignItems: 'center', gap: 14,
    }}>
      <div style={{
        width: 36, height: 36, borderRadius: 8, flexShrink: 0,
        backgroundColor: C.surfaceSubtle, border: `1px solid ${C.border}`,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}>
        {intg.icon}
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 2 }}>
          <span style={{ fontSize: 13, fontWeight: 600, color: C.text1 }}>{intg.name}</span>
          <span style={{ fontSize: 9, color: C.text3, fontWeight: 500 }}>{catLabel[intg.category]}</span>
        </div>
        <div style={{ fontSize: 11, color: isConnected ? '#15803D' : C.text3 }}>{intg.detail}</div>
      </div>
      <button
        onClick={() => !isConnected && onConnect(intg.id)}
        disabled={isConnecting}
        style={{
          padding: '6px 12px', borderRadius: 5, border: 'none', cursor: isConnected ? 'default' : 'pointer',
          backgroundColor: isConnected ? '#F0FDF4' : isConnecting ? C.surfaceSubtle : C.text1,
          color: isConnected ? '#166534' : isConnecting ? C.text3 : '#FFF',
          fontSize: 11, fontWeight: 600, flexShrink: 0,
          display: 'flex', alignItems: 'center', gap: 5,
        }}
      >
        {isConnected ? (
          <><CheckIcon size={11} />Connected</>
        ) : isConnecting ? (
          <><SpinnerIcon size={11} />Connecting…</>
        ) : (
          'Connect'
        )}
      </button>
    </div>
  )
}

function StepConnect({ onNext }: { onNext: () => void }) {
  const [integrations, setIntegrations] = useState<Integration[]>(SEED_INTEGRATIONS)

  function handleConnect(id: string) {
    setIntegrations(prev => prev.map(i => i.id === id ? { ...i, status: 'connecting' } : i))
    setTimeout(() => {
      setIntegrations(prev => prev.map(i => i.id === id ? { ...i, status: 'connected', detail: 'Connected · ready for analysis' } : i))
    }, 1200)
  }

  const connectedCount = integrations.filter(i => i.status === 'connected').length
  const required = ['gitlab', 'jira']
  const requiredOk = required.every(id => integrations.find(i => i.id === id)?.status === 'connected')

  const categories: Integration['category'][] = ['source', 'planning', 'knowledge']
  const catLabels: Record<Integration['category'], string> = {
    source: 'Source control', planning: 'Project planning', knowledge: 'Knowledge base',
  }

  return (
    <div style={{ maxWidth: 580 }}>
      <h2 style={{ fontSize: 20, fontWeight: 700, color: C.text1, margin: '0 0 8px', letterSpacing: '-0.02em' }}>
        Connect your sources
      </h2>
      <p style={{ fontSize: 13, color: C.text2, margin: '0 0 6px', lineHeight: 1.6 }}>
        The agent reads these sources to build context — commit history, story structure, documentation, test patterns. The more you connect, the richer the baseline.
      </p>
      <div style={{ fontSize: 11, color: C.text3, marginBottom: 24 }}>
        <span style={{ color: '#DC2626' }}>*</span> Git and Jira are required for analysis to run.
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 20, marginBottom: 28 }}>
        {categories.map(cat => {
          const items = integrations.filter(i => i.category === cat)
          return (
            <div key={cat}>
              <div style={{ fontSize: 10, fontWeight: 600, color: C.text3, textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 8 }}>
                {catLabels[cat]}
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                {items.map(intg => (
                  <IntegrationCard key={intg.id} intg={intg} onConnect={handleConnect} />
                ))}
              </div>
            </div>
          )
        })}
      </div>

      <div style={{
        backgroundColor: C.surfaceSubtle, border: `1px solid ${C.border}`,
        borderRadius: 6, padding: '10px 14px', marginBottom: 20,
      }}>
        <span style={{ fontSize: 12, color: C.text2 }}>
          <strong style={{ color: C.text1 }}>{connectedCount}</strong> of {integrations.length} sources connected
        </span>
      </div>

      <button
        onClick={onNext}
        disabled={!requiredOk}
        style={{
          width: '100%', padding: '13px', borderRadius: 8,
          backgroundColor: requiredOk ? C.text1 : C.surfaceSubtle,
          color: requiredOk ? '#FFF' : C.text3,
          border: 'none', fontSize: 14, fontWeight: 600,
          cursor: requiredOk ? 'pointer' : 'not-allowed',
        }}
        className={requiredOk ? 'hover:opacity-90 transition-opacity' : ''}
      >
        {requiredOk ? 'Continue: Team configuration →' : 'Connect Git and Jira to continue'}
      </button>
    </div>
  )
}

// ─── STEP 4: Team configuration ───────────────────────────────────────────────

function StepTeamConfig({ onNext }: { onNext: () => void }) {
  const [expanded, setExpanded] = useState<string | null>('dev')

  const roles: { key: string; label: string; color: string; members: InvitedMember[] }[] = [
    { key: 'dev',          label: 'Developers',       color: '#6D28D9', members: SEED_MEMBERS.filter(m => m.role === 'dev') },
    { key: 'qa',           label: 'QA Engineers',     color: '#0891B2', members: SEED_MEMBERS.filter(m => m.role === 'qa') },
    { key: 'ba',           label: 'Business Analysts', color: '#D97706', members: SEED_MEMBERS.filter(m => m.role === 'ba') },
    { key: 'scrum_master', label: 'Scrum Masters',    color: '#16A34A', members: SEED_MEMBERS.filter(m => m.role === 'scrum_master') },
  ]

  return (
    <div style={{ maxWidth: 580 }}>
      <h2 style={{ fontSize: 20, fontWeight: 700, color: C.text1, margin: '0 0 8px', letterSpacing: '-0.02em' }}>
        Team configuration
      </h2>
      <p style={{ fontSize: 13, color: C.text2, margin: '0 0 24px', lineHeight: 1.6 }}>
        Each role has a few things to confirm or connect. Team members complete these in their own view — here you see the progress and can nudge anyone who's pending.
      </p>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 28 }}>
        {roles.map(role => {
          const tasks = ROLE_CONFIG_TASKS[role.key] ?? []
          const doneCount = tasks.filter(t => t.done).length
          const isOpen = expanded === role.key
          return (
            <div key={role.key} style={{
              backgroundColor: C.surface, border: `1px solid ${C.border}`,
              borderRadius: 8, overflow: 'hidden',
            }}>
              <button
                onClick={() => setExpanded(isOpen ? null : role.key)}
                style={{
                  width: '100%', textAlign: 'left', padding: '12px 16px',
                  display: 'flex', alignItems: 'center', gap: 12,
                  background: 'none', border: 'none', cursor: 'pointer',
                }}
                className="hover:bg-[#F3F4F6] transition-colors"
              >
                <div style={{
                  width: 8, height: 8, borderRadius: '50%',
                  backgroundColor: role.color, flexShrink: 0,
                }} />
                <span style={{ fontSize: 13, fontWeight: 500, color: C.text1, flex: 1 }}>{role.label}</span>
                <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                  {role.members.map(m => (
                    <div
                      key={m.id}
                      title={`${m.name} · ${m.status}`}
                      style={{
                        width: 22, height: 22, borderRadius: '50%',
                        backgroundColor: m.status === 'configured' ? C.text1 : m.status === 'joined' ? '#0891B2' : C.borderStrong,
                        color: '#FFF', fontSize: 8, fontWeight: 700,
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                      }}
                    >
                      {m.avatar}
                    </div>
                  ))}
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 4, minWidth: 60 }}>
                  <div style={{ flex: 1, height: 4, backgroundColor: C.border, borderRadius: 2, width: 48 }}>
                    <div style={{ height: '100%', borderRadius: 2, backgroundColor: role.color, width: `${(doneCount / tasks.length) * 100}%` }} />
                  </div>
                  <span style={{ fontSize: 10, color: C.text3 }}>{doneCount}/{tasks.length}</span>
                </div>
                <svg width="10" height="10" viewBox="0 0 10 10" fill="none" style={{ transform: isOpen ? 'rotate(180deg)' : 'none', transition: 'transform 150ms' }}>
                  <path d="M2.5 4l2.5 2.5 2.5-2.5" stroke={C.text3} strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </button>

              {isOpen && (
                <div style={{ padding: '0 16px 14px', borderTop: `1px solid ${C.border}` }}>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginTop: 12 }}>
                    {tasks.map((task, i) => (
                      <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: 8 }}>
                        {task.done ? (
                          <CheckIcon size={14} color="#16A34A" />
                        ) : (
                          <div style={{ width: 14, height: 14, borderRadius: '50%', border: `1.5px solid ${C.border}`, flexShrink: 0, marginTop: 1 }} />
                        )}
                        <span style={{ fontSize: 12, color: task.done ? C.text2 : C.text1, lineHeight: 1.5, textDecoration: task.done ? 'none' : 'none' }}>
                          {task.task}
                        </span>
                        {!task.done && (
                          <span style={{
                            fontSize: 9, fontWeight: 600, color: '#D97706',
                            backgroundColor: '#FFFBEB', border: '1px solid #FDE68A',
                            padding: '1px 5px', borderRadius: 3, flexShrink: 0, marginTop: 2,
                          }}>
                            Pending
                          </span>
                        )}
                      </div>
                    ))}
                  </div>
                  {tasks.some(t => !t.done) && (
                    <div style={{ marginTop: 12 }}>
                      <button style={{
                        fontSize: 11, color: C.text2, padding: '5px 10px',
                        border: `1px solid ${C.border}`, borderRadius: 5,
                        backgroundColor: 'transparent', cursor: 'pointer',
                      }}>
                        Send reminder →
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>
          )
        })}
      </div>

      <div style={{
        backgroundColor: '#FFFBEB', border: '1px solid #FDE68A',
        borderRadius: 6, padding: '10px 14px', marginBottom: 20,
        fontSize: 12, color: '#92400E', lineHeight: 1.6,
      }}>
        <strong>3 tasks still pending</strong> — you can run the analysis now and team members can complete their setup in the next cycle. The baseline will update automatically.
      </div>

      <button onClick={onNext} style={{
        width: '100%', padding: '13px', borderRadius: 8,
        backgroundColor: C.text1, color: '#FFF', border: 'none',
        fontSize: 14, fontWeight: 600, cursor: 'pointer',
      }} className="hover:opacity-90 transition-opacity">
        Continue: Run agent analysis →
      </button>
    </div>
  )
}

// ─── STEP 5: Analysis ─────────────────────────────────────────────────────────

function StepAnalysis({ onNext }: { onNext: () => void }) {
  const [items, setItems] = useState<AnalysisItem[]>(
    ANALYSIS_ITEMS.map(a => ({ ...a, done: false }))
  )
  const [started, setStarted] = useState(false)
  const [allDone, setAllDone] = useState(false)
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  function runAnalysis() {
    setStarted(true)
    ANALYSIS_ITEMS.forEach((_, i) => {
      timerRef.current = setTimeout(() => {
        setItems(prev => prev.map((a, j) => j === i ? { ...a, done: true } : a))
        if (i === ANALYSIS_ITEMS.length - 1) {
          setTimeout(() => setAllDone(true), 400)
        }
      }, 600 + i * 700)
    })
  }

  useEffect(() => () => { if (timerRef.current) clearTimeout(timerRef.current) }, [])

  return (
    <div style={{ maxWidth: 580 }}>
      <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
      <h2 style={{ fontSize: 20, fontWeight: 700, color: C.text1, margin: '0 0 8px', letterSpacing: '-0.02em' }}>
        Agent analysis
      </h2>
      <p style={{ fontSize: 13, color: C.text2, margin: '0 0 24px', lineHeight: 1.6 }}>
        The agent will read your connected sources — git history, Jira stories, Confluence pages, and test files — to build a rich context for Sprint 1.
      </p>

      {!started && (
        <div style={{
          backgroundColor: C.surfaceSubtle, border: `1px solid ${C.border}`,
          borderRadius: 8, padding: '20px', textAlign: 'center', marginBottom: 24,
        }}>
          <div style={{ fontSize: 13, color: C.text2, marginBottom: 16, lineHeight: 1.6 }}>
            Ready to analyze <strong>3 connected sources</strong>.<br />
            This typically takes 30–90 seconds.
          </div>
          <button onClick={runAnalysis} style={{
            padding: '11px 24px', borderRadius: 7, border: 'none',
            backgroundColor: C.text1, color: '#FFF',
            fontSize: 13, fontWeight: 600, cursor: 'pointer',
          }}>
            Run analysis
          </button>
        </div>
      )}

      {started && (
        <div style={{
          backgroundColor: C.surface, border: `1px solid ${C.border}`,
          borderRadius: 8, overflow: 'hidden', marginBottom: 24,
        }}>
          <div style={{
            padding: '10px 14px', borderBottom: `1px solid ${C.border}`,
            backgroundColor: C.surfaceSubtle,
            display: 'flex', alignItems: 'center', gap: 8,
          }}>
            {!allDone ? <SpinnerIcon size={12} /> : <CheckIcon size={12} color="#16A34A" />}
            <span style={{ fontSize: 11, fontWeight: 600, color: C.text1 }}>
              {allDone ? 'Analysis complete' : 'Analyzing connected sources…'}
            </span>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            {items.map((item, i) => {
              const isNext = !item.done && items.slice(0, i).every(a => a.done)
              return (
                <div key={item.id} style={{
                  padding: '10px 14px', borderBottom: `1px solid ${C.border}`,
                  display: 'flex', alignItems: 'flex-start', gap: 10,
                  opacity: !item.done && !isNext ? 0.4 : 1,
                  transition: 'opacity 200ms',
                }}>
                  <div style={{ marginTop: 2, flexShrink: 0 }}>
                    {item.done
                      ? <CheckIcon size={14} color="#16A34A" />
                      : isNext
                      ? <SpinnerIcon size={14} />
                      : <div style={{ width: 14, height: 14, borderRadius: '50%', border: `1.5px solid ${C.border}` }} />
                    }
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8 }}>
                      <span style={{ fontSize: 12, color: C.text1, fontWeight: item.done ? 500 : 400 }}>{item.label}</span>
                      {item.done && (
                        <span style={{ fontSize: 11, fontFamily: 'JetBrains Mono, monospace', color: '#16A34A', flexShrink: 0 }}>
                          {item.found}
                        </span>
                      )}
                    </div>
                    {item.done && (
                      <div style={{ fontSize: 11, color: C.text3, marginTop: 2, lineHeight: 1.5 }}>{item.detail}</div>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      <button
        onClick={onNext}
        disabled={!allDone}
        style={{
          width: '100%', padding: '13px', borderRadius: 8,
          backgroundColor: allDone ? C.text1 : C.surfaceSubtle,
          color: allDone ? '#FFF' : C.text3,
          border: 'none', fontSize: 14, fontWeight: 600,
          cursor: allDone ? 'pointer' : 'not-allowed',
        }}
        className={allDone ? 'hover:opacity-90 transition-opacity' : ''}
      >
        {allDone ? 'View Day 1 baseline →' : 'Waiting for analysis to complete…'}
      </button>
    </div>
  )
}

// ─── STEP 6: Baseline ─────────────────────────────────────────────────────────

function StepBaseline() {
  return (
    <div style={{ maxWidth: 580 }}>
      <div style={{ marginBottom: 28 }}>
        <div style={{
          display: 'inline-flex', alignItems: 'center', gap: 6,
          backgroundColor: '#F0FDF4', border: '1px solid #BBF7D0',
          borderRadius: 6, padding: '5px 10px', marginBottom: 16,
        }}>
          <CheckIcon size={12} color="#16A34A" />
          <span style={{ fontSize: 11, fontWeight: 600, color: '#166534' }}>Setup complete</span>
        </div>
        <h2 style={{ fontSize: 20, fontWeight: 700, color: C.text1, margin: '0 0 8px', letterSpacing: '-0.02em' }}>
          Day 1 baseline established
        </h2>
        <p style={{ fontSize: 13, color: C.text2, margin: 0, lineHeight: 1.6 }}>
          The agent has analyzed your connected sources and established a baseline across cycle time, throughput, quality, and documentation coverage.
          The Always On Agent will track improvement from this point forward.
        </p>
      </div>

      {/* Baseline metrics grid */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 24 }}>
        {BASELINE_METRICS.map(m => (
          <div key={m.label} style={{
            backgroundColor: C.surface, border: `1px solid ${C.border}`,
            borderRadius: 6, padding: '12px 14px',
          }}>
            <div style={{ fontSize: 10, color: C.text3, marginBottom: 6 }}>{m.label}</div>
            <div style={{ fontSize: 20, fontWeight: 700, color: C.text1, lineHeight: 1, letterSpacing: '-0.02em', fontFamily: 'JetBrains Mono, monospace' }}>
              {m.value}
            </div>
            <div style={{ fontSize: 10, color: C.text3, marginTop: 5 }}>{m.note}</div>
          </div>
        ))}
      </div>

      {/* Skill draft notice */}
      <div style={{
        backgroundColor: '#F5F3FF', border: '1px solid #DDD6FE',
        borderRadius: 8, padding: '14px 16px', marginBottom: 24,
        display: 'flex', gap: 12, alignItems: 'flex-start',
      }}>
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none" style={{ flexShrink: 0, marginTop: 1 }}>
          <rect x="2" y="2" width="12" height="12" rx="3" fill="#6D28D9" fillOpacity="0.12" />
          <path d="M5 8h6M5 5.5h6M5 10.5h4" stroke="#6D28D9" strokeWidth="1.2" strokeLinecap="round" />
        </svg>
        <div>
          <div style={{ fontSize: 12, fontWeight: 600, color: '#4C1D95', marginBottom: 4 }}>Skill draft v1 ready for review</div>
          <div style={{ fontSize: 12, color: '#6D28D9', lineHeight: 1.6 }}>
            22 rules generated across BA, Dev, and QA agents based on your git patterns, story templates, and Confluence standards. The Scrum Master can review and approve before Sprint 1 begins.
          </div>
        </div>
      </div>

      {/* What's next */}
      <div style={{
        backgroundColor: C.surfaceSubtle, border: `1px solid ${C.border}`,
        borderRadius: 8, padding: '14px 16px', marginBottom: 24,
      }}>
        <div style={{ fontSize: 11, fontWeight: 600, color: C.text3, textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 10 }}>What happens next</div>
        {[
          { icon: '→', text: 'Your team uses their role-scoped workspaces each sprint' },
          { icon: '→', text: 'The Always On Agent monitors cycle time, gate rates, and throughput' },
          { icon: '→', text: 'After each sprint, the baseline updates automatically' },
          { icon: '→', text: 'Skill rules improve based on patterns the agent observes' },
        ].map((item, i) => (
          <div key={i} style={{ display: 'flex', gap: 10, marginBottom: 8, fontSize: 12, color: C.text2, lineHeight: 1.5 }}>
            <span style={{ color: C.text3, flexShrink: 0 }}>{item.icon}</span>
            {item.text}
          </div>
        ))}
      </div>

      <Link
        to="/p/FACTS/always-on"
        style={{
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          gap: 8, width: '100%', padding: '13px',
          backgroundColor: C.text1, color: '#FFF',
          borderRadius: 8, textDecoration: 'none',
          fontSize: 14, fontWeight: 600, boxSizing: 'border-box',
        }}
        className="hover:opacity-90 transition-opacity"
      >
        Open Always On Agent →
      </Link>

      <div style={{ marginTop: 10, textAlign: 'center' }}>
        <Link to="/p/FACTS/always-on" style={{ fontSize: 12, color: C.text3, textDecoration: 'none' }}
          className="hover:underline">
          Go to home
        </Link>
      </div>
    </div>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function OnboardingSetup() {
  const [stepIdx, setStepIdx] = useState(0)
  const current = STEP_KEYS[stepIdx]

  function next() {
    setStepIdx(i => Math.min(i + 1, STEPS.length - 1))
  }

  return (
    <div style={{ display: 'flex', height: '100vh', overflow: 'hidden', backgroundColor: C.ground, flexDirection: 'column' }}>
      <TopBar />
      <div style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>
        <StepSidebar current={current} completedUpTo={stepIdx} />
        <main style={{ flex: 1, overflowY: 'auto', padding: '40px 48px' }}>
          {current === 'welcome'     && <StepWelcome     onNext={next} />}
          {current === 'invite'      && <StepInvite      onNext={next} />}
          {current === 'connect'     && <StepConnect     onNext={next} />}
          {current === 'team-config' && <StepTeamConfig  onNext={next} />}
          {current === 'analysis'    && <StepAnalysis    onNext={next} />}
          {current === 'baseline'    && <StepBaseline />}
        </main>
      </div>
    </div>
  )
}
