<script setup lang="ts">
import type { PaymentFormData } from '../../types'
import { payNow } from '../../api/mock'

const props = defineProps<{ data: PaymentFormData }>()

function pay() {
  payNow(props.data.amount)
}
</script>

<template>
  <div>
    <h3 class="font-semibold mb-2">Payment</h3>
    <div class="text-sm text-zinc-700 mb-3">Amount: ${{ props.data.amount }}</div>
    <div class="grid grid-cols-1 md:grid-cols-2 gap-3">
      <input class="input" placeholder="Card number" />
      <div class="flex gap-2">
        <input class="input w-1/2" placeholder="MM/YY" />
        <input class="input w-1/2" placeholder="CVC" />
      </div>
      <input class="input" placeholder="Name on card" />
    </div>
    <button class="btn-primary mt-3" @click="pay">Pay now</button>
  </div>
</template>


