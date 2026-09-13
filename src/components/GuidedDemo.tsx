import { useState, useEffect } from 'react'
import { useLocation, useNavigate } from 'react-router'
import { C } from '../tokens'

// ─── Story and steps ──────────────────────────────────────────────────────────

const STORY_KEY = 'FACT-127'
const STORY_TITLE = 'Export filtered facts'

type DemoStep = {
  index: number
  label: string
  agent: string
  instruction: string
  route: string | null
}

const STEPS: DemoStep[] = [
  {
    index: 0,
    label: 'Onboarding',
    agent: 'Onboarding agent',
    instruction: 'Review the discovered project rules. Reject one that doesn\'t fit, then merge skill v1.',
    route: '/p/FACTS/onboarding',
  },
  {
    index: 1,
    label: 'BA agent',
    agent: 'BA agent',
    instruction: 'Approve the drafted user story and acceptance criteria for FACT-127.',
    route: null, // BA page not built in this prototype
  },
  {
    index: 2,
    label: 'Dev agent',
    agent: 'Dev agent',
    instruction: 'Notice parseRange flagged as a reuse candidate in the impact map. Edit one plan step, then approve.',
    route: '/p/FACTS/dev',
  },
  {
    index: 3,
    label: 'QA agent',
    agent: 'QA agent',
    instruction: 'Open the context inspector to see what the agent read, then approve the generated test suite.',
    route: '/p/FACTS/qa',
  },
  {
    index: 4,
    label: 'Flow',
    agent: 'Flow view',
    instruction: 'Watch the story appear in the comparison table with fewer plan iterations than the previous one.',
    route: '/p/FACTS/flow',
  },
]

function pathToStep(pathname: string): number | null {
  if (pathname.includes('/onboarding')) return 0
  if (pathname.includes('/dev'))        return 2
  if (pathname.includes('/qa'))         return 3
  if (pathname.includes('/flow'))       return 4
  return null
}

// ─── Icons ────────────────────────────────────────────────────────────────────

function CheckIcon() {
  return (
    <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
      <path d="M2 5.5l2 2 4-4" stroke="#15803D" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

function ChevronUpIcon({ color = C.text3 }: { color?: string }) {
  return (
    <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
      <path d="M2 7l3-3 3 3" stroke={color} strokeWidth="1.25" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

function ChevronDownIcon({ color = C.text3 }: { color?: string }) {
  return (
    <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
      <path d="M2 3l3 3 3-3" stroke={color} strokeWidth="1.25" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

// ─── Panel ────────────────────────────────────────────────────────────────────

const LS_KEY = 'guided-demo-dismissed'

export default function GuidedDemo() {
  const location = useLocation()
  const navigate = useNavigate()

  const [dismissed, setDismissed] = useState<boolean>(() => {
    try { return localStorage.getItem(LS_KEY) === '1' } catch { return false }
  })
  const [open, setOpen] = useState<boolean>(!dismissed)

  const activeStep = pathToStep(location.pathname)

  function dismiss() {
    try { localStorage.setItem(LS_KEY, '1') } catch { /* ignore */ }
    setDismissed(true)
    setOpen(false)
  }

  function toggle() {
    if (dismissed) {
      // Re-open from dismissed: clear and show
      try { localStorage.removeItem(LS_KEY) } catch { /* ignore */ }
      setDismissed(false)
      setOpen(true)
    } else {
      setOpen(o => !o)
    }
  }

  const currentStep = activeStep !== null ? STEPS[activeStep] : null

  return (
    <div
      style={{
        position: 'fixed',
        bottom: 20,
        right: 20,
        zIndex: 200,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'flex-end',
        gap: 0,
        pointerEvents: 'none',
      }}
    >
      {/* Expanded panel */}
      {open && !dismissed && (
        <div
          style={{
            width: 268,
            backgroundColor: C.surface,
            border: `1px solid ${C.border}`,
            borderRadius: 6,
            boxShadow: '0 4px 16px rgba(0,0,0,0.08)',
            overflow: 'hidden',
            marginBottom: 6,
            pointerEvents: 'auto',
          }}
        >
          {/* Header */}
          <div style={{
            padding: '9px 12px',
            borderBottom: `1px solid ${C.border}`,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <span style={{
                fontFamily: 'JetBrains Mono, monospace',
                fontSize: 10,
                color: C.text3,
                letterSpacing: '0.04em',
              }}>
                {STORY_KEY}
              </span>
              <span style={{ fontSize: 11, color: C.text2, fontWeight: 500 }}>{STORY_TITLE}</span>
            </div>
            <button
              onClick={dismiss}
              style={{
                background: 'none', border: 'none', cursor: 'pointer',
                color: C.text3, fontSize: 14, lineHeight: 1, padding: '0 2px',
              }}
              title="Dismiss guide"
            >
              ×
            </button>
          </div>

          {/* Steps */}
          <div style={{ padding: '8px 0' }}>
            {STEPS.map((step) => {
              const isActive = activeStep === step.index
              const isDone = activeStep !== null && step.index < activeStep

              return (
                <div
                  key={step.index}
                  style={{
                    padding: '7px 12px',
                    backgroundColor: isActive ? `${C.surfaceSubtle}` : 'transparent',
                    borderLeft: isActive ? `2px solid ${C.text1}` : '2px solid transparent',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: isActive ? 4 : 0 }}>
                    {/* Step number / check */}
                    <div style={{
                      width: 16, height: 16, borderRadius: '50%', flexShrink: 0,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      backgroundColor: isDone ? '#F0FDF4' : isActive ? C.text1 : C.surfaceSubtle,
                      border: isDone ? '1px solid #BBF7D0' : isActive ? 'none' : `1px solid ${C.border}`,
                    }}>
                      {isDone
                        ? <CheckIcon />
                        : <span style={{
                            fontSize: 9, fontWeight: 600,
                            color: isActive ? '#FFF' : C.text3,
                          }}>{step.index + 1}</span>
                      }
                    </div>

                    <span style={{
                      fontSize: 12,
                      fontWeight: isActive ? 500 : 400,
                      color: isDone ? C.text3 : isActive ? C.text1 : C.text2,
                    }}>
                      {step.label}
                    </span>

                    {isActive && (
                      <span style={{
                        marginLeft: 'auto',
                        fontSize: 9, fontWeight: 600,
                        color: C.text3,
                        letterSpacing: '0.05em',
                        textTransform: 'uppercase',
                      }}>
                        here
                      </span>
                    )}
                  </div>

                  {/* Expanded instruction + action for active step */}
                  {isActive && (
                    <div style={{ paddingLeft: 22 }}>
                      <p style={{ fontSize: 11, color: C.text2, lineHeight: 1.5, margin: '0 0 8px' }}>
                        {step.instruction}
                      </p>
                      {step.route ? (
                        <button
                          onClick={() => navigate(step.route!)}
                          style={{
                            fontSize: 11, fontWeight: 500,
                            color: C.text1,
                            backgroundColor: C.surfaceSubtle,
                            border: `1px solid ${C.border}`,
                            borderRadius: 4,
                            padding: '4px 10px',
                            cursor: 'pointer',
                          }}
                          className="hover:bg-[#E9EAED] transition-colors"
                        >
                          Take me there →
                        </button>
                      ) : (
                        <span style={{ fontSize: 11, color: C.text3, fontStyle: 'italic' }}>
                          Not built in this prototype — continue to Dev agent
                        </span>
                      )}
                    </div>
                  )}
                </div>
              )
            })}
          </div>

          {/* Footer */}
          <div style={{
            padding: '8px 12px',
            borderTop: `1px solid ${C.border}`,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}>
            <span style={{ fontSize: 10, color: C.text3 }}>
              {activeStep !== null ? `Step ${activeStep + 1} of ${STEPS.length}` : 'Follow FACT-127 through the flow'}
            </span>
            <button
              onClick={() => setOpen(false)}
              style={{
                background: 'none', border: 'none', cursor: 'pointer',
                fontSize: 11, color: C.text3, padding: 0,
                display: 'flex', alignItems: 'center', gap: 3,
              }}
              className="hover:text-[#4B5563] transition-colors"
            >
              Collapse <ChevronDownIcon />
            </button>
          </div>
        </div>
      )}

      {/* Collapsed pill */}
      <button
        onClick={toggle}
        style={{
          pointerEvents: 'auto',
          display: 'flex', alignItems: 'center', gap: 6,
          backgroundColor: C.surface,
          border: `1px solid ${C.border}`,
          borderRadius: 20,
          padding: '5px 10px 5px 8px',
          cursor: 'pointer',
          boxShadow: '0 2px 8px rgba(0,0,0,0.07)',
        }}
        className="hover:bg-[#F3F4F6] transition-colors"
      >
        <span style={{
          fontFamily: 'JetBrains Mono, monospace',
          fontSize: 10,
          color: C.text3,
          letterSpacing: '0.04em',
        }}>
          {STORY_KEY}
        </span>
        <span style={{ fontSize: 11, color: C.text2 }}>
          {currentStep ? currentStep.label : 'guided demo'}
        </span>
        {activeStep !== null && (
          <span style={{
            fontSize: 9, fontWeight: 600,
            backgroundColor: C.text1, color: '#FFF',
            borderRadius: 10, padding: '1px 5px',
          }}>
            {activeStep + 1}/{STEPS.length}
          </span>
        )}
        {(open && !dismissed) ? <ChevronDownIcon /> : <ChevronUpIcon />}
      </button>
    </div>
  )
}
