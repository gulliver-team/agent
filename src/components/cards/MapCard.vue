<script setup lang="ts">
import { onMounted, ref, watch } from 'vue'
import type { MapCardData, HotelOption } from '../../types'
import * as L from 'leaflet'

const props = defineProps<{ data: MapCardData }>()
const mapEl = ref<HTMLDivElement | null>(null)
let map: L.Map | null = null
let markers: L.Marker[] = []

function renderMarkers(hotels: HotelOption[]) {
  markers.forEach((m) => m.remove())
  markers = []
  const venueIcon = L.divIcon({ html: '<div class="w-3 h-3 rounded-full bg-red-600 border-2 border-white"></div>', className: '' })
  const hotelIcon = L.divIcon({ html: '<div class="w-3 h-3 rounded-full bg-orange-500 border-2 border-white"></div>', className: '' })
  const v = props.data.venue.location
  L.marker([v.lat, v.lng], { icon: venueIcon }).addTo(map!)
  hotels.forEach((h) => {
    const m = L.marker([h.location.lat, h.location.lng], { icon: hotelIcon }).addTo(map!)
    m.bindPopup(`${h.name} — $${h.price}/night${h.distanceMeters ? ` • ${h.distanceMeters} m` : ''}`)
    markers.push(m)
  })
}

onMounted(() => {
  if (!mapEl.value) return
  const center = props.data.venue.location
  map = L.map(mapEl.value).setView([center.lat, center.lng], 15)
  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', { maxZoom: 19, attribution: '© OpenStreetMap' }).addTo(map)
  L.circle([center.lat, center.lng], { radius: props.data.radiusMeters, color: '#f97316', fillColor: '#fdba74', fillOpacity: 0.2 }).addTo(map)
  renderMarkers(props.data.hotels)
})

watch(() => props.data.hotels, (h) => {
  if (map) renderMarkers(h)
})
</script>

<template>
    <div>
      <div class="h-[280px] w-full rounded-2xl overflow-hidden" ref="mapEl"></div>
      <div class="mt-2 text-xs text-zinc-600 dark:text-zinc-400">Red pin: venue. Blue pins: hotels. Circle: ~5-minute walk.</div>
    </div>
</template>


