<script setup lang="ts">
import { computed, ref } from 'vue'
import type { HotelSelectionData } from '../../types'
import { chooseHotel } from '../../api/mock'

const props = defineProps<{ data: HotelSelectionData }>()
const budget = ref(props.data.budget ?? 0)
const exactBudget = ref(props.data.budget?.toString() ?? '')

const filtered = computed(() => {
  if (!budget.value) return props.data.hotels
  return props.data.hotels.filter((h) => h.price <= budget.value)
})

function updateExact(e: Event) {
  const v = Number((e.target as HTMLInputElement).value || '0')
  budget.value = v
  exactBudget.value = v ? String(v) : ''
}

function setBudgetFromText() {
  const v = Number(exactBudget.value || '0')
  budget.value = v
}
</script>

<template>
  <div>
    <div class="flex items-center justify-between mb-3">
      <h3 class="font-semibold">Select a hotel</h3>
      <div class="text-xs text-zinc-600">{{ filtered.length }} options</div>
    </div>

    <div v-if="props.data.budget" class="mb-3 flex items-center gap-3">
      <div class="text-sm">Budget</div>
      <input type="range" min="100" max="500" step="10" v-model.number="budget" class="w-48" />
      <input class="input w-24" placeholder="$" v-model="exactBudget" @change="setBudgetFromText" />
      <div class="pill">Up to ${{ budget || '∞' }}</div>
    </div>

    <div class="grid grid-cols-1 md:grid-cols-2 gap-3">
      <div v-for="h in filtered" :key="h.id" class="border rounded-xl p-3 hover:shadow-soft transition bg-white">
        <div class="flex items-center justify-between">
          <div>
            <div class="font-medium">{{ h.name }}</div>
            <div class="text-xs text-zinc-600">{{ h.address }}</div>
          </div>
          <div class="text-right">
            <div class="font-semibold">${{ h.price }}</div>
            <div class="text-xs text-zinc-600" v-if="h.distanceMeters">
              <span class="pill">{{ h.distanceMeters }} m</span>
              <span class="pill ml-1">{{ h.walkMinutes }} min</span>
            </div>
          </div>
        </div>
        <div class="mt-3">
          <button class="btn-primary" @click="chooseHotel(h.id)">Select</button>
        </div>
      </div>
    </div>
  </div>
  
</template>


