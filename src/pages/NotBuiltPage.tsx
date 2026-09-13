import { useParams } from 'react-router'
import { C } from '../tokens'
import { TopBar } from '../components/Shell'
import { useStore } from '../store'

export default function NotBuiltPage() {
  useStore()
  const { agent } = useParams<{ agent: string }>()
  const agentLabel = agent ? agent.charAt(0).toUpperCase() + agent.slice(1) : 'This page'

  return (
    <div style={{ display: 'flex', height: '100vh', overflow: 'hidden', backgroundColor: C.ground, flexDirection: 'column' }}>
      <TopBar />
      <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ textAlign: 'center', maxWidth: 320 }}>
          <div
            style={{
              width: 40, height: 40, borderRadius: 8,
              backgroundColor: C.surfaceSubtle,
              border: `1px solid ${C.border}`,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              margin: '0 auto 16px',
            }}
          >
            <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
              <rect x="2" y="5" width="14" height="10" rx="2" stroke={C.text3} strokeWidth="1.25" />
              <path d="M6 5V4a3 3 0 0 1 6 0v1" stroke={C.text3} strokeWidth="1.25" strokeLinecap="round" />
            </svg>
          </div>
          <div style={{ fontSize: 13, fontWeight: 500, color: C.text1, marginBottom: 6 }}>
            {agentLabel} agent
          </div>
          <div style={{ fontSize: 12, color: C.text3, lineHeight: 1.6 }}>
            Not in this prototype
          </div>
        </div>
      </div>
    </div>
  )
}
