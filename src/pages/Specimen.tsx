import { useState } from 'react'
import { Link } from 'react-router'

// ─── Design tokens (source of truth for this specimen) ──────────────────────

const C = {
  ground:        '#F4F5F7',
  surface:       '#FFFFFF',
  surfaceSubtle: '#F3F4F6',
  border:        '#E2E5EA',
  borderStrong:  '#C9CDD4',
  text1:         '#111318',
  text2:         '#4B5563',
  text3:         '#9CA3AF',
  // Decision — RESERVED. Approve and Reject actions only.
  approve:       '#15803D',
  approveFg:     '#FFFFFF',
  reject:        '#B91C1C',
  rejectFg:      '#FFFFFF',
} as const

const SEMANTIC = {
  pass:    { label: 'Pass',    bg: '#F0FDF4', text: '#166534', ring: '#BBF7D0' },
  fail:    { label: 'Fail',    bg: '#FFF5F5', text: '#991B1B', ring: '#FECACA' },
  pending: { label: 'Pending', bg: '#FFFBEB', text: '#92400E', ring: '#FDE68A' },
  stale:   { label: 'Stale',   bg: '#F9FAFB', text: '#6B7280', ring: '#E5E7EB' },
} as const

type Status = keyof typeof SEMANTIC

// ─── Table fixture data ──────────────────────────────────────────────────────

const ROWS: {
  key: string; title: string; type: string; agent: string;
  status: Status; reviewed: string | null; reviewer: string | null
}[] = [
  { key: 'REQ-0041', title: 'Audit log must capture all agent invocations with caller identity and timestamp', type: 'Requirement', agent: 'claude-3-5-sonnet', status: 'pending', reviewed: null, reviewer: null },
  { key: 'REQ-0042', title: 'Approval gate must block downstream writes until human sign-off is received', type: 'Requirement', agent: 'claude-3-5-sonnet', status: 'pass', reviewed: '2h ago', reviewer: 'D. Marsh' },
  { key: 'US-0018', title: 'As a scrum master I can view all pending approvals in a single queue sorted by age', type: 'User Story', agent: 'claude-3-5-sonnet', status: 'fail', reviewed: '47m ago', reviewer: 'A. Okafor' },
  { key: 'TC-0093', title: 'Given an expired session token, agent invocation returns HTTP 401 and the event is logged', type: 'Test Case', agent: 'gpt-4o', status: 'pass', reviewed: '1d ago', reviewer: 'L. Park' },
  { key: 'TC-0094', title: 'Verify approval webhook fires within 500ms of human decision event', type: 'Test Case', agent: 'gpt-4o', status: 'stale', reviewed: '6d ago', reviewer: 'D. Marsh' },
  { key: 'US-0019', title: 'As a BA I can export the full approval chain as a signed PDF for compliance audits', type: 'User Story', agent: 'gemini-1.5-pro', status: 'pending', reviewed: null, reviewer: null },
]

const TYPE_COLOR: Record<string, { text: string; bg: string }> = {
  'Requirement': { text: '#1D4ED8', bg: '#EFF6FF' },
  'User Story':  { text: '#6D28D9', bg: '#F5F3FF' },
  'Test Case':   { text: '#166534', bg: '#F0FDF4' },
}

// ─── Atom components ─────────────────────────────────────────────────────────

function StatusBadge({ status }: { status: Status }) {
  const s = SEMANTIC[status]
  return (
    <span
      style={{ backgroundColor: s.bg, color: s.text, boxShadow: `0 0 0 1px ${s.ring}` }}
      className="inline-flex items-center px-1.5 py-px rounded-sm text-[11px] font-medium leading-4 font-sans"
    >
      {s.label}
    </span>
  )
}

function TypeBadge({ type }: { type: string }) {
  const cfg = TYPE_COLOR[type] ?? { text: C.text2, bg: C.surfaceSubtle }
  return (
    <span
      style={{ backgroundColor: cfg.bg, color: cfg.text }}
      className="inline-flex items-center px-1.5 py-px rounded-sm text-[11px] font-medium leading-4 whitespace-nowrap"
    >
      {type}
    </span>
  )
}

function Btn({
  variant = 'default',
  size = 'md',
  children,
  onClick,
  disabled,
}: {
  variant?: 'default' | 'primary' | 'ghost' | 'approve' | 'reject'
  size?: 'sm' | 'md'
  children: React.ReactNode
  onClick?: () => void
  disabled?: boolean
}) {
  const styles = {
    default: { backgroundColor: C.surface, color: C.text1, boxShadow: `0 0 0 1px ${C.border}` },
    primary: { backgroundColor: C.text1, color: '#FFFFFF' },
    ghost:   { backgroundColor: 'transparent', color: C.text2 },
    approve: { backgroundColor: C.approve, color: C.approveFg },
    reject:  { backgroundColor: C.reject, color: C.rejectFg },
  }
  const pad = size === 'sm' ? 'px-2 py-0.5 text-[12px]' : 'px-3 py-1.5 text-[13px]'
  return (
    <button
      style={disabled ? { backgroundColor: C.surfaceSubtle, color: C.text3, cursor: 'not-allowed' } : styles[variant]}
      onClick={disabled ? undefined : onClick}
      className={`inline-flex items-center gap-1.5 rounded font-medium leading-5 cursor-pointer transition-opacity hover:opacity-80 ${pad}`}
    >
      {children}
    </button>
  )
}

function Skeleton({ width, h = 'h-3' }: { width?: number | string; h?: string }) {
  return (
    <div
      style={{ backgroundColor: C.border, width: width ?? '100%' }}
      className={`${h} rounded-sm animate-pulse`}
    />
  )
}

function Mono({ children }: { children: React.ReactNode }) {
  return <span style={{ fontFamily: 'JetBrains Mono, monospace', color: C.text2 }} className="text-[12px]">{children}</span>
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <div className="text-[11px] font-semibold tracking-wide mb-3" style={{ color: C.text3 }}>
      {children}
    </div>
  )
}

function Card({ className = '', style = {}, children }: { className?: string; style?: React.CSSProperties; children: React.ReactNode }) {
  return (
    <div
      style={{ backgroundColor: C.surface, border: `1px solid ${C.border}`, ...style }}
      className={`rounded ${className}`}
    >
      {children}
    </div>
  )
}

// ─── Drawer ──────────────────────────────────────────────────────────────────

function Drawer({ open, onClose }: { open: boolean; onClose: () => void }) {
  const row = ROWS[0]
  return (
    <>
      {open && (
        <div
          style={{ backgroundColor: 'rgba(17,19,24,0.3)' }}
          className="fixed inset-0 z-40"
          onClick={onClose}
        />
      )}
      <div
        style={{
          width: 480,
          backgroundColor: C.surface,
          borderLeft: `1px solid ${C.border}`,
          transform: open ? 'translateX(0)' : 'translateX(100%)',
          transition: 'transform 180ms cubic-bezier(0.4,0,0.2,1)',
        }}
        className="fixed top-0 right-0 h-full z-50 flex flex-col"
      >
        {/* Drawer header */}
        <div
          style={{ borderBottom: `1px solid ${C.border}` }}
          className="flex items-start justify-between px-5 py-4 shrink-0"
        >
          <div>
            <Mono>{row.key}</Mono>
            <h3 className="text-[14px] font-semibold mt-1 leading-5 pr-4" style={{ color: C.text1 }}>
              {row.title}
            </h3>
            <div className="flex items-center gap-2 mt-2">
              <TypeBadge type={row.type} />
              <StatusBadge status={row.status} />
            </div>
          </div>
          <button
            onClick={onClose}
            style={{ color: C.text3 }}
            className="hover:text-[#111318] transition-colors text-[18px] leading-none mt-0.5 cursor-pointer"
          >
            ×
          </button>
        </div>

        {/* Drawer body */}
        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-5">

          {/* Meta */}
          <div
            style={{ backgroundColor: C.surfaceSubtle, border: `1px solid ${C.border}` }}
            className="rounded text-[12px]"
          >
            {[
              { label: 'Agent', value: row.agent, mono: true },
              { label: 'Run', value: '#/delivery/req/run-0041', mono: true },
              { label: 'Invoked', value: 'Sept 12, 2026 · 09:14 UTC', mono: false },
              { label: 'Model version', value: 'claude-3-5-sonnet-20241022', mono: true },
            ].map((m, i) => (
              <div
                key={m.label}
                className="flex items-center px-3 py-2"
                style={{ borderTop: i > 0 ? `1px solid ${C.border}` : undefined }}
              >
                <span style={{ color: C.text3, width: 108 }} className="shrink-0">{m.label}</span>
                {m.mono
                  ? <Mono>{m.value}</Mono>
                  : <span style={{ color: C.text2 }}>{m.value}</span>
                }
              </div>
            ))}
          </div>

          {/* Agent output */}
          <div>
            <div className="text-[12px] font-medium mb-2" style={{ color: C.text2 }}>Agent output</div>
            <div
              style={{ backgroundColor: C.surfaceSubtle, border: `1px solid ${C.border}`, color: C.text1 }}
              className="rounded p-3 text-[13px] leading-6"
            >
              <p style={{ color: C.text1 }}>
                The system must maintain an immutable audit log of every agent invocation. Each log entry must include: the caller identity (user ID, service account), the agent model and version, the exact prompt hash, and a UTC timestamp with millisecond precision.
              </p>
              <p className="mt-3" style={{ color: C.text1 }}>
                Log entries must be write-once and stored in a tamper-evident append-only store. Reads require the <Mono>audit:read</Mono> permission scope.
              </p>
            </div>
          </div>

          {/* Evidence chain */}
          <div>
            <div className="text-[12px] font-medium mb-2" style={{ color: C.text2 }}>Evidence chain</div>
            <div style={{ border: `1px solid ${C.border}` }} className="rounded overflow-hidden">
              {[
                { label: 'Prompt submitted', by: 'system', at: '09:14:02' },
                { label: 'Agent invoked', by: 'claude-3-5-sonnet', at: '09:14:03' },
                { label: 'Output generated', by: 'claude-3-5-sonnet', at: '09:14:11' },
                { label: 'Queued for review', by: 'system', at: '09:14:11' },
              ].map(e => (
                <div key={e.label} className="flex items-center justify-between px-3 py-2" style={{ borderColor: C.border }}>
                  <span className="text-[12px]" style={{ color: C.text1 }}>{e.label}</span>
                  <div className="flex items-center gap-3">
                    <Mono>{e.by}</Mono>
                    <Mono>{e.at}</Mono>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Decision footer — the only colored actions on screen */}
        <div
          style={{ borderTop: `1px solid ${C.border}`, backgroundColor: C.surface }}
          className="shrink-0 px-5 py-4 flex items-center gap-3"
        >
          <Btn variant="approve" onClick={onClose}>Approve</Btn>
          <Btn variant="reject" onClick={onClose}>Reject</Btn>
          <span className="flex-1" />
          <Btn variant="ghost" onClick={onClose}>Skip</Btn>
        </div>
      </div>
    </>
  )
}

// ─── Main specimen sheet ─────────────────────────────────────────────────────

export default function Specimen() {
  const [activeTab, setActiveTab] = useState('requirements')
  const [drawerOpen, setDrawerOpen] = useState(false)

  const tabs = [
    { key: 'requirements', label: 'Requirements', count: 12 },
    { key: 'user-stories', label: 'User Stories', count: 5 },
    { key: 'test-cases', label: 'Test Cases', count: 18 },
  ]

  return (
    <div style={{ backgroundColor: C.ground, color: C.text1, minHeight: '100vh' }} className="font-sans">
      <div style={{ maxWidth: 1280, margin: '0 auto', padding: '32px 40px 80px' }}>
        <div style={{ marginBottom: 20 }}>
          <Link
            to="/"
            style={{
              fontFamily: 'JetBrains Mono, monospace',
              fontSize: 10,
              color: C.text3,
              textDecoration: 'none',
              letterSpacing: '0.04em',
            }}
          >
            ← Index
          </Link>
        </div>

        {/* ── Page header ──────────────────────────────────────────────────── */}
        <div style={{ borderBottom: `1px solid ${C.border}` }} className="pb-6 mb-8">
          <div className="flex items-end justify-between">
            <div>
              <h1 className="text-[22px] font-semibold leading-7 tracking-[-0.01em]">TeamMate.AI</h1>
              <p className="text-[13px] mt-1" style={{ color: C.text2 }}>
                Design System — Specimen Sheet · v0.1 · Sept 2026
              </p>
            </div>
            <div className="text-right">
              <div className="text-[11px] mb-0.5" style={{ color: C.text3 }}>Interface face</div>
              <Mono>Inter 400 / 500 / 600</Mono>
              <div className="text-[11px] mt-1.5 mb-0.5" style={{ color: C.text3 }}>Identifier face</div>
              <Mono>JetBrains Mono 400 / 500</Mono>
            </div>
          </div>
        </div>

        {/* ── Foundation: Type scale + Palette + Spacing ───────────────────── */}
        <div className="grid gap-8 mb-10" style={{ gridTemplateColumns: '1fr 340px' }}>

          {/* Type scale */}
          <section>
            <SectionLabel>Type scale</SectionLabel>
            <Card>
              {/* Sans steps */}
              {[
                { step: 'display',    px: 22, w: 600, lh: 28, sample: 'AI output awaiting human approval' },
                { step: 'heading',    px: 15, w: 600, lh: 22, sample: 'Pending review queue — Sprint 23' },
                { step: 'subheading', px: 13, w: 600, lh: 18, sample: 'Requirements · 12 items · 3 pending' },
                { step: 'body',       px: 13, w: 400, lh: 20, sample: 'Audit log must capture all agent invocations with caller identity and a UTC timestamp' },
                { step: 'label',      px: 12, w: 500, lh: 16, sample: 'Last reviewed 2 hours ago by D. Marsh' },
                { step: 'caption',    px: 11, w: 400, lh: 16, sample: 'Auto-expired after 6 days without review' },
              ].map((s, i) => (
                <div
                  key={s.step}
                  className="flex items-center gap-4 px-4 py-3"
                  style={{ borderTop: i > 0 ? `1px solid ${C.border}` : undefined }}
                >
                  <span
                    style={{ fontFamily: 'JetBrains Mono, monospace', color: C.text3, width: 84, fontSize: 10, flexShrink: 0 }}
                  >
                    {s.step}
                  </span>
                  <span
                    className="flex-1 truncate"
                    style={{ fontSize: s.px, fontWeight: s.w, lineHeight: `${s.lh}px`, color: C.text1 }}
                  >
                    {s.sample}
                  </span>
                  <span
                    style={{ fontFamily: 'JetBrains Mono, monospace', color: C.text3, fontSize: 10, flexShrink: 0 }}
                  >
                    {s.px}/{s.lh} · {s.w}
                  </span>
                </div>
              ))}
              {/* Divider with label */}
              <div
                className="flex items-center gap-3 px-4"
                style={{ borderTop: `1px solid ${C.border}`, borderBottom: `1px solid ${C.border}`, padding: '6px 16px' }}
              >
                <span style={{ fontFamily: 'JetBrains Mono, monospace', color: C.text3, fontSize: 10 }}>
                  monospace — system identifiers only: issue keys, MR refs, file paths, hashes, symbol names
                </span>
              </div>
              {/* Mono steps */}
              {[
                { step: 'mono-body', px: 12, w: 400, lh: 18, sample: 'REQ-0041  !1042  src/auth/approval-gate.ts  a3f92bc' },
                { step: 'mono-sm',   px: 11, w: 400, lh: 16, sample: '#/delivery/build/run-0091  commit: 3f8a2d1e' },
              ].map((s, i) => (
                <div
                  key={s.step}
                  className="flex items-center gap-4 px-4 py-3"
                  style={{ borderTop: i > 0 ? `1px solid ${C.border}` : undefined }}
                >
                  <span
                    style={{ fontFamily: 'JetBrains Mono, monospace', color: C.text3, width: 84, fontSize: 10, flexShrink: 0 }}
                  >
                    {s.step}
                  </span>
                  <span
                    className="flex-1 truncate"
                    style={{ fontSize: s.px, fontWeight: s.w, lineHeight: `${s.lh}px`, fontFamily: 'JetBrains Mono, monospace', color: C.text2 }}
                  >
                    {s.sample}
                  </span>
                  <span
                    style={{ fontFamily: 'JetBrains Mono, monospace', color: C.text3, fontSize: 10, flexShrink: 0 }}
                  >
                    {s.px}/{s.lh} · mono
                  </span>
                </div>
              ))}
            </Card>
          </section>

          {/* Palette + Spacing stacked */}
          <div className="flex flex-col gap-6">

            {/* Palette */}
            <section>
              <SectionLabel>Palette</SectionLabel>
              <Card>
                {/* Ground */}
                <div className="px-3 pt-3 pb-2.5">
                  <div className="text-[10px] mb-2" style={{ color: C.text3 }}>Ground</div>
                  <div className="flex gap-2">
                    {[
                      { value: C.ground, label: 'ground', border: false },
                      { value: C.surface, label: 'surface', border: true },
                      { value: C.surfaceSubtle, label: 'wash', border: false },
                    ].map(sw => (
                      <div key={sw.label} className="flex-1">
                        <div
                          style={{ backgroundColor: sw.value, height: 28, border: sw.border ? `1px solid ${C.border}` : undefined }}
                          className="rounded-sm mb-1"
                        />
                        <div style={{ fontFamily: 'JetBrains Mono, monospace', color: C.text3, fontSize: 9.5 }}>{sw.label}</div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Text */}
                <div className="px-3 py-2.5" style={{ borderTop: `1px solid ${C.border}` }}>
                  <div className="text-[10px] mb-2" style={{ color: C.text3 }}>Text</div>
                  <div className="flex gap-2">
                    {[
                      { value: C.text1, label: 'text-1' },
                      { value: C.text2, label: 'text-2' },
                      { value: C.text3, label: 'text-3' },
                    ].map(sw => (
                      <div key={sw.label} className="flex-1">
                        <div style={{ backgroundColor: sw.value, height: 28 }} className="rounded-sm mb-1" />
                        <div style={{ fontFamily: 'JetBrains Mono, monospace', color: C.text3, fontSize: 9.5 }}>{sw.label}</div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Structure */}
                <div className="px-3 py-2.5" style={{ borderTop: `1px solid ${C.border}` }}>
                  <div className="text-[10px] mb-2" style={{ color: C.text3 }}>Structure</div>
                  <div className="flex gap-2">
                    {[
                      { value: C.border, label: 'border' },
                      { value: C.borderStrong, label: 'border-strong' },
                    ].map(sw => (
                      <div key={sw.label} className="flex-1">
                        <div style={{ backgroundColor: sw.value, height: 28 }} className="rounded-sm mb-1" />
                        <div style={{ fontFamily: 'JetBrains Mono, monospace', color: C.text3, fontSize: 9.5 }}>{sw.label}</div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Decision — highlighted */}
                <div className="px-3 py-2.5" style={{ borderTop: `1px solid ${C.border}`, backgroundColor: '#FFFDF7' }}>
                  <div className="flex items-center justify-between mb-2">
                    <div className="text-[10px]" style={{ color: C.text3 }}>Decision</div>
                    <div className="text-[9.5px] font-medium" style={{ color: '#92400E' }}>Reserved — approve / reject only</div>
                  </div>
                  <div className="flex gap-2">
                    {[
                      { value: C.approve, label: 'approve' },
                      { value: C.reject, label: 'reject' },
                    ].map(sw => (
                      <div key={sw.label} className="flex-1">
                        <div style={{ backgroundColor: sw.value, height: 28 }} className="rounded-sm mb-1" />
                        <div style={{ fontFamily: 'JetBrains Mono, monospace', color: C.text3, fontSize: 9.5 }}>{sw.label}</div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Semantic */}
                <div className="px-3 py-2.5 pb-3" style={{ borderTop: `1px solid ${C.border}` }}>
                  <div className="text-[10px] mb-2" style={{ color: C.text3 }}>Semantic</div>
                  <div className="flex gap-2">
                    {(Object.entries(SEMANTIC) as [Status, typeof SEMANTIC[Status]][]).map(([key, s]) => (
                      <div key={key} className="flex-1">
                        <div
                          style={{ backgroundColor: s.bg, boxShadow: `0 0 0 1px ${s.ring}`, height: 28 }}
                          className="rounded-sm mb-1 flex items-center justify-center"
                        >
                          <span style={{ color: s.text, fontSize: 10.5, fontWeight: 500 }}>{s.label}</span>
                        </div>
                        <div style={{ fontFamily: 'JetBrains Mono, monospace', color: C.text3, fontSize: 9.5 }}>{key}</div>
                      </div>
                    ))}
                  </div>
                </div>
              </Card>
            </section>

            {/* Spacing scale */}
            <section>
              <SectionLabel>Spacing scale — 4px base</SectionLabel>
              <Card className="px-4 py-3">
                <div className="flex flex-col gap-1.5">
                  {[
                    { token: '1',  px: 4  },
                    { token: '2',  px: 8  },
                    { token: '3',  px: 12 },
                    { token: '4',  px: 16 },
                    { token: '5',  px: 20 },
                    { token: '6',  px: 24 },
                    { token: '8',  px: 32 },
                    { token: '10', px: 40 },
                    { token: '12', px: 48 },
                    { token: '16', px: 64 },
                  ].map(({ token, px }) => (
                    <div key={token} className="flex items-center gap-3">
                      <span
                        style={{ fontFamily: 'JetBrains Mono, monospace', color: C.text3, fontSize: 10, width: 14, textAlign: 'right' }}
                      >
                        {token}
                      </span>
                      <div
                        style={{ width: px, height: 7, backgroundColor: C.borderStrong, flexShrink: 0 }}
                        className="rounded-sm"
                      />
                      <span style={{ fontFamily: 'JetBrains Mono, monospace', color: C.text3, fontSize: 10 }}>{px}px</span>
                    </div>
                  ))}
                </div>
              </Card>
            </section>
          </div>
        </div>

        {/* ── Primitives heading ────────────────────────────────────────────── */}
        <div style={{ borderTop: `1px solid ${C.border}` }} className="pt-8 mb-8">
          <h2 className="text-[15px] font-semibold">Primitives</h2>
        </div>

        {/* ── Buttons ──────────────────────────────────────────────────────── */}
        <section className="mb-8">
          <SectionLabel>Button</SectionLabel>
          <Card className="px-5 py-4">
            <div className="flex flex-wrap items-center gap-3">
              <Btn variant="default">Default</Btn>
              <Btn variant="primary">Primary</Btn>
              <Btn variant="ghost">Ghost</Btn>
              <Btn variant="default" disabled>Disabled</Btn>
              <div style={{ width: 1, height: 24, backgroundColor: C.border }} className="mx-1" />
              <div className="flex items-center gap-2">
                <span className="text-[11px] font-medium" style={{ color: C.text3 }}>Decision only →</span>
                <Btn variant="approve">Approve</Btn>
                <Btn variant="reject">Reject</Btn>
              </div>
              <div style={{ width: 1, height: 24, backgroundColor: C.border }} className="mx-1" />
              <Btn variant="default" size="sm">Default sm</Btn>
              <Btn variant="primary" size="sm">Primary sm</Btn>
              <Btn variant="approve" size="sm">Approve sm</Btn>
              <Btn variant="reject" size="sm">Reject sm</Btn>
            </div>
          </Card>
        </section>

        {/* ── Badges ───────────────────────────────────────────────────────── */}
        <section className="mb-8">
          <SectionLabel>Badge</SectionLabel>
          <Card className="px-5 py-4">
            <div className="flex flex-wrap items-center gap-3">
              <StatusBadge status="pass" />
              <StatusBadge status="fail" />
              <StatusBadge status="pending" />
              <StatusBadge status="stale" />
              <div style={{ width: 1, height: 20, backgroundColor: C.border }} className="mx-1" />
              <TypeBadge type="Requirement" />
              <TypeBadge type="User Story" />
              <TypeBadge type="Test Case" />
              <div style={{ width: 1, height: 20, backgroundColor: C.border }} className="mx-1" />
              {/* Generic labeled badge examples */}
              {[
                { label: 'Agent', bg: '#F0F9FF', text: '#0369A1', ring: '#BAE6FD' },
                { label: 'Human', bg: '#FDF4FF', text: '#7E22CE', ring: '#E9D5FF' },
                { label: 'Blocked', bg: '#FFF7ED', text: '#C2410C', ring: '#FED7AA' },
              ].map(b => (
                <span
                  key={b.label}
                  style={{ backgroundColor: b.bg, color: b.text, boxShadow: `0 0 0 1px ${b.ring}` }}
                  className="inline-flex items-center px-1.5 py-px rounded-sm text-[11px] font-medium leading-4"
                >
                  {b.label}
                </span>
              ))}
            </div>
          </Card>
        </section>

        {/* ── Cards ────────────────────────────────────────────────────────── */}
        <section className="mb-8">
          <SectionLabel>Card — border encodes status, not decoration</SectionLabel>
          <div className="grid grid-cols-3 gap-4">
            {/* Pending card */}
            <div style={{ backgroundColor: C.surface, border: `1px solid ${C.border}`, borderLeft: `3px solid #D97706` }} className="rounded">
              <div className="px-4 py-3">
                <div className="flex items-center justify-between mb-2">
                  <Mono>REQ-0041</Mono>
                  <StatusBadge status="pending" />
                </div>
                <p className="text-[13px] leading-5" style={{ color: C.text1 }}>
                  Audit log must capture all agent invocations with caller identity and timestamp
                </p>
                <div className="flex items-center gap-2 mt-3">
                  <Mono>claude-3-5-sonnet</Mono>
                </div>
              </div>
              <div
                className="flex items-center justify-between px-4 py-2.5"
                style={{ borderTop: `1px solid ${C.border}` }}
              >
                <span className="text-[11px]" style={{ color: C.text3 }}>Awaiting first review</span>
                <div className="flex gap-2">
                  <Btn variant="approve" size="sm">Approve</Btn>
                  <Btn variant="reject" size="sm">Reject</Btn>
                </div>
              </div>
            </div>

            {/* Pass card */}
            <div style={{ backgroundColor: C.surface, border: `1px solid ${C.border}`, borderLeft: `3px solid #15803D` }} className="rounded">
              <div className="px-4 py-3">
                <div className="flex items-center justify-between mb-2">
                  <Mono>REQ-0042</Mono>
                  <StatusBadge status="pass" />
                </div>
                <p className="text-[13px] leading-5" style={{ color: C.text1 }}>
                  Approval gate must block downstream writes until human sign-off is received
                </p>
                <div className="flex items-center gap-2 mt-3">
                  <Mono>claude-3-5-sonnet</Mono>
                </div>
              </div>
              <div
                className="flex items-center justify-between px-4 py-2.5"
                style={{ borderTop: `1px solid ${C.border}` }}
              >
                <span className="text-[11px]" style={{ color: C.text3 }}>D. Marsh · 2h ago</span>
                <span className="text-[11px]" style={{ color: C.text3 }}>Approved</span>
              </div>
            </div>

            {/* Fail card */}
            <div style={{ backgroundColor: C.surface, border: `1px solid ${C.border}`, borderLeft: `3px solid #B91C1C` }} className="rounded">
              <div className="px-4 py-3">
                <div className="flex items-center justify-between mb-2">
                  <Mono>US-0018</Mono>
                  <StatusBadge status="fail" />
                </div>
                <p className="text-[13px] leading-5" style={{ color: C.text1 }}>
                  As a scrum master I can view all pending approvals in a single queue sorted by age
                </p>
                <div className="flex items-center gap-2 mt-3">
                  <Mono>claude-3-5-sonnet</Mono>
                </div>
              </div>
              <div
                className="flex items-center justify-between px-4 py-2.5"
                style={{ borderTop: `1px solid ${C.border}` }}
              >
                <span className="text-[11px]" style={{ color: C.text3 }}>A. Okafor · 47m ago</span>
                <span className="text-[11px]" style={{ color: '#991B1B' }}>Rejected — see notes</span>
              </div>
            </div>
          </div>
        </section>

        {/* ── Tabs ─────────────────────────────────────────────────────────── */}
        <section className="mb-8">
          <SectionLabel>Tabs</SectionLabel>
          <Card>
            {/* Tab bar */}
            <div
              className="flex items-center px-4"
              style={{ borderBottom: `1px solid ${C.border}` }}
            >
              {tabs.map(tab => {
                const active = tab.key === activeTab
                return (
                  <button
                    key={tab.key}
                    onClick={() => setActiveTab(tab.key)}
                    style={{
                      color: active ? C.text1 : C.text3,
                      borderBottom: active ? `2px solid ${C.text1}` : '2px solid transparent',
                      marginBottom: -1,
                    }}
                    className="flex items-center gap-1.5 px-3 py-3 text-[13px] font-medium cursor-pointer transition-colors hover:text-[#111318]"
                  >
                    {tab.label}
                    <span
                      style={{
                        backgroundColor: active ? C.text1 : C.surfaceSubtle,
                        color: active ? '#FFFFFF' : C.text3,
                        fontSize: 10,
                        fontWeight: 500,
                        padding: '1px 5px',
                        borderRadius: 3,
                      }}
                    >
                      {tab.count}
                    </span>
                  </button>
                )
              })}
            </div>
            {/* Tab content placeholder */}
            <div className="px-4 py-3">
              <span className="text-[12px]" style={{ color: C.text3 }}>
                Showing {tabs.find(t => t.key === activeTab)?.label} — {tabs.find(t => t.key === activeTab)?.count} items
              </span>
            </div>
          </Card>
        </section>

        {/* ── Table ────────────────────────────────────────────────────────── */}
        <section className="mb-8">
          <div className="flex items-center justify-between mb-3">
            <SectionLabel>Table</SectionLabel>
            <button
              style={{ color: C.text2, fontSize: 12 }}
              className="hover:underline cursor-pointer"
              onClick={() => setDrawerOpen(true)}
            >
              Open Drawer →
            </button>
          </div>
          <Card className="overflow-hidden">
            <table className="w-full text-[13px]" style={{ borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ borderBottom: `1px solid ${C.border}`, backgroundColor: C.surfaceSubtle }}>
                  {['Key', 'Title', 'Type', 'Agent', 'Status', 'Reviewed', ''].map((h, i) => (
                    <th
                      key={i}
                      className="px-4 py-2 text-left text-[11px] font-semibold"
                      style={{ color: C.text3, whiteSpace: 'nowrap' }}
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {ROWS.map((row, i) => (
                  <tr
                    key={row.key}
                    style={{ borderTop: i > 0 ? `1px solid ${C.border}` : undefined }}
                    className="hover:bg-[#FAFBFC] cursor-pointer transition-colors"
                    onClick={() => setDrawerOpen(true)}
                  >
                    <td className="px-4 py-2 whitespace-nowrap">
                      <Mono>{row.key}</Mono>
                    </td>
                    <td className="px-4 py-2" style={{ maxWidth: 320 }}>
                      <span className="line-clamp-1 block" style={{ color: C.text1 }}>{row.title}</span>
                    </td>
                    <td className="px-4 py-2 whitespace-nowrap">
                      <TypeBadge type={row.type} />
                    </td>
                    <td className="px-4 py-2 whitespace-nowrap">
                      <Mono>{row.agent}</Mono>
                    </td>
                    <td className="px-4 py-2 whitespace-nowrap">
                      <StatusBadge status={row.status} />
                    </td>
                    <td className="px-4 py-2 whitespace-nowrap">
                      {row.reviewed
                        ? <span style={{ color: C.text3, fontSize: 12 }}>{row.reviewer} · {row.reviewed}</span>
                        : <span style={{ color: C.text3, fontSize: 12 }}>—</span>
                      }
                    </td>
                    <td className="px-4 py-2 whitespace-nowrap">
                      {row.status === 'pending' && (
                        <div className="flex items-center gap-1.5">
                          <Btn variant="approve" size="sm">Approve</Btn>
                          <Btn variant="reject" size="sm">Reject</Btn>
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Card>
        </section>

        {/* ── States ───────────────────────────────────────────────────────── */}
        <div style={{ borderTop: `1px solid ${C.border}` }} className="pt-8 mb-8">
          <h2 className="text-[15px] font-semibold">States</h2>
        </div>

        <div className="grid grid-cols-3 gap-4">

          {/* Empty state */}
          <section>
            <SectionLabel>Empty state</SectionLabel>
            <Card className="flex flex-col items-center justify-center py-12 px-6 text-center" style={{ minHeight: 220 }}>
              <div
                style={{ width: 32, height: 32, border: `1.5px solid ${C.border}`, borderRadius: 6 }}
                className="flex items-center justify-center mb-4"
              >
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                  <rect x="2" y="4" width="12" height="1.5" rx="0.75" fill={C.borderStrong} />
                  <rect x="2" y="7.25" width="9" height="1.5" rx="0.75" fill={C.border} />
                  <rect x="2" y="10.5" width="7" height="1.5" rx="0.75" fill={C.border} />
                </svg>
              </div>
              <p className="text-[13px] font-medium mb-1" style={{ color: C.text1 }}>No pending approvals</p>
              <p className="text-[12px]" style={{ color: C.text3 }}>
                The queue is clear. New agent outputs will appear here when they are ready for review.
              </p>
            </Card>
          </section>

          {/* Error state */}
          <section>
            <SectionLabel>Error state</SectionLabel>
            <Card style={{ minHeight: 220 }}>
              <div
                className="flex items-center gap-2.5 px-4 py-3"
                style={{ borderBottom: `1px solid ${C.border}`, backgroundColor: '#FFF5F5' }}
              >
                <div style={{ width: 6, height: 6, borderRadius: '50%', backgroundColor: '#B91C1C', flexShrink: 0 }} />
                <span className="text-[13px] font-medium" style={{ color: '#991B1B' }}>Agent invocation failed</span>
              </div>
              <div className="px-4 py-4">
                <p className="text-[13px] mb-3" style={{ color: C.text2 }}>
                  The agent could not generate output for <Mono>REQ-0045</Mono>. The run was aborted and no output was queued.
                </p>
                <div
                  style={{ backgroundColor: C.surfaceSubtle, border: `1px solid ${C.border}`, fontFamily: 'JetBrains Mono, monospace', fontSize: 11, color: C.text2, padding: '8px 12px', borderRadius: 4, lineHeight: 1.6 }}
                >
                  <div style={{ color: '#B91C1C' }}>Error: context_length_exceeded</div>
                  <div style={{ color: C.text3 }}>run: #/delivery/req/run-0045</div>
                  <div style={{ color: C.text3 }}>tokens: 128,412 / 128,000 max</div>
                </div>
                <div className="flex gap-2 mt-4">
                  <Btn variant="default">Retry with chunking</Btn>
                  <Btn variant="ghost">Dismiss</Btn>
                </div>
              </div>
            </Card>
          </section>

          {/* Skeleton loading */}
          <section>
            <SectionLabel>Skeleton — loading state</SectionLabel>
            <Card className="overflow-hidden" style={{ minHeight: 220 }}>
              {/* Fake table header */}
              <div
                style={{ backgroundColor: C.surfaceSubtle, borderBottom: `1px solid ${C.border}`, padding: '8px 16px' }}
                className="flex gap-4"
              >
                {[40, 120, 60, 80, 50].map((w, i) => (
                  <Skeleton key={i} width={w} h="h-2.5" />
                ))}
              </div>
              {/* Fake rows */}
              {[1, 2, 3, 4].map((_, i) => (
                <div
                  key={i}
                  className="flex items-center gap-4 px-4 py-3"
                  style={{ borderTop: i > 0 ? `1px solid ${C.border}` : undefined }}
                >
                  <Skeleton width={48} h="h-2.5" />
                  <div className="flex-1 flex flex-col gap-1.5">
                    <Skeleton h="h-2.5" />
                    <Skeleton width="60%" h="h-2" />
                  </div>
                  <Skeleton width={56} h="h-2.5" />
                  <Skeleton width={44} h="h-5" />
                </div>
              ))}
            </Card>
          </section>
        </div>

      </div>

      {/* ── Drawer ───────────────────────────────────────────────────────── */}
      <Drawer open={drawerOpen} onClose={() => setDrawerOpen(false)} />
    </div>
  )
}
