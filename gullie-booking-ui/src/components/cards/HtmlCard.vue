<script setup lang="ts">
import { onMounted, onBeforeUnmount, ref, watch } from 'vue'
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
  applyTheme()
})
onBeforeUnmount(() => {
  root.value?.removeEventListener('click', onClick)
})

watch(() => props.data.html, () => applyTheme())

function applyTheme() {
  const el = root.value
  if (!el) return
  const orangeBg = '#f97316'
  const orangeFill = '#fdba74'
  
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
  
  // Badges/chips
  el.querySelectorAll('.chip, .badge').forEach((t) => {
    const e = t as HTMLElement
    e.style.background = orangeFill
    e.style.borderColor = orangeBg
    e.style.color = '#7c2d12'
    e.style.fontFamily = "'Cera Pro', sans-serif"
  })
}
</script>

<template>
  <div ref="root" class="overflow-hidden" :style="{ minHeight: (props.data.height || 0) + 'px' }">
    <div v-html="props.data.html"></div>
  </div>
</template>


