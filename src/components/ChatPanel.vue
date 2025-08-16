<script setup lang="ts">
import { ref, onBeforeUnmount, onMounted } from 'vue'
import { isSpeechSupported, startListening } from '../lib/voice'
import { callOpenAIResponse, getOpenAIApiKey, setOpenAIApiKey, AVAILABLE_MODELS, getSelectedModel, setSelectedModel } from '../lib/openai'
import { SYSTEM_INSTRUCTIONS } from '../instructions/system'
import { userSay, gullieSay, updateRelocationPlan, store } from '../store'
import { handleHotelSearch } from '../lib/intent'

// Import service-specific instruction functions from intent.ts
function getServiceSpecificInstructions(serviceType: string): string {
  const baseInstructions = SYSTEM_INSTRUCTIONS
  
  const serviceSpecificContext: Record<string, string> = {
    'shipping': `
CURRENT SERVICE CONTEXT: You are operating in the SHIPPING & MOVING service thread ONLY.

Your role: Expert shipping and moving specialist
Your focus: ONLY shipping, moving, furniture, inventory, packing, containers, movers, quotes, logistics
FORBIDDEN topics: Immigration, pets, visas, temporary housing, accommodation (unless moving-related storage)

Allowed topics:
- Household size assessment for shipping volume
- Shipping type selection (everything, essentials, furniture only)
- Moving quotes and mover recommendations  
- Packing services and timelines
- Container sizes and shipping methods
- Moving logistics and coordination

NEVER discuss: immigration, visas, pets, accommodation booking, hotels
`,
    'pets': `
CURRENT SERVICE CONTEXT: You are operating in the PET RELOCATION service thread ONLY.

Your role: Expert pet relocation specialist  
Your focus: ONLY pets, animals, veterinary requirements, pet travel, pet documentation
FORBIDDEN topics: Shipping furniture, moving household goods, immigration for humans, temporary housing

Allowed topics:
- Pet types and breeds
- Pet size and weight requirements
- Veterinary documentation for travel
- Pet quarantine requirements
- Pet carrier requirements and airline policies
- Pet health certificates and vaccinations
- Pet import/export permits

NEVER discuss: furniture shipping, human immigration, accommodation booking, moving household goods
`,
    'immigration': `
CURRENT SERVICE CONTEXT: You are operating in the IMMIGRATION & VISA service thread ONLY.

Your role: Expert immigration and visa specialist
Your focus: ONLY immigration, visas, work permits, documentation, legal status
FORBIDDEN topics: Shipping furniture, pet relocation, temporary accommodation booking

Allowed topics:
- Visa types and requirements
- Work permits and job status
- Immigration documentation
- Legal status and applications
- Immigration lawyers and specialists
- Visa timelines and processes

NEVER discuss: pet relocation, furniture shipping, temporary accommodation booking
`,
    'housing': `
CURRENT SERVICE CONTEXT: You are operating in the TEMPORARY HOUSING service thread ONLY.

Your role: Expert temporary accommodation specialist
Your focus: ONLY temporary housing, hotels, serviced apartments, short-term rentals
FORBIDDEN topics: Shipping furniture, pet relocation, immigration visas

Allowed topics:
- Temporary accommodation types
- Hotel and serviced apartment options
- Short-term rental properties
- Accommodation booking and rates
- Neighborhood recommendations for temporary stays
- Extended stay options

NEVER discuss: pet relocation, furniture shipping, immigration visas
`
  }

  // For general/unknown threads, allow hotel search functionality
  if (serviceType === 'general' || !serviceSpecificContext[serviceType]) {
    return baseInstructions + `
CURRENT SERVICE CONTEXT: You are operating in the GENERAL planning thread.

You can help with:
- Initial relocation planning and overview
- Hotel and accommodation search (you have access to web_search_preview tool)
- General relocation guidance  
- Directing users to specific service threads

When users ask for hotel/accommodation search, use the web_search_preview tool to find real options.
`
  }
  
  return baseInstructions + serviceSpecificContext[serviceType]
}

function getServiceFromThread(threadId: string): string {
  const thread = store.threads.find(t => t.id === threadId)
  if (!thread) return 'general'
  
  // Extract service type from thread title/service
  if (thread.service) return thread.service
  if (thread.title.includes('Shipping')) return 'shipping'
  if (thread.title.includes('Pet')) return 'pets'
  if (thread.title.includes('Immigration')) return 'immigration'
  if (thread.title.includes('Housing')) return 'housing'
  return 'general'
}
// import { handleBookingQuery } from '../api/mock'

const input = ref('')
const listening = ref(false)
let stopFn: (() => void) | null = null
const apiKeySet = ref(!!getOpenAIApiKey())
const sending = ref(false)
const selectedModel = ref(getSelectedModel())
const showModelSelector = ref(false)

function toTitleCase(text: string): string {
  return text
    .trim()
    .replace(/\s+/g, ' ')
    .split(' ')
    .filter(Boolean)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(' ')
}

function extractRelocationCities(text: string): { from?: string; to?: string } {
  // Prefer explicit "from X to Y"
  const explicit = /\bfrom\s+([A-Za-z][A-Za-z\s]+?)\s+to\s+([A-Za-z][A-Za-z\s]+?)(?:[.,!?]|$)/i.exec(text)
  if (explicit) {
    return { from: toTitleCase(explicit[1]), to: toTitleCase(explicit[2]) }
  }
  // Fallback: "X to Y" at start, but avoid leading verbs/pronouns
  const simple = /^\s*([A-Za-z][A-Za-z\s]{1,40})\s+to\s+([A-Za-z][A-Za-z\s]{1,40})\b/i.exec(text)
  if (simple) {
    const left = simple[1]
    if (!/\b(i|i'm|im|we|we're|moving|move|from)\b/i.test(left)) {
      return { from: toTitleCase(left), to: toTitleCase(simple[2]) }
    }
  }
  return {}
}

function send() {
  const text = input.value.trim()
  if (!text) return
  userSay(text)
  input.value = ''
  // Demo: fetch a model reply using system instructions (pirate)
  ;(async () => {
    sending.value = true
    try {
      // 1) First call may include tool requests (e.g., web_search_preview)
      const currentServiceType = getServiceFromThread(store.activeThreadId)
      const serviceInstructions = getServiceSpecificInstructions(currentServiceType)
      const reply = await callOpenAIResponse(text, { instructions: serviceInstructions, reasoningEffort: 'low', tools: [{ type: 'web_search_preview' }] })

      // Detect TOOL_REQUEST: {"tool":"web_search_preview", ...}
      const toolMatch = reply.match(/TOOL_REQUEST:\s*(\{[\s\S]*\})/)
      if (toolMatch) {
        const toolPayload = JSON.parse(toolMatch[1])
        if (toolPayload.tool === 'web_search_preview') {
          // 2) Auto-run hotel search if the query looks like a hotel request
          await handleHotelSearch({ query: toolPayload.query })
        } else {
          gullieSay('Unsupported tool.')
        }
      } else {
        // If the HTML includes a search button, run it directly; else render as is
        const maybeBtn = /data-intent=\"(search_hotels|start_hotel_search|start_search)\"[\s\S]*?data-payload=\"([\s\S]*?)\"/i.exec(reply)
        if (maybeBtn) {
          const payloadStr = maybeBtn[2]
          const payload = payloadStr
            .replace(/&quot;/g, '"')
            .replace(/&#34;/g, '"')
            .replace(/&apos;/g, "'")
            .replace(/&#39;/g, "'")
            .replace(/&amp;/g, '&')
          try { await handleHotelSearch(JSON.parse(payload)); sending.value = false; return } catch {}
        }
        // Instead of creating a separate HtmlCard, embed HTML directly in the message
        gullieSay(reply)
      }

      // Extract only the cities and store in the plan (title-cased)
      const { from, to } = extractRelocationCities(text)
      if (from || to) updateRelocationPlan({ fromCity: from || '', toCity: to || '' })
      const dateMatch = text.match(/(\d{4}-\d{2}-\d{2}|\b(?:jan|feb|mar|apr|may|jun|jul|aug|sep|sept|oct|nov|dec)[a-z]*\s+\d{1,2}\b|\d{1,2}\/\d{1,2})/i)
      if (dateMatch) updateRelocationPlan({ date: dateMatch[1] })
    } catch (e) {
      // Fallback to mock flow if model call fails
      gullieSay(String(e))
    }
    sending.value = false
  })()
}

function toggleMic() {
  if (!isSpeechSupported()) return
  if (listening.value) {
    stopFn?.()
    listening.value = false
  } else {
    stopFn = startListening((t) => {
      input.value = t
    })
    listening.value = true
    setTimeout(() => {
      if (listening.value) {
        stopFn?.()
        listening.value = false
        send()
      }
    }, 3000)
  }
}

function selectModel(modelId: string) {
  selectedModel.value = modelId
  setSelectedModel(modelId)
  showModelSelector.value = false
}

function getCurrentModelName(): string {
  const model = AVAILABLE_MODELS.find(m => m.id === selectedModel.value)
  return model?.name || selectedModel.value
}

// Close model selector when clicking outside
onMounted(() => {
  const handleClickOutside = (e: Event) => {
    if (showModelSelector.value && !(e.target as Element)?.closest('.relative')) {
      showModelSelector.value = false
    }
  }
  document.addEventListener('click', handleClickOutside)
  onBeforeUnmount(() => {
    document.removeEventListener('click', handleClickOutside)
  })
})

onBeforeUnmount(() => stopFn?.())

async function setKey() {
  const key = prompt('Enter OpenAI API Key (will be stored in localStorage for demo)')
  if (key) {
    setOpenAIApiKey(key)
    apiKeySet.value = true
    try {
      const reply = await callOpenAIResponse('Write a short bedtime story about a unicorn.')
      console.log('OpenAI test reply:', reply)
    } catch (e) {
      alert(String(e))
    }
  }
}
</script>

<template>
    <div class="h-full min-h-0 flex flex-col">
      <div class="flex-1 min-h-0 overflow-y-auto space-y-2 p-3">
        <!-- Messages rendered in App -->
        <slot />
      </div>
      <div class="border-t p-3 relative z-10 bg-transparent dark:border-zinc-700">
        <div class="flex items-center gap-2">
          <input v-model="input" class="input flex-1" placeholder="Type a message to the agent..." @keyup.enter="send" />
          <button class="btn" :disabled="sending" @click="send">
            <span v-if="!sending">Send</span>
            <span v-else>Sending…</span>
        </button>
        <button class="btn" :class="{ 'bg-orange-50 border-orange-400': listening }" @click="toggleMic" :title="isSpeechSupported() ? 'Voice input' : 'Voice not supported'">
          <span v-if="!listening">🎤</span>
          <span v-else>⏹</span>
        </button>
        <button class="btn" @click="setKey" :title="apiKeySet ? 'Update API key' : 'Set OpenAI API key'">🔑</button>
          <div class="relative">
            <button class="btn" @click="showModelSelector = !showModelSelector" :title="`Current model: ${getCurrentModelName()}`">🤖</button>

            <!-- Model Selector Dropdown -->
            <div v-if="showModelSelector" class="absolute bottom-full right-0 mb-2 bg-white border border-zinc-200 rounded-lg shadow-lg z-20 min-w-64 dark:bg-zinc-800 dark:border-zinc-700">
              <div class="p-3 border-b border-zinc-100 dark:border-zinc-700">
                <div class="font-semibold text-sm text-zinc-900 dark:text-zinc-100">Select AI Model</div>
                <div class="text-xs text-zinc-500 dark:text-zinc-400 mt-1">Current: {{ getCurrentModelName() }}</div>
              </div>
              <div class="max-h-64 overflow-y-auto">
                <div v-for="model in AVAILABLE_MODELS" :key="model.id"
                     class="p-3 hover:bg-zinc-50 cursor-pointer border-b border-zinc-50 last:border-b-0 dark:hover:bg-zinc-700 dark:border-zinc-700"
                     :class="{ 'bg-orange-50 dark:bg-orange-900/30 border-orange-100 dark:border-orange-700': model.id === selectedModel }"
                     @click="selectModel(model.id)">
                  <div class="flex items-center justify-between">
                    <div>
                      <div class="font-medium text-sm text-zinc-900 dark:text-zinc-100">{{ model.name }}</div>
                      <div class="text-xs text-zinc-500 dark:text-zinc-400">{{ model.description }}</div>
                    </div>
                    <div v-if="model.id === selectedModel" class="text-orange-500 text-xs">✓</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
        <div class="text-[11px] text-zinc-500 dark:text-zinc-400 mt-1" v-if="isSpeechSupported()">Tip: Tap mic and speak; it will auto-send.</div>
        <div class="text-[11px] text-zinc-500 dark:text-zinc-400 mt-1" v-if="sending">Model thinking… ({{ getCurrentModelName() }})</div>
      </div>
    </div>
  </template>


