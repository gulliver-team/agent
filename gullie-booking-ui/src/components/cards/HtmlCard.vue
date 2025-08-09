<script setup lang="ts">
import { onMounted, onBeforeUnmount, ref } from 'vue'
import type { HtmlCardData } from '../../types'
import { dispatchIntent } from '../../lib/intent'
const props = defineProps<{ data: HtmlCardData }>()

const root = ref<HTMLElement | null>(null)
function onClick(e: Event) {
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

onMounted(() => {
  root.value?.addEventListener('click', onClick)
})
onBeforeUnmount(() => {
  root.value?.removeEventListener('click', onClick)
})
</script>

<template>
  <div ref="root" class="card overflow-hidden" :style="{ minHeight: (props.data.height || 0) + 'px' }">
    <div class="p-0" v-html="props.data.html"></div>
  </div>
</template>


