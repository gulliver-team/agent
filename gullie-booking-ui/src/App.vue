<script setup lang="ts">
import { computed, onMounted, nextTick } from 'vue'
import { store } from './store'
import TimelineStep from './components/TimelineStep.vue'
import Timeline from './components/Timeline.vue'
import ChatPanel from './components/ChatPanel.vue'
import ThreadsList from './components/ThreadsList.vue'
import { dispatchIntent } from './lib/intent'
import { getOrCreateServiceThread } from './store'

const messages = computed(() => store.messages.filter(m => 
  m.threadId === store.activeThreadId || (!m.threadId && store.activeThreadId === 'general')
))

const activeThread = computed(() => store.threads.find(t => t.id === store.activeThreadId))

function showCreateThreadDialog() {
  // For now, just create a shipping thread as an example
  // TODO: Add proper service selection dialog
  const thread = getOrCreateServiceThread('shipping')
  store.activeThreadId = thread.id
}

function handleMessageClick(e: Event) {
  const path = (e as any).composedPath ? (e as any).composedPath() as any[] : []
  let intentEl: HTMLElement | null = null
  let anchorEl: HTMLAnchorElement | null = null

  // Search event path for intent or anchor
  for (const el of path) {
    if (!el || !(el instanceof HTMLElement)) continue
    if (!intentEl && el.hasAttribute && el.hasAttribute('data-intent')) intentEl = el
    if (!anchorEl && el.tagName === 'A') anchorEl = el as HTMLAnchorElement
    if (intentEl && anchorEl) break
  }

  // Fallbacks if composedPath not available
  if (!intentEl) {
    const t = (e.target as any)
    intentEl = (t?.closest ? t.closest('[data-intent]') : t?.parentElement?.closest?.('[data-intent]')) || null
  }
  if (!anchorEl) {
    const t = (e.target as any)
    anchorEl = (t?.closest ? t.closest('a[href]') : t?.parentElement?.closest?.('a[href]')) || null
  }

  // 1) Handle explicit intents
  if (intentEl) {
    e.preventDefault()
    const intent = intentEl.getAttribute('data-intent') || ''
    const payload = intentEl.getAttribute('data-payload')
    if (intent) dispatchIntent(intent, payload)
    return
  }

  // 2) Fallback: open plain links in new tab
  if (anchorEl && /^https?:\/\//i.test(anchorEl.getAttribute('href') || '')) {
    e.preventDefault()
    window.open(anchorEl.getAttribute('href')!, '_blank', 'noopener,noreferrer')
  }
}

// Apply theme to gullie messages after they're rendered
function applyGullieMessageTheme() {
  nextTick(() => {
    const gullieMessages = document.querySelectorAll('.gullie-message')
    gullieMessages.forEach((messageEl) => {
      const el = messageEl as HTMLElement
      const orangeBg = '#f97316'
      
      // Apply Cera Pro font to all text elements
      const allElements = el.querySelectorAll('*')
      allElements.forEach((element) => {
        const e = element as HTMLElement
        if (!e.style.fontFamily) {
          e.style.fontFamily = "'Cera Pro', sans-serif"
        }
      })
      
      // Apply orange theme to buttons and interactive elements
      const targets = el.querySelectorAll('button, [data-intent]')
      targets.forEach((t) => {
        const e = t as HTMLElement
        e.style.background = orangeBg
        e.style.borderColor = orangeBg
        e.style.color = '#ffffff'
        e.style.borderRadius = e.style.borderRadius || '8px'
        e.style.fontFamily = "'Cera Pro', sans-serif"
      })
    })
  })
}

// Watch for new messages and apply theme
onMounted(() => {
  const observer = new MutationObserver(() => {
    applyGullieMessageTheme()
  })
  observer.observe(document.body, { childList: true, subtree: true })
  applyGullieMessageTheme() // Initial application
})
</script>

<template>
  <div class="min-h-screen relative bg-gradient-to-b from-zinc-50 to-zinc-100">
    <div class="pointer-events-none absolute inset-0 z-0 opacity-10 bg-[url('/arch-illustration.png')] bg-center bg-cover"></div>
    <div class="relative z-10 max-w-6xl mx-auto p-4">
      <!-- Centered Gullie Logo -->
      <div class="flex justify-center mb-8">
        <img src="/gullie-black-logo.png" alt="Gullie" class="h-16 w-auto" />
      </div>
      <div class="grid grid-cols-1 lg:grid-cols-4 gap-4">
        <!-- Threads Panel -->
        <div class="lg:col-span-1 rounded-2xl border border-zinc-200 bg-white h-[80vh] min-h-0 flex flex-col overflow-hidden">
          <ThreadsList @create-thread="showCreateThreadDialog" />
        </div>
        
        <!-- Chat Panel -->
        <div class="lg:col-span-2 rounded-2xl border border-zinc-200 bg-white h-[80vh] min-h-0 flex flex-col overflow-hidden">
          <div class="px-4 py-3 border-b flex items-center justify-between bg-white">
            <div class="flex items-center gap-3">
              <div v-if="activeThread" class="text-lg">{{ activeThread.avatar }}</div>
              <div>
                <div class="font-semibold" style="font-family: 'Cera Pro', sans-serif">
                  {{ activeThread?.title || 'Gullie Chat' }}
                </div>
                <div class="text-xs text-zinc-500" style="font-family: 'Cera Pro', sans-serif">
                  Chat with your relocation assistant
                </div>
              </div>
            </div>
          </div>
          <ChatPanel>
            <template v-if="messages.length === 0">
              <div class="p-6">
                <h2 class="text-2xl md:text-3xl font-bold text-zinc-900">Where are you moving to?</h2>
                <ol class="mt-6 space-y-4">
                  <li class="flex items-start gap-3">
                    <span class="h-8 w-8 rounded-full bg-orange-500 text-white grid place-items-center font-semibold">1</span>
                    <div class="text-zinc-800">Tell us where you are moving <span class="font-semibold">from</span> and <span class="font-semibold">to</span> (e.g., “I am moving from New York to London”).</div>
                  </li>
                  <li class="flex items-start gap-3">
                    <span class="h-8 w-8 rounded-full bg-orange-500 text-white grid place-items-center font-semibold">2</span>
                    <div class="text-zinc-800">Ask for specific tasks and the Gullie agent will guide you and connect you to the right vendors.</div>
                  </li>
                </ol>
              </div>
            </template>
            <template v-else>
              <div v-for="m in messages" :key="m.id" class="space-y-2">
                <div class="flex items-start gap-2 p-2 rounded-lg" :class="m.role === 'gullie' ? 'bg-orange-50' : 'bg-zinc-50'">
                  <div class="text-[10px] uppercase tracking-wide pill" :class="m.role === 'gullie' ? 'bg-orange-100 border-orange-200 text-orange-700' : 'bg-zinc-100'">{{ m.role }}</div>
                  <div 
                    class="text-sm leading-5 text-zinc-800" 
                    :class="m.role === 'gullie' ? 'gullie-message' : ''"
                    v-if="m.role === 'gullie' && m.text.includes('<')" 
                    v-html="m.text"
                    @click="handleMessageClick"
                  ></div>
                  <div 
                    class="text-sm leading-5 text-zinc-800" 
                    v-else
                  >{{ m.text }}</div>
                </div>
                <template v-for="s in store.steps.filter(s => s.afterMessageId === m.id)" :key="s.id">
                  <TimelineStep :step="s" />
                </template>
              </div>
            </template>
          </ChatPanel>
        </div>
        <div class="lg:col-span-1 rounded-2xl border border-zinc-200 bg-white h-[80vh] min-h-0 flex flex-col overflow-hidden">
          <div class="px-4 py-3 border-b flex items-center justify-between bg-zinc-50">
            <div class="font-semibold">Timeline</div>
          </div>
          <div class="flex-1 min-h-0 overflow-y-auto p-4 bg-white">
            <Timeline />
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
