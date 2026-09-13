import { useState } from 'react'
import { flushSync } from 'react-dom'
import { useNavigate } from 'react-router'
import { C } from '../tokens'
import { useStore } from '../store'
import { PERSONAS, ROLE_HOME, buildUserSession } from '../personas'
import type { Persona } from '../personas'

// ─── SSO note ─────────────────────────────────────────────────────────────────

function SSONote({ onClose }: { onClose: () => void }) {
  return (
    <div
      style={{
        marginTop: 12,
        padding: '10px 14px',
        backgroundColor: C.surfaceSubtle,
        border: `1px solid ${C.border}`,
        borderRadius: 5,
        fontSize: 12,
        color: C.text2,
        lineHeight: 1.6,
        position: 'relative',
      }}
    >
      <button
        onClick={onClose}
        style={{
          position: 'absolute', top: 6, right: 8,
          fontSize: 16, color: C.text3, background: 'none', border: 'none', cursor: 'pointer', lineHeight: 1,
        }}
        aria-label="Dismiss"
      >
        ×
      </button>
      <span style={{ fontWeight: 500, color: C.text1 }}>Real OIDC authentication is not wired in this prototype.</span>
      {' '}Use a persona below to explore the interface.
    </div>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function LoginPage() {
  const { dispatch } = useStore()
  const navigate = useNavigate()
  const [ssoNoteVisible, setSsoNoteVisible] = useState(false)
  const [signingIn, setSigningIn] = useState<string | null>(null)

  function handlePersona(persona: Persona) {
    if (signingIn) return
    setSigningIn(persona.name)
    dispatch({ type: 'SIGN_IN', user: buildUserSession(persona) })
    navigate(ROLE_HOME[persona.role], { replace: true })
  }

  function handleOnboarding() {
    if (signingIn) return
    setSigningIn('onboard')
    const bill = PERSONAS.find(p => p.role === 'delivery_lead')!
    flushSync(() => dispatch({ type: 'SIGN_IN', user: buildUserSession(bill) }))
    navigate('/p/FACTS/setup', { replace: true })
  }

  return (
    <div
      style={{
        minHeight: '100vh',
        backgroundColor: C.ground,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'flex-start',
        padding: '80px 24px 64px',
      }}
    >
      {/* Product identity */}
      <div style={{ width: '100%', maxWidth: 400, marginBottom: 48 }}>
        <div
          style={{
            width: 36, height: 36, backgroundColor: C.text1, borderRadius: 7,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            marginBottom: 20,
          }}
        >
          <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
            <rect x="3" y="3" width="6" height="6" rx="1.5" fill="white" fillOpacity="0.9" />
            <rect x="11" y="3" width="6" height="6" rx="1.5" fill="white" fillOpacity="0.5" />
            <rect x="3" y="11" width="6" height="6" rx="1.5" fill="white" fillOpacity="0.5" />
            <rect x="11" y="11" width="6" height="6" rx="1.5" fill="white" fillOpacity="0.9" />
          </svg>
        </div>

        <h1
          style={{
            fontSize: 22, fontWeight: 700, color: C.text1,
            margin: '0 0 8px', letterSpacing: '-0.02em',
          }}
        >
          TeamMate.AI
        </h1>
        <p style={{ fontSize: 14, color: C.text2, margin: '0 0 32px', lineHeight: 1.5 }}>
          AI-assisted delivery workflow for software teams.
        </p>

        {/* SSO button */}
        <button
          onClick={() => setSsoNoteVisible(v => !v)}
          style={{
            width: '100%',
            padding: '11px 20px',
            backgroundColor: C.text1,
            color: '#FFFFFF',
            fontSize: 14,
            fontWeight: 500,
            borderRadius: 6,
            border: 'none',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 10,
            letterSpacing: '0.01em',
          }}
          className="hover:opacity-90 transition-opacity"
        >
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
            <rect x="2" y="6" width="10" height="7" rx="1.5" stroke="white" strokeWidth="1.3" />
            <path d="M4.5 6V4a2.5 2.5 0 0 1 5 0v2" stroke="white" strokeWidth="1.3" strokeLinecap="round" />
          </svg>
          Sign in with CACI SSO
        </button>

        {ssoNoteVisible && <SSONote onClose={() => setSsoNoteVisible(false)} />}
      </div>

      {/* Divider */}
      <div
        style={{
          width: '100%', maxWidth: 560,
          display: 'flex', alignItems: 'center', gap: 16, marginBottom: 28,
        }}
      >
        <div style={{ flex: 1, height: 1, backgroundColor: C.border }} />
        <span
          style={{
            fontSize: 11, fontWeight: 600, color: C.text3,
            textTransform: 'uppercase', letterSpacing: '0.07em', whiteSpace: 'nowrap',
          }}
        >
          Prototype — sign in as
        </span>
        <div style={{ flex: 1, height: 1, backgroundColor: C.border }} />
      </div>

      {/* Persona grid */}
      <div
        style={{
          width: '100%',
          maxWidth: 560,
          display: 'grid',
          gridTemplateColumns: 'repeat(3, 1fr)',
          gap: 10,
          marginBottom: 28,
        }}
      >
        {PERSONAS.map(persona => (
          <button
            key={persona.name}
            onClick={() => handlePersona(persona)}
            disabled={!!signingIn}
            style={{
              padding: '14px 16px',
              backgroundColor: signingIn === persona.name ? C.surfaceSubtle : C.surface,
              border: `1px solid ${C.border}`,
              borderRadius: 6,
              cursor: signingIn ? 'default' : 'pointer',
              textAlign: 'left',
              opacity: signingIn && signingIn !== persona.name ? 0.5 : 1,
              transition: 'opacity 150ms, box-shadow 120ms',
            }}
            className={signingIn ? '' : 'hover:shadow-[0_0_0_1.5px_#C9CDD4]'}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
              <div
                style={{
                  width: 28, height: 28, borderRadius: '50%',
                  backgroundColor: C.text1, color: '#FFF',
                  fontSize: 10, fontWeight: 700, flexShrink: 0,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}
              >
                {persona.initials}
              </div>
              <div style={{ minWidth: 0 }}>
                <div style={{ fontSize: 13, fontWeight: 600, color: C.text1, lineHeight: 1.2 }}>
                  {persona.name}
                </div>
              </div>
            </div>
            <div style={{ fontSize: 11, fontWeight: 500, color: C.text3, marginBottom: 4, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
              {persona.roleLabel}
            </div>
            <div style={{ fontSize: 11, color: C.text2, lineHeight: 1.5 }}>
              {persona.description}
            </div>
          </button>
        ))}
      </div>

      {/* Onboarding tile */}
      <div style={{ width: '100%', maxWidth: 560 }}>
        <div
          style={{
            display: 'flex', alignItems: 'center', gap: 16, marginBottom: 16,
          }}
        >
          <div style={{ flex: 1, height: 1, backgroundColor: C.border }} />
          <span
            style={{
              fontSize: 11, fontWeight: 600, color: C.text3,
              textTransform: 'uppercase', letterSpacing: '0.07em', whiteSpace: 'nowrap',
            }}
          >
            or start fresh
          </span>
          <div style={{ flex: 1, height: 1, backgroundColor: C.border }} />
        </div>

        <button
          onClick={handleOnboarding}
          disabled={!!signingIn}
          style={{
            width: '100%',
            padding: '18px 22px',
            backgroundColor: signingIn === 'onboard' ? '#F5F3FF' : C.surface,
            border: `1.5px solid ${signingIn === 'onboard' ? '#A78BFA' : '#C4B5FD'}`,
            borderRadius: 8,
            cursor: signingIn ? 'default' : 'pointer',
            textAlign: 'left',
            display: 'flex',
            alignItems: 'center',
            gap: 16,
            opacity: signingIn && signingIn !== 'onboard' ? 0.5 : 1,
            transition: 'all 150ms',
            boxSizing: 'border-box',
          }}
          className={signingIn ? '' : 'hover:border-[#8B5CF6] hover:bg-[#FAF5FF]'}
        >
          {/* Icon */}
          <div style={{
            width: 42, height: 42, borderRadius: 10, flexShrink: 0,
            background: 'linear-gradient(135deg, #7C3AED 0%, #4F46E5 100%)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
              <path d="M10 3v14M3 10h14" stroke="white" strokeWidth="1.8" strokeLinecap="round" />
            </svg>
          </div>

          {/* Text */}
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 14, fontWeight: 600, color: '#4C1D95', marginBottom: 3 }}>
              {signingIn === 'onboard' ? 'Launching onboarding…' : 'Onboard a new project'}
            </div>
            <div style={{ fontSize: 12, color: '#6D28D9', lineHeight: 1.5 }}>
              Invite your team, connect Git · Jira · Confluence, and let the agent build your Day 1 baseline.
            </div>
          </div>

          {/* Arrow */}
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none" style={{ flexShrink: 0, opacity: 0.5 }}>
            <path d="M4 8h8M9 5l3 3-3 3" stroke="#4C1D95" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>
      </div>
    </div>
  )
}
