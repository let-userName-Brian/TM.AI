import { useState } from 'react'
import { C } from '../tokens'
import { Mono, Btn, TopBar } from '../components/Shell'
import { useStore } from '../store'
import { selectRules, selectReviewers } from '../store/selectors'
import type { EvidenceType, RuleDecision as RuleStatus, SkillRule as Rule, Reviewer } from '../store/types'
import { useToast } from '../components/Toast'


// ─── Evidence chip ─────────────────────────────────────────────────────────────

const EV_STYLE: Record<EvidenceType, { label: string; bg: string; color: string }> = {
  file: { label: 'FILE', bg: C.surfaceSubtle,  color: C.text3 },
  jira: { label: 'JIRA', bg: '#EFF6FF',        color: '#2563EB' },
  ci:   { label: 'CI',   bg: '#FFF7ED',        color: '#C2410C' },
}

function EvidenceChip({ type, value }: { type: EvidenceType; value: string }) {
  const s = EV_STYLE[type]
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
      <span style={{
        backgroundColor: s.bg, color: s.color,
        fontSize: 9, fontWeight: 700, letterSpacing: '0.06em',
        padding: '2px 5px', borderRadius: 3, border: `1px solid ${C.border}`,
      }}>
        {s.label}
      </span>
      <Mono size={11} color={C.text3}>{value}</Mono>
    </div>
  )
}

// ─── Left border accent by status ─────────────────────────────────────────────

const STATUS_BORDER: Record<RuleStatus, string> = {
  accepted: '#16A34A',
  rejected: C.reject,
  edited:   '#7C3AED',
  pending:  C.border,
}

// ─── Rule card ─────────────────────────────────────────────────────────────────

function RuleCard({
  rule,
  isEditing,
  editDraft,
  onAccept,
  onReject,
  onStartEdit,
  onDraftChange,
  onSaveEdit,
  onCancelEdit,
  onUndo,
}: {
  rule: Rule
  isEditing: boolean
  editDraft: string
  onAccept: () => void
  onReject: () => void
  onStartEdit: () => void
  onDraftChange: (v: string) => void
  onSaveEdit: () => void
  onCancelEdit: () => void
  onUndo: () => void
}) {
  const borderColor = STATUS_BORDER[rule.status]
  const decided = rule.status !== 'pending'

  return (
    <div style={{
      backgroundColor: C.surface,
      border: `1px solid ${C.border}`,
      borderLeft: `3px solid ${borderColor}`,
      borderRadius: 6,
      marginBottom: 8,
      overflow: 'hidden',
    }}>
      {/* Card header row */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', padding: '14px 16px 0' }}>
        {/* Rule ID */}
        <Mono size={11} color={C.text3}>{rule.id}</Mono>

        {/* Controls: pending shows buttons, decided shows status + undo */}
        {decided ? (
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <DecidedBadge status={rule.status} decidedBy={rule.decidedBy} />
            <button
              onClick={onUndo}
              style={{
                background: 'none', border: 'none', cursor: 'pointer',
                fontSize: 11, color: C.text3, padding: '2px 4px',
                textDecoration: 'underline', textUnderlineOffset: 2,
              }}
            >
              undo
            </button>
          </div>
        ) : (
          <div style={{ display: 'flex', gap: 6 }}>
            <Btn variant="approve" size="sm" onClick={onAccept}>Accept</Btn>
            <Btn variant="reject"  size="sm" onClick={onReject}>Reject</Btn>
            <Btn variant="default" size="sm" onClick={onStartEdit}>Edit</Btn>
          </div>
        )}
      </div>

      {/* Rule text body */}
      <div style={{ padding: '8px 16px' }}>
        {rule.status === 'edited' && rule.originalText ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            <div style={{
              fontSize: 11, color: C.text3, padding: '6px 8px',
              backgroundColor: C.surfaceSubtle, borderRadius: 4,
              borderLeft: '2px solid #DDD6FE',
            }}>
              <span style={{ fontSize: 10, fontWeight: 600, color: '#7C3AED', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Original</span>
              <div style={{ marginTop: 3, fontStyle: 'italic' }}>{rule.originalText}</div>
            </div>
            <p style={{ fontSize: 13.5, color: C.text1, lineHeight: 1.6, margin: 0 }}>{rule.text}</p>
          </div>
        ) : isEditing ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            <textarea
              value={editDraft}
              onChange={e => onDraftChange(e.target.value)}
              autoFocus
              rows={3}
              style={{
                width: '100%', padding: '8px 10px', resize: 'vertical',
                border: `1.5px solid ${C.borderStrong}`, borderRadius: 4,
                fontFamily: 'Inter, sans-serif', fontSize: 13.5, lineHeight: 1.6,
                color: C.text1, backgroundColor: C.surface,
                outline: 'none', boxSizing: 'border-box',
              }}
            />
            <div style={{ display: 'flex', gap: 6 }}>
              <Btn variant="approve" size="sm" onClick={onSaveEdit}>Save</Btn>
              <Btn variant="default" size="sm" onClick={onCancelEdit}>Cancel</Btn>
            </div>
          </div>
        ) : (
          <p style={{
            fontSize: 13.5, color: rule.status === 'rejected' ? C.text2 : C.text1,
            lineHeight: 1.6, margin: 0,
            textDecoration: rule.status === 'rejected' ? 'line-through' : 'none',
            textDecorationColor: '#FCA5A5',
          }}>{rule.text}</p>
        )}
      </div>

      {/* Rejection note */}
      {rule.status === 'rejected' && rule.note && (
        <div style={{ margin: '0 16px 10px', padding: '8px 10px', borderRadius: 4, backgroundColor: '#FFF5F5', border: `1px solid #FECACA`, borderLeft: `3px solid ${C.reject}` }}>
          <div style={{ fontSize: 10, fontWeight: 700, color: C.reject, textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: 3 }}>Rejection note · {rule.decidedBy}</div>
          <p style={{ fontSize: 12, color: '#991B1B', lineHeight: 1.55, margin: 0 }}>{rule.note}</p>
        </div>
      )}

      {/* Edited note */}
      {rule.status === 'edited' && rule.note && (
        <div style={{ margin: '0 16px 10px', padding: '8px 10px', borderRadius: 4, backgroundColor: '#F5F3FF', border: `1px solid #DDD6FE`, borderLeft: `3px solid #7C3AED` }}>
          <div style={{ fontSize: 10, fontWeight: 700, color: '#7C3AED', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: 3 }}>Edit rationale · {rule.decidedBy}</div>
          <p style={{ fontSize: 12, color: '#4C1D95', lineHeight: 1.55, margin: 0 }}>{rule.note}</p>
        </div>
      )}

      {/* Evidence footer */}
      <div style={{ padding: '0 16px 12px', display: 'flex', alignItems: 'center', gap: 6 }}>
        <span style={{ fontSize: 11, color: C.text3 }}>Evidence</span>
        <span style={{ fontSize: 11, color: C.border }}>·</span>
        <EvidenceChip type={rule.evidence.type} value={rule.evidence.value} />
      </div>
    </div>
  )
}

// ─── Decided badge ─────────────────────────────────────────────────────────────

function DecidedBadge({ status, decidedBy }: { status: RuleStatus; decidedBy: string | null }) {
  const configs: Record<string, { icon: string; color: string }> = {
    accepted: { icon: '✓', color: '#15803D' },
    rejected: { icon: '✗', color: C.reject },
    edited:   { icon: '✎', color: '#7C3AED' },
  }
  const cfg = configs[status] ?? configs['accepted']
  return (
    <span style={{ fontSize: 11, color: cfg.color, fontWeight: 500 }}>
      {cfg.icon} {status.charAt(0).toUpperCase() + status.slice(1)}
      {decidedBy ? <span style={{ color: C.text3, fontWeight: 400 }}> · {decidedBy}</span> : null}
    </span>
  )
}

// ─── Reviewer panel card ────────────────────────────────────────────────────────

function ReviewerCard({
  reviewer,
  total,
  onSignOff,
  signing,
}: {
  reviewer: Reviewer
  total: number
  onSignOff: () => void
  signing: boolean
}) {
  const signed = reviewer.signedOff

  return (
    <div style={{
      flex: 1,
      padding: '14px 16px',
      backgroundColor: C.surface,
      border: `1px solid ${signed ? '#BBF7D0' : C.border}`,
      borderLeft: `3px solid ${signed ? '#15803D' : C.border}`,
      borderRadius: 6,
    }}>
      {/* Role */}
      <div style={{ fontSize: 10, fontWeight: 700, color: C.text3, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 8 }}>
        {reviewer.role}
      </div>

      {/* Name + initials */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
        <div style={{
          width: 28, height: 28, borderRadius: '50%',
          backgroundColor: signed ? '#DCFCE7' : C.surfaceSubtle,
          border: `1.5px solid ${signed ? '#86EFAC' : C.borderStrong}`,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 10, fontWeight: 700, color: signed ? '#15803D' : C.text2,
          flexShrink: 0,
        }}>
          {reviewer.initials}
        </div>
        <span style={{ fontSize: 13, fontWeight: 500, color: C.text1 }}>{reviewer.name}</span>
      </div>

      {/* Status */}
      {signed ? (
        <div>
          <div style={{ fontSize: 12, fontWeight: 600, color: '#15803D' }}>Signed off</div>
          {reviewer.signedAt && (
            <div style={{ fontSize: 11, color: C.text3, marginTop: 2 }}>{reviewer.signedAt}</div>
          )}
        </div>
      ) : (
        <div>
          <div style={{ marginBottom: 8 }}>
            <Btn variant="approve" size="sm" onClick={onSignOff} disabled={signing}>
              {signing ? 'Signing…' : 'Sign off'}
            </Btn>
          </div>
          <div style={{ fontSize: 11, color: C.text3 }}>
            {reviewer.progress} of {total} reviewed
          </div>
        </div>
      )}
    </div>
  )
}

// ─── Summary bar ───────────────────────────────────────────────────────────────

function SummaryBar({
  decided, total, accepted, rejected, edited, pending,
  reviewers, onMerge, merging, merged,
}: {
  decided: number; total: number; accepted: number; rejected: number; edited: number; pending: number;
  reviewers: Reviewer[]; onMerge: () => void; merging: boolean; merged: boolean
}) {
  const allSignedOff = reviewers.every(r => r.signedOff)
  const notSigned = reviewers.filter(r => !r.signedOff).map(r => r.name)
  const pct = Math.round((decided / total) * 100)

  return (
    <div style={{
      flexShrink: 0,
      backgroundColor: C.surface,
      borderTop: `1px solid ${C.border}`,
      padding: '0 24px',
      height: 52,
      display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16,
    }}>
      {/* Progress */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <div style={{ width: 88, height: 4, backgroundColor: C.surfaceSubtle, borderRadius: 2, overflow: 'hidden' }}>
            <div style={{ width: `${pct}%`, height: '100%', backgroundColor: '#15803D', borderRadius: 2, transition: 'width 0.3s ease' }} />
          </div>
          <span style={{ fontSize: 12, fontWeight: 600, color: C.text1 }}>{decided} of {total} decided</span>
        </div>

        <span style={{ fontSize: 11, color: C.border }}>·</span>

        <div style={{ display: 'flex', gap: 10 }}>
          <StatPill label="accepted" value={accepted} color="#15803D" />
          <StatPill label="rejected" value={rejected} color={C.reject} />
          <StatPill label="edited"   value={edited}   color="#7C3AED" />
          {pending > 0 && <StatPill label="pending" value={pending} color={C.text3} />}
        </div>
      </div>

      {/* Reviewers + merge */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        {/* Per-reviewer dots */}
        <div style={{ display: 'flex', gap: 8 }}>
          {reviewers.map(r => (
            <div key={r.name} style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
              <div style={{
                width: 7, height: 7, borderRadius: '50%',
                backgroundColor: r.signedOff ? '#15803D' : C.border,
                border: `1.5px solid ${r.signedOff ? '#86EFAC' : C.borderStrong}`,
              }} />
              <span style={{ fontSize: 11, color: r.signedOff ? '#15803D' : C.text3 }}>{r.role.split(' ')[0]}</span>
            </div>
          ))}
        </div>

        {/* Merge button + gating message */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          {!allSignedOff && (
            <span style={{ fontSize: 11, color: C.text3 }}>
              Awaiting {notSigned.join(', ')}
            </span>
          )}
          <button
            disabled={!allSignedOff || merging || merged}
            onClick={allSignedOff && !merging && !merged ? onMerge : undefined}
            style={{
              padding: '6px 14px',
              borderRadius: 5,
              fontSize: 12, fontWeight: 600,
              cursor: allSignedOff && !merging && !merged ? 'pointer' : 'not-allowed',
              border: `1px solid ${merged ? '#BBF7D0' : allSignedOff ? '#15803D' : C.border}`,
              backgroundColor: merged ? '#F0FDF4' : allSignedOff ? (merging ? '#166534' : '#15803D') : C.surfaceSubtle,
              color: merged ? '#15803D' : allSignedOff ? '#FFFFFF' : C.text3,
              transition: 'background-color 150ms',
              opacity: merging ? 0.75 : 1,
            }}
          >
            {merging ? 'Merging…' : merged ? 'Merged ✓' : 'Merge ruleset'}
          </button>
        </div>
      </div>
    </div>
  )
}

function StatPill({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
      <span style={{ fontSize: 12, fontWeight: 600, color }}>{value}</span>
      <span style={{ fontSize: 11, color: C.text3 }}>{label}</span>
    </div>
  )
}

// ─── Page ──────────────────────────────────────────────────────────────────────

const CURRENT_USER = 'D. Marsh'

export default function OnboardingPage() {
  const { state, dispatch } = useStore()
  const rules     = selectRules(state)
  const reviewers = selectReviewers(state)
  const skillVersion = state.skillVersions.find(sv => sv.agent === 'onboarding')
  const skillId = skillVersion?.id ?? 'SV-01'

  const { showToast } = useToast()
  const [editingId, setEditingId]     = useState<string | null>(null)
  const [editDraft, setEditDraft]     = useState('')
  const [merging, setMerging]         = useState(false)
  const [merged, setMerged]           = useState(false)
  const [signingOff, setSigningOff]   = useState<Set<string>>(new Set())

  const accepted = rules.filter(r => r.status === 'accepted').length
  const rejected = rules.filter(r => r.status === 'rejected').length
  const edited   = rules.filter(r => r.status === 'edited').length
  const pending  = rules.filter(r => r.status === 'pending').length
  const decided  = accepted + rejected + edited

  function acceptRule(id: string) {
    dispatch({ type: 'DECIDE_RULE', skillId, ruleId: id, decision: 'accepted', by: CURRENT_USER })
  }

  function rejectRule(id: string) {
    const rule = rules.find(r => r.id === id)
    dispatch({ type: 'DECIDE_RULE', skillId, ruleId: id, decision: 'rejected', by: CURRENT_USER, note: rule?.note ?? 'Rejected by reviewer.' })
  }

  function undoRule(id: string) {
    dispatch({ type: 'DECIDE_RULE', skillId, ruleId: id, decision: 'pending', by: CURRENT_USER })
  }

  function startEdit(id: string, currentText: string) {
    setEditingId(id)
    setEditDraft(currentText)
  }

  function saveEdit(id: string) {
    const rule = rules.find(r => r.id === id)
    dispatch({
      type: 'DECIDE_RULE', skillId, ruleId: id, decision: 'edited', by: CURRENT_USER,
      editedText: editDraft.trim() || rule?.text,
      note: rule?.note ?? 'Edited by reviewer.',
    })
    setEditingId(null)
    setEditDraft('')
  }

  function cancelEdit() {
    setEditingId(null)
    setEditDraft('')
  }

  function signOff(reviewerName: string) {
    setSigningOff(prev => new Set([...prev, reviewerName]))
    const now = new Date()
    const signedAt = `${now.toLocaleString('en-US', { month: 'short', day: 'numeric' })} · ${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`
    setTimeout(() => {
      dispatch({ type: 'REVIEWER_SIGN_OFF', skillId, reviewerName, signedAt })
      setSigningOff(prev => { const s = new Set(prev); s.delete(reviewerName); return s })
    }, 600)
  }

  function handleMerge() {
    setMerging(true)
    setTimeout(() => {
      setMerging(false)
      setMerged(true)
      showToast('Ruleset merged — skill v1 ready for agents', 'success')
    }, 700)
  }

  return (
    <div style={{ display: 'flex', height: '100vh', overflow: 'hidden', backgroundColor: C.ground, flexDirection: 'column' }}>
      <TopBar />
      <main style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>

        {/* ── Page header ── */}
        <div style={{
          flexShrink: 0,
          backgroundColor: C.surface,
          borderBottom: `1px solid ${C.border}`,
          padding: '20px 24px 18px',
        }}>
          <div style={{ maxWidth: 840 }}>
            <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: 6 }}>
              <h1 style={{ fontSize: 17, fontWeight: 600, color: C.text1, margin: 0, letterSpacing: '-0.01em' }}>
                Project ruleset
                <span style={{ fontSize: 14, fontWeight: 400, color: C.text3, marginLeft: 8 }}>FACTS · Initial configuration</span>
              </h1>
              <div style={{ display: 'flex', gap: 10 }}>
                <ScanMeta label="24 files scanned" />
                <ScanMeta label="Sept 14 · 09:11" />
              </div>
            </div>
            <p style={{ fontSize: 13, color: C.text2, lineHeight: 1.65, margin: 0, maxWidth: 680 }}>
              The repository scanner analysed 24 files across <Mono size={12} color={C.text2}>.github/</Mono>, <Mono size={12} color={C.text2}>.gitlab/</Mono>, and Jira workflow exports, and proposed {rules.length} conventions in active use. This ruleset will be read by every agent before it acts on this project. Review each rule, correct where needed, and sign off. All three roles must approve before the ruleset merges.
            </p>
          </div>
        </div>

        {/* ── Reviewer panel ── */}
        <div style={{
          flexShrink: 0,
          backgroundColor: C.ground,
          borderBottom: `1px solid ${C.border}`,
          padding: '12px 24px',
        }}>
          <div style={{ maxWidth: 840, display: 'flex', gap: 10 }}>
            {reviewers.map((reviewer) => (
              <ReviewerCard
                key={reviewer.name}
                reviewer={reviewer}
                total={rules.length}
                onSignOff={() => signOff(reviewer.name)}
                signing={signingOff.has(reviewer.name)}
              />
            ))}
          </div>
        </div>

        {/* ── Rule list ── */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '16px 24px 8px' }}>
          <div style={{ maxWidth: 840 }}>
            {rules.map(rule => (
              <RuleCard
                key={rule.id}
                rule={rule}
                isEditing={editingId === rule.id}
                editDraft={editDraft}
                onAccept={() => acceptRule(rule.id)}
                onReject={() => rejectRule(rule.id)}
                onStartEdit={() => startEdit(rule.id, rule.text)}
                onDraftChange={setEditDraft}
                onSaveEdit={() => saveEdit(rule.id)}
                onCancelEdit={cancelEdit}
                onUndo={() => undoRule(rule.id)}
              />
            ))}
          </div>
        </div>

        {/* ── Summary bar ── */}
        <SummaryBar
          decided={decided}
          total={rules.length}
          accepted={accepted}
          rejected={rejected}
          edited={edited}
          pending={pending}
          reviewers={reviewers}
          onMerge={handleMerge}
          merging={merging}
          merged={merged}
        />
      </main>
    </div>
  )
}

function ScanMeta({ label }: { label: string }) {
  return (
    <span style={{
      fontSize: 11, color: C.text3,
      backgroundColor: C.surfaceSubtle,
      border: `1px solid ${C.border}`,
      borderRadius: 4, padding: '2px 7px',
    }}>
      {label}
    </span>
  )
}
