import { useState } from 'react'
import { C } from '../tokens'
import { TopBar, ConnectorHealthBanner, AgentContract } from '../components/Shell'
import { AgentHeader } from '../components/AgentChatPage'

// ─── Improvement data (Sprint 1 baseline → Sprint 14 current) ────────────────

const SPRINT_SERIES = [
  { sprint: 'S1',  cycleTime: 11.2, throughput: 3,  gatePass: 51, tokenCost: 0 },
  { sprint: 'S2',  cycleTime: 10.8, throughput: 4,  gatePass: 55, tokenCost: 0 },
  { sprint: 'S3',  cycleTime: 10.1, throughput: 5,  gatePass: 60, tokenCost: 0 },
  { sprint: 'S4',  cycleTime: 9.6,  throughput: 5,  gatePass: 62, tokenCost: 0 },
  { sprint: 'S5',  cycleTime: 9.2,  throughput: 6,  gatePass: 65, tokenCost: 0 },
  { sprint: 'S6',  cycleTime: 8.7,  throughput: 7,  gatePass: 68, tokenCost: 0 },
  { sprint: 'S7',  cycleTime: 8.4,  throughput: 7,  gatePass: 70, tokenCost: 0 },
  { sprint: 'S8',  cycleTime: 8.1,  throughput: 8,  gatePass: 72, tokenCost: 0 },
  { sprint: 'S9',  cycleTime: 7.8,  throughput: 8,  gatePass: 74, tokenCost: 0 },
  { sprint: 'S10', cycleTime: 7.4,  throughput: 9,  gatePass: 77, tokenCost: 0 },
  { sprint: 'S11', cycleTime: 7.1,  throughput: 10, gatePass: 79, tokenCost: 0 },
  { sprint: 'S12', cycleTime: 6.9,  throughput: 10, gatePass: 81, tokenCost: 0 },
  { sprint: 'S13', cycleTime: 7.3,  throughput: 9,  gatePass: 79, tokenCost: 0 },
  { sprint: 'S14', cycleTime: 7.4,  throughput: 10, gatePass: 80, tokenCost: 0 },
]

const SLOWDOWNS = [
  {
    id: 'sl1',
    zone: 'Dev → QA handoff',
    severity: 'warn' as const,
    detail: 'Avg wait time jumped from 4.1 h to 7.8 h over the last 2 sprints. QA queue depth exceeds Dev output rate.',
    sprints: ['S13', 'S14'],
    action: 'Review QA agent throughput cap or re-balance story assignment.',
  },
  {
    id: 'sl2',
    zone: 'BA gate approval',
    severity: 'ok' as const,
    detail: 'Approval latency reduced to 1.3 h median, down from 5.2 h at onboarding. Gate pass rate steady at 80%.',
    sprints: ['S12', 'S13', 'S14'],
    action: null,
  },
  {
    id: 'sl3',
    zone: 'Plan iteration cycles',
    severity: 'ok' as const,
    detail: 'First-pass plan acceptance improved from 38% to 74% since skill v1 → v3 upgrade in Sprint 8.',
    sprints: ['S8', 'S14'],
    action: null,
  },
]

const IMPROVEMENTS = [
  { label: 'Cycle time', from: '11.2 d', to: '7.4 d', delta: '−34%', dir: 'up' as const },
  { label: 'Throughput', from: '3 stories/sprint', to: '10 stories/sprint', delta: '+233%', dir: 'up' as const },
  { label: 'Gate pass rate', from: '51%', to: '80%', delta: '+29 pp', dir: 'up' as const },
  { label: 'Plan 1st-pass acceptance', from: '38%', to: '74%', delta: '+36 pp', dir: 'up' as const },
  { label: 'BA gate latency', from: '5.2 h', to: '1.3 h', delta: '−75%', dir: 'up' as const },
  { label: 'Rework loops (rejected gates)', from: '2.8/sprint', to: '0.6/sprint', delta: '−79%', dir: 'up' as const },
]

// ─── Mini sparkline (SVG line chart, no dep) ─────────────────────────────────

function Sparkline({
  data, color = '#2563EB', width = 120, height = 36,
}: { data: number[]; color?: string; width?: number; height?: number }) {
  const min = Math.min(...data)
  const max = Math.max(...data)
  const range = max - min || 1
  const pts = data.map((v, i) => {
    const x = (i / (data.length - 1)) * width
    const y = height - ((v - min) / range) * (height - 6) - 3
    return `${x},${y}`
  })
  return (
    <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} fill="none" style={{ display: 'block' }}>
      <polyline points={pts.join(' ')} stroke={color} strokeWidth="1.5" strokeLinejoin="round" strokeLinecap="round" fill="none" />
      <circle cx={pts[pts.length - 1].split(',')[0]} cy={pts[pts.length - 1].split(',')[1]} r="2.5" fill={color} />
    </svg>
  )
}

// ─── Bar chart ────────────────────────────────────────────────────────────────

function BarChart({
  data, valueKey, color, width = 560, height = 100,
}: {
  data: typeof SPRINT_SERIES
  valueKey: 'cycleTime' | 'throughput' | 'gatePass'
  color: string
  width?: number
  height?: number
}) {
  const [hovered, setHovered] = useState<number | null>(null)
  const values = data.map(d => d[valueKey] as number)
  const max = Math.max(...values)
  const barW = Math.floor((width - (data.length - 1) * 3) / data.length)

  return (
    <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} style={{ display: 'block', overflow: 'visible' }}>
      {data.map((d, i) => {
        const val = d[valueKey] as number
        const barH = Math.max(3, (val / max) * (height - 20))
        const x = i * (barW + 3)
        const y = height - 20 - barH
        const isLast = i === data.length - 1
        const isHov = hovered === i
        return (
          <g key={d.sprint}
            onMouseEnter={() => setHovered(i)}
            onMouseLeave={() => setHovered(null)}
            style={{ cursor: 'default' }}
          >
            <rect
              x={x} y={y} width={barW} height={barH}
              rx={2} fill={color}
              opacity={isLast ? 1 : isHov ? 0.85 : 0.45}
            />
            <text
              x={x + barW / 2} y={height - 4}
              textAnchor="middle"
              fontSize={8.5} fill={C.text3}
              fontFamily="JetBrains Mono, monospace"
            >
              {d.sprint}
            </text>
            {isHov && (
              <g>
                <rect x={x - 2} y={y - 22} width={barW + 4} height={18} rx={3} fill={C.text1} />
                <text x={x + barW / 2} y={y - 10} textAnchor="middle" fontSize={9.5} fill="#FFF" fontWeight="600">
                  {val}{valueKey === 'gatePass' ? '%' : valueKey === 'cycleTime' ? 'd' : ''}
                </text>
              </g>
            )}
          </g>
        )
      })}
    </svg>
  )
}

// ─── Section heading ──────────────────────────────────────────────────────────

function SectionHead({ label, sub }: { label: string; sub?: string }) {
  return (
    <div style={{ marginBottom: 14 }}>
      <div style={{ fontSize: 12, fontWeight: 600, color: C.text1 }}>{label}</div>
      {sub && <div style={{ fontSize: 11, color: C.text3, marginTop: 2 }}>{sub}</div>}
    </div>
  )
}

// ─── Chart metric tab ─────────────────────────────────────────────────────────

type ChartTab = 'cycleTime' | 'throughput' | 'gatePass'

const CHART_TABS: { key: ChartTab; label: string; color: string; unit: string }[] = [
  { key: 'cycleTime',  label: 'Cycle time (days)', color: '#6D28D9', unit: 'd' },
  { key: 'throughput', label: 'Throughput (stories)', color: '#0891B2', unit: '' },
  { key: 'gatePass',   label: 'Gate pass rate', color: '#16A34A', unit: '%' },
]

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function AlwaysOnAgent() {
  const [chartTab, setChartTab] = useState<ChartTab>('cycleTime')
  const activeTab = CHART_TABS.find(t => t.key === chartTab)!

  const cycleData   = SPRINT_SERIES.map(d => d.cycleTime)
  const thruData    = SPRINT_SERIES.map(d => d.throughput)
  const gateData    = SPRINT_SERIES.map(d => d.gatePass)

  return (
    <div style={{ display: 'flex', height: '100vh', overflow: 'hidden', backgroundColor: C.ground, flexDirection: 'column' }}>
      <TopBar />
      <ConnectorHealthBanner />
      <AgentContract text="Always On Agent · passive monitoring · Sprint 1 → 14 · FACTS project" />

      <AgentHeader
        role="Always On Agent"
        sprint="Sprint 1 → 14 · FACTS"
        accent="#6EE7B7"
        accentDim="rgba(16,185,129,0.2)"
        stats={[
          { label: 'Cycle time', val: '7.4 d', highlight: true },
          { label: 'Throughput', val: '10 / sprint', highlight: true },
          { label: 'Gate pass rate', val: '80%' },
          { label: 'Rework loops', val: '0.6 / sprint' },
        ]}
      />

      <div style={{ flex: 1, overflowY: 'auto' }}>
        <div style={{ maxWidth: 860, margin: '0 auto', padding: '32px 28px 64px' }}>

          {/* Key improvement tiles */}
          <div style={{ marginBottom: 36 }}>
            <SectionHead label="Improvement since onboarding" sub="Sprint 1 baseline → Sprint 14 current" />
            <div style={{
              display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10,
            }}>
              {IMPROVEMENTS.map(imp => (
                <div key={imp.label} style={{
                  backgroundColor: C.surface, border: `1px solid ${C.border}`,
                  borderRadius: 6, padding: '12px 14px',
                }}>
                  <div style={{ fontSize: 10, color: C.text3, fontWeight: 500, marginBottom: 8 }}>{imp.label}</div>
                  <div style={{ display: 'flex', alignItems: 'flex-end', gap: 8, marginBottom: 6 }}>
                    <div>
                      <div style={{ fontSize: 9, color: C.text3, marginBottom: 1 }}>Was</div>
                      <div style={{ fontSize: 12, color: C.text2, fontFamily: 'JetBrains Mono, monospace' }}>{imp.from}</div>
                    </div>
                    <svg width="16" height="10" viewBox="0 0 16 10" fill="none" style={{ marginBottom: 3 }}>
                      <path d="M1 5h12M10 2l4 3-4 3" stroke={C.border} strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                    <div>
                      <div style={{ fontSize: 9, color: C.text3, marginBottom: 1 }}>Now</div>
                      <div style={{ fontSize: 12, fontWeight: 600, color: C.text1, fontFamily: 'JetBrains Mono, monospace' }}>{imp.to}</div>
                    </div>
                  </div>
                  <div style={{
                    fontSize: 11, fontWeight: 700,
                    color: imp.dir === 'up' ? '#16A34A' : '#DC2626',
                  }}>
                    {imp.delta}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Chart panel */}
          <div style={{ marginBottom: 36 }}>
            <SectionHead label="Sprint-over-sprint trend" sub="Select a metric to explore" />
            <div style={{
              backgroundColor: C.surface, border: `1px solid ${C.border}`,
              borderRadius: 6, overflow: 'hidden',
            }}>
              {/* Tab bar */}
              <div style={{ display: 'flex', borderBottom: `1px solid ${C.border}` }}>
                {CHART_TABS.map(t => {
                  const active = t.key === chartTab
                  return (
                    <button
                      key={t.key}
                      onClick={() => setChartTab(t.key)}
                      style={{
                        padding: '9px 16px', fontSize: 12, cursor: 'pointer',
                        fontWeight: active ? 500 : 400,
                        color: active ? C.text1 : C.text3,
                        borderBottom: active ? `2px solid ${t.color}` : '2px solid transparent',
                        marginBottom: -1, backgroundColor: 'transparent',
                        transition: 'color 100ms',
                      }}
                    >
                      {t.label}
                    </button>
                  )
                })}
              </div>
              {/* Chart body */}
              <div style={{ padding: '20px 20px 12px', overflowX: 'auto' }}>
                <BarChart
                  data={SPRINT_SERIES}
                  valueKey={chartTab}
                  color={activeTab.color}
                  width={760}
                  height={120}
                />
              </div>
              <div style={{ padding: '0 20px 14px', display: 'flex', gap: 24 }}>
                {[
                  { label: 'Sprint 1 (baseline)', val: SPRINT_SERIES[0][chartTab] + activeTab.unit },
                  { label: 'Sprint 14 (current)', val: SPRINT_SERIES[13][chartTab] + activeTab.unit },
                ].map(s => (
                  <div key={s.label}>
                    <div style={{ fontSize: 10, color: C.text3 }}>{s.label}</div>
                    <div style={{ fontSize: 14, fontWeight: 600, color: C.text1, fontFamily: 'JetBrains Mono, monospace' }}>{String(s.val)}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Sparkline row */}
          <div style={{ marginBottom: 36 }}>
            <SectionHead label="Quick-glance trends" />
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10 }}>
              {[
                { label: 'Cycle time', data: cycleData, color: '#6D28D9', good: 'down' as const, unit: 'd' },
                { label: 'Throughput', data: thruData,  color: '#0891B2', good: 'up'   as const, unit: '' },
                { label: 'Gate pass %', data: gateData, color: '#16A34A', good: 'up'   as const, unit: '%' },
              ].map(s => {
                const first = s.data[0]
                const last  = s.data[s.data.length - 1]
                const pct   = Math.round(((last - first) / first) * 100)
                const positive = (s.good === 'up' && pct >= 0) || (s.good === 'down' && pct <= 0)
                return (
                  <div key={s.label} style={{
                    backgroundColor: C.surface, border: `1px solid ${C.border}`,
                    borderRadius: 6, padding: '12px 14px',
                  }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                      <div style={{ fontSize: 11, color: C.text3 }}>{s.label}</div>
                      <span style={{
                        fontSize: 10, fontWeight: 600,
                        color: positive ? '#16A34A' : '#DC2626',
                      }}>
                        {pct >= 0 ? '+' : ''}{pct}%
                      </span>
                    </div>
                    <Sparkline data={s.data} color={s.color} width={160} height={36} />
                    <div style={{ marginTop: 6, fontSize: 12, fontWeight: 600, color: C.text1, fontFamily: 'JetBrains Mono, monospace' }}>
                      {last}{s.unit}
                    </div>
                  </div>
                )
              })}
            </div>
          </div>

          {/* Slowdown / health panel */}
          <div>
            <SectionHead label="Flow health zones" sub="Active monitoring of handoff and gate bottlenecks" />
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {SLOWDOWNS.map(s => {
                const isWarn = s.severity === 'warn'
                return (
                  <div key={s.id} style={{
                    backgroundColor: C.surface,
                    border: `1px solid ${isWarn ? '#FDE68A' : C.border}`,
                    borderLeft: `3px solid ${isWarn ? '#D97706' : '#16A34A'}`,
                    borderRadius: 6,
                    padding: '14px 16px',
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                      <div style={{
                        width: 7, height: 7, borderRadius: '50%', flexShrink: 0,
                        backgroundColor: isWarn ? '#D97706' : '#16A34A',
                      }} />
                      <span style={{ fontSize: 13, fontWeight: 600, color: C.text1 }}>{s.zone}</span>
                      <div style={{ marginLeft: 'auto', display: 'flex', gap: 4 }}>
                        {s.sprints.map(sp => (
                          <span key={sp} style={{
                            fontSize: 9.5, fontFamily: 'JetBrains Mono, monospace',
                            color: C.text3, backgroundColor: C.surfaceSubtle,
                            border: `1px solid ${C.border}`, padding: '1px 5px', borderRadius: 3,
                          }}>
                            {sp}
                          </span>
                        ))}
                      </div>
                    </div>
                    <p style={{ fontSize: 12, color: C.text2, margin: '0 0 8px', lineHeight: 1.6 }}>{s.detail}</p>
                    {s.action && (
                      <div style={{
                        fontSize: 11, color: '#92400E',
                        backgroundColor: '#FFFBEB', border: '1px solid #FDE68A',
                        borderRadius: 4, padding: '5px 9px',
                        display: 'flex', gap: 6, alignItems: 'flex-start',
                      }}>
                        <svg width="12" height="12" viewBox="0 0 12 12" fill="none" style={{ flexShrink: 0, marginTop: 1 }}>
                          <path d="M6 1.5L11 10.5H1L6 1.5Z" stroke="#D97706" strokeWidth="1.2" strokeLinejoin="round" />
                          <line x1="6" y1="4.5" x2="6" y2="7" stroke="#D97706" strokeWidth="1.2" strokeLinecap="round" />
                          <circle cx="6" cy="8.5" r="0.6" fill="#D97706" />
                        </svg>
                        <span><strong>Suggested action:</strong> {s.action}</span>
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          </div>

        </div>
      </div>
    </div>
  )
}
