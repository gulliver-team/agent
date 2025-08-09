<script setup lang="ts">
import type { TimelineStep as TStep } from '../types'
import MapCard from './cards/MapCard.vue'
import HotelSelectionCard from './cards/HotelSelectionCard.vue'
import BookingSummaryCard from './cards/BookingSummaryCard.vue'
import PaymentFormCard from './cards/PaymentFormCard.vue'
import ConfirmationCard from './cards/ConfirmationCard.vue'
import HtmlCard from './cards/HtmlCard.vue'

defineProps<{ step: TStep }>()
</script>

<template>
  <div class="card p-4">
    <div v-if="step.kind === 'GenericText'">
      <p class="text-sm text-zinc-700">{{ (step as any).data.text }}</p>
    </div>
    <MapCard v-else-if="step.kind === 'MapCard'" :data="(step as any).data" />
    <HotelSelectionCard v-else-if="step.kind === 'HotelSelection'" :data="(step as any).data" />
    <BookingSummaryCard v-else-if="step.kind === 'BookingSummary'" :data="(step as any).data" />
    <PaymentFormCard v-else-if="step.kind === 'PaymentForm'" :data="(step as any).data" />
    <ConfirmationCard v-else-if="step.kind === 'Confirmation'" :data="(step as any).data" />
    <HtmlCard v-else-if="step.kind === 'HtmlCard'" :data="(step as any).data" />
  </div>
</template>


