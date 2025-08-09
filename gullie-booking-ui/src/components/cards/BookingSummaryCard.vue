<script setup lang="ts">
import type { BookingSummaryData } from '../../types'
import { upsertStep, createStepId } from '../../store'

const props = defineProps<{ data: BookingSummaryData }>()

function proceedToPayment() {
  const amount = props.data.hotel.price
  upsertStep({ id: createStepId('PaymentForm'), kind: 'PaymentForm', status: 'in_progress', data: { amount, hotel: props.data.hotel } })
}
</script>

<template>
  <div>
    <h3 class="font-semibold mb-2">Booking summary</h3>
    <div class="text-sm text-zinc-700">Hotel: <span class="font-medium">{{ props.data.hotel.name }}</span></div>
    <div class="text-sm text-zinc-700">Venue: {{ props.data.venue.name }}</div>
    <div class="text-sm text-zinc-700">Total: <span class="font-medium">${{ props.data.hotel.price }}</span> / night</div>
    <button class="btn-primary mt-3" @click="proceedToPayment">Proceed to payment</button>
  </div>
</template>


