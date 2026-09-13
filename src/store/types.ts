// ─── Auth ─────────────────────────────────────────────────────────────────────

export type UserRole =
  | 'ba'
  | 'dev'
  | 'qa'
  | 'scrum_master'
  | 'delivery_lead'

export type Permission =
  | 'ask.write'
  | 'story.review'
  | 'story.approve'
  | 'plan.review'
  | 'plan.iterate'
  | 'qa.review'
  | 'qa.approve'
  | 'skill.merge'
  | 'flow.view'
  | 'gates.all'
  | 'team.unblock'
  | 'admin'

export const ROLE_PERMISSIONS: Record<UserRole, Permission[]> = {
  ba:            ['ask.write', 'story.review', 'story.approve'],
  dev:           ['plan.review', 'plan.iterate'],
  qa:            ['qa.review', 'qa.approve'],
  scrum_master:  ['flow.view', 'gates.all', 'team.unblock'],
  delivery_lead: ['ask.write', 'story.review', 'story.approve', 'plan.review', 'plan.iterate', 'qa.review', 'qa.approve', 'skill.merge', 'flow.view', 'gates.all', 'team.unblock', 'admin'],
}

// Which agent pages each role can access (home is always accessible)
// Workers access only their own agent. Managers work from Home + Flow.
export type NavItem = 'home' | 'onboarding' | 'ba' | 'dev' | 'qa' | 'flow' | 'assign' | 'always-on' | 'setup'
export const ROLE_NAV: Record<UserRole, NavItem[]> = {
  ba:            ['home', 'ba'],
  dev:           ['home', 'dev'],
  qa:            ['home', 'qa'],
  scrum_master:  ['home', 'assign'],
  delivery_lead: ['home', 'always-on', 'setup'],
}

// Whether a user role can decide a gate assigned to a given reviewer role
// Workers decide only their own gate type. No cross-role decisions.
export function canDecideRole(userRole: UserRole, gateRole: ReviewerRole): boolean {
  return userRole === gateRole
}

export type UserSession = {
  name: string
  role: UserRole
  roleLabel: string
  initials: string
  permissions: Permission[]
}

// ─── Enums ────────────────────────────────────────────────────────────────────

export type AgentId      = 'onboarding' | 'ba' | 'dev' | 'qa' | 'flow'
export type AgentStatus  = 'idle' | 'running' | 'blocked'
export type StoryStage   = 'backlog' | 'requirements' | 'plan' | 'build' | 'test' | 'accept' | 'done'
export type GateDecision = 'approved' | 'rejected'
export type ReviewerRole = 'scrum_master' | 'ba'
export type RuleDecision = 'pending' | 'accepted' | 'rejected' | 'edited'
export type EvidenceType = 'file' | 'jira' | 'ci'
export type ItemStatus   = 'pass' | 'fail' | 'pending' | 'stale'

// ─── Project ──────────────────────────────────────────────────────────────────

export type Project = {
  key: string
  name: string
  activeSprint: string
  connectors: { github: 'ok' | 'error'; jira: 'ok' | 'error'; gitlab: 'ok' | 'error' }
}

// ─── Story artifacts ──────────────────────────────────────────────────────────

export type QualityItem = { label: string; value: string; detail: string; status: ItemStatus }
export type SpecCase    = { desc: string; ac: string; result: 'pass' | 'fail' }
export type SpecFile    = { file: string; framework: 'Cypress' | 'Jest'; cases: SpecCase[]; defaultExpanded: boolean }

export type TestsArtifact = {
  specs: SpecFile[]
  quality: QualityItem[]
  contextPackId: string
}

export type PlanRevision = {
  rev: number
  at: string
  correction: { by: string; note: string } | null
  changes: string[] | null
}

export type PlanArtifact = {
  id: string
  steps: PlanStep[]
  revisions: PlanRevision[]
  quality: QualityItem[]
  contract: string
}

export type PlanStep = {
  id: string
  file: string
  change: 'new' | 'modify' | 'del'
  approach: string
}

export type ImpactFile = {
  path: string
  change: 'new' | 'modify' | 'del'
  symbols: string[]
}

export type ImpactMapArtifact = {
  files: ImpactFile[]
  reuseProse: string
  confidence: number
}

export type DiffArtifact = {
  mr: string
  hunks: number
  additions: number
  deletions: number
}

export type StoryArtifacts = {
  plan:      PlanArtifact      | null
  tests:     TestsArtifact     | null
  impactMap: ImpactMapArtifact | null
  diff:      DiffArtifact      | null
}

export type Story = {
  key: string
  title: string
  stage: StoryStage
  assignee: string
  submittedBy?: string
  stageMinutes: Partial<Record<StoryStage, number>>
  artifacts: StoryArtifacts
}

// ─── Gates ────────────────────────────────────────────────────────────────────

export type Gate = {
  id: string
  storyKey: string
  agent: AgentId
  role: ReviewerRole
  status: 'open' | 'decided'
  decision: GateDecision | null
  decider: string | null
  reason: string | null
  openedAt: string
  decidedAt: string | null
}

// ─── Runs ─────────────────────────────────────────────────────────────────────

export type RunStep = {
  label: string
  tokens: number | null
  ts: string
  done: boolean
}

export type ContextChunk = {
  rank: number
  ref: string
  score: number
  reason: string
  tokens: number
  truncated: boolean
}

export type Run = {
  id: string
  agent: AgentId
  storyKey: string
  status: 'running' | 'done' | 'failed'
  steps: RunStep[]
  contextChunks: ContextChunk[]
  tokensUsed: number
  provenance: { model: string; skillVersion: string; contextPackId: string }
  startedAt: string
  completedAt: string | null
}

// ─── Skill versions ───────────────────────────────────────────────────────────

export type SkillRule = {
  id: string
  text: string
  evidence: { type: EvidenceType; value: string }
  status: RuleDecision
  decidedBy: string | null
  originalText?: string
  note: string | null
}

export type Reviewer = {
  role: string
  name: string
  initials: string
  signedOff: boolean
  signedAt: string | null
  progress: number
}

export type SkillProposal = {
  id: string
  mr: string
  title: string
  observation: string
  evidenceCount: number
}

export type SkillVersion = {
  id: string
  agent: AgentId
  version: number
  publishedAt: string
  rules: SkillRule[]
  reviewers: Reviewer[]
  proposals: SkillProposal[]
}

// ─── Carry forward ────────────────────────────────────────────────────────────

export type CarryItem = {
  text: string
  source: string
  sourceType: 'skill' | 'rule' | 'context' | 'process'
}

// ─── Activity log ─────────────────────────────────────────────────────────────

export type ActivityEntry = {
  id: string
  timestamp: string
  type:
    | 'GATE_DECIDED'
    | 'PLAN_STEP_EDITED'
    | 'RULE_DECIDED'
    | 'REVIEWER_SIGNED_OFF'
    | 'STORY_STAGE_ADVANCED'
    | 'STORY_STAGE_REGRESSED'
  payload: Record<string, unknown>
}

// ─── App state ────────────────────────────────────────────────────────────────

export type AppState = {
  currentUser: UserSession | null
  project: Project
  stories: Story[]
  gates: Gate[]
  runs: Run[]
  skillVersions: SkillVersion[]
  carryForward: CarryItem[]
  activity: ActivityEntry[]
}

// ─── Actions ──────────────────────────────────────────────────────────────────

export type AppAction =
  | { type: 'SIGN_IN'; user: UserSession }
  | { type: 'SIGN_OUT' }
  | { type: 'DECIDE_GATE';  gateId: string; decision: GateDecision; decider: string; reason?: string }
  | { type: 'EDIT_PLAN_STEP'; storyKey: string; stepId: string; newApproach: string; by: string }
  | { type: 'DECIDE_RULE';  skillId: string; ruleId: string; decision: RuleDecision; by: string; note?: string; editedText?: string }
  | { type: 'REVIEWER_SIGN_OFF'; skillId: string; reviewerName: string; signedAt: string }
  | { type: 'ADVANCE_STORY_STAGE'; storyKey: string }
  | { type: 'REGRESS_STORY_STAGE'; storyKey: string }
