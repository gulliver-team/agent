<script setup lang="ts">
import { computed } from 'vue'
import { store } from '../store'
import TimelineStep from './TimelineStep.vue'

const steps = computed(() => store.steps)
;(window as any).__store_steps = steps.value
</script>

<template>
  <div class="h-full overflow-y-auto p-4 space-y-3 bg-zinc-50">
    <TimelineStep v-for="s in steps" :key="s.id" :step="s" />
  </div>
</template>


