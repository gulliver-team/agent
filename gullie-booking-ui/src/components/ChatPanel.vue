<script setup lang="ts">
import { ref, onBeforeUnmount } from 'vue'
import { isSpeechSupported, startListening } from '../lib/voice'
import { callOpenAIResponse, getOpenAIApiKey, setOpenAIApiKey } from '../lib/openai'
import { SYSTEM_INSTRUCTIONS } from '../instructions/system'
import { userSay, agentSay, upsertStep, createStepId } from '../store'
import { handleHotelSearch } from '../lib/intent'
// import { handleBookingQuery } from '../api/mock'

const input = ref('')
const listening = ref(false)
let stopFn: (() => void) | null = null
const apiKeySet = ref(!!getOpenAIApiKey())
const sending = ref(false)

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
          const a = agentSay('')
          upsertStep({ id: createStepId('HtmlCard'), kind: 'HtmlCard', status: 'in_progress', afterMessageId: a.id, ts: Date.now(), data: { html: `<section style="padding:12px;border:1px solid #e5e7eb;border-radius:12px;background:#fff"><p style="margin:0;font:13px system-ui">Unsupported tool.</p></section>` } } as any)
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
        const a = agentSay('')
        upsertStep({ id: createStepId('HtmlCard'), kind: 'HtmlCard', status: 'in_progress', afterMessageId: a.id, ts: Date.now(), data: { html: reply } } as any)
      }
    } catch (e) {
      // Fallback to mock flow if model call fails
      agentSay(String(e))
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
  <div class="h-full min-h-0 flex flex-col relative">
    <div class="pointer-events-none absolute inset-0 -z-10 opacity-20 bg-[url('/arch-illustration.png')] bg-center bg-contain md:bg-cover"></div>
    <div class="flex-1 min-h-0 overflow-y-auto space-y-2 p-3">
      <!-- Messages rendered in App -->
      <slot />
    </div>
    <div class="border-t p-3">
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
      </div>
      <div class="text-[11px] text-zinc-500 mt-1" v-if="isSpeechSupported()">Tip: Tap mic and speak; it will auto-send.</div>
      <div class="text-[11px] text-zinc-500 mt-1" v-if="sending">Model thinking…</div>
    </div>
  </div>
</template>


