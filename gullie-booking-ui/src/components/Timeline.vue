<script setup lang="ts">
import { computed } from 'vue'
import { store } from '../store'

const plan = computed(() => store.relocationPlan)
const items = computed(() => {
  if (!plan.value) return [] as Array<{ title: string; subtitle?: string; details?: string[] }>
  const base: Array<{ title: string; subtitle?: string; details?: string[] }> = []
  
  // Origin city (first dot)
  base.push({ 
    title: plan.value.fromCity || 'Origin',
    subtitle: undefined // No date here anymore
  })
  
  // Profile details section
  const profileDetails: string[] = []
  if (plan.value.householdSize) {
    profileDetails.push(`${plan.value.householdSize} ${plan.value.householdSize === 1 ? 'person' : 'people'}`)
  }
  if (plan.value.hasPets !== undefined) {
    if (plan.value.hasPets) {
      profileDetails.push(`Pets: ${plan.value.petDetails || 'Yes'}`)
    } else {
      profileDetails.push('No pets')
    }
  }
  if (plan.value.hasVisa !== undefined) {
    profileDetails.push(plan.value.hasVisa ? 'Visa: Already have' : 'Visa: Need assistance')
  }
  if (plan.value.budget) {
    profileDetails.push(`Budget: $${plan.value.budget}`)
  }
  
  if (profileDetails.length > 0) {
    base.push({ title: 'Profile details', details: profileDetails })
  }
  
  // Accommodation details
  if (plan.value.hotelName || plan.value.hotelConfirmation) {
    const details: string[] = []
    if (plan.value.hotelName) details.push(plan.value.hotelName)
    if (plan.value.hotelAddress) details.push(plan.value.hotelAddress)
    if (plan.value.hotelConfirmation) details.push(`Ref: ${plan.value.hotelConfirmation}`)
    base.push({ title: 'Temporary accommodation', details })
  }
  
  // Scheduled dates
  if (plan.value.packingDate) base.push({ title: 'Packing scheduled', subtitle: plan.value.packingDate })
  if (plan.value.furniturePickupDate) base.push({ title: 'Furniture pickup', subtitle: plan.value.furniturePickupDate })
  if (plan.value.travelBookingRef) base.push({ title: 'Travel booked', subtitle: `Ref ${plan.value.travelBookingRef}` })
  
  // Standard workflow items
  base.push({ title: 'Immigration & paperwork' })
  base.push({ title: 'Utilities & services' })
  
  // Move-day logistics with the move date
  const moveDate = plan.value.moveDate || plan.value.date || plan.value.selectedDate
  base.push({ 
    title: 'Move‑day logistics',
    subtitle: moveDate ? `Move date: ${moveDate}` : 'Date TBD'
  })
  
  // Destination city (last dot)
  base.push({ 
    title: plan.value.toCity || 'Destination',
    subtitle: undefined
  })
  
  return base
})
</script>

<template>
  <div v-if="!plan">No plan yet. Start chatting to create one.</div>
  <ol v-else class="relative border-l border-zinc-200 pl-4 space-y-6">
    <li v-for="(it, idx) in items" :key="idx" class="ml-2">
      <div class="absolute -left-1.5 mt-1.5 h-3 w-3 rounded-full bg-orange-500"></div>
      <div class="text-sm font-medium text-zinc-900">{{ it.title }}</div>
      <div v-if="it.subtitle" class="text-xs text-zinc-500">{{ it.subtitle }}</div>
      <div v-if="it.details && it.details.length > 0" class="mt-1 space-y-1">
        <div v-for="detail in it.details" :key="detail" class="text-xs text-zinc-600 bg-zinc-50 px-2 py-1 rounded">
          {{ detail }}
        </div>
      </div>
    </li>
  </ol>
</template>


