import { gullieSay, upsertStep, createStepId } from '../store'
import { store } from '../store'
import type { HotelOption, TimelineStep, Venue } from '../types'
import { haversineDistanceMeters, mockGeocode, walkTimeMinutes } from './geo'

function parseBudget(text: string): number | undefined {
  // Match amounts like "$1,200", "budget is 2500" or "$150.50"
  const pattern = '\\d+(?:,\\d{3})*(?:\\.\\d+)?'

  const mDollar = text.match(new RegExp(`\\$\\s*(${pattern})`))
  if (mDollar) return Number(mDollar[1].replace(/,/g, ''))

  const mBudget = text.match(new RegExp(`budget\\s*(?:is|=|:)?\\s*(${pattern})`, 'i'))
  if (mBudget) return Number(mBudget[1].replace(/,/g, ''))

  return undefined
}

function parseDate(text: string): string | undefined {
  const mIso = text.match(/(\d{4}-\d{2}-\d{2})/)
  if (mIso) return mIso[1]
  const mUs = text.match(/(\d{1,2})\/(\d{1,2})(?:\/(\d{2,4}))?/)
  if (mUs) {
    const [_, mm, dd, yyyy] = mUs
    const year = yyyy?.length === 2 ? `20${yyyy}` : yyyy ?? `${new Date().getFullYear()}`
    return `${year}-${mm.padStart(2, '0')}-${dd.padStart(2, '0')}`
  }
  const mMon = text.match(/(jan|feb|mar|apr|may|jun|jul|aug|sep|sept|oct|nov|dec)[a-z]*\s*(\d{1,2})/i)
  if (mMon) {
    const months = ['jan','feb','mar','apr','may','jun','jul','aug','sep','oct','nov','dec']
    const mon = months.findIndex(m => m === mMon[1].slice(0,3).toLowerCase()) + 1
    const dd = mMon[2]
    const year = `${new Date().getFullYear()}`
    return `${year}-${String(mon).padStart(2,'0')}-${String(dd).padStart(2,'0')}`
  }
  return undefined
}

function nearbyHotels(): HotelOption[] {
  // Roughly around Midtown / Javits
  return [
    { id: 'h1', name: 'Hudson West Hotel', price: 210, address: '442 W 36th St, NY', location: { lat: 40.7549, lng: -73.997 } },
    { id: 'h2', name: 'The High Line Stay', price: 240, address: '10th Ave, NY', location: { lat: 40.7479, lng: -74.0047 } },
    { id: 'h3', name: 'Midtown Petite Inn', price: 180, address: 'W 37th St, NY', location: { lat: 40.7537, lng: -73.991 } },
    { id: 'h4', name: 'Times Square Budget', price: 195, address: 'W 43rd St, NY', location: { lat: 40.7587, lng: -73.987 } },
    { id: 'h5', name: 'Chelsea Corner Hotel', price: 220, address: 'W 23rd St, NY', location: { lat: 40.7465, lng: -73.995 } },
    { id: 'h6', name: 'Hell’s Kitchen Suites', price: 260, address: '9th Ave, NY', location: { lat: 40.7622, lng: -73.9915 } },
    { id: 'h7', name: 'Garry’s Midtown Lodge', price: 235, address: '8th Ave, NY', location: { lat: 40.7572, lng: -73.989 } },
    { id: 'h8', name: 'Javits Walk Hotel', price: 205, address: '11th Ave, NY', location: { lat: 40.7568, lng: -74.0035 } },
  ]
}

export async function handleBookingQuery(text: string) {
  const budget = parseBudget(text)
  const date = parseDate(text)
  const venueQueryMatch = text.match(/(?:near|at|by|around)\s+([^,]+?)(?:\s+on\s+|\.|,|$)/i)
  const venueQuery = venueQueryMatch ? venueQueryMatch[1] : text

  const venueGeocoded = await mockGeocode(venueQuery)
  const venue: Venue = {
    name: venueGeocoded.name,
    address: venueGeocoded.address,
    location: venueGeocoded.location,
  }

  const radiusMeters = 400 // 5-minute walk
  let hotels = nearbyHotels().map((h) => {
    const d = haversineDistanceMeters(venue.location, h.location)
    return { ...h, distanceMeters: Math.round(d), walkMinutes: walkTimeMinutes(d) }
  })

  let filtered = hotels.filter((h) => h.distanceMeters! <= radiusMeters)
  if (typeof budget === 'number') filtered = filtered.filter((h) => h.price <= budget)

  if (filtered.length === 0) {
    const relaxed = 600
    filtered = hotels.filter((h) => h.distanceMeters! <= relaxed)
    if (typeof budget === 'number') filtered = filtered.filter((h) => h.price <= budget)
  }

  filtered.sort((a, b) => (a.price - b.price) || (a.distanceMeters! - b.distanceMeters!))

  // Cards disabled for now (we will switch to model-driven tool calls)

  return { venue, hotels: filtered, date, budget }
}

export function chooseHotel(hotelId: string) {
  const steps = store.steps
  const map = [...steps].reverse().find((s) => s.kind === 'MapCard')
  const selection = [...steps].reverse().find((s) => s.kind === 'HotelSelection')
  if (!selection || !map) return
  const hotel = (selection.data as any).hotels.find((h: HotelOption) => h.id === hotelId)
  if (!hotel) return

  const agentMsg = gullieSay('Great choice. Here is your booking summary:')
  const summary: TimelineStep = {
    id: createStepId('BookingSummary'),
    kind: 'BookingSummary',
    status: 'in_progress',
    afterMessageId: agentMsg.id,
    data: { venue: (map.data as any).venue, hotel },
  }
  upsertStep(summary)
}

export function payNow(amount: number) {
  const steps = store.steps
  const summary = [...steps].reverse().find((s) => s.kind === 'BookingSummary')
  const hotel = summary ? ((summary.data as any).hotel as HotelOption) : { id: 'selected', name: 'Selected Hotel', price: amount, location: { lat: 0, lng: 0 }, address: '' }
  const ref = `REF-${Math.random().toString(36).slice(2, 8).toUpperCase()}`
  const agentMsg = gullieSay(`Payment successful. Confirmation: ${ref}`)
  const confirmation: TimelineStep = {
    id: createStepId('Confirmation'),
    kind: 'Confirmation',
    status: 'completed',
    afterMessageId: agentMsg.id,
    data: { reference: ref, hotel },
  }
  upsertStep(confirmation)
}


