import type { AppState } from './types'

export const initialState: AppState = {
  currentUser: null,
  project: {
    key: 'FACTS',
    name: 'FACTS Audit Trail',
    activeSprint: 'Sprint 14',
    connectors: { github: 'ok', jira: 'ok', gitlab: 'ok' },
  },

  stories: [
    {
      key: 'FACT-127',
      title: 'Export filtered facts to CSV and PDF',
      stage: 'test',
      assignee: 'A. Okafor',
      stageMinutes: { requirements: 38, plan: 22, build: 84, test: 31 },
      artifacts: {
        diff: { mr: '!418', hunks: 48, additions: 312, deletions: 89 },
        plan: {
          id: 'PLN-23',
          contract: 'Dev agent · from story FACT-127 + 7 AC · skill v3 · context pack #c82d',
          revisions: [
            {
              rev: 2,
              at: 'Sept 14 · 09:22',
              correction: {
                by: 'D. Marsh',
                note: 'Use /api/facts/filter — it already has pagination. FilterAdapter.ts is not needed.',
              },
              changes: [
                'Step 1 updated: ExportService now binds to existing /api/facts/filter endpoint',
                'FilterAdapter.ts removed from plan (was a rev 1 artefact)',
              ],
            },
            { rev: 1, at: 'Sept 14 · 08:47', correction: null, changes: null },
          ],
          quality: [
            { label: 'AC coverage',     value: '7 / 7', detail: 'all criteria mapped', status: 'pass' },
            { label: 'Files addressed', value: '4 / 4', detail: 'complete',             status: 'pass' },
            { label: 'Confidence',      value: '87%',   detail: 'impact map',            status: 'pass' },
            { label: 'Drift flags',     value: '0',     detail: 'clean',                 status: 'pass' },
          ],
          steps: [
            {
              id: 'S1',
              file: 'src/features/facts/ExportService.ts',
              change: 'new',
              approach:
                'Implement ExportService class with an export(filter, columns) method. Uses buildCsvHeader and buildRow from csv-writer.ts. Binds to the existing /api/facts/filter endpoint for paginated data fetch — no new filter utility needed.',
            },
            {
              id: 'S2',
              file: 'src/utils/csv-writer.ts',
              change: 'modify',
              approach:
                'Add BOM prefix (0xEF 0xBB 0xBF) to the header write path for Excel compatibility. Extend buildRow to accept an optional column mask so it emits only the columns the user has visible.',
            },
            {
              id: 'S3',
              file: 'src/api/routes/export.ts',
              change: 'new',
              approach:
                'POST /api/export handler. Validates filter shape and column list from request body, delegates to ExportService, and streams the CSV response using chunked transfer encoding. Sets Content-Disposition for file download.',
            },
            {
              id: 'S4',
              file: 'src/features/facts/FactsTable.tsx',
              change: 'modify',
              approach:
                'Add an Export button to the existing toolbar. On click, it serialises the active filter and visible column list, calls POST /api/export, and surfaces a progress toast. Abort controller wired to the Close action on the toast.',
            },
          ],
        },
        impactMap: {
          confidence: 87,
          reuseProse:
            'src/utils/range.ts exports parseRange(), which the plan already leverages. The existing /api/facts/filter route handles pagination and column selection natively, removing the need for FilterAdapter.ts.',
          files: [
            { path: 'src/features/facts/ExportService.ts', change: 'new',    symbols: ['ExportService'] },
            { path: 'src/utils/csv-writer.ts',             change: 'modify', symbols: ['buildRow()', 'buildCsvHeader()'] },
            { path: 'src/api/routes/export.ts',            change: 'new',    symbols: ['exportHandler'] },
            { path: 'src/features/facts/FactsTable.tsx',   change: 'modify', symbols: ['FactsTable'] },
          ],
        },
        tests: {
          contextPackId: '#a41f',
          quality: [
            { label: 'Test pass rate',  value: '11 / 12',    detail: '92%',           status: 'pass'    },
            { label: 'Lint',            value: 'Clean',       detail: '0 issues',      status: 'pass'    },
            { label: 'Security scan',   value: '2 warnings',  detail: 'non-blocking',  status: 'pending' },
            { label: 'Coverage delta',  value: '+3.2%',       detail: 'src/export/**', status: 'pass'    },
          ],
          specs: [
            {
              file: 'tests/e2e/export-facts.cy.ts',
              framework: 'Cypress',
              defaultExpanded: true,
              cases: [
                { desc: 'exports all visible rows when no filter applied',      ac: 'AC-127-1', result: 'pass' },
                { desc: 'exports only filtered rows when filter is active',     ac: 'AC-127-2', result: 'pass' },
                { desc: 'respects column visibility settings in export output', ac: 'AC-127-3', result: 'pass' },
                { desc: 'shows error toast if export fails mid-stream',         ac: 'AC-127-4', result: 'fail' },
              ],
            },
            {
              file: 'tests/unit/export.spec.ts',
              framework: 'Jest',
              defaultExpanded: true,
              cases: [
                { desc: "formatRow() strips PII fields before serialization",     ac: 'AC-127-2', result: 'pass' },
                { desc: 'applyFilter() returns empty array for no-match filter',  ac: 'AC-127-1', result: 'pass' },
                { desc: 'buildCsvHeader() includes all visible column keys',      ac: 'AC-127-3', result: 'pass' },
              ],
            },
            {
              file: 'tests/e2e/export-pagination.cy.ts',
              framework: 'Cypress',
              defaultExpanded: false,
              cases: [
                { desc: 'paginates correctly when result set exceeds 1 000 rows', ac: 'AC-127-5', result: 'pass' },
                { desc: 'shows progress indicator during large export',            ac: 'AC-127-5', result: 'pass' },
                { desc: 'cancels export cleanly on user navigation away',          ac: 'AC-127-6', result: 'pass' },
                { desc: 'resumes partial export after network reconnect',          ac: 'AC-127-6', result: 'pass' },
                { desc: 'emits export.complete event on success',                  ac: 'AC-127-5', result: 'pass' },
              ],
            },
            {
              file: 'tests/unit/csv-writer.spec.ts',
              framework: 'Jest',
              defaultExpanded: false,
              cases: [
                { desc: 'escapes commas in cell values correctly',           ac: 'AC-127-3', result: 'pass' },
                { desc: 'handles null and undefined cell values gracefully', ac: 'AC-127-3', result: 'fail' },
                { desc: 'writes UTF-8 BOM for Excel compatibility',          ac: 'AC-127-7', result: 'pass' },
              ],
            },
          ],
        },
      },
    },

    {
      key: 'FACT-119',
      title: 'Bulk update validation for audit records',
      stage: 'build',
      assignee: 'A. Okafor',
      stageMinutes: { requirements: 52, plan: 31 },
      artifacts: {
        plan: {
          id: 'PLN-21',
          contract: 'Dev agent · from story FACT-119 + 5 AC · skill v3 · context pack #c82d',
          revisions: [{ rev: 1, at: 'Sept 13 · 14:15', correction: null, changes: null }],
          quality: [
            { label: 'AC coverage',     value: '5 / 5', detail: 'all criteria mapped', status: 'pass' },
            { label: 'Files addressed', value: '3 / 3', detail: 'complete',             status: 'pass' },
            { label: 'Confidence',      value: '91%',   detail: 'impact map',            status: 'pass' },
            { label: 'Drift flags',     value: '0',     detail: 'clean',                 status: 'pass' },
          ],
          steps: [
            { id: 'S1', file: 'src/api/routes/bulk-update.ts', change: 'new',    approach: 'POST /api/bulk-update handler with schema validation via zod. Rejects any record whose auditStatus is Closed.' },
            { id: 'S2', file: 'src/features/audit/BulkUpdateModal.tsx', change: 'new', approach: 'Modal component triggered from the audit table toolbar. Previews affected rows before submission.' },
            { id: 'S3', file: 'src/utils/validators.ts', change: 'modify', approach: 'Add validateBulkPayload() helper used by both the API route and the modal preview.' },
          ],
        },
        impactMap: {
          confidence: 91,
          reuseProse: 'src/utils/validators.ts already exports field-level validators used by the single-record edit flow. Extending validateBulkPayload() from these avoids duplicating schema logic.',
          files: [
            { path: 'src/api/routes/bulk-update.ts',          change: 'new',    symbols: ['bulkUpdateHandler'] },
            { path: 'src/features/audit/BulkUpdateModal.tsx', change: 'new',    symbols: ['BulkUpdateModal'] },
            { path: 'src/utils/validators.ts',                change: 'modify', symbols: ['validateBulkPayload()'] },
          ],
        },
        tests: null,
        diff: null,
      },
    },

    {
      key: 'FACT-133',
      title: 'Webhook retry backoff for failed deliveries',
      stage: 'build',
      assignee: 'L. Park',
      stageMinutes: { requirements: 29, plan: 18 },
      artifacts: {
        plan: {
          id: 'PLN-24',
          contract: 'Dev agent · from story FACT-133 + 4 AC · skill v3 · context pack #c82d',
          revisions: [{ rev: 1, at: 'Sept 14 · 07:30', correction: null, changes: null }],
          quality: [
            { label: 'AC coverage',     value: '4 / 4', detail: 'all criteria mapped', status: 'pass' },
            { label: 'Files addressed', value: '2 / 2', detail: 'complete',             status: 'pass' },
            { label: 'Confidence',      value: '93%',   detail: 'impact map',            status: 'pass' },
            { label: 'Drift flags',     value: '0',     detail: 'clean',                 status: 'pass' },
          ],
          steps: [
            { id: 'S1', file: 'src/services/webhook/RetryScheduler.ts', change: 'new',    approach: 'Implements exponential back-off with jitter: delays of 1 s, 4 s, 16 s, 64 s, then dead-letter after 5 attempts.' },
            { id: 'S2', file: 'src/services/webhook/WebhookDispatcher.ts', change: 'modify', approach: 'Wire RetryScheduler into the existing dispatcher. On non-2xx response, push to retry queue rather than dropping the event.' },
          ],
        },
        impactMap: {
          confidence: 93,
          reuseProse: 'src/utils/jitter.ts exports addJitter() already used by the rate-limiter service. RetryScheduler can import it directly.',
          files: [
            { path: 'src/services/webhook/RetryScheduler.ts',    change: 'new',    symbols: ['RetryScheduler'] },
            { path: 'src/services/webhook/WebhookDispatcher.ts', change: 'modify', symbols: ['WebhookDispatcher'] },
          ],
        },
        tests: null,
        diff: null,
      },
    },

    {
      key: 'FACT-128',
      title: 'CSV column ordering in export output',
      stage: 'plan',
      assignee: 'D. Marsh',
      submittedBy: 'Bill',
      stageMinutes: { requirements: 14 },
      artifacts: { plan: null, tests: null, impactMap: null, diff: null },
    },

    {
      key: 'FACT-121',
      title: 'Rate limit enforcement by organisation',
      stage: 'test',
      assignee: 'D. Marsh',
      stageMinutes: { requirements: 41, plan: 25, build: 67 },
      artifacts: {
        plan: null,
        impactMap: null,
        diff: { mr: '!401', hunks: 22, additions: 148, deletions: 31 },
        tests: {
          contextPackId: '#b88e',
          quality: [
            { label: 'Test pass rate', value: '8 / 9',  detail: '89%',            status: 'pass'    },
            { label: 'Lint',           value: 'Clean',   detail: '0 issues',       status: 'pass'    },
            { label: 'Security scan',  value: 'Pass',    detail: 'no issues',      status: 'pass'    },
            { label: 'Coverage delta', value: '+1.8%',  detail: 'src/rate-limit/**', status: 'pass'  },
          ],
          specs: [
            {
              file: 'tests/e2e/rate-limit.cy.ts',
              framework: 'Cypress',
              defaultExpanded: true,
              cases: [
                { desc: 'blocks requests after per-org limit is reached', ac: 'AC-121-1', result: 'pass' },
                { desc: 'resets counter at the start of each window',     ac: 'AC-121-2', result: 'pass' },
                { desc: 'returns 429 with Retry-After header',            ac: 'AC-121-3', result: 'fail' },
              ],
            },
          ],
        },
      },
    },

    // Earlier sprint story used for Flow comparison
    {
      key: 'FACT-114',
      title: 'Audit trail pagination controls',
      stage: 'done',
      assignee: 'A. Okafor',
      stageMinutes: { requirements: 45, plan: 35, build: 110, test: 42 },
      artifacts: { plan: null, tests: null, impactMap: null, diff: { mr: '!388', hunks: 34, additions: 204, deletions: 67 } },
    },
  ],

  gates: [
    // FACT-127 — dev gate (decided, cleared story to move to test)
    {
      id: 'G-01',
      storyKey: 'FACT-127',
      agent: 'dev',
      role: 'ba',
      status: 'decided',
      decision: 'approved',
      decider: 'D. Marsh',
      reason: null,
      openedAt: 'Sept 14 · 08:51',
      decidedAt: 'Sept 14 · 09:11',
    },
    // FACT-127 — qa gates (open, shown in QA queue)
    {
      id: 'G-02',
      storyKey: 'FACT-127',
      agent: 'qa',
      role: 'scrum_master',
      status: 'open',
      decision: null,
      decider: null,
      reason: null,
      openedAt: 'Sept 14 · 09:14',
      decidedAt: null,
    },
    // FACT-121 — qa gate (open, stale)
    {
      id: 'G-03',
      storyKey: 'FACT-121',
      agent: 'qa',
      role: 'ba',
      status: 'open',
      decision: null,
      decider: null,
      reason: null,
      openedAt: 'Sept 13 · 11:02',
      decidedAt: null,
    },
    // FACT-119 — dev gate (open, in dev queue)
    {
      id: 'G-04',
      storyKey: 'FACT-119',
      agent: 'dev',
      role: 'ba',
      status: 'open',
      decision: null,
      decider: null,
      reason: null,
      openedAt: 'Sept 13 · 14:20',
      decidedAt: null,
    },
    // FACT-133 — dev gate (open, in dev queue)
    {
      id: 'G-05',
      storyKey: 'FACT-133',
      agent: 'dev',
      role: 'ba',
      status: 'open',
      decision: null,
      decider: null,
      reason: null,
      openedAt: 'Sept 14 · 07:35',
      decidedAt: null,
    },
    // FACT-128 — dev gate (open, stale, in dev queue)
    {
      id: 'G-06',
      storyKey: 'FACT-128',
      agent: 'dev',
      role: 'ba',
      status: 'open',
      decision: null,
      decider: null,
      reason: null,
      openedAt: 'Sept 12 · 15:44',
      decidedAt: null,
    },
  ],

  runs: [
    // Dev run for FACT-127
    {
      id: 'RUN-dev-127',
      agent: 'dev',
      storyKey: 'FACT-127',
      status: 'done',
      tokensUsed: 10356,
      provenance: { model: 'claude-sonnet-5', skillVersion: 'v3', contextPackId: '#c82d' },
      startedAt: 'Sept 14 · 08:47',
      completedAt: 'Sept 14 · 09:09',
      steps: [
        { label: 'Loading context pack #c82d',    tokens: 1840, ts: '08:47:03', done: true },
        { label: 'Reading story FACT-127',         tokens: 892,  ts: '08:47:04', done: true },
        { label: 'Resolving acceptance criteria',  tokens: 1204, ts: '08:47:06', done: true },
        { label: 'Mapping impact — 4 files',       tokens: 2316, ts: '08:47:14', done: true },
        { label: 'Scoring reuse candidates',       tokens: 1104, ts: '08:47:18', done: true },
        { label: 'Generating implementation plan', tokens: 3201, ts: '08:47:28', done: true },
        { label: 'Linking traceability',           tokens: 312,  ts: '08:47:30', done: true },
      ],
      contextChunks: [
        { rank: 1, ref: 'FACT-127 requirements body',      score: 0.96, reason: 'Primary signal — story text for plan derivation', tokens: 892,  truncated: false },
        { rank: 2, ref: 'AC-127-1..7 (all criteria)',       score: 0.93, reason: 'Plan oracle — each step must cover an AC',       tokens: 832,  truncated: false },
        { rank: 3, ref: 'src/features/facts/** (index)',    score: 0.81, reason: 'Surface scan — existing exports and patterns',   tokens: 2801, truncated: false },
        { rank: 4, ref: 'src/utils/range.ts (full)',        score: 0.74, reason: 'Reuse candidate — parseRange identified',       tokens: 412,  truncated: false },
        { rank: 5, ref: 'src/api/routes/filter.ts L1–88',  score: 0.71, reason: 'Existing endpoint — avoids rewrite',            tokens: 1104, truncated: false },
        { rank: 6, ref: 'src/utils/csv-writer.ts (full)',   score: 0.68, reason: 'Utility to be extended in plan',               tokens: 892,  truncated: false },
        { rank: 7, ref: 'GitLab CI config · export jobs',  score: 0.31, reason: 'Would cover deployment constraints',            tokens: 1640, truncated: true  },
      ],
    },

    // QA run for FACT-127
    {
      id: 'RUN-qa-127',
      agent: 'qa',
      storyKey: 'FACT-127',
      status: 'done',
      tokensUsed: 14040,
      provenance: { model: 'claude-sonnet-5', skillVersion: 'v2', contextPackId: '#a41f' },
      startedAt: 'Sept 14 · 09:14',
      completedAt: 'Sept 14 · 09:14',
      steps: [
        { label: 'Loading context pack #a41f',    tokens: 2048, ts: '09:14:03', done: true },
        { label: 'Reading diff !418 (48 hunks)',   tokens: 4391, ts: '09:14:05', done: true },
        { label: 'Resolving acceptance criteria',  tokens: 1204, ts: '09:14:07', done: true },
        { label: 'Generating Cypress spec',        tokens: 3872, ts: '09:14:18', done: true },
        { label: 'Generating Jest spec',           tokens: 2109, ts: '09:14:24', done: true },
        { label: 'Linking traceability',           tokens: 416,  ts: '09:14:26', done: true },
        { label: 'Writing output…',                tokens: null,  ts: '09:14:26', done: false },
      ],
      contextChunks: [
        { rank: 1, ref: 'MR !418 diff (full)',         score: 0.97, reason: 'Primary signal — directly referenced in prompt', tokens: 4391, truncated: false },
        { rank: 2, ref: 'FACT-127 requirements body',  score: 0.94, reason: 'Story text used for AC derivation',              tokens: 1204, truncated: false },
        { rank: 3, ref: 'AC-127-1..7 (all criteria)',  score: 0.91, reason: 'Test oracle — maps output to expected behavior', tokens: 832,  truncated: false },
        { rank: 4, ref: 'export.service.ts L1–247',    score: 0.76, reason: 'Implementation surface under test',              tokens: 3201, truncated: false },
        { rank: 5, ref: 'csv-writer.ts L1–89',         score: 0.71, reason: 'Utility exercised by Cypress spec',              tokens: 892,  truncated: false },
        { rank: 6, ref: 'HistoryProvider.tsx L88–204', score: 0.48, reason: 'Pagination context — would cover AC-127-5/6',    tokens: 1640, truncated: true },
      ],
    },

    // Dev run for FACT-114 (previous sprint story, for Flow comparison)
    {
      id: 'RUN-dev-114',
      agent: 'dev',
      storyKey: 'FACT-114',
      status: 'done',
      tokensUsed: 18200,
      provenance: { model: 'claude-sonnet-5', skillVersion: 'v2', contextPackId: '#b22c' },
      startedAt: 'Sept 11 · 10:12',
      completedAt: 'Sept 11 · 11:02',
      steps: [
        { label: 'Loading context pack #b22c',    tokens: 2100, ts: '10:12:01', done: true },
        { label: 'Reading story FACT-114',         tokens: 1020, ts: '10:12:03', done: true },
        { label: 'Resolving acceptance criteria',  tokens: 1380, ts: '10:12:05', done: true },
        { label: 'Mapping impact — 6 files',       tokens: 3400, ts: '10:12:22', done: true },
        { label: 'Scoring reuse candidates',       tokens: 1800, ts: '10:12:31', done: true },
        { label: 'Generating implementation plan', tokens: 5200, ts: '10:12:55', done: true },
        { label: 'Linking traceability',           tokens: 480,  ts: '10:13:01', done: true },
      ],
      contextChunks: [],
    },

    // QA run for FACT-114
    {
      id: 'RUN-qa-114',
      agent: 'qa',
      storyKey: 'FACT-114',
      status: 'done',
      tokensUsed: 16400,
      provenance: { model: 'claude-sonnet-5', skillVersion: 'v1', contextPackId: '#b22c' },
      startedAt: 'Sept 12 · 08:30',
      completedAt: 'Sept 12 · 09:12',
      steps: [],
      contextChunks: [],
    },
  ],

  skillVersions: [
    {
      id: 'SV-01',
      agent: 'onboarding',
      version: 1,
      publishedAt: 'Sept 14 · 08:00',
      reviewers: [
        { role: 'Scrum Master',      name: 'D. Marsh',  initials: 'DM', signedOff: true,  signedAt: 'Sept 14 · 09:47', progress: 12 },
        { role: 'Business Analyst',  name: 'A. Okafor', initials: 'AO', signedOff: false, signedAt: null, progress: 10 },
        { role: 'Product Architect', name: 'L. Park',   initials: 'LP', signedOff: false, signedAt: null, progress: 11 },
      ],
      proposals: [],
      rules: [
        { id: 'R-01', text: 'Commit messages must follow the format FACTS-xxx: description where xxx is the Jira story key.', evidence: { type: 'file', value: '.github/COMMIT_CONVENTION.md' }, status: 'accepted', decidedBy: 'D. Marsh', note: null },
        { id: 'R-02', text: 'A story must have at least three acceptance criteria in Jira before any agent is invoked on it.', evidence: { type: 'jira', value: 'Jira workflow: Refinement → AC_SIGNED' }, status: 'accepted', decidedBy: 'D. Marsh', note: null },
        { id: 'R-03', text: 'Test coverage for src/** must remain at or above 80% on every merge to main.', evidence: { type: 'file', value: '.nycrc.json · branches: 80, functions: 80' }, status: 'accepted', decidedBy: 'A. Okafor', note: null },
        { id: 'R-04', text: 'Feature branches must be named feat/FACTS-xxx-short-slug, matching the originating story key.', evidence: { type: 'ci', value: '.github/branch-naming.yml · pattern: feat/{key}-*' }, status: 'accepted', decidedBy: 'D. Marsh', note: null },
        { id: 'R-05', text: 'All merge requests must pass the lint and format check before they can be merged to any protected branch.', evidence: { type: 'ci', value: '.github/workflows/ci.yml · job: lint · line 42' }, status: 'accepted', decidedBy: 'L. Park', note: null },
        { id: 'R-06', text: 'No commits may be pushed directly to the main branch under any circumstances.', evidence: { type: 'file', value: 'GitLab protected branches · main · Settings' }, status: 'rejected', decidedBy: 'L. Park', note: "This team uses trunk-based development with short-lived branches. Revise to: \"No commits without a merge request, even for hotfixes.\"" },
        { id: 'R-07', text: 'Every merge request description must reference the originating Jira story key in the first line.', evidence: { type: 'file', value: '.gitlab/merge_request_templates/Default.md' }, status: 'accepted', decidedBy: 'D. Marsh', note: null },
        { id: 'R-08', text: 'Agent-generated artefacts must be approved by a human reviewer before any write to Jira or GitLab occurs.', evidence: { type: 'file', value: 'teammate.config.yml · approval_gate: true · required: true' }, status: 'accepted', decidedBy: 'A. Okafor', note: null },
        { id: 'R-09', text: 'Dependency version updates must be proposed via Renovate and never edited manually in package.json.', evidence: { type: 'file', value: 'renovate.json · schedule: ["before 6am on monday"]' }, status: 'accepted', decidedBy: 'L. Park', note: null },
        { id: 'R-10', text: 'A security scan must pass before a story may be moved to the QA stage.', evidence: { type: 'ci', value: '.github/workflows/security.yml · job: snyk-scan' }, status: 'accepted', decidedBy: 'A. Okafor', note: null },
        { id: 'R-11', text: 'Secrets and credentials must be injected via environment variables. Values hardcoded in source will fail the pre-commit hook.', evidence: { type: 'file', value: '.env.example · .husky/pre-commit · detect-secrets baseline' }, status: 'pending', decidedBy: null, note: null },
        { id: 'R-12', text: 'A sprint story may only be closed after the QA agent has approved the test suite and a human reviewer has signed off on the approval.', evidence: { type: 'jira', value: 'Jira automation: QA_DONE → Closed · trigger: status_change' }, status: 'edited', decidedBy: 'A. Okafor', originalText: 'A sprint story may only be closed after QA sign-off.', note: "Original was too vague — does not distinguish agent approval from human sign-off. Edited to require both." },
      ],
    },

    {
      id: 'SV-02',
      agent: 'dev',
      version: 3,
      publishedAt: 'Sept 12 · 16:00',
      reviewers: [],
      rules: [],
      proposals: [
        { id: 'P-01', mr: '!47', title: 'Add prefer-hook-extraction as a dev convention', observation: 'In 4 of the last 5 stories the agent extracted shared state logic into custom hooks rather than keeping it inline, reducing average component size by 31 lines. Formalising this as a convention would make the pattern explicit to future agent runs.', evidenceCount: 4 },
        { id: 'P-02', mr: '!48', title: 'Promote src/utils/dateFormat to shared context pack', observation: 'The dateFormat utility was imported independently in 3 consecutive stories. Including it in the shared context pack would lower per-story token use and prevent the same helper from being re-described from scratch each time.', evidenceCount: 3 },
      ],
    },
  ],

  carryForward: [
    { text: 'Project skill v2 merged',             source: 'skill',   sourceType: 'skill'   },
    { text: 'New rule: reuse src/utils helpers',   source: 'rule',    sourceType: 'rule'    },
    { text: 'FACTS-123 API now in the impact map', source: 'context', sourceType: 'context' },
    { text: 'Jira Ready state adopted',            source: 'process', sourceType: 'process' },
  ],

  activity: [
    {
      id: 'ACT-001',
      timestamp: 'Sept 14 · 09:11',
      type: 'GATE_DECIDED',
      payload: { gateId: 'G-01', storyKey: 'FACT-127', agent: 'dev', decision: 'approved', decider: 'D. Marsh' },
    },
  ],
}
