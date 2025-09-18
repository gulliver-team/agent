<script setup lang="ts">
import { ref, onMounted } from 'vue'

const isDark = ref(false)

onMounted(() => {
  isDark.value = document.documentElement.classList.contains('dark')
})

function toggle() {
  isDark.value = !isDark.value
  const root = document.documentElement
  if (isDark.value) {
    root.classList.add('dark')
  } else {
    root.classList.remove('dark')
  }
}
</script>

<template>
  <button
    @click="toggle"
    class="p-2 rounded-full border border-zinc-300 hover:bg-zinc-50 dark:border-zinc-600 dark:hover:bg-zinc-700"
    aria-label="Toggle dark mode"
  >
    <span v-if="!isDark">🌙</span>
    <span v-else>☀️</span>
  </button>
</template>
