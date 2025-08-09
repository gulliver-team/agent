import { reactive } from 'vue'
import type { StoreState, Message, TimelineStep, StepKind } from './types'

function generateId(prefix: string = 'id'): string {
  return `${prefix}_${Math.random().toString(36).slice(2, 8)}_${Date.now().toString(36)}`
}

export const store = reactive<StoreState>({
  messages: [],
  steps: [],
})

export function agentSay(text: string) {
  const msg: Message = { id: generateId('m'), role: 'agent', text, ts: Date.now() }
  store.messages.push(msg)
  return msg
}

export function userSay(text: string) {
  const msg: Message = { id: generateId('m'), role: 'user', text, ts: Date.now() }
  store.messages.push(msg)
  return msg
}

export function getLastUserRequest(): string | null {
  for (let i = store.messages.length - 1; i >= 0; i--) {
    const m = store.messages[i]
    if (m.role === 'user') return m.text
  }
  return null
}

export function upsertStep(step: TimelineStep) {
  const idx = store.steps.findIndex((s) => s.id === step.id)
  if (idx >= 0) {
    store.steps[idx] = { ...store.steps[idx], ...step }
  } else {
    const withTs = { ...step, ts: step.ts ?? Date.now() }
    store.steps.push(withTs)
  }
}

export function completeStep(id: string) {
  const s = store.steps.find((x) => x.id === id)
  if (s) s.status = 'completed'
}

export function createStepId(kind: StepKind): string {
  return generateId(kind)
}


