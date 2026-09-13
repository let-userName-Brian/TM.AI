import { createContext, useContext, useReducer, type Dispatch } from 'react'
import type { AppState, AppAction, ActivityEntry } from './types'
import { initialState } from './fixtures'

// ─── Reducer ──────────────────────────────────────────────────────────────────

function makeActivity(type: ActivityEntry['type'], payload: Record<string, unknown>): ActivityEntry {
  return {
    id: `ACT-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    timestamp: new Date().toLocaleString('en-US', {
      month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit', hour12: false,
    }).replace(',', ' ·'),
    type,
    payload,
  }
}

function reducer(state: AppState, action: AppAction): AppState {
  switch (action.type) {

    case 'SIGN_IN':
      return { ...state, currentUser: action.user }

    case 'SIGN_OUT':
      return { ...state, currentUser: null }

    case 'DECIDE_GATE': {
      const now = new Date().toLocaleString('en-US', {
        month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit', hour12: false,
      }).replace(',', ' ·')

      const gates = state.gates.map(g =>
        g.id === action.gateId
          ? { ...g, status: 'decided' as const, decision: action.decision, decider: action.decider, reason: action.reason ?? null, decidedAt: now }
          : g
      )

      return {
        ...state,
        gates,
        activity: [
          makeActivity('GATE_DECIDED', {
            gateId: action.gateId,
            decision: action.decision,
            decider: action.decider,
            reason: action.reason,
          }),
          ...state.activity,
        ],
      }
    }

    case 'EDIT_PLAN_STEP': {
      const stories = state.stories.map(s => {
        if (s.key !== action.storyKey || !s.artifacts.plan) return s
        return {
          ...s,
          artifacts: {
            ...s.artifacts,
            plan: {
              ...s.artifacts.plan,
              steps: s.artifacts.plan.steps.map(step =>
                step.id === action.stepId ? { ...step, approach: action.newApproach } : step
              ),
            },
          },
        }
      })

      return {
        ...state,
        stories,
        activity: [
          makeActivity('PLAN_STEP_EDITED', {
            storyKey: action.storyKey,
            stepId: action.stepId,
            newApproach: action.newApproach,
            by: action.by,
          }),
          ...state.activity,
        ],
      }
    }

    case 'DECIDE_RULE': {
      const skillVersions = state.skillVersions.map(sv => {
        if (sv.id !== action.skillId) return sv
        return {
          ...sv,
          rules: sv.rules.map(r => {
            if (r.id !== action.ruleId) return r
            const base = { ...r, status: action.decision, decidedBy: action.by, note: action.note ?? r.note }
            if (action.decision === 'edited' && action.editedText) {
              return { ...base, originalText: r.originalText ?? r.text, text: action.editedText }
            }
            return base
          }),
        }
      })

      return {
        ...state,
        skillVersions,
        activity: [
          makeActivity('RULE_DECIDED', {
            skillId: action.skillId,
            ruleId: action.ruleId,
            decision: action.decision,
            by: action.by,
            note: action.note,
            editedText: action.editedText,
          }),
          ...state.activity,
        ],
      }
    }

    case 'REVIEWER_SIGN_OFF': {
      const skillVersions = state.skillVersions.map(sv => {
        if (sv.id !== action.skillId) return sv
        return {
          ...sv,
          reviewers: sv.reviewers.map(r =>
            r.name === action.reviewerName
              ? { ...r, signedOff: true, signedAt: action.signedAt }
              : r
          ),
        }
      })

      return {
        ...state,
        skillVersions,
        activity: [
          makeActivity('REVIEWER_SIGNED_OFF', {
            skillId: action.skillId,
            reviewerName: action.reviewerName,
            signedAt: action.signedAt,
          }),
          ...state.activity,
        ],
      }
    }

    case 'ADVANCE_STORY_STAGE': {
      const STAGES: import('./types').StoryStage[] = ['backlog', 'requirements', 'plan', 'build', 'test', 'accept', 'done']
      const stories = state.stories.map(s => {
        if (s.key !== action.storyKey) return s
        const idx = STAGES.indexOf(s.stage)
        if (idx < 0 || idx >= STAGES.length - 1) return s
        return { ...s, stage: STAGES[idx + 1] }
      })
      return { ...state, stories, activity: [makeActivity('STORY_STAGE_ADVANCED', { storyKey: action.storyKey }), ...state.activity] }
    }

    case 'REGRESS_STORY_STAGE': {
      const STAGES: import('./types').StoryStage[] = ['backlog', 'requirements', 'plan', 'build', 'test', 'accept', 'done']
      const stories = state.stories.map(s => {
        if (s.key !== action.storyKey) return s
        const idx = STAGES.indexOf(s.stage)
        if (idx <= 0) return s
        return { ...s, stage: STAGES[idx - 1] }
      })
      return { ...state, stories, activity: [makeActivity('STORY_STAGE_REGRESSED', { storyKey: action.storyKey }), ...state.activity] }
    }

    default:
      return state
  }
}

// ─── Context ──────────────────────────────────────────────────────────────────

type StoreCtx = { state: AppState; dispatch: Dispatch<AppAction> }
const StoreContext = createContext<StoreCtx | null>(null)

export function StoreProvider({ children }: { children: React.ReactNode }) {
  const [state, dispatch] = useReducer(reducer, initialState)
  return <StoreContext.Provider value={{ state, dispatch }}>{children}</StoreContext.Provider>
}

export function useStore(): StoreCtx {
  const ctx = useContext(StoreContext)
  if (!ctx) throw new Error('useStore must be called inside StoreProvider')
  return ctx
}
