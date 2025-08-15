import { reactive } from 'vue'
import type { StoreState, Message, TimelineStep, StepKind, RelocationPlan, ChatThread, ServiceType } from './types'

function generateId(prefix: string = 'id'): string {
  return `${prefix}_${Math.random().toString(36).slice(2, 8)}_${Date.now().toString(36)}`
}

const DEFAULT_THREADS: ChatThread[] = [
  {
    id: 'general',
    title: 'General Planning',
    service: 'general',
    avatar: '🏠',
    color: '#6b7280',
    unreadCount: 0
  }
]

export const store = reactive<StoreState>({
  messages: [],
  steps: [],
  relocationPlan: undefined,
  threads: [...DEFAULT_THREADS],
  activeThreadId: 'general'
})

export function gullieSay(text: string, threadId?: string) {
  const activeThread = threadId || store.activeThreadId
  const msg: Message = { id: generateId('m'), role: 'gullie', text, ts: Date.now(), threadId: activeThread }
  store.messages.push(msg)
  updateThreadLastMessage(activeThread, text)
  
  // Auto-scroll to bottom after message is added
  setTimeout(() => {
    const chatContainer = document.querySelector('.overflow-y-auto')
    if (chatContainer) {
      chatContainer.scrollTop = chatContainer.scrollHeight
    }
  }, 100) // Small delay to ensure DOM update
  
  return msg
}

// Backwards compatibility
export const agentSay = gullieSay

export function userSay(text: string, threadId?: string) {
  const activeThread = threadId || store.activeThreadId
  const msg: Message = { id: generateId('m'), role: 'user', text, ts: Date.now(), threadId: activeThread }
  store.messages.push(msg)
  updateThreadLastMessage(activeThread, text)
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

// Thread management helpers
export function createThread(service: ServiceType, title: string): ChatThread {
  const serviceConfig = getServiceConfig(service)
  const thread: ChatThread = {
    id: generateId('thread'),
    title,
    service,
    avatar: serviceConfig.avatar,
    color: serviceConfig.color,
    unreadCount: 0
  }
  store.threads.push(thread)
  return thread
}

export function switchToThread(threadId: string) {
  store.activeThreadId = threadId
  // Clear unread count for this thread
  const thread = store.threads.find(t => t.id === threadId)
  if (thread) thread.unreadCount = 0
}

export function getOrCreateServiceThread(service: ServiceType): ChatThread {
  let thread = store.threads.find(t => t.service === service)
  if (!thread) {
    const serviceConfig = getServiceConfig(service)
    thread = createThread(service, serviceConfig.title)
    // Start service-specific conversation
    startServiceConversation(service, thread.id)
  }
  return thread
}

function startServiceConversation(service: ServiceType, threadId: string) {
  // Import this dynamically to avoid circular dependency
  import('./lib/serviceWorkflows').then(({ startServiceWorkflow }) => {
    startServiceWorkflow(service, threadId)
  }).catch(() => {
    // Fallback if serviceWorkflows file doesn't exist yet
    gullieSay(`How can I help you with ${getServiceConfig(service).title}?`, threadId)
  })
}

function stripHtmlTags(html: string): string {
  // Create a temporary DOM element to strip HTML tags
  const temp = document.createElement('div')
  temp.innerHTML = html
  return temp.textContent || temp.innerText || ''
}

function updateThreadLastMessage(threadId: string, message: string) {
  const thread = store.threads.find(t => t.id === threadId)
  if (thread) {
    // Strip HTML tags and get clean text for the subtitle
    const cleanMessage = stripHtmlTags(message).trim()
    thread.lastMessage = cleanMessage.length > 50 ? cleanMessage.slice(0, 50) + '...' : cleanMessage
    thread.lastMessageTime = Date.now()
    // Increment unread count if it's not the active thread
    if (threadId !== store.activeThreadId) {
      thread.unreadCount++
    }
  }
}

function getServiceConfig(service: ServiceType) {
  const configs = {
    general: { title: 'General Planning', avatar: '🏠', color: '#6b7280' },
    immigration: { title: 'Immigration & Visa', avatar: '📋', color: '#3b82f6' },
    shipping: { title: 'Shipping & Moving', avatar: '📦', color: '#f59e0b' },
    housing: { title: 'Housing', avatar: '🏡', color: '#10b981' },
    finance: { title: 'Finance & Banking', avatar: '💰', color: '#059669' },
    healthcare: { title: 'Healthcare', avatar: '🏥', color: '#dc2626' },
    transportation: { title: 'Transportation', avatar: '🚗', color: '#7c3aed' },
    lifestyle: { title: 'Lifestyle & Community', avatar: '🌟', color: '#ec4899' },
    education: { title: 'Children & Education', avatar: '🎓', color: '#f97316' },
    pets: { title: 'Pet Relocation', avatar: '🐾', color: '#8b5cf6' },
    accommodation: { title: 'Temporary Housing', avatar: '🏨', color: '#06b6d4' },
    insurance: { title: 'Insurance', avatar: '🛡️', color: '#84cc16' },
    utilities: { title: 'Utilities & Services', avatar: '⚡', color: '#64748b' }
  }
  return configs[service] || configs.general
}

// Relocation plan helpers
export function updateRelocationPlan(partial: Partial<RelocationPlan>) {
  store.relocationPlan = {
    ...(store.relocationPlan ?? { fromCity: '', toCity: '' }),
    ...partial,
  }
}


