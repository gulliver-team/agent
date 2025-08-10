<script setup lang="ts">
import { computed } from 'vue'
import { store } from './store'
import TimelineStep from './components/TimelineStep.vue'
import ChatPanel from './components/ChatPanel.vue'
// Using TimelineStep directly for itinerary items rendered after messages

const messages = computed(() => store.messages)
</script>

<template>
  <div class="min-h-screen relative bg-gradient-to-b from-zinc-50 to-zinc-100">
    <header class="sticky top-0 z-10 backdrop-blur bg-white/70 border-b">
      <div class="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between">
        <div class="flex items-center gap-3">
          <img src="/gullie-black-logo.png" alt="Gullie" class="h-8 w-auto" />
        </div>
      </div>
    </header>

    <div class="max-w-6xl mx-auto p-4">
      <div class="grid grid-cols-1 gap-4">
        <div class="rounded-2xl border border-zinc-200 bg-white h-[80vh] min-h-0 flex flex-col">
          <div class="px-4 py-3 border-b flex items-center justify-between bg-zinc-50">
            <div class="font-semibold">Agent Chat</div>
            <div class="text-xs text-zinc-500">Chat + Voice</div>
          </div>
          <ChatPanel>
            <template v-if="messages.length === 0">
              <div class="p-3 text-sm text-zinc-700">
                <div class="font-medium mb-1">Start a booking</div>
                <div>Tell the agent your destination, date, walking time, and budget.</div>
                <ul class="list-disc ml-5 mt-2 space-y-1 text-zinc-600">
                  <li>“Book a hotel near Javits Center on Sep 21, within 5 minutes walk, budget $220.”</li>
                  <li>“Find hotels near Times Square on 9/21 under $250.”</li>
                  <li>“Stay near the conference venue in New York on September 21 under $200.”</li>
                </ul>
                <div class="text-[11px] text-zinc-500 mt-3">Tip: Click the mic to speak your request if voice is supported.</div>
              </div>
            </template>
            <template v-else>
              <div v-for="m in messages" :key="m.id" class="space-y-2">
                <div class="flex items-start gap-2 p-2 rounded-lg" :class="m.role === 'agent' ? 'bg-orange-50' : 'bg-zinc-50'">
                  <div class="text-[10px] uppercase tracking-wide pill" :class="m.role === 'agent' ? 'bg-orange-100 border-orange-200 text-orange-700' : 'bg-zinc-100'">{{ m.role }}</div>
                  <div class="text-sm leading-5 text-zinc-800">{{ m.text }}</div>
                </div>
                <template v-for="s in store.steps.filter(s => s.afterMessageId === m.id)" :key="s.id">
                  <TimelineStep :step="s" />
                </template>
              </div>
            </template>
          </ChatPanel>
        </div>
        <!-- Right panel intentionally removed per request -->
      </div>
    </div>
  </div>
</template>
