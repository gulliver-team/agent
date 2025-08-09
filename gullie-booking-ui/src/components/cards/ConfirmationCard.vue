<script setup lang="ts">
import type { ConfirmationData } from '../../types'
const props = defineProps<{ data: ConfirmationData }>()
</script>

<template>
  <div>
    <h3 class="font-semibold mb-2">Confirmation</h3>
    <div class="text-sm text-zinc-700">Reference: <span class="font-mono">{{ props.data.reference }}</span></div>
    <div class="text-sm text-zinc-700">Hotel: {{ props.data.hotel.name }}</div>
    <div class="text-sm text-green-700 mt-2">Booking confirmed. A receipt has been emailed to you (mock).</div>
  </div>
</template>


