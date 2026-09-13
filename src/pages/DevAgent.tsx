import { useState, useMemo } from 'react'
import { C } from '../tokens'
import { Mono } from '../components/Shell'
import { useStore } from '../store'
import { useToast } from '../components/Toast'
import AgentChatPage, { AgentHeader, type ChatMsg, type QueueItem, type AgentAction, type FileDiff } from '../components/AgentChatPage'

// ─── Fixtures ─────────────────────────────────────────────────────────────────

type PlanStep = {
  n: number
  file: string
  action: string
  risk: 'low' | 'med' | 'high'
  note?: string
}

type GateEntry = {
  id: string
  storyKey: string
  title: string
  status: 'open' | 'decided' | 'stale'
  isAwaiting: boolean
  steps: PlanStep[]
  stepCount: number
  fileCount: number
  estimatedDays: number
  qualityScore: number
}

const GATES: GateEntry[] = [
  {
    id: 'dev-g1', storyKey: 'FACTS-17',
    title: 'Export filtered facts to CSV and Parquet',
    status: 'open', isAwaiting: true,
    stepCount: 6, fileCount: 6, estimatedDays: 3, qualityScore: 88,
    steps: [
      { n: 1, file: 'src/api/facts/export.ts',           action: 'Add POST /api/facts/export endpoint accepting filter payload + format enum', risk: 'low' },
      { n: 2, file: 'src/services/ExportService.ts',     action: 'Extend FilterAdapter to read active filter state and pass it to the writer without touching the core serializer', risk: 'high', note: 'Load-bearing for 4 other features — narrow change only' },
      { n: 3, file: 'src/writers/CsvWriter.ts',          action: 'Extend FACTS-11 CSV writer to support column aliasing and filter projection', risk: 'med' },
      { n: 4, file: 'src/writers/ParquetWriter.ts',      action: 'New Parquet writer using existing pyarrow dependency — no new packages', risk: 'low' },
      { n: 5, file: 'src/jobs/ExportJob.ts',             action: 'Async job handler for exports > 50k rows — enqueue, notify on completion', risk: 'med' },
      { n: 6, file: 'src/ui/dashboard/ExportButton.tsx', action: 'Add export control to dashboard toolbar; disable with tooltip when result set is empty', risk: 'low' },
    ],
  },
  {
    id: 'dev-g2', storyKey: 'FACTS-21',
    title: 'Token refresh resilience for long sessions',
    status: 'open', isAwaiting: true,
    stepCount: 4, fileCount: 4, estimatedDays: 2, qualityScore: 79,
    steps: [
      { n: 1, file: 'src/auth/TokenService.ts',      action: 'Add silent refresh with 60s buffer before expiry', risk: 'high', note: 'Token refresh logic is load-bearing — review required before merge' },
      { n: 2, file: 'src/auth/SessionManager.ts',    action: 'Track session age; trigger refresh on activity if within buffer window', risk: 'med' },
      { n: 3, file: 'src/api/client.ts',             action: 'Intercept 401 responses; retry with refreshed token before surfacing error', risk: 'med' },
      { n: 4, file: 'src/ui/auth/SessionBanner.tsx', action: 'Show "session expiring soon" banner when within 5 min of expiry', risk: 'low' },
    ],
  },
  {
    id: 'dev-g3', storyKey: 'FACTS-22',
    title: 'Audit log for bulk operations',
    status: 'stale', isAwaiting: false,
    stepCount: 3, fileCount: 3, estimatedDays: 1, qualityScore: 91,
    steps: [
      { n: 1, file: 'src/audit/AuditLogger.ts',        action: 'Add structured log entry for bulk operations: actor, timestamp, filter state, row count', risk: 'low' },
      { n: 2, file: 'src/services/BulkTagService.ts',  action: 'Call AuditLogger after every successful bulk tag operation', risk: 'low' },
      { n: 3, file: 'src/api/audit/entries.ts',        action: 'Add GET /api/audit/entries endpoint with pagination and filter support', risk: 'low' },
    ],
  },
]

// ─── Seed messages ────────────────────────────────────────────────────────────

// ─── File diff fixtures ───────────────────────────────────────────────────────

const DEV_DIFFS: Record<string, FileDiff[]> = {
  'dev-g1': [
    {
      file: 'src/services/FilterAdapter.ts',
      additions: 28, deletions: 0,
      hunks: [{
        header: '@@ -0,0 +1,28 @@',
        lines: [
          { type: 'add', text: "import type { FilterState } from '../types/filters';" },
          { type: 'add', text: "import { FactsRepository } from './FactsRepository';" },
          { type: 'add', text: '' },
          { type: 'add', text: 'export class FilterAdapter {' },
          { type: 'add', text: '  constructor(private filters: FilterState) {}' },
          { type: 'add', text: '' },
          { type: 'add', text: '  async resolve(): Promise<Row[]> {' },
          { type: 'add', text: "    return FactsRepository.query(this.filters);" },
          { type: 'add', text: '  }' },
          { type: 'add', text: '}' },
        ],
      }],
    },
    {
      file: 'src/services/ExportService.ts',
      additions: 12, deletions: 4,
      hunks: [{
        header: '@@ -1,8 +1,16 @@',
        lines: [
          { type: 'del', text: "import { serialize } from './serializer';" },
          { type: 'add', text: "import { FilterAdapter } from './FilterAdapter';" },
          { type: 'add', text: "import { CsvWriter } from '../writers/CsvWriter';" },
          { type: 'add', text: "import { ParquetWriter } from '../writers/ParquetWriter';" },
          { type: 'ctx', text: '' },
          { type: 'ctx', text: 'export class ExportService {' },
          { type: 'del', text: '  async export(data: Row[], format: string) {' },
          { type: 'del', text: "    return serialize(data, format);" },
          { type: 'add', text: '  async export(filters: FilterState, format: string) {' },
          { type: 'add', text: '    const adapter = new FilterAdapter(filters);' },
          { type: 'add', text: '    const data = await adapter.resolve();' },
          { type: 'add', text: '    return format === "csv"' },
          { type: 'add', text: '      ? this.csvWriter.write(data)' },
          { type: 'add', text: '      : this.parquetWriter.write(data);' },
          { type: 'ctx', text: '  }' },
        ],
      }],
    },
  ],
  'dev-g2': [
    {
      file: 'src/auth/TokenService.ts',
      additions: 18, deletions: 3,
      hunks: [{
        header: '@@ -8,6 +8,21 @@',
        lines: [
          { type: 'ctx', text: '  getToken(): string | null {' },
          { type: 'ctx', text: "    return localStorage.getItem('access_token');" },
          { type: 'ctx', text: '  }' },
          { type: 'add', text: '' },
          { type: 'add', text: '  async silentRefresh(): Promise<boolean> {' },
          { type: 'add', text: '    const expiry = this.session.getExpiry();' },
          { type: 'add', text: '    if (!expiry) return false;' },
          { type: 'del', text: '    // TODO: add refresh logic' },
          { type: 'add', text: '    const secsRemaining = (expiry - Date.now()) / 1000;' },
          { type: 'add', text: '    if (secsRemaining > REFRESH_BUFFER_SECS) return false;' },
          { type: 'add', text: '    if (!this.session.isActive()) return false;' },
          { type: 'add', text: "    const refreshToken = localStorage.getItem('refresh_token');" },
          { type: 'add', text: "    if (!refreshToken) return false;" },
          { type: 'add', text: '    // ... fetch + store new token' },
          { type: 'add', text: '    return true;' },
          { type: 'add', text: '  }' },
        ],
      }],
    },
  ],
  'dev-g3': [
    {
      file: 'src/audit/AuditLogger.ts',
      additions: 14, deletions: 0,
      hunks: [{
        header: '@@ -0,0 +1,14 @@',
        lines: [
          { type: 'add', text: 'export interface AuditEntry {' },
          { type: 'add', text: '  actor: string;' },
          { type: 'add', text: '  action: string;' },
          { type: 'add', text: '  filterState: Record<string, unknown>;' },
          { type: 'add', text: '  rowCount: number;' },
          { type: 'add', text: '}' },
          { type: 'add', text: '' },
          { type: 'add', text: 'export class AuditLogger {' },
          { type: 'add', text: "  async log(entry: AuditEntry): Promise<void> {" },
          { type: 'add', text: "    await fetch('/api/audit/entries', { method: 'POST'," },
          { type: 'add', text: '      body: JSON.stringify({ ...entry, timestamp: new Date().toISOString() }) });' },
          { type: 'add', text: '  }' },
          { type: 'add', text: '}' },
        ],
      }],
    },
  ],
}

// ─── Seed messages ────────────────────────────────────────────────────────────

const SEED: Record<string, ChatMsg[]> = {
  'dev-g1': [
    { id: 'dv1', role: 'assistant', ts: '10:15 AM', content: "I've mapped the impact of FACTS-17 across the codebase. Six files need changes. The highest-risk touch point is ExportService.ts — it's used by 4 other features and modifying it carelessly could break the shared serialization path.\n\nHere's what I'm proposing: instead of changing ExportService directly, I'll add a thin FilterAdapter layer that reads the active filter state and passes it to the writers. That keeps the core serializer untouched and makes the change reversible." },
    { id: 'dv1-diff', role: 'system', ts: '10:15 AM', content: '', fileDiffs: DEV_DIFFS['dev-g1'] },
    { id: 'dv2', role: 'user', ts: '10:18 AM', content: "Good call on the adapter. What's the reuse situation from FACTS-11?" },
    { id: 'dv3', role: 'assistant', ts: '10:18 AM', content: "FACTS-11's CSV writer covers the happy path but doesn't handle column aliasing or filter projection. I've scoped step 3 as an extension rather than a replacement.\n\nPlan is ready for your review. If you want to dig into a specific file before approving, use **Take Over** to open it in your editor — any saves will be annotated for the QA reviewer." },
  ],
  'dev-g2': [
    { id: 'dv4', role: 'assistant', ts: '11:00 AM', content: "FACTS-21 touches the auth middleware. The token refresh logic in TokenService.ts is load-bearing for 3 other flows — session persistence, SSO handoff, and the mobile API client. I'd recommend a dedicated code review for step 1 before this merges." },
    { id: 'dv4-diff', role: 'system', ts: '11:00 AM', content: '', fileDiffs: DEV_DIFFS['dev-g2'] },
    { id: 'dv5', role: 'user', ts: '11:03 AM', content: "Agreed on the dedicated review. Can we scope the silent refresh to only fire on user activity, not on a timer?" },
    { id: 'dv6', role: 'assistant', ts: '11:04 AM', content: "Good constraint. Activity-triggered refresh is safer — it won't fire for idle sessions that happen to be within the buffer window. I've updated step 2 to track user activity events and trigger the refresh only when the user is actively using the app.\n\nPlan is updated — ready for approval." },
  ],
  'dev-g3': [
    { id: 'dv7', role: 'assistant', ts: '2 days ago', content: "FACTS-22 audit log plan is straightforward — 3 steps, 1 day estimated. All low risk. This has been waiting 48 hours because the API design decision wasn't resolved.\n\nDo you want to proceed with an internal-only endpoint for now, or wait for API governance to weigh in?" },
    { id: 'dv7-diff', role: 'system', ts: '2 days ago', content: '', fileDiffs: DEV_DIFFS['dev-g3'] },
  ],
}

// ─── VS Code snippets per gate ────────────────────────────────────────────────

const VSCODE_CODE: Record<string, { file: string; lang: string; lines: string[] }> = {
  'dev-g1': {
    file: 'src/services/ExportService.ts',
    lang: 'typescript',
    lines: [
      "import { FilterAdapter } from './FilterAdapter';",
      "import { CsvWriter } from '../writers/CsvWriter';",
      "import { ParquetWriter } from '../writers/ParquetWriter';",
      "import type { FilterState } from '../types/filters';",
      "",
      "export class ExportService {",
      "  private csvWriter = new CsvWriter();",
      "  private parquetWriter = new ParquetWriter();",
      "",
      "  async export(",
      "    filters: FilterState,",
      "    format: 'csv' | 'parquet'",
      "  ): Promise<Buffer> {",
      "    // FilterAdapter isolates the core serializer from filter logic",
      "    const adapter = new FilterAdapter(filters);",
      "    const data = await adapter.resolve();",
      "",
      "    if (format === 'csv') {",
      "      return this.csvWriter.write(data);",
      "    }",
      "    return this.parquetWriter.write(data);",
      "  }",
      "",
      "  async exportAsync(filters: FilterState, format: 'csv' | 'parquet'): Promise<string> {",
      "    // For datasets > 50k rows — enqueues a job and returns a job ID",
      "    const jobId = await this.enqueue({ filters, format });",
      "    return jobId;",
      "  }",
      "}",
    ],
  },
  'dev-g2': {
    file: 'src/auth/TokenService.ts',
    lang: 'typescript',
    lines: [
      "import { SessionManager } from './SessionManager';",
      "",
      "const REFRESH_BUFFER_SECS = 60;",
      "",
      "export class TokenService {",
      "  private session = new SessionManager();",
      "",
      "  getToken(): string | null {",
      "    return localStorage.getItem('access_token');",
      "  }",
      "",
      "  async silentRefresh(): Promise<boolean> {",
      "    const expiry = this.session.getExpiry();",
      "    if (!expiry) return false;",
      "",
      "    const secsRemaining = (expiry - Date.now()) / 1000;",
      "    if (secsRemaining > REFRESH_BUFFER_SECS) return false;",
      "",
      "    // Only refresh on active user sessions",
      "    if (!this.session.isActive()) return false;",
      "",
      "    const refreshToken = localStorage.getItem('refresh_token');",
      "    if (!refreshToken) return false;",
      "",
      "    const resp = await fetch('/api/auth/refresh', {",
      "      method: 'POST',",
      "      body: JSON.stringify({ refresh_token: refreshToken }),",
      "    });",
      "    if (!resp.ok) return false;",
      "",
      "    const { access_token } = await resp.json();",
      "    localStorage.setItem('access_token', access_token);",
      "    return true;",
      "  }",
      "}",
    ],
  },
  'dev-g3': {
    file: 'src/audit/AuditLogger.ts',
    lang: 'typescript',
    lines: [
      "export interface AuditEntry {",
      "  actor: string;",
      "  action: string;",
      "  timestamp: string;",
      "  filterState: Record<string, unknown>;",
      "  rowCount: number;",
      "}",
      "",
      "export class AuditLogger {",
      "  async log(entry: AuditEntry): Promise<void> {",
      "    await fetch('/api/audit/entries', {",
      "      method: 'POST',",
      "      headers: { 'Content-Type': 'application/json' },",
      "      body: JSON.stringify({",
      "        ...entry,",
      "        timestamp: new Date().toISOString(),",
      "      }),",
      "    });",
      "  }",
      "}",
    ],
  },
}

// ─── Syntax highlight (minimal, TypeScript-aware) ─────────────────────────────

const DEV_KW_LIST = ['import', 'export', 'class', 'const', 'let', 'async', 'await', 'return', 'if', 'new', 'from', 'type', 'interface', 'private']
const DEV_KW_RE = new RegExp(`\\b(${DEV_KW_LIST.join('|')})\\b`, 'g')

function devKwHighlight(text: string, color: string, prefix: string): React.ReactNode[] {
  const out: React.ReactNode[] = []
  DEV_KW_RE.lastIndex = 0
  let last = 0; let k = 0; let m: RegExpExecArray | null
  while ((m = DEV_KW_RE.exec(text)) !== null) {
    if (m.index > last) out.push(<span key={`${prefix}-${k++}`}>{text.slice(last, m.index)}</span>)
    out.push(<span key={`${prefix}-${k++}`} style={{ color }}>{m[0]}</span>)
    last = m.index + m[0].length
  }
  if (last < text.length) out.push(<span key={`${prefix}-${k++}`}>{text.slice(last)}</span>)
  return out
}

function highlight(line: string) {
  const KW = '#569CD6'; const STR = '#CE9178'; const CMT = '#6A9955'
  if (line.trim().startsWith('//') || line.trim().startsWith('*')) {
    return <span style={{ color: CMT }}>{line}</span>
  }
  const strMatch = line.match(/('.*?'|".*?"|\`.*?\`)/)
  if (strMatch && strMatch.index !== undefined) {
    const before = line.slice(0, strMatch.index)
    const after = line.slice(strMatch.index + strMatch[0].length)
    return <>{devKwHighlight(before, KW, 'a')}<span style={{ color: STR }}>{strMatch[0]}</span>{devKwHighlight(after, KW, 'b')}</>
  }
  return <>{devKwHighlight(line, KW, 'c')}</>
}

// ─── Take Over Panel (VS Code) ────────────────────────────────────────────────

function TakeOverPanel({
  gate,
  onClose,
  onSave,
}: {
  gate: GateEntry
  onClose: () => void
  onSave: (annotation: string) => void
}) {
  const code = VSCODE_CODE[gate.id] ?? VSCODE_CODE['dev-g1']
  const [saved, setSaved] = useState(false)
  const [editLine, setEditLine] = useState<number | null>(null)

  function handleSave() {
    setSaved(true)
    const note = `Manual edit in ${code.file} — Vikas adjusted the FilterAdapter boundary on line ${(editLine ?? 14) + 1}. Change narrows the adapter scope to avoid touching the serializer chain.`
    onSave(note)
  }

  return (
    <div style={{
      display: 'flex', flexDirection: 'column', height: '100%',
      backgroundColor: '#1E1E1E', fontFamily: 'JetBrains Mono, monospace',
    }}>
      {/* VS Code title bar */}
      <div style={{
        backgroundColor: '#323233', padding: '0 12px', height: 36,
        display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0,
        borderBottom: '1px solid #111',
      }}>
        {/* Window dots */}
        <div style={{ display: 'flex', gap: 5 }}>
          {['#FF5F57', '#FEBC2E', '#28C840'].map((c, i) => (
            <div key={i} style={{ width: 10, height: 10, borderRadius: '50%', backgroundColor: c }} />
          ))}
        </div>
        <div style={{ flex: 1, textAlign: 'center', fontSize: 11, color: '#CCC' }}>
          {code.file.split('/').pop()} — FACTS · TeamMate.AI
        </div>
        <button onClick={onClose} style={{ color: '#888', background: 'none', border: 'none', cursor: 'pointer', fontSize: 14 }}>✕</button>
      </div>

      {/* Activity bar + editor */}
      <div style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>
        {/* Slim activity bar */}
        <div style={{ width: 40, backgroundColor: '#333', display: 'flex', flexDirection: 'column', alignItems: 'center', paddingTop: 8, gap: 18, flexShrink: 0 }}>
          {['⎇', '🔍', '⬡', '🐞'].map((icon, i) => (
            <div key={i} style={{ fontSize: 14, color: i === 0 ? '#FFF' : '#666', cursor: 'pointer' }}>{icon}</div>
          ))}
        </div>

        {/* File tab + editor */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
          {/* Tab bar */}
          <div style={{
            backgroundColor: '#252526', borderBottom: '1px solid #111',
            display: 'flex', alignItems: 'center', flexShrink: 0,
          }}>
            <div style={{
              padding: '6px 14px', fontSize: 11, color: '#CCC',
              backgroundColor: '#1E1E1E', borderRight: '1px solid #111',
              borderTop: '1px solid #007ACC',
              display: 'flex', alignItems: 'center', gap: 6,
            }}>
              <span style={{ color: '#4EC9B0', fontSize: 9 }}>TS</span>
              {code.file.split('/').pop()}
              {!saved && <span style={{ color: '#E6DB74', fontSize: 10, marginLeft: 4 }}>●</span>}
            </div>
          </div>

          {/* Breadcrumb */}
          <div style={{ backgroundColor: '#1E1E1E', padding: '3px 12px', borderBottom: '1px solid #111', flexShrink: 0 }}>
            <span style={{ fontSize: 10, color: '#858585' }}>{code.file}</span>
          </div>

          {/* Code */}
          <div style={{ flex: 1, overflowY: 'auto', padding: '8px 0' }}>
            {code.lines.map((line, i) => (
              <div
                key={i}
                onClick={() => setEditLine(i)}
                style={{
                  display: 'flex', gap: 0, cursor: 'text',
                  backgroundColor: editLine === i ? 'rgba(255,255,255,0.04)' : 'transparent',
                  borderLeft: editLine === i ? '2px solid #007ACC' : '2px solid transparent',
                }}
                className="hover:bg-white/[0.02]"
              >
                <span style={{
                  width: 44, textAlign: 'right', paddingRight: 16, paddingLeft: 8,
                  fontSize: 12, lineHeight: '20px', color: '#5A5A5A', flexShrink: 0, userSelect: 'none',
                }}>
                  {i + 1}
                </span>
                <span style={{ fontSize: 12, lineHeight: '20px', color: '#D4D4D4', whiteSpace: 'pre', flex: 1 }}>
                  {highlight(line)}
                </span>
              </div>
            ))}
          </div>

          {/* Status bar */}
          <div style={{
            backgroundColor: '#007ACC', padding: '2px 12px',
            display: 'flex', alignItems: 'center', gap: 16, flexShrink: 0,
          }}>
            {[
              { v: '⎇ main' }, { v: '✗ 0  ⚠ 0' }, { v: 'TypeScript' },
              { v: `Ln ${(editLine ?? 0) + 1}, Col 1` },
            ].map((s, i) => (
              <span key={i} style={{ fontSize: 10, color: '#FFF', opacity: 0.85 }}>{s.v}</span>
            ))}
          </div>
        </div>
      </div>

      {/* Action bar */}
      <div style={{
        backgroundColor: '#252526', borderTop: '1px solid #111',
        padding: '10px 14px', flexShrink: 0,
        display: 'flex', alignItems: 'center', gap: 10,
      }}>
        {saved ? (
          <div style={{
            flex: 1, display: 'flex', alignItems: 'center', gap: 8,
            backgroundColor: '#0D1117', border: '1px solid #238636',
            borderRadius: 5, padding: '8px 12px',
          }}>
            <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
              <circle cx="6" cy="6" r="5" fill="#238636" />
              <path d="M3 6l2 2 4-4" stroke="#FFF" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            <span style={{ fontSize: 11, color: '#3FB950' }}>Saved · AI annotation logged for QA reviewer</span>
          </div>
        ) : (
          <>
            <div style={{ flex: 1, fontSize: 11, color: '#858585' }}>
              {editLine !== null
                ? `Line ${editLine + 1} selected — click Save to annotate your changes`
                : 'Click a line to select it, then save to annotate'}
            </div>
            <button
              onClick={handleSave}
              style={{
                padding: '7px 16px', borderRadius: 4, border: 'none',
                backgroundColor: '#0E639C', color: '#FFF',
                fontSize: 12, fontWeight: 600, cursor: 'pointer',
              }}
            >
              ⌘S Save & Annotate
            </button>
          </>
        )}
      </div>
    </div>
  )
}

// ─── Artifact card body ───────────────────────────────────────────────────────

const RISK_STYLE = {
  low:  { color: '#15803D', bg: '#F0FDF4', border: '#BBF7D0' },
  med:  { color: '#D97706', bg: '#FFFBEB', border: '#FDE68A' },
  high: { color: '#DC2626', bg: '#FFF5F5', border: '#FECACA' },
}

function PlanArtifact({ gate }: { gate: GateEntry }) {
  return (
    <div>
      <div style={{ display: 'flex', gap: 20, marginBottom: 14 }}>
        {[
          { label: 'Steps',    value: String(gate.stepCount) },
          { label: 'Files',    value: String(gate.fileCount) },
          { label: 'Estimate', value: `${gate.estimatedDays}d` },
          { label: 'Quality',  value: `${gate.qualityScore}/100` },
        ].map(m => (
          <div key={m.label}>
            <div style={{ fontSize: 9.5, fontWeight: 600, color: C.text3, textTransform: 'uppercase', letterSpacing: '0.06em' }}>{m.label}</div>
            <div style={{ fontSize: 16, fontWeight: 700, color: C.text1, lineHeight: 1.2 }}>{m.value}</div>
          </div>
        ))}
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
        {gate.steps.map(step => {
          const r = RISK_STYLE[step.risk]
          return (
            <div key={step.n} style={{ padding: '9px 11px', backgroundColor: C.surfaceSubtle, border: `1px solid ${C.border}`, borderRadius: 5 }}>
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8 }}>
                <span style={{ fontSize: 10, fontWeight: 700, color: C.text3, flexShrink: 0, marginTop: 1 }}>{step.n}</span>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <Mono size={10} color={C.text3}>{step.file}</Mono>
                  <div style={{ fontSize: 11.5, color: C.text1, lineHeight: 1.5, marginTop: 2 }}>{step.action}</div>
                  {step.note && <div style={{ fontSize: 10.5, color: '#D97706', marginTop: 4, fontStyle: 'italic' }}>⚠ {step.note}</div>}
                </div>
                <span style={{
                  flexShrink: 0, fontSize: 9, fontWeight: 700, textTransform: 'uppercase',
                  color: r.color, backgroundColor: r.bg, border: `1px solid ${r.border}`,
                  padding: '1px 5px', borderRadius: 3,
                }}>
                  {step.risk}
                </span>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

// ─── Root ─────────────────────────────────────────────────────────────────────

export default function DevAgent() {
  const { state, dispatch } = useStore()
  const { showToast } = useToast()
  const [selectedId, setSelectedId] = useState('dev-g1')
  const [decidedIds, setDecidedIds] = useState<Map<string, 'approved' | 'rejected'>>(new Map())
  const [takeOverOpen, setTakeOverOpen] = useState(false)
  const [takeOverMessages, setTakeOverMessages] = useState<ChatMsg[]>([])

  const currentUser = state.currentUser
  const isDev = currentUser?.role === 'dev'

  const selected = GATES.find(g => g.id === selectedId) ?? GATES[0]
  const decision = decidedIds.get(selectedId)

  const queue: QueueItem[] = GATES.map(g => ({
    id: g.id, storyKey: g.storyKey, title: g.title,
    status: decidedIds.has(g.id) ? 'decided' : g.status,
    isAwaiting: g.isAwaiting && isDev,
  }))

  function handleApprove() {
    setDecidedIds(prev => new Map([...prev, [selectedId, 'approved']]))
    const storeGate = state.gates.find(g => g.storyKey === selected.storyKey && g.agent === 'dev')
    if (storeGate) {
      dispatch({ type: 'DECIDE_GATE', gateId: storeGate.id, decision: 'approved', decider: currentUser?.name ?? 'Dev' })
    }
    showToast(`Approved · ${selected.storyKey} plan approved, moving to build`, 'success')
  }

  function handleKickBack(note: string) {
    setDecidedIds(prev => new Map([...prev, [selectedId, 'rejected']]))
    const storeGate = state.gates.find(g => g.storyKey === selected.storyKey && g.agent === 'dev')
    if (storeGate) {
      dispatch({ type: 'DECIDE_GATE', gateId: storeGate.id, decision: 'rejected', decider: currentUser?.name ?? 'Dev', reason: note })
      dispatch({ type: 'REGRESS_STORY_STAGE', storyKey: selected.storyKey })
    }
    showToast(`${selected.storyKey} returned to BA — reason recorded`, 'error')
  }

  function handleSave(annotation: string) {
    const sysMsg: ChatMsg = {
      id: Math.random().toString(36).slice(2), role: 'system',
      content: `🔧 Take Over · ${currentUser?.name ?? 'Dev'} made a manual edit`,
      ts: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    }
    const aiMsg: ChatMsg = {
      id: Math.random().toString(36).slice(2), role: 'assistant',
      content: `I've logged the manual change for the QA reviewer:\n\n**Annotation:** ${annotation}\n\nThis edit will appear in the traceability chain and QA will see it highlighted when they review the generated test specs.`,
      ts: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    }
    setTakeOverMessages([sysMsg, aiMsg])
    showToast('Change annotated — QA reviewer will see your edit', 'success')
  }

  const actions: AgentAction[] = isDev && !decision ? [
    {
      label: takeOverOpen ? 'Close Editor' : 'Take Over',
      variant: 'secondary',
      onClick: () => setTakeOverOpen(o => !o),
    },
    {
      label: 'Approve plan',
      variant: 'approve',
      onClick: handleApprove,
    },
  ] : []

  const baseMessages = useMemo(() => SEED[selectedId] ?? SEED['dev-g1'], [selectedId])
  const seedMessages = useMemo(
    () => [...baseMessages, ...takeOverMessages],
    [baseMessages, takeOverMessages]
  )

  const sidePanel = takeOverOpen ? (
    <TakeOverPanel
      gate={selected}
      onClose={() => setTakeOverOpen(false)}
      onSave={handleSave}
    />
  ) : undefined

  const approvedCount = [...decidedIds.values()].filter(v => v === 'approved').length
  const avgQuality = Math.round(GATES.reduce((n, g) => n + g.qualityScore, 0) / GATES.length)

  return (
    <AgentChatPage
      agentLabel="Dev Agent"
      agentContext="dev"
      queue={queue}
      selectedId={selectedId}
      onSelect={(id) => { setSelectedId(id); setTakeOverOpen(false) }}
      artifactTitle={`${selected.storyKey} · Implementation Plan`}
      artifactMeta={`${selected.stepCount} steps · ${selected.fileCount} files · ~${selected.estimatedDays} days · Quality ${selected.qualityScore}/100`}
      artifactBody={<PlanArtifact gate={selected} />}
      seedMessages={seedMessages}
      placeholder="Ask the Dev agent about the plan, risk, or request a revision…"
      actions={actions}
      kickBack={isDev && !decision ? {
        label: 'Return to BA',
        toStage: 'requirements',
        storyKey: selected.storyKey,
        onConfirm: handleKickBack,
      } : undefined}
      sidePanel={sidePanel}
      header={<AgentHeader
        role="Dev Agent"
        sprint="Sprint 15 · FACTS"
        accent="#6EE7B7"
        accentDim="rgba(16,185,129,0.2)"
        stats={[
          { label: 'Plans in queue', val: String(GATES.length) },
          { label: 'Awaiting review', val: String(GATES.filter(g => g.isAwaiting).length) },
          { label: 'Approved', val: String(approvedCount), highlight: approvedCount > 0 },
          { label: 'Avg quality', val: `${avgQuality}/100` },
        ]}
      />}
    />
  )
}
