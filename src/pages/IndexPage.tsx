import { Link } from 'react-router'
import { C } from '../tokens'

const SCREENS = [
  { label: 'Onboarding', path: '/p/FACTS/onboarding' },
  { label: 'BA agent',   path: '/p/FACTS/ba' },
  { label: 'Dev agent',  path: '/p/FACTS/dev' },
  { label: 'QA agent',   path: '/p/FACTS/qa' },
  { label: 'Flow',       path: '/p/FACTS/flow' },
]

export default function IndexPage() {
  return (
    <div
      style={{
        minHeight: '100vh',
        backgroundColor: C.ground,
        display: 'flex',
        alignItems: 'flex-start',
        justifyContent: 'center',
        padding: '80px 24px 48px',
      }}
    >
      <div style={{ width: '100%', maxWidth: 600 }}>

        {/* Product identity */}
        <div style={{ marginBottom: 32 }}>
          <div
            style={{
              fontFamily: 'JetBrains Mono, monospace',
              fontSize: 11,
              color: C.text3,
              letterSpacing: '0.06em',
              marginBottom: 10,
              textTransform: 'uppercase',
            }}
          >
            TeamMate.AI · v0.1 · Prototype
          </div>
          <h1
            style={{
              fontSize: 20,
              fontWeight: 600,
              color: C.text1,
              margin: '0 0 10px',
              lineHeight: 1.3,
              letterSpacing: '-0.01em',
            }}
          >
            TeamMate.AI
          </h1>
          <p style={{ fontSize: 13, color: C.text2, lineHeight: 1.6, margin: 0, maxWidth: 520 }}>
            A workbench where software teams run AI agents across a delivery workflow and
            approve what the agents produce before any of it reaches Jira or GitLab.
          </p>
        </div>

        {/* Divider */}
        <div style={{ height: 1, backgroundColor: C.border, marginBottom: 28 }} />

        {/* Two primary destinations */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 28 }}>
          <a
            href="/p/FACTS/onboarding"
            style={{
              display: 'block',
              padding: '16px 18px',
              backgroundColor: C.surface,
              border: `1px solid ${C.border}`,
              borderRadius: 6,
              textDecoration: 'none',
              transition: 'box-shadow 120ms',
            }}
            onMouseEnter={e => (e.currentTarget.style.boxShadow = `0 0 0 1.5px ${C.borderStrong}`)}
            onMouseLeave={e => (e.currentTarget.style.boxShadow = 'none')}
          >
            <div style={{ fontSize: 12, fontWeight: 600, color: C.text1, marginBottom: 4 }}>
              Open the prototype →
            </div>
            <div style={{ fontSize: 11, color: C.text3, lineHeight: 1.5 }}>
              The working interface, running on illustrative data
            </div>
          </a>

          <Link
            to="/design"
            style={{
              display: 'block',
              padding: '16px 18px',
              backgroundColor: C.surface,
              border: `1px solid ${C.border}`,
              borderRadius: 6,
              textDecoration: 'none',
              transition: 'box-shadow 120ms',
            }}
            onMouseEnter={e => (e.currentTarget.style.boxShadow = `0 0 0 1.5px ${C.borderStrong}`)}
            onMouseLeave={e => (e.currentTarget.style.boxShadow = 'none')}
          >
            <div style={{ fontSize: 12, fontWeight: 600, color: C.text1, marginBottom: 4 }}>
              View the design system →
            </div>
            <div style={{ fontSize: 11, color: C.text3, lineHeight: 1.5 }}>
              Tokens, type scale and component specimens
            </div>
          </Link>
        </div>

        {/* Direct screen links */}
        <div
          style={{
            padding: '12px 16px',
            backgroundColor: C.surface,
            border: `1px solid ${C.border}`,
            borderRadius: 6,
            marginBottom: 24,
          }}
        >
          <div
            style={{
              fontFamily: 'JetBrains Mono, monospace',
              fontSize: 10,
              color: C.text3,
              letterSpacing: '0.05em',
              textTransform: 'uppercase',
              marginBottom: 9,
            }}
          >
            Screens
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px 0' }}>
            {SCREENS.map((s, i) => (
              <span key={s.path} style={{ display: 'inline-flex', alignItems: 'center' }}>
                {i > 0 && (
                  <span style={{ color: C.border, margin: '0 10px', fontSize: 11 }}>·</span>
                )}
                <a
                  href={s.path}
                  style={{
                    fontSize: 12,
                    color: C.text2,
                    textDecoration: 'none',
                    borderBottom: `1px solid transparent`,
                    transition: 'color 100ms, border-color 100ms',
                  }}
                  onMouseEnter={e => {
                    e.currentTarget.style.color = C.text1
                    e.currentTarget.style.borderBottomColor = C.borderStrong
                  }}
                  onMouseLeave={e => {
                    e.currentTarget.style.color = C.text2
                    e.currentTarget.style.borderBottomColor = 'transparent'
                  }}
                >
                  {s.label}
                </a>
              </span>
            ))}
          </div>
        </div>

        {/* Disclaimer + version */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <span style={{ fontSize: 11, color: C.text3, lineHeight: 1.5 }}>
            All data is illustrative. Nothing connects to a live system.
          </span>
          <span
            style={{
              fontFamily: 'JetBrains Mono, monospace',
              fontSize: 10,
              color: C.text3,
              letterSpacing: '0.04em',
            }}
          >
            v0.1
          </span>
        </div>

      </div>
    </div>
  )
}
