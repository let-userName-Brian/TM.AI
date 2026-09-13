import { Navigate, Outlet } from 'react-router'
import { createBrowserRouter, redirect } from 'react-router'
import Specimen from './pages/Specimen'
import LoginPage from './pages/LoginPage'
import HomePage from './pages/HomePage'
import BAAgent from './pages/BAAgent'
import QAAgent from './pages/QAAgent'
import DevAgent from './pages/DevAgent'
import OnboardingPage from './pages/OnboardingPage'
import FlowPage from './pages/FlowPage'
import AlwaysOnAgent from './pages/AlwaysOnAgent'
import OnboardingSetup from './pages/OnboardingSetup'
import AssignPage from './pages/AssignPage'
import NotBuiltPage from './pages/NotBuiltPage'
import { TopBar } from './components/Shell'
import { C } from './tokens'
import { useStore } from './store'
import { ROLE_NAV } from './store/types'
import type { AgentId, UserRole } from './store/types'

const ROLE_HOME: Record<UserRole, string> = {
  ba:            '/p/FACTS/ba',
  dev:           '/p/FACTS/dev',
  qa:            '/p/FACTS/qa',
  scrum_master:  '/p/FACTS/assign',
  delivery_lead: '/p/FACTS/always-on',
}

// ─── Watermark + guided demo wrapper ─────────────────────────────────────────

function RootLayout() {
  return (
    <>
      <Outlet />
      <div
        style={{
          position: 'fixed', bottom: 14, left: 16, zIndex: 10,
          fontSize: 10, color: C.text3, opacity: 0.6,
          letterSpacing: '0.04em', pointerEvents: 'none', userSelect: 'none',
          fontFamily: 'JetBrains Mono, monospace',
        }}
      >
        Prototype · illustrative data
      </div>
    </>
  )
}

// ─── Auth gate: redirect to / if not signed in ────────────────────────────────

function RequireAuth({ children }: { children: React.ReactNode }) {
  const { state } = useStore()
  if (!state.currentUser) return <Navigate to="/" replace />
  return <>{children}</>
}

// ─── Shared agent label map ───────────────────────────────────────────────────

const AGENT_LABELS: Record<AgentId | 'always-on' | 'assign' | 'setup', string> = {
  onboarding: 'Onboarding', ba: 'BA', dev: 'Dev', qa: 'QA', flow: 'Flow',
  'always-on': 'Always On Agent', assign: 'Assign', setup: 'Setup',
}

// ─── Forbidden page — rendered inside the normal shell ────────────────────────

// Derives which role labels can access a given nav item
function rolesForPage(agentId: string): string[] {
  const labels: Record<UserRole, string> = {
    ba: 'Business Analyst', dev: 'Developer', qa: 'QA Engineer',
    scrum_master: 'Scrum Master', delivery_lead: 'Delivery Lead',
  }
  return (Object.entries(ROLE_NAV) as [UserRole, string[]][])
    .filter(([, nav]) => nav.includes(agentId))
    .map(([role]) => labels[role])
}

function ForbiddenPage({ agentId }: { agentId: string }) {
  const { state } = useStore()
  const who = rolesForPage(agentId)
  const agentLabel = AGENT_LABELS[agentId as AgentId] ?? agentId
  void state

  return (
    <div style={{ display: 'flex', height: '100vh', overflow: 'hidden', backgroundColor: C.ground }}>
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        <TopBar />
        <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ textAlign: 'center', maxWidth: 360, padding: '0 24px' }}>
            <div style={{
              width: 44, height: 44, borderRadius: 10,
              backgroundColor: '#FFF5F5',
              border: `1px solid #FECACA`,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              margin: '0 auto 18px',
            }}>
              <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                <rect x="3" y="8" width="14" height="10" rx="2" stroke="#DC2626" strokeWidth="1.3" />
                <path d="M7 8V6a3 3 0 0 1 6 0v2" stroke="#DC2626" strokeWidth="1.3" strokeLinecap="round" />
                <line x1="10" y1="11" x2="10" y2="14" stroke="#DC2626" strokeWidth="1.3" strokeLinecap="round" />
              </svg>
            </div>
            <div style={{ fontSize: 14, fontWeight: 600, color: C.text1, marginBottom: 8 }}>
              You don't have access to this
            </div>
            <div style={{ fontSize: 12, color: C.text2, lineHeight: 1.7, marginBottom: 16 }}>
              The <strong>{agentLabel} agent</strong> is only available to:
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, justifyContent: 'center', marginBottom: 20 }}>
              {who.map(label => (
                <span key={label} style={{
                  fontSize: 11, fontWeight: 500,
                  backgroundColor: C.surfaceSubtle, color: C.text2,
                  padding: '3px 9px', borderRadius: 4,
                  border: `1px solid ${C.border}`,
                }}>
                  {label}
                </span>
              ))}
            </div>
            <div style={{ fontSize: 11, color: C.text3 }}>
              Switch persona using the <span style={{
                fontFamily: 'JetBrains Mono, monospace',
                fontSize: 9, fontWeight: 600,
                color: '#6D28D9', backgroundColor: '#F5F3FF',
                border: '1px solid #DDD6FE',
                padding: '1px 4px', borderRadius: 3,
              }}>DEMO</span> switcher above.
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

// ─── Role access guard: wraps a page, shows ForbiddenPage if role can't access ─

function RequireRoleAccess({ agentId, children }: { agentId: string; children: React.ReactNode }) {
  const { state } = useStore()
  if (!state.currentUser) return <Navigate to="/" replace />
  const allowed = ROLE_NAV[state.currentUser.role] ?? []
  if (!allowed.includes(agentId as typeof allowed[number])) {
    return <ForbiddenPage agentId={agentId} />
  }
  return <>{children}</>
}

// ─── Root index: login if logged out, home if logged in ───────────────────────

function IndexRoute() {
  const { state } = useStore()
  if (state.currentUser) return <Navigate to={ROLE_HOME[state.currentUser.role]} replace />
  return <LoginPage />
}

// ─── Named route components (must be stable references — no inline arrows) ────

function HomeRoute()       { return <RequireAuth><HomePage /></RequireAuth> }
function BARoute()         { return <RequireRoleAccess agentId="ba"><BAAgent /></RequireRoleAccess> }
function QARoute()         { return <RequireRoleAccess agentId="qa"><QAAgent /></RequireRoleAccess> }
function DevRoute()        { return <RequireRoleAccess agentId="dev"><DevAgent /></RequireRoleAccess> }
function OnboardingRoute() { return <RequireRoleAccess agentId="onboarding"><OnboardingPage /></RequireRoleAccess> }
function FlowRoute()       { return <RequireRoleAccess agentId="flow"><FlowPage /></RequireRoleAccess> }
function AlwaysOnRoute()    { return <RequireRoleAccess agentId="always-on"><AlwaysOnAgent /></RequireRoleAccess> }
function SetupRoute()       { return <RequireRoleAccess agentId="setup"><OnboardingSetup /></RequireRoleAccess> }
function AssignRoute()      { return <RequireRoleAccess agentId="assign"><AssignPage /></RequireRoleAccess> }
function CatchAllRoute()   { return <RequireAuth><NotBuiltPage /></RequireAuth> }

// ─── Router ───────────────────────────────────────────────────────────────────

export const router = createBrowserRouter([
  {
    Component: RootLayout,
    children: [
      { path: '/',       Component: IndexRoute },
      { path: '/design', Component: Specimen },

      { path: '/p/:project/home',       Component: HomeRoute },
      { path: '/p/:project/ba',         Component: BARoute },
      { path: '/p/:project/qa',         Component: QARoute },
      { path: '/p/:project/dev',        Component: DevRoute },
      { path: '/p/:project/onboarding', Component: OnboardingRoute },
      { path: '/p/:project/assign',      Component: AssignRoute },
      { path: '/p/:project/flow',       Component: FlowRoute },
      { path: '/p/:project/always-on',  Component: AlwaysOnRoute },
      { path: '/p/:project/setup',      Component: SetupRoute },

      { path: '/p/:project', loader: ({ params }) => redirect(`/p/${params.project}/home`) },
      { path: '/p/:project/:agent',     Component: CatchAllRoute },
      { path: '/p', loader: () => redirect('/') },
      { path: '*', loader: () => redirect('/') },
    ],
  },
])
