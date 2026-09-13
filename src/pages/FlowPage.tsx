import { useState, useRef, useEffect, useId } from 'react'
import { C } from '../tokens'
import { TopBar, ConnectorHealthBanner, Mono } from '../components/Shell'
import { useStore } from '../store'

// ─── Types ────────────────────────────────────────────────────────────────────

type ChatMsg = {
  id: string
  role: 'user' | 'assistant' | 'system'
  content: string
  ts: string
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function uid() { return Math.random().toString(36).slice(2, 9) }
function nowStr() { return new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) }

const MANAGER_REPLIES: Record<string, string[]> = {
  scrum_master: [
    "The QA gate is the current bottleneck — two stories arrived within 4 hours of each other and are competing for the same reviewer. Want me to surface which stories are blocked?",
    "Stale gates are usually a handoff timing issue. I can draft an unblock message to the team if you want to expedite.",
    "Sprint velocity is on track. The risk is the two stale gates — if they don't move by end of day, cycle time for this sprint will drift above target.",
    "The skill proposal in the flow view would reduce spec rework by batching similar test patterns. Worth reviewing before sprint planning.",
    "Based on the current throughput, we'll close all in-flight stories before the sprint ends — assuming the QA gate clears today.",
  ],
  delivery_lead: [
    "Sprint 14 is tracking 8% ahead of Sprint 13 on cycle time. Token spend is within budget — $0.43 per story on average.",
    "Two stale gates are the main risk to on-time delivery. Both are QA-side — the QA agent is the bottleneck this sprint.",
    "Agent performance has been consistent: average plan quality score is 87/100, up from 82 last sprint. The BA agent is generating tighter acceptance criteria.",
    "If you want to reduce cost, the Parquet export story is the heaviest in terms of token spend — it required 3 plan iterations before approval.",
    "The carry-forward rate is 0% so far this sprint — no stories are being pushed. That's better than the 15% rate we had in Sprint 12.",
  ],
}

function pickReply(text: string, role: string): string {
  const l = text.toLowerCase()
  if (l.includes('block') || l.includes('stuck') || l.includes('stale'))
    return "The stale gates are both in QA. I can draft an unblock message or flag it in the standup summary — which would be more useful right now?"
  if (l.includes('cost') || l.includes('token') || l.includes('budget') || l.includes('spend'))
    return "Total token spend this sprint is on track. The heaviest story was FACTS-17 (export) at 6,800 tokens across 3 agent runs. Average is 4,200 per story."
  if (l.includes('velocity') || l.includes('pace') || l.includes('track') || l.includes('sprint'))
    return "Velocity is healthy. At current pace, all 7 in-flight stories will close before the sprint ends. The risk is the QA bottleneck — if FACTS-17 and FACTS-21 don't clear today, we'll slip by ~4 hours."
  if (l.includes('risk') || l.includes('concern') || l.includes('watch'))
    return "Main risk this sprint: FACTS-21 touches the auth middleware. It's been reviewed but I'd want a second set of eyes before merge. I can flag it for the tech lead."
  if (l.includes('proposal') || l.includes('skill') || l.includes('merge'))
    return "There are 2 skill proposals pending. The export-filter proposal has strong evidence (4 sprint history). The batching proposal is newer — 1 sprint of evidence. I'd approve the first and defer the second."
  const replies = MANAGER_REPLIES[role] ?? MANAGER_REPLIES['scrum_master']
  return replies[Math.floor(Math.random() * replies.length)]
}

// ─── Role-specific seed messages ──────────────────────────────────────────────

const SEED: Record<string, ChatMsg[]> = {
  scrum_master: [
    {
      id: 'fl-sm1', role: 'assistant', ts: '9:30 AM',
      content: "Morning, Scott. Sprint 14 status:\n\n• 7 stories in flight, 1 decided (FACTS-22 passed QA)\n• 2 stale gates — FACTS-17 and FACTS-19 both over 24 hours without action\n• QA agent is the current bottleneck: two stories arrived in the same window\n\nThe stale gates are the main risk to cycle time this sprint. Want me to draft a nudge message to the QA reviewer, or would you rather surface this in standup?",
    },
    {
      id: 'fl-sm2', role: 'user', ts: '9:33 AM',
      content: "Flag it for standup. What's causing the QA backlog?",
    },
    {
      id: 'fl-sm3', role: 'assistant', ts: '9:33 AM',
      content: "Two stories (FACTS-17 and FACTS-21) landed in QA within 4 hours of each other yesterday. Both require the same reviewer. The QA agent generated all specs on time — the bottleneck is human review capacity, not agent throughput.\n\nIf this pattern continues, it's worth discussing whether to stagger when Dev pushes to QA — a 24-hour buffer between submissions would prevent this queue from forming.",
    },
  ],
  delivery_lead: [
    {
      id: 'fl-dl1', role: 'assistant', ts: '8:00 AM',
      content: "Bill, Sprint 14 delivery summary:\n\n• **Cycle time**: tracking 8% ahead of Sprint 13\n• **Token spend**: $3.01 total, avg $0.43/story — within budget\n• **Agent quality**: plan quality avg 87/100 (↑ from 82 last sprint)\n• **Stale gates**: 2 open > 24h — QA bottleneck\n• **Carry-forward**: 0% — no stories being pushed to Sprint 15\n\nThe two stale gates are the only delivery risk. If they clear today, we finish on target. If they slip to tomorrow, cycle time will drift by ~4 hours.",
    },
    {
      id: 'fl-dl2', role: 'user', ts: '8:04 AM',
      content: "What's driving the token cost on FACTS-17 vs the others?",
    },
    {
      id: 'fl-dl3', role: 'assistant', ts: '8:05 AM',
      content: "FACTS-17 required 3 plan iterations before the Dev team approved — each iteration triggered a full re-run of the impact mapping and plan generation steps. The main driver was the ExportService risk discussion: the first plan proposed touching the core serializer, the team pushed back, and two more runs were needed to land on the adapter approach.\n\nBy comparison, FACTS-22 (audit log) needed only 1 run — clear AC, low-risk implementation, no iteration.\n\nIf you want to reduce per-story cost, earlier architectural guidance before Dev planning would cut iteration cycles. Worth raising in the retrospective.",
    },
  ],
}

// ─── Sprint health strip ──────────────────────────────────────────────────────

function SprintStrip() {
  const { state } = useStore()
  const openGates = state.gates.filter(g => g.status === 'open')
  const decidedGates = state.gates.filter(g => g.status === 'decided')
  const staleGates = openGates.filter(g => g.id === 'G-03' || g.id === 'G-06')
  const storiesInFlight = state.stories.filter(s => !['done', 'backlog'].includes(s.stage))

  const metrics = [
    { label: 'In flight', value: String(storiesInFlight.length), accent: C.text1 },
    { label: 'Open gates', value: String(openGates.length), accent: C.text1 },
    { label: 'Decided', value: String(decidedGates.length), accent: '#15803D' },
    { label: 'Stale', value: String(staleGates.length), accent: staleGates.length > 0 ? '#D97706' : C.text3 },
  ]

  return (
    <div style={{
      display: 'flex', gap: 0,
      borderBottom: `1px solid ${C.border}`,
      backgroundColor: C.surface,
      flexShrink: 0,
    }}>
      {metrics.map((m, i) => (
        <div key={m.label} style={{
          flex: 1, padding: '10px 18px',
          borderRight: i < metrics.length - 1 ? `1px solid ${C.border}` : 'none',
        }}>
          <div style={{ fontSize: 9.5, fontWeight: 600, color: C.text3, textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 3 }}>
            {m.label}
          </div>
          <div style={{ fontSize: 20, fontWeight: 700, color: m.accent, lineHeight: 1, letterSpacing: '-0.02em' }}>
            {m.value}
          </div>
        </div>
      ))}
      <div style={{ padding: '10px 18px', display: 'flex', alignItems: 'center', gap: 6 }}>
        <Mono size={10} color={C.text3}>Sprint 14 · FACTS</Mono>
      </div>
    </div>
  )
}

// ─── Bubble ───────────────────────────────────────────────────────────────────

function Bubble({ msg }: { msg: ChatMsg }) {
  if (msg.role === 'system') {
    return (
      <div style={{
        margin: '8px 24px', padding: '6px 14px',
        backgroundColor: C.surfaceSubtle, border: `1px solid ${C.border}`,
        borderRadius: 5, fontSize: 11, color: C.text3, textAlign: 'center', fontStyle: 'italic',
      }}>
        {msg.content}
      </div>
    )
  }
  const isUser = msg.role === 'user'
  return (
    <div style={{
      display: 'flex', flexDirection: isUser ? 'row-reverse' : 'row',
      gap: 10, padding: '4px 24px', alignItems: 'flex-start',
    }}>
      {!isUser && (
        <div style={{
          width: 30, height: 30, borderRadius: '50%', flexShrink: 0,
          background: 'linear-gradient(135deg, #0F172A 0%, #334155 100%)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 11, fontWeight: 700, color: '#FFF', marginTop: 2,
        }}>
          AI
        </div>
      )}
      <div style={{ maxWidth: '72%', minWidth: 0 }}>
        {!isUser && (
          <div style={{ fontSize: 10, fontWeight: 600, color: C.text3, marginBottom: 4, letterSpacing: '0.03em' }}>
            Delivery Agent · {msg.ts}
          </div>
        )}
        <div style={{
          padding: '11px 14px',
          backgroundColor: isUser ? C.text1 : '#FFF',
          color: isUser ? '#FFF' : C.text1,
          border: isUser ? 'none' : `1px solid ${C.border}`,
          borderRadius: isUser ? '14px 14px 4px 14px' : '4px 14px 14px 14px',
          fontSize: 13, lineHeight: 1.65,
          boxShadow: isUser ? 'none' : '0 1px 3px rgba(0,0,0,0.06)',
          whiteSpace: 'pre-wrap',
        }}>
          {msg.content}
        </div>
        {isUser && <div style={{ fontSize: 10, color: C.text3, marginTop: 3, textAlign: 'right' }}>{msg.ts}</div>}
      </div>
    </div>
  )
}

function TypingIndicator() {
  return (
    <div style={{ display: 'flex', gap: 10, padding: '4px 24px', alignItems: 'flex-start' }}>
      <div style={{
        width: 30, height: 30, borderRadius: '50%', flexShrink: 0,
        background: 'linear-gradient(135deg, #0F172A 0%, #334155 100%)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize: 11, fontWeight: 700, color: '#FFF', marginTop: 2,
      }}>AI</div>
      <div style={{
        marginTop: 18, padding: '10px 14px', backgroundColor: '#FFF',
        border: `1px solid ${C.border}`, borderRadius: '4px 14px 14px 14px',
        display: 'flex', gap: 5, alignItems: 'center', boxShadow: '0 1px 3px rgba(0,0,0,0.06)',
      }}>
        {[0, 1, 2].map(i => (
          <span key={i} style={{
            width: 5, height: 5, borderRadius: '50%', backgroundColor: '#94A3B8',
            animation: `typing-dot 1.3s ease-in-out ${i * 0.2}s infinite`, display: 'inline-block',
          }} />
        ))}
      </div>
    </div>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function FlowPage() {
  const { state } = useStore()
  const role = state.currentUser?.role ?? 'scrum_master'
  const name = state.currentUser?.name ?? ''

  const [messages, setMessages] = useState<ChatMsg[]>(() => SEED[role] ?? SEED['scrum_master'])
  const [input, setInput] = useState('')
  const [typing, setTyping] = useState(false)
  const bottomRef = useRef<HTMLDivElement>(null)
  const inputId = useId()

  // Reset when role changes (persona switch)
  const seedKey = (SEED[role] ?? []).map(m => m.id).join(',')
  useEffect(() => {
    setMessages(SEED[role] ?? SEED['scrum_master'])
    setInput('')
  }, [seedKey])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, typing])

  function send() {
    const text = input.trim()
    if (!text || typing) return
    const userMsg: ChatMsg = { id: uid(), role: 'user', content: text, ts: nowStr() }
    setMessages(prev => [...prev, userMsg])
    setInput('')
    setTyping(true)
    setTimeout(() => {
      const reply: ChatMsg = { id: uid(), role: 'assistant', content: pickReply(text, role), ts: nowStr() }
      setMessages(prev => [...prev, reply])
      setTyping(false)
    }, 800 + Math.random() * 700)
  }

  const roleLabelMap: Record<string, string> = {
    scrum_master: 'Scrum Master',
    delivery_lead: 'Delivery Lead',
    ba: 'Business Analyst',
    dev: 'Developer',
    qa: 'QA Engineer',
  }
  const roleLabel = roleLabelMap[role] ?? 'Manager'

  return (
    <>
      <style>{`
        @keyframes typing-dot {
          0%, 60%, 100% { opacity: 0.25; transform: scale(0.85); }
          30% { opacity: 1; transform: scale(1); }
        }
      `}</style>
      <div style={{ display: 'flex', height: '100vh', overflow: 'hidden', backgroundColor: C.ground, flexDirection: 'column' }}>
        <TopBar />
        <ConnectorHealthBanner />
        <SprintStrip />
        <FlowInner
          name={name} role={role} roleLabel={roleLabel}
          messages={messages} typing={typing}
          input={input} inputId={inputId}
          bottomRef={bottomRef}
          onInput={setInput} onSend={send}
        />
      </div>
    </>
  )
}

type FlowInnerProps = {
  name: string; role: string; roleLabel: string
  messages: ChatMsg[]; typing: boolean
  input: string; inputId: string
  bottomRef: React.RefObject<HTMLDivElement | null>
  onInput: (v: string) => void; onSend: () => void
}

export function FlowInner({ name, role, roleLabel, messages, typing, input, inputId, bottomRef, onInput, onSend }: FlowInnerProps) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', flex: 1, overflow: 'hidden', backgroundColor: C.ground }}>
      {/* Chat header */}
      <div style={{
        padding: '12px 24px 10px',
        borderBottom: `1px solid ${C.border}`,
        backgroundColor: C.surface,
        flexShrink: 0,
        display: 'flex', alignItems: 'center', gap: 10,
      }}>
        <div style={{
          width: 30, height: 30, borderRadius: '50%',
          background: 'linear-gradient(135deg, #0F172A 0%, #334155 100%)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 11, fontWeight: 700, color: '#FFF',
        }}>AI</div>
        <div>
          <div style={{ fontSize: 13, fontWeight: 600, color: C.text1 }}>Delivery Agent</div>
          <div style={{ fontSize: 11, color: C.text3 }}>
            Briefing {name} as <strong>{roleLabel}</strong> · Sprint 14
          </div>
        </div>
        <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 6 }}>
          <span style={{ width: 6, height: 6, borderRadius: '50%', backgroundColor: '#16A34A', display: 'inline-block', boxShadow: '0 0 0 2px #DCFCE7' }} />
          <span style={{ fontSize: 10, fontWeight: 600, color: C.text3, letterSpacing: '0.04em' }}>Live</span>
        </div>
      </div>

      {/* Thread */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '16px 0 8px', backgroundColor: '#F7F8FA' }}>
        {messages.map(msg => <Bubble key={msg.id} msg={msg} />)}
        {typing && <TypingIndicator />}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div style={{
        padding: '12px 24px 14px',
        borderTop: `1px solid ${C.border}`,
        backgroundColor: '#FFF',
        flexShrink: 0,
      }}>
        <div style={{ display: 'flex', gap: 10, alignItems: 'flex-end' }}>
          <label htmlFor={inputId} style={{ display: 'none' }}>Message</label>
          <textarea
            id={inputId}
            value={input}
            onChange={e => onInput(e.target.value)}
            onKeyDown={e => {
              if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); onSend() }
            }}
            placeholder={
              role === 'delivery_lead' ? 'Ask about cost, velocity, agent performance, or delivery risk…'
              : 'Ask about blockers, stale gates, team throughput, or sprint health…'
            }
            rows={2}
            style={{
              flex: 1, resize: 'none', outline: 'none',
              border: `1.5px solid ${C.border}`, borderRadius: 8,
              padding: '10px 13px', fontSize: 13, lineHeight: 1.55,
              fontFamily: 'inherit', color: C.text1, backgroundColor: C.surfaceSubtle,
              boxSizing: 'border-box', transition: 'border-color 120ms',
            }}
            onFocus={e => { e.currentTarget.style.borderColor = '#334155' }}
            onBlur={e => { e.currentTarget.style.borderColor = C.border }}
          />
          <button
            onClick={onSend}
            disabled={!input.trim() || typing}
            style={{
              flexShrink: 0, padding: '9px 18px', fontSize: 13, fontWeight: 600,
              background: input.trim() && !typing ? 'linear-gradient(135deg, #0F172A 0%, #334155 100%)' : C.border,
              color: input.trim() && !typing ? '#FFF' : C.text3,
              border: 'none', borderRadius: 8,
              cursor: input.trim() && !typing ? 'pointer' : 'not-allowed',
              transition: 'all 120ms',
            }}
          >
            Send ↵
          </button>
        </div>
      </div>
    </div>
  )
}
