<script setup lang="ts">
import { ref, onBeforeUnmount, onMounted } from 'vue'
import { isSpeechSupported, startListening } from '../lib/voice'
import { callOpenAIResponse, getOpenAIApiKey, setOpenAIApiKey, AVAILABLE_MODELS, getSelectedModel, setSelectedModel } from '../lib/openai'
import { SYSTEM_INSTRUCTIONS } from '../instructions/system'
import { userSay, gullieSay, updateRelocationPlan } from '../store'
import { handleHotelSearch } from '../lib/intent'
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
      const reply = await callOpenAIResponse(text, { instructions: SYSTEM_INSTRUCTIONS, reasoningEffort: 'low', tools: [{ type: 'web_search_preview' }] })

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
    <div class="border-t p-3 relative z-10 bg-transparent">
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
          <div v-if="showModelSelector" class="absolute bottom-full right-0 mb-2 bg-white border border-zinc-200 rounded-lg shadow-lg z-20 min-w-64">
            <div class="p-3 border-b border-zinc-100">
              <div class="font-semibold text-sm text-zinc-900">Select AI Model</div>
              <div class="text-xs text-zinc-500 mt-1">Current: {{ getCurrentModelName() }}</div>
            </div>
            <div class="max-h-64 overflow-y-auto">
              <div v-for="model in AVAILABLE_MODELS" :key="model.id" 
                   class="p-3 hover:bg-zinc-50 cursor-pointer border-b border-zinc-50 last:border-b-0" 
                   :class="{ 'bg-orange-50 border-orange-100': model.id === selectedModel }"
                   @click="selectModel(model.id)">
                <div class="flex items-center justify-between">
                  <div>
                    <div class="font-medium text-sm text-zinc-900">{{ model.name }}</div>
                    <div class="text-xs text-zinc-500">{{ model.description }}</div>
                  </div>
                  <div v-if="model.id === selectedModel" class="text-orange-500 text-xs">✓</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
      <div class="text-[11px] text-zinc-500 mt-1" v-if="isSpeechSupported()">Tip: Tap mic and speak; it will auto-send.</div>
      <div class="text-[11px] text-zinc-500 mt-1" v-if="sending">Model thinking… ({{ getCurrentModelName() }})</div>
    </div>
  </div>
</template>


