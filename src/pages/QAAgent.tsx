import { useState, useMemo } from 'react'
import { C } from '../tokens'
import { Mono } from '../components/Shell'
import { useStore } from '../store'
import { useToast } from '../components/Toast'
import AgentChatPage, { AgentHeader, type ChatMsg, type QueueItem, type AgentAction, type FileDiff } from '../components/AgentChatPage'

// ─── Fixtures ─────────────────────────────────────────────────────────────────

type SpecRow = { file: string; type: 'unit' | 'e2e'; count: number; gaps?: string }

type GateEntry = {
  id: string
  storyKey: string
  title: string
  status: 'open' | 'decided' | 'stale'
  isAwaiting: boolean
  specs: SpecRow[]
  totalSpecs: number
  coverage: number
  gaps: number
}

const GATES: GateEntry[] = [
  {
    id: 'qa-g1', storyKey: 'FACTS-17',
    title: 'Export filtered facts to CSV and Parquet',
    status: 'open', isAwaiting: true,
    totalSpecs: 14, coverage: 87, gaps: 2,
    specs: [
      { file: 'ExportService.spec.ts',    type: 'unit', count: 5 },
      { file: 'CsvWriter.spec.ts',        type: 'unit', count: 3 },
      { file: 'ParquetWriter.spec.ts',    type: 'unit', count: 1, gaps: 'Mock only — real file system not exercised in unit context' },
      { file: 'ExportButton.spec.ts',     type: 'unit', count: 2 },
      { file: 'export-flow.cy.ts',        type: 'e2e',  count: 2 },
      { file: 'export-empty-state.cy.ts', type: 'e2e',  count: 1, gaps: 'Empty result state not reached — test dataset always has rows' },
    ],
  },
  {
    id: 'qa-g2', storyKey: 'FACTS-21',
    title: 'Token refresh resilience for long sessions',
    status: 'open', isAwaiting: true,
    totalSpecs: 9, coverage: 92, gaps: 1,
    specs: [
      { file: 'TokenService.spec.ts',   type: 'unit', count: 4 },
      { file: 'SessionManager.spec.ts', type: 'unit', count: 3 },
      { file: 'session-flow.cy.ts',     type: 'e2e',  count: 1 },
      { file: 'idle-timeout.cy.ts',     type: 'e2e',  count: 1, gaps: 'Clock manipulation not deterministic — flaky under CI load' },
    ],
  },
  {
    id: 'qa-g3', storyKey: 'FACTS-22',
    title: 'Audit log for bulk operations',
    status: 'decided', isAwaiting: false,
    totalSpecs: 7, coverage: 100, gaps: 0,
    specs: [
      { file: 'AuditLogger.spec.ts',       type: 'unit', count: 4 },
      { file: 'BulkTagService.spec.ts',    type: 'unit', count: 2 },
      { file: 'audit-entries.cy.ts',       type: 'e2e',  count: 1 },
    ],
  },
]

// ─── Seed messages ────────────────────────────────────────────────────────────

// ─── File diff fixtures ───────────────────────────────────────────────────────

const QA_DIFFS: Record<string, FileDiff[]> = {
  'qa-g1': [
    {
      file: 'src/__tests__/ExportService.spec.ts',
      additions: 22, deletions: 0,
      hunks: [{
        header: '@@ -0,0 +1,22 @@',
        lines: [
          { type: 'add', text: "import { ExportService } from '../services/ExportService';" },
          { type: 'add', text: "import { FilterAdapter } from '../services/FilterAdapter';" },
          { type: 'add', text: '' },
          { type: 'add', text: "jest.mock('../services/FilterAdapter');" },
          { type: 'add', text: '' },
          { type: 'add', text: "describe('ExportService', () => {" },
          { type: 'add', text: "  it('calls FilterAdapter with the provided filter state', async () => {" },
          { type: 'add', text: "    const svc = new ExportService();" },
          { type: 'add', text: "    await svc.export({ status: 'open' }, 'csv');" },
          { type: 'add', text: "    expect(FilterAdapter).toHaveBeenCalledWith({ status: 'open' });" },
          { type: 'add', text: "  });" },
          { type: 'add', text: "  it('returns CSV buffer when format is csv', async () => {" },
          { type: 'add', text: "    const result = await new ExportService().export({}, 'csv');" },
          { type: 'add', text: "    expect(result).toBeInstanceOf(Buffer);" },
          { type: 'add', text: "  });" },
          { type: 'add', text: "});" },
        ],
      }],
    },
    {
      file: 'src/__tests__/export-empty-state.cy.ts',
      additions: 18, deletions: 0,
      hunks: [{
        header: '@@ -0,0 +1,18 @@ (new file)',
        lines: [
          { type: 'add', text: "import { seedEmptyDataset } from '../support/helpers';" },
          { type: 'add', text: '' },
          { type: 'add', text: "describe('Export — empty result state', () => {" },
          { type: 'add', text: "  beforeEach(() => { seedEmptyDataset(); cy.visit('/dashboard'); });" },
          { type: 'add', text: '' },
          { type: 'add', text: "  it('disables export button with tooltip', () => {" },
          { type: 'add', text: "    cy.get('[data-testid=\"export-btn\"]').should('be.disabled').trigger('mouseover');" },
          { type: 'add', text: "    cy.get('[role=\"tooltip\"]').should('contain', 'No results to export');" },
          { type: 'add', text: "  });" },
          { type: 'add', text: "  it('does not initiate a download', () => {" },
          { type: 'add', text: "    cy.window().then(win => { cy.stub(win, 'fetch').as('fetch'); });" },
          { type: 'add', text: "    cy.get('[data-testid=\"export-btn\"]').click({ force: true });" },
          { type: 'add', text: "    cy.get('@fetch').should('not.have.been.called');" },
          { type: 'add', text: "  });" },
          { type: 'add', text: "});" },
        ],
      }],
    },
  ],
  'qa-g2': [
    {
      file: 'src/__tests__/idle-timeout.cy.ts',
      additions: 14, deletions: 7,
      hunks: [{
        header: '@@ -3,14 +3,14 @@',
        lines: [
          { type: 'del', text: "  cy.clock();" },
          { type: 'del', text: "  cy.tick(4 * 60 * 1000);" },
          { type: 'add', text: "  // Stub internal timer — avoids CI flakiness from cy.clock()" },
          { type: 'add', text: "  const stub = cy.stub(SessionManager.prototype, 'getExpiry');" },
          { type: 'add', text: "  stub.returns(Date.now() + 4 * 60 * 1000);" },
          { type: 'ctx', text: '' },
          { type: 'ctx', text: "  cy.get('[data-testid=\"trigger-activity\"]').click();" },
          { type: 'del', text: "  cy.get('[data-testid=\"session-banner\"]').should('exist');" },
          { type: 'add', text: "  cy.get('[data-testid=\"session-banner\"]')" },
          { type: 'add', text: "    .should('be.visible').and('contain', 'session expiring');" },
        ],
      }],
    },
  ],
  'qa-g3': [
    {
      file: 'src/__tests__/AuditLogger.spec.ts',
      additions: 20, deletions: 0,
      hunks: [{
        header: '@@ -0,0 +1,20 @@',
        lines: [
          { type: 'add', text: "import { AuditLogger } from '../audit/AuditLogger';" },
          { type: 'add', text: '' },
          { type: 'add', text: "describe('AuditLogger', () => {" },
          { type: 'add', text: "  let fetchSpy: jest.SpyInstance;" },
          { type: 'add', text: "  beforeEach(() => { fetchSpy = jest.spyOn(global, 'fetch').mockResolvedValue({ ok: true } as Response); });" },
          { type: 'add', text: "  afterEach(() => jest.restoreAllMocks());" },
          { type: 'add', text: '' },
          { type: 'add', text: "  it('posts to /api/audit/entries', async () => {" },
          { type: 'add', text: "    await new AuditLogger().log({ actor: 'Sachin', action: 'bulk_tag'," },
          { type: 'add', text: "      timestamp: '', filterState: {}, rowCount: 42 });" },
          { type: 'add', text: "    expect(fetchSpy).toHaveBeenCalledWith('/api/audit/entries', expect.objectContaining({ method: 'POST' }));" },
          { type: 'add', text: "  });" },
          { type: 'add', text: "});" },
        ],
      }],
    },
  ],
}

// ─── Seed messages ────────────────────────────────────────────────────────────

const SEED: Record<string, ChatMsg[]> = {
  'qa-g1': [
    {
      id: 'qs1', role: 'assistant', ts: '2:10 PM',
      content: "I've generated 14 specs for FACTS-17 — 9 Jest units and 5 Cypress E2E flows. Coverage sits at 87% of the acceptance criteria.\n\nTwo gaps worth flagging before you sign off:\n\n• AC-4 (Parquet format): The ParquetWriter spec is a mock-only unit test. I can't exercise the actual Parquet output in a unit context because the writer needs a real file system.\n\n• AC-7 (empty result set E2E): The Cypress spec doesn't reach the empty-state UI because the test dataset always has rows.",
    },
    { id: 'qs1-diff', role: 'system', ts: '2:10 PM', content: '', fileDiffs: QA_DIFFS['qa-g1'] },
    {
      id: 'qs2', role: 'user', ts: '2:14 PM',
      content: "AC-4 is acceptable for now — we'll do a manual verification in staging. For AC-7 can you add a Cypress spec that seeds an empty dataset?",
    },
    {
      id: 'qs3', role: 'assistant', ts: '2:14 PM',
      content: "On it. I've drafted `export-empty-state.cy.ts`: it seeds a filtered view with no matching rows, triggers the export button, and asserts two things — the button is disabled with the correct tooltip, and no file download is initiated.\n\nCoverage would jump to 94% with this spec added. Want me to add it to the suite and mark AC-7 as covered?",
    },
  ],
  'qa-g2': [
    {
      id: 'qs4', role: 'assistant', ts: '3:00 PM',
      content: "9 specs for FACTS-21. Coverage at 92% — the one gap is the idle-timeout Cypress spec, which is flaky under CI load due to clock manipulation.\n\nThe unit coverage on TokenService is solid — all 4 refresh scenarios are covered including the race condition on concurrent requests.",
    },
    { id: 'qs4-diff', role: 'system', ts: '3:00 PM', content: '', fileDiffs: QA_DIFFS['qa-g2'] },
    {
      id: 'qs5', role: 'user', ts: '3:03 PM',
      content: "How bad is the flaky spec? Can we determinize it?",
    },
    {
      id: 'qs6', role: 'assistant', ts: '3:03 PM',
      content: "It's a Cypress cy.clock() timing issue — the spec assumes clock ticks happen in a specific order, but CI runners don't always honor that under load. I've rewritten it to stub the SessionManager's internal timer directly — same coverage, CI stability goes from ~60% to ~99%.\n\nSwap is ready above.",
    },
  ],
  'qa-g3': [
    {
      id: 'qs7', role: 'assistant', ts: 'Yesterday',
      content: "FACTS-22 audit log specs: 7 specs, 100% AC coverage. This one was clean — the AuditLogger is well-isolated and the API contract was clear from the story. All specs passed on first run.",
    },
    { id: 'qs7-diff', role: 'system', ts: 'Yesterday', content: '', fileDiffs: QA_DIFFS['qa-g3'] },
  ],
}

// ─── VS Code snippets per gate ────────────────────────────────────────────────

const VSCODE_CODE: Record<string, { file: string; lines: string[] }> = {
  'qa-g1': {
    file: 'src/__tests__/export-empty-state.cy.ts',
    lines: [
      "import { seedEmptyDataset } from '../support/helpers';",
      "",
      "describe('Export — empty result state', () => {",
      "  beforeEach(() => {",
      "    seedEmptyDataset();",
      "    cy.visit('/dashboard');",
      "  });",
      "",
      "  it('disables export button with correct tooltip', () => {",
      "    cy.get('[data-testid=\"export-btn\"]')",
      "      .should('be.disabled')",
      "      .trigger('mouseover');",
      "",
      "    cy.get('[role=\"tooltip\"]')",
      "      .should('contain', 'No results to export');",
      "  });",
      "",
      "  it('does not initiate a file download', () => {",
      "    cy.window().then(win => {",
      "      cy.stub(win, 'fetch').as('fetchSpy');",
      "    });",
      "",
      "    cy.get('[data-testid=\"export-btn\"]').click({ force: true });",
      "    cy.get('@fetchSpy').should('not.have.been.called');",
      "  });",
      "});",
    ],
  },
  'qa-g2': {
    file: 'src/__tests__/idle-timeout.cy.ts',
    lines: [
      "import { SessionManager } from '../../src/auth/SessionManager';",
      "",
      "describe('Session — idle timeout behaviour', () => {",
      "  let sessionStub: sinon.SinonStub;",
      "",
      "  beforeEach(() => {",
      "    // Stub internal timer instead of manipulating system clock",
      "    sessionStub = cy.stub(SessionManager.prototype, 'getExpiry');",
      "    cy.visit('/dashboard');",
      "  });",
      "",
      "  it('shows session expiring banner when < 5 min remain', () => {",
      "    const fiveMinFromNow = Date.now() + 4 * 60 * 1000;",
      "    sessionStub.returns(fiveMinFromNow);",
      "",
      "    cy.get('[data-testid=\"trigger-activity\"]').click();",
      "    cy.get('[data-testid=\"session-banner\"]')",
      "      .should('be.visible')",
      "      .and('contain', 'session expiring');",
      "  });",
      "",
      "  it('does not show banner with plenty of time remaining', () => {",
      "    const oneHourFromNow = Date.now() + 60 * 60 * 1000;",
      "    sessionStub.returns(oneHourFromNow);",
      "",
      "    cy.get('[data-testid=\"trigger-activity\"]').click();",
      "    cy.get('[data-testid=\"session-banner\"]').should('not.exist');",
      "  });",
      "});",
    ],
  },
  'qa-g3': {
    file: 'src/__tests__/AuditLogger.spec.ts',
    lines: [
      "import { AuditLogger } from '../../src/audit/AuditLogger';",
      "",
      "describe('AuditLogger', () => {",
      "  let logger: AuditLogger;",
      "  let fetchSpy: jest.SpyInstance;",
      "",
      "  beforeEach(() => {",
      "    logger = new AuditLogger();",
      "    fetchSpy = jest.spyOn(global, 'fetch').mockResolvedValue({",
      "      ok: true,",
      "    } as Response);",
      "  });",
      "",
      "  afterEach(() => jest.restoreAllMocks());",
      "",
      "  it('posts to /api/audit/entries', async () => {",
      "    await logger.log({ actor: 'Sachin', action: 'bulk_tag',",
      "      timestamp: '', filterState: {}, rowCount: 42 });",
      "",
      "    expect(fetchSpy).toHaveBeenCalledWith(",
      "      '/api/audit/entries',",
      "      expect.objectContaining({ method: 'POST' })",
      "    );",
      "  });",
      "});",
    ],
  },
}

// ─── Syntax highlight (minimal) ───────────────────────────────────────────────

const KW_LIST = ['import', 'export', 'const', 'let', 'async', 'await', 'return', 'new', 'from', 'describe', 'it', 'beforeEach', 'afterEach', 'expect', 'type', 'interface']
const KW_RE = new RegExp(`\\b(${KW_LIST.join('|')})\\b`, 'g')

function kwHighlight(text: string, color: string, prefix: string): React.ReactNode[] {
  const out: React.ReactNode[] = []
  KW_RE.lastIndex = 0
  let last = 0; let k = 0; let m: RegExpExecArray | null
  while ((m = KW_RE.exec(text)) !== null) {
    if (m.index > last) out.push(<span key={`${prefix}-${k++}`}>{text.slice(last, m.index)}</span>)
    out.push(<span key={`${prefix}-${k++}`} style={{ color }}>{m[0]}</span>)
    last = m.index + m[0].length
  }
  if (last < text.length) out.push(<span key={`${prefix}-${k++}`}>{text.slice(last)}</span>)
  return out
}

function highlight(line: string) {
  const KW = '#569CD6'; const STR = '#CE9178'; const CMT = '#6A9955'
  if (line.trim().startsWith('//') || line.trim().startsWith('*')) return <span style={{ color: CMT }}>{line}</span>
  const strMatch = line.match(/('.*?'|".*?"|\`.*?\`)/)
  if (strMatch && strMatch.index !== undefined) {
    const before = line.slice(0, strMatch.index)
    const after = line.slice(strMatch.index + strMatch[0].length)
    return <>{kwHighlight(before, KW, 'a')}<span style={{ color: STR }}>{strMatch[0]}</span>{kwHighlight(after, KW, 'b')}</>
  }
  return <>{kwHighlight(line, KW, 'c')}</>
}

// ─── Take Over Panel (VS Code) ────────────────────────────────────────────────

function TakeOverPanel({
  gate, onClose, onSave,
}: {
  gate: GateEntry; onClose: () => void; onSave: (annotation: string) => void
}) {
  const code = VSCODE_CODE[gate.id] ?? VSCODE_CODE['qa-g1']
  const [saved, setSaved] = useState(false)
  const [editLine, setEditLine] = useState<number | null>(null)

  function handleSave() {
    setSaved(true)
    onSave(`Sachin manually edited ${code.file} — added assertion on line ${(editLine ?? 10) + 1} to close the coverage gap. Annotated by AI for next review cycle.`)
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', backgroundColor: '#1E1E1E', fontFamily: 'JetBrains Mono, monospace' }}>
      <div style={{ backgroundColor: '#323233', padding: '0 12px', height: 36, display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0, borderBottom: '1px solid #111' }}>
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

      <div style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>
        <div style={{ width: 40, backgroundColor: '#333', display: 'flex', flexDirection: 'column', alignItems: 'center', paddingTop: 8, gap: 18, flexShrink: 0 }}>
          {['⎇', '🔍', '⬡', '🐞'].map((icon, i) => (
            <div key={i} style={{ fontSize: 14, color: i === 0 ? '#FFF' : '#666', cursor: 'pointer' }}>{icon}</div>
          ))}
        </div>

        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
          <div style={{ backgroundColor: '#252526', borderBottom: '1px solid #111', display: 'flex', alignItems: 'center', flexShrink: 0 }}>
            <div style={{ padding: '6px 14px', fontSize: 11, color: '#CCC', backgroundColor: '#1E1E1E', borderRight: '1px solid #111', borderTop: '1px solid #007ACC', display: 'flex', alignItems: 'center', gap: 6 }}>
              <span style={{ color: '#4EC9B0', fontSize: 9 }}>TS</span>
              {code.file.split('/').pop()}
              {!saved && <span style={{ color: '#E6DB74', fontSize: 10, marginLeft: 4 }}>●</span>}
            </div>
          </div>
          <div style={{ backgroundColor: '#1E1E1E', padding: '3px 12px', borderBottom: '1px solid #111', flexShrink: 0 }}>
            <span style={{ fontSize: 10, color: '#858585' }}>{code.file}</span>
          </div>

          <div style={{ flex: 1, overflowY: 'auto', padding: '8px 0' }}>
            {code.lines.map((line, i) => (
              <div
                key={i}
                onClick={() => setEditLine(i)}
                style={{
                  display: 'flex', cursor: 'text',
                  backgroundColor: editLine === i ? 'rgba(255,255,255,0.04)' : 'transparent',
                  borderLeft: editLine === i ? '2px solid #007ACC' : '2px solid transparent',
                }}
              >
                <span style={{ width: 44, textAlign: 'right', paddingRight: 16, paddingLeft: 8, fontSize: 12, lineHeight: '20px', color: '#5A5A5A', flexShrink: 0, userSelect: 'none' }}>
                  {i + 1}
                </span>
                <span style={{ fontSize: 12, lineHeight: '20px', color: '#D4D4D4', whiteSpace: 'pre', flex: 1 }}>
                  {highlight(line)}
                </span>
              </div>
            ))}
          </div>

          <div style={{ backgroundColor: '#007ACC', padding: '2px 12px', display: 'flex', alignItems: 'center', gap: 16, flexShrink: 0 }}>
            {[{ v: '⎇ main' }, { v: '✗ 0  ⚠ 0' }, { v: 'TypeScript' }, { v: `Ln ${(editLine ?? 0) + 1}, Col 1` }].map((s, i) => (
              <span key={i} style={{ fontSize: 10, color: '#FFF', opacity: 0.85 }}>{s.v}</span>
            ))}
          </div>
        </div>
      </div>

      <div style={{ backgroundColor: '#252526', borderTop: '1px solid #111', padding: '10px 14px', flexShrink: 0, display: 'flex', alignItems: 'center', gap: 10 }}>
        {saved ? (
          <div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: 8, backgroundColor: '#0D1117', border: '1px solid #238636', borderRadius: 5, padding: '8px 12px' }}>
            <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
              <circle cx="6" cy="6" r="5" fill="#238636" />
              <path d="M3 6l2 2 4-4" stroke="#FFF" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            <span style={{ fontSize: 11, color: '#3FB950' }}>Saved · AI annotation logged for next review cycle</span>
          </div>
        ) : (
          <>
            <div style={{ flex: 1, fontSize: 11, color: '#858585' }}>
              {editLine !== null ? `Line ${editLine + 1} selected — save to annotate changes` : 'Click a line to select, then save to annotate'}
            </div>
            <button onClick={handleSave} style={{ padding: '7px 16px', borderRadius: 4, border: 'none', backgroundColor: '#0E639C', color: '#FFF', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>
              ⌘S Save & Annotate
            </button>
          </>
        )}
      </div>
    </div>
  )
}

// ─── Artifact card body ───────────────────────────────────────────────────────

function QaArtifact({ gate }: { gate: GateEntry }) {
  return (
    <div>
      <div style={{ display: 'flex', gap: 20, marginBottom: 14 }}>
        {[
          { label: 'Specs', value: String(gate.totalSpecs) },
          { label: 'AC Coverage', value: `${gate.coverage}%` },
          { label: 'Gaps', value: String(gate.gaps), warn: gate.gaps > 0 },
          { label: 'Jest', value: String(gate.specs.filter(s => s.type === 'unit').reduce((a, s) => a + s.count, 0)) },
          { label: 'Cypress', value: String(gate.specs.filter(s => s.type === 'e2e').reduce((a, s) => a + s.count, 0)) },
        ].map(m => (
          <div key={m.label}>
            <div style={{ fontSize: 9.5, fontWeight: 600, color: C.text3, textTransform: 'uppercase', letterSpacing: '0.06em' }}>{m.label}</div>
            <div style={{ fontSize: 16, fontWeight: 700, color: m.warn ? '#D97706' : C.text1, lineHeight: 1.2 }}>{m.value}</div>
          </div>
        ))}
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
        {gate.specs.map(spec => (
          <div key={spec.file} style={{
            display: 'flex', gap: 10, alignItems: 'flex-start',
            padding: '8px 10px',
            backgroundColor: spec.gaps ? '#FFFBEB' : C.surfaceSubtle,
            border: `1px solid ${spec.gaps ? '#FDE68A' : C.border}`,
            borderRadius: 5,
          }}>
            <span style={{
              flexShrink: 0, fontSize: 9, fontWeight: 700, textTransform: 'uppercase',
              color: spec.type === 'e2e' ? '#1D4ED8' : '#6D28D9',
              backgroundColor: spec.type === 'e2e' ? '#EFF6FF' : '#F5F3FF',
              border: `1px solid ${spec.type === 'e2e' ? '#BFDBFE' : '#DDD6FE'}`,
              padding: '1px 5px', borderRadius: 3, marginTop: 1,
            }}>
              {spec.type === 'e2e' ? 'E2E' : 'Unit'}
            </span>
            <div style={{ flex: 1, minWidth: 0 }}>
              <Mono size={10.5} color={C.text1}>{spec.file}</Mono>
              {spec.gaps && (
                <div style={{ fontSize: 10.5, color: '#D97706', marginTop: 3, fontStyle: 'italic' }}>⚠ {spec.gaps}</div>
              )}
            </div>
            <span style={{ flexShrink: 0, fontSize: 11, fontWeight: 600, color: C.text2 }}>{spec.count}</span>
          </div>
        ))}
      </div>
    </div>
  )
}

// ─── Root ─────────────────────────────────────────────────────────────────────

export default function QAAgent() {
  const { state, dispatch } = useStore()
  const { showToast } = useToast()
  const [selectedId, setSelectedId] = useState('qa-g1')
  const [decidedIds, setDecidedIds] = useState<Map<string, 'approved' | 'rejected'>>(new Map())
  const [takeOverOpen, setTakeOverOpen] = useState(false)
  const [takeOverMessages, setTakeOverMessages] = useState<ChatMsg[]>([])

  const currentUser = state.currentUser
  const isQa = currentUser?.role === 'qa'

  const selected = GATES.find(g => g.id === selectedId) ?? GATES[0]
  const decision = decidedIds.get(selectedId) ?? (selected.status === 'decided' ? 'approved' : undefined)

  const queue: QueueItem[] = GATES.map(g => ({
    id: g.id, storyKey: g.storyKey, title: g.title,
    status: decidedIds.has(g.id) ? 'decided' : g.status,
    isAwaiting: g.isAwaiting && isQa,
  }))

  function handleApprove() {
    setDecidedIds(prev => new Map([...prev, [selectedId, 'approved']]))
    const storeGate = state.gates.find(g => g.storyKey === selected.storyKey && g.agent === 'qa')
    if (storeGate) {
      dispatch({ type: 'DECIDE_GATE', gateId: storeGate.id, decision: 'approved', decider: currentUser?.name ?? 'QA' })
      dispatch({ type: 'ADVANCE_STORY_STAGE', storyKey: selected.storyKey })
    }
    showToast(`Approved · ${selected.storyKey} passed QA, moving to acceptance`, 'success')
  }

  function handleKickBack(note: string) {
    setDecidedIds(prev => new Map([...prev, [selectedId, 'rejected']]))
    const storeGate = state.gates.find(g => g.storyKey === selected.storyKey && g.agent === 'qa')
    if (storeGate) {
      dispatch({ type: 'DECIDE_GATE', gateId: storeGate.id, decision: 'rejected', decider: currentUser?.name ?? 'QA', reason: note })
      dispatch({ type: 'REGRESS_STORY_STAGE', storyKey: selected.storyKey })
    }
    showToast(`${selected.storyKey} returned to Dev — reason recorded`, 'error')
  }

  function handleSave(annotation: string) {
    const sysMsg: ChatMsg = {
      id: Math.random().toString(36).slice(2), role: 'system',
      content: `🔧 Take Over · ${currentUser?.name ?? 'QA'} made a manual edit`,
      ts: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    }
    const aiMsg: ChatMsg = {
      id: Math.random().toString(36).slice(2), role: 'assistant',
      content: `I've logged the manual change:\n\n**Annotation:** ${annotation}\n\nThis will appear in the traceability chain. The next reviewer will see this edit highlighted in context.`,
      ts: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    }
    setTakeOverMessages([sysMsg, aiMsg])
    showToast('Change annotated — logged for the next review cycle', 'success')
  }

  const actions: AgentAction[] = isQa && !decision ? [
    {
      label: takeOverOpen ? 'Close Editor' : 'Take Over',
      variant: 'secondary',
      onClick: () => setTakeOverOpen(o => !o),
    },
    {
      label: 'Approve test suite',
      variant: 'approve',
      onClick: handleApprove,
    },
  ] : []

  const baseMessages = useMemo(() => SEED[selectedId] ?? SEED['qa-g1'], [selectedId])
  const seedMessages = useMemo(() => [...baseMessages, ...takeOverMessages], [baseMessages, takeOverMessages])

  const sidePanel = takeOverOpen ? (
    <TakeOverPanel
      gate={selected}
      onClose={() => setTakeOverOpen(false)}
      onSave={handleSave}
    />
  ) : undefined

  return (
    <AgentChatPage
      agentLabel="QA Agent"
      agentContext="qa"
      queue={queue}
      selectedId={selectedId}
      onSelect={(id) => { setSelectedId(id); setTakeOverOpen(false) }}
      artifactTitle={`${selected.storyKey} · Test Suite`}
      artifactMeta={`${selected.totalSpecs} specs · ${selected.coverage}% AC coverage · ${selected.gaps} gap${selected.gaps !== 1 ? 's' : ''}`}
      artifactBody={<QaArtifact gate={selected} />}
      seedMessages={seedMessages}
      placeholder="Ask the QA agent to add specs, explain gaps, or check coverage…"
      actions={actions}
      kickBack={isQa && !decision ? {
        label: 'Return to Dev',
        toStage: 'build',
        storyKey: selected.storyKey,
        onConfirm: handleKickBack,
      } : undefined}
      sidePanel={sidePanel}
      header={<AgentHeader
        role="QA Agent"
        sprint="Sprint 15 · FACTS"
        accent="#93C5FD"
        accentDim="rgba(59,130,246,0.2)"
        stats={[
          { label: 'Test suites', val: String(GATES.length) },
          { label: 'Total specs', val: String(GATES.reduce((n, g) => n + g.totalSpecs, 0)) },
          { label: 'Avg coverage', val: `${Math.round(GATES.reduce((n, g) => n + g.coverage, 0) / GATES.length)}%`, highlight: true },
          { label: 'Open gaps', val: String(GATES.reduce((n, g) => n + g.gaps, 0)), warn: GATES.some(g => g.gaps > 0) },
        ]}
      />}
    />
  )
}
