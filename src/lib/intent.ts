import { gullieSay, upsertStep, createStepId, updateRelocationPlan, store, getOrCreateServiceThread, switchToThread } from '../store'
import type { ServiceType } from '../types'
import type { TimelineStep } from '../types'
import { chooseHotel, payNow } from '../api/mock'
import { callOpenAIResponse } from './openai'
import { SYSTEM_INSTRUCTIONS } from '../instructions/system'
import { handleMovingQuotes, handleInventoryWorkflow, handleImmigrationWorkflow, handleAllServicesOverview } from './workflows'
import { sendImmigrationPartnerEmail, ensureUserEmail, ensureUserName } from './email'
import { askShippingTypeQuestion } from './serviceWorkflows'

// Generate service-specific system instructions to ensure thread isolation
function getServiceSpecificInstructions(serviceType: string): string {
  const baseInstructions = SYSTEM_INSTRUCTIONS
  
  const serviceSpecificContext: Record<string, string> = {
    'shipping': `
CURRENT SERVICE CONTEXT: You are operating in the SHIPPING & MOVING service thread ONLY.

Your role: Expert shipping and moving specialist
Your focus: ONLY shipping, moving, furniture, inventory, packing, containers, movers, quotes, logistics
FORBIDDEN topics: Immigration, pets, visas, temporary housing, accommodation (unless moving-related storage)

Allowed topics:
- Household size assessment for shipping volume
- Shipping type selection (everything, essentials, furniture only)
- Moving quotes and mover recommendations  
- Packing services and timelines
- Container sizes and shipping methods
- Moving logistics and coordination

NEVER discuss: immigration, visas, pets, accommodation booking, hotels
`,
    'pets': `
CURRENT SERVICE CONTEXT: You are operating in the PET RELOCATION service thread ONLY.

Your role: Expert pet relocation specialist  
Your focus: ONLY pets, animals, veterinary requirements, pet travel, pet documentation
FORBIDDEN topics: Shipping furniture, moving household goods, immigration for humans, temporary housing

Allowed topics:
- Pet types and breeds
- Pet size and weight requirements
- Veterinary documentation for travel
- Pet quarantine requirements
- Pet carrier requirements and airline policies
- Pet health certificates and vaccinations
- Pet import/export permits

NEVER discuss: furniture shipping, human immigration, accommodation booking, moving household goods
`,
    'immigration': `
CURRENT SERVICE CONTEXT: You are operating in the IMMIGRATION & VISA service thread ONLY.

Your role: Expert immigration and visa specialist
Your focus: ONLY immigration, visas, work permits, documentation, legal status
FORBIDDEN topics: Shipping furniture, pet relocation, temporary accommodation booking

Allowed topics:
- Visa types and requirements
- Work permits and job status
- Immigration documentation
- Legal status and applications
- Immigration lawyers and specialists
- Visa timelines and processes

NEVER discuss: pet relocation, furniture shipping, temporary accommodation booking
`,
    'housing': `
CURRENT SERVICE CONTEXT: You are operating in the TEMPORARY HOUSING service thread ONLY.

Your role: Expert temporary accommodation specialist
Your focus: ONLY temporary housing, hotels, serviced apartments, short-term rentals
FORBIDDEN topics: Shipping furniture, pet relocation, immigration visas

Allowed topics:
- Temporary accommodation types
- Hotel and serviced apartment options
- Short-term rental properties
- Accommodation booking and rates
- Neighborhood recommendations for temporary stays
- Extended stay options

NEVER discuss: pet relocation, furniture shipping, immigration visas
`
  }

  // For general/unknown threads, allow hotel search functionality
  if (serviceType === 'general' || !serviceSpecificContext[serviceType]) {
    return baseInstructions + `
CURRENT SERVICE CONTEXT: You are operating in the GENERAL planning thread.

You can help with:
- Initial relocation planning and overview
- Hotel and accommodation search (you have access to web search tools)
- General relocation guidance
- Directing users to specific service threads

When users ask for hotel/accommodation search, use the web_search_preview tool to find real options.
`
  }
  
  return baseInstructions + serviceSpecificContext[serviceType]
}

function getServiceFromThread(threadId: string): string {
  const thread = store.threads.find(t => t.id === threadId)
  if (!thread) return 'general'
  
  // Extract service type from thread title/service
  if (thread.service) return thread.service
  if (thread.title.includes('Shipping')) return 'shipping'
  if (thread.title.includes('Pet')) return 'pets'
  if (thread.title.includes('Immigration')) return 'immigration'
  if (thread.title.includes('Housing')) return 'housing'
  return 'general'
}

// Flag to prevent multiple simultaneous auto-responses (currently unused but reserved for future use)
// let isAutoResponding = false

export function safeParse<T = any>(text?: string | null): T | undefined {
  if (!text) return undefined
  try {
    let cleaned = text
      .replace(/&quot;/g, '"')
      .replace(/&#34;/g, '"')
      .replace(/&apos;/g, "'")
      .replace(/&#39;/g, "'")
      .replace(/&amp;/g, '&')
    if (cleaned.startsWith('{') && cleaned.endsWith('}') && cleaned.indexOf('"') === -1 && cleaned.indexOf("'") !== -1) {
      cleaned = cleaned.replace(/'/g, '"')
    }
    return JSON.parse(cleaned) as T
  } catch {
    return undefined
  }
}

function captureProfileData(intent: string, payload: any) {
  if (!payload) return
  
  // Only capture explicit data - don't auto-capture generic values
  switch (intent) {
    case 'choose_date':
    case 'select_date':
      if (payload.date) {
        updateRelocationPlan({ selectedDate: payload.date })
      }
      break
    case 'confirm_household_size':
      const size = Number(payload.size)
      if (!Number.isNaN(size) && size > 0) {
        updateRelocationPlan({ householdSize: size })
      }
      break
    case 'set_pet_type':
      if (payload.details && payload.count !== undefined) {
        updateRelocationPlan({ 
          hasPets: payload.count !== '0' && payload.type !== 'none',
          petDetails: payload.details 
        })
      }
      break
    case 'set_children':
      if (payload.details) {
        updateRelocationPlan({ specialRequirements: [payload.details] })
      }
      break
    case 'set_work_status':
      if (payload.details) {
        updateRelocationPlan({ specialRequirements: [...(store.relocationPlan?.specialRequirements || []), payload.details] })
      }
      break
    case 'choose_hotel':
      // Capture hotel booking details
      if (payload.name && payload.price) {
        updateRelocationPlan({ 
          hotelName: payload.name, 
          hotelAddress: payload.address,
          budget: Number(payload.price)
        })
      }
      break
  }
}

function getServiceFromIntent(intent: string): ServiceType | null {
  const serviceMap: Record<string, ServiceType> = {
    'service_workflow': 'general',
    'start_shipping': 'shipping',
    'shipping_workflow': 'shipping',
    'moving_shipping': 'shipping',
    'moving_and_shipping': 'shipping',
    'moving': 'shipping',
    'shipping': 'shipping',
    'get_moving_quotes': 'shipping',
    'start_inventory': 'shipping',
    'schedule_move': 'shipping',
    'visa_workflow': 'immigration',
    'immigration_workflow': 'immigration',
    'visa_immigration': 'immigration',
    'visa_and_immigration': 'immigration',
    'immigration': 'immigration',
    'select_visa': 'immigration',
    'housing_workflow': 'housing',
    'housing': 'housing',
    'start_hotel_search': 'accommodation',
    'search_hotels': 'accommodation',
    'choose_hotel': 'accommodation',
    'temporary_housing': 'accommodation',
    'select_accommodation_type': 'accommodation',
    'select_nyc_area': 'accommodation',
    'set_accommodation_budget': 'accommodation',
    'set_accommodation_duration': 'accommodation',
    'pet_workflow': 'pets',
    'pet_relocation': 'pets',
    'pets': 'pets',
    'select_pets': 'pets',
    'set_pet_type': 'pets',
    'finance_workflow': 'finance',
    'finance_taxes': 'finance',
    'finance_and_taxes': 'finance',
    'finance': 'finance',
    'healthcare_workflow': 'healthcare',
    'healthcare': 'healthcare',
    'transportation_workflow': 'transportation',
    'transportation': 'transportation',
    'education_workflow': 'education',
    'education': 'education',
    'visa_status': 'immigration',
    'immigration_consultation': 'immigration',
    'immigration_assessment': 'immigration',
    'pet_details_form': 'pets',
    'set_household_goods': 'shipping',
    'household_survey': 'shipping',
    'shipping_type': 'shipping',
    'housing_type': 'housing',
    'housing_preferences': 'housing',
    'select_move_date': 'general',
    'move_date': 'general'
  }
  return serviceMap[intent] || null
}

export function dispatchIntent(intent: string, rawPayload?: string | null) {
  const payload = safeParse(rawPayload)
  const i = (intent || '').toLowerCase().trim()
  
  // Auto-create and switch to service thread if needed
  const service = getServiceFromIntent(i)
  let targetThreadId = store.activeThreadId
  if (service && service !== 'general') {
    const thread = getOrCreateServiceThread(service)
    switchToThread(thread.id)
    targetThreadId = thread.id
  }
  
  // Capture profile information for timeline
  captureProfileData(i, payload)
  
  switch (i) {
    // Note: targetThreadId is captured at dispatch time to ensure thread isolation in delayed responses
    case 'search_hotels':
    case 'start_search':
    case 'start_hotel_search': {
      handleHotelSearch(payload)
      break
    }
    case 'choose_hotel': {
      const id = (payload as any)?.id
      if (typeof id === 'string') {
        // Try native flow first
        chooseHotel(id)
        // Fallback: if no native selection context, build a summary from payload
        const name = (payload as any)?.name
        const price = Number((payload as any)?.price ?? 0)
        if (name && !Number.isNaN(price)) {
          const a = gullieSay('')
          const summary: TimelineStep = {
            id: createStepId('BookingSummary'),
            kind: 'BookingSummary',
            status: 'in_progress',
            afterMessageId: a.id,
            ts: Date.now(),
            data: {
              venue: { name: (payload as any)?.near || 'Selected area', address: (payload as any)?.address || '', location: { lat: 0, lng: 0 } },
              hotel: { id, name, price, address: (payload as any)?.address || '', location: { lat: 0, lng: 0 } },
            } as any,
          }
          upsertStep(summary)
        }
      } else {
        gullieSay('I could not determine which hotel to choose.')
      }
      break
    }
    case 'select_hotel':
    case 'select': {
      const id = (payload as any)?.id
      if (typeof id === 'string') chooseHotel(id)
      else gullieSay('I could not determine which hotel to choose.')
      break
    }
    case 'open_url': {
      const url = (payload as any)?.url
      if (typeof window !== 'undefined' && typeof url === 'string') {
        window.open(url, '_blank', 'noopener,noreferrer')
      } else {
        gullieSay('(demo) Could not open URL')
      }
      break
    }
    case 'pay_now': {
      const amount = Number((payload as any)?.amount ?? 0)
      if (!Number.isNaN(amount) && amount > 0) payNow(amount)
      else gullieSay('Payment amount missing.')
      break
    }
    case 'open_calendar': {
      const defaultDate = (payload as any)?.date || '2025-09-01'
      handleDatePicker(defaultDate)
      break
    }
    case 'choose_date':
    case 'select_date': {
      let date = (payload as any)?.date || (payload as any)?.value
      
      // Handle special case where date should come from input field
      if (date === 'from-input') {
        const dateInput = document.getElementById('gullie-date-picker') as HTMLInputElement
        date = dateInput?.value || '2025-09-01'
      }
      
      if (date) {
        updateRelocationPlan({ selectedDate: date })
        if (date === 'flexible') {
          gullieSay(`Great! I've noted that you're flexible with dates. This will help me find better options for accommodations and travel.`)
        } else {
          const dateObj = new Date(date)
          const formattedDate = dateObj.toLocaleDateString('en-US', { 
            weekday: 'long', 
            year: 'numeric', 
            month: 'long', 
            day: 'numeric' 
          })
          gullieSay(`Perfect! Your moving date is set for ${formattedDate}. I'll use this to coordinate all your relocation services.`)
        }
      } else {
        gullieSay('Please provide a date.')
      }
      break
    }
    case 'set_household':
    case 'select_household_size':
    case 'choose_household':
    case 'household_size': {
      // If specific size is provided, capture it
      const size = Number((payload as any)?.size || (payload as any)?.value)
      if (!Number.isNaN(size) && size > 0) {
        updateRelocationPlan({ householdSize: size })
        gullieSay(`Perfect! I've noted your household size: ${size} people. This helps me plan your shipping, housing, and other services accordingly.`)
      } else {
        // Show household size selection UI instead of auto-capturing
        handleHouseholdSizeSelection()
      }
      break
    }
    case 'select_pets':
    case 'choose_pets':
    case 'pets': {
      // Instead of just capturing yes/no, show detailed pet workflow
      gullieSay(`Great! I can help you with pet relocation. Let me gather some details about your pets to ensure they travel safely and meet all requirements.`)
      break
    }
    case 'select_visa':
    case 'choose_visa': {
      const hasVisa = (payload as any)?.hasVisa === 'yes' || (payload as any)?.value === 'yes'
      const visaStatus = (payload as any)?.status || (hasVisa ? 'have_visa' : 'need_help')
      updateRelocationPlan({ hasVisa, visaStatus })
      gullieSay(hasVisa ? 'Visa already obtained' : 'Visa assistance needed')
      break
    }
    case 'get_moving_quotes': {
      handleMovingQuotes(payload)
      break
    }
    case 'start_inventory': {
      handleInventoryWorkflow()
      break
    }
    case 'schedule_move': {
      gullieSay('Opening move scheduling workflow...')
      break
    }
    case 'show_all_services': {
      handleAllServicesOverview()
      break
    }
    case 'connect_immigration_partner':
    case 'connect_with_specialist':
    case 'immigration_specialist': {
      handleImmigrationPartnerConnection()
      break
    }
    case 'service_workflow': {
      const service = (payload as any)?.service
      if (service === 'immigration') handleImmigrationWorkflow()
      else if (service === 'shipping') handleShippingWorkflow(2) // default household size
      else gullieSay(`${service} workflow coming soon...`)
      break
    }
    case 'confirm_household_size': {
      const size = Number((payload as any)?.size)
      if (!Number.isNaN(size) && size > 0) {
        updateRelocationPlan({ householdSize: size })
        gullieSay(`Perfect! I've noted your household size: ${size} people. This helps me plan your shipping, housing, and other services accordingly.`)
      } else {
        gullieSay('Please select a valid household size')
      }
      break
    }
    case 'set_children':
    case 'set_work_status':
    case 'set_pet_type': {
      const petType = (payload as any)?.type || 'pet'
      const petDetails = (payload as any)?.details || `${petType} relocation`
      
      // Update the timeline with pet information
      updateRelocationPlan({ 
        hasPets: true,
        petDetails: petDetails 
      })
      
      // Be proactive and guide user to next steps
      if (petType === 'dog') {
        gullieSay(`Perfect! I'll help you relocate your dog safely. Now I need some specific details to plan their journey and ensure all requirements are met.`)
        
        setTimeout(() => {
          const fromCity = store.relocationPlan?.fromCity || 'your origin'
          const toCity = store.relocationPlan?.toCity || 'your destination'
          const html = `
<div style="padding:16px;background:#fff;max-width:100%;font-family:'Cera Pro',sans-serif">
  <h3 style="margin:0 0 12px 0;font:600 16px 'Cera Pro',sans-serif;color:#1f2937">🐕 Dog Relocation Details</h3>
  
  <div style="background:#fef3c7;border:1px solid #f59e0b;border-radius:8px;padding:16px;margin-bottom:16px">
    <h4 style="margin:0 0 12px 0;font:600 13px 'Cera Pro',sans-serif;color:#92400e">How many dogs are you relocating?</h4>
    
    <div style="display:grid;gap:8px;grid-template-columns:1fr 1fr 1fr;margin-bottom:12px">
      <button data-intent="set_pet_count" data-payload='{"count":1,"type":"dog"}' style="padding:10px;border:1px solid #f59e0b;background:#fef3c7;color:#92400e;border-radius:6px;font:12px 'Cera Pro',sans-serif">1 dog</button>
      <button data-intent="set_pet_count" data-payload='{"count":2,"type":"dog"}' style="padding:10px;border:1px solid #f59e0b;background:#fef3c7;color:#92400e;border-radius:6px;font:12px 'Cera Pro',sans-serif">2 dogs</button>
      <button data-intent="set_pet_count" data-payload='{"count":"3+","type":"dog"}' style="padding:10px;border:1px solid #f59e0b;background:#fef3c7;color:#92400e;border-radius:6px;font:12px 'Cera Pro',sans-serif">3+ dogs</button>
    </div>
    
    <h4 style="margin:12px 0 8px 0;font:600 13px 'Cera Pro',sans-serif;color:#92400e">What size are your dogs?</h4>
    <div style="display:grid;gap:6px;grid-template-columns:1fr 1fr">
      <button data-intent="set_pet_size" data-payload='{"size":"small","type":"dog","details":"Small dog (under 25 lbs)"}' style="padding:8px;border:1px solid #f59e0b;background:#fef3c7;color:#92400e;border-radius:6px;font:11px 'Cera Pro',sans-serif">Small (under 25lbs)</button>
      <button data-intent="set_pet_size" data-payload='{"size":"medium","type":"dog","details":"Medium dog (25-60 lbs)"}' style="padding:8px;border:1px solid #f59e0b;background:#fef3c7;color:#92400e;border-radius:6px;font:11px 'Cera Pro',sans-serif">Medium (25-60lbs)</button>
      <button data-intent="set_pet_size" data-payload='{"size":"large","type":"dog","details":"Large dog (over 60 lbs)"}' style="padding:8px;border:1px solid #f59e0b;background:#fef3c7;color:#92400e;border-radius:6px;font:11px 'Cera Pro',sans-serif">Large (over 60lbs)</button>
      <button data-intent="set_pet_size" data-payload='{"size":"mixed","type":"dog","details":"Multiple dogs of different sizes"}' style="padding:8px;border:1px solid #f59e0b;background:#fef3c7;color:#92400e;border-radius:6px;font:11px 'Cera Pro',sans-serif">Mixed sizes</button>
    </div>
  </div>

  <div style="background:#ecfdf5;border:1px solid #10b981;border-radius:8px;padding:12px">
    <h4 style="margin:0 0 8px 0;font:600 13px 'Cera Pro',sans-serif;color:#065f46">🏥 Next: Health & Documentation</h4>
    <div style="font:12px 'Cera Pro',sans-serif;color:#065f46;line-height:1.5">
      After this, I'll help you with:<br/>
      • <strong>Vaccination records</strong> & health certificates<br/>
      • <strong>Quarantine requirements</strong> for ${fromCity} → ${toCity}<br/>
      • <strong>Import permits</strong> & customs documentation<br/>
      • <strong>Travel carrier requirements</strong> & booking flights
    </div>
  </div>
</div>`
          gullieSay(html, targetThreadId)
        }, 1000)
        
      } else if (petType === 'cat') {
        gullieSay(`Excellent! Cat relocation has specific requirements. Let me gather the details I need to ensure your feline friend travels safely and comfortably.`)
        
        setTimeout(() => {
          const html = `
<div style="padding:16px;background:#fff;max-width:100%;font-family:'Cera Pro',sans-serif">
  <h3 style="margin:0 0 12px 0;font:600 16px 'Cera Pro',sans-serif;color:#1f2937">🐱 Cat Relocation Details</h3>
  
  <div style="background:#e0f2fe;border:1px solid #0ea5e9;border-radius:8px;padding:16px;margin-bottom:16px">
    <h4 style="margin:0 0 12px 0;font:600 13px 'Cera Pro',sans-serif;color:#0c4a6e">How many cats are you relocating?</h4>
    
    <div style="display:grid;gap:8px;grid-template-columns:1fr 1fr 1fr;margin-bottom:12px">
      <button data-intent="set_pet_count" data-payload='{"count":1,"type":"cat"}' style="padding:10px;border:1px solid #0ea5e9;background:#e0f2fe;color:#0c4a6e;border-radius:6px;font:12px 'Cera Pro',sans-serif">1 cat</button>
      <button data-intent="set_pet_count" data-payload='{"count":2,"type":"cat"}' style="padding:10px;border:1px solid #0ea5e9;background:#e0f2fe;color:#0c4a6e;border-radius:6px;font:12px 'Cera Pro',sans-serif">2 cats</button>
      <button data-intent="set_pet_count" data-payload='{"count":"3+","type":"cat"}' style="padding:10px;border:1px solid #0ea5e9;background:#e0f2fe;color:#0c4a6e;border-radius:6px;font:12px 'Cera Pro',sans-serif">3+ cats</button>
    </div>
    
    <h4 style="margin:12px 0 8px 0;font:600 13px 'Cera Pro',sans-serif;color:#0c4a6e">Are they indoor/outdoor cats?</h4>
    <div style="display:grid;gap:6px;grid-template-columns:1fr 1fr">
      <button data-intent="set_pet_lifestyle" data-payload='{"lifestyle":"indoor","type":"cat","details":"Indoor cats only"}' style="padding:8px;border:1px solid #0ea5e9;background:#e0f2fe;color:#0c4a6e;border-radius:6px;font:11px 'Cera Pro',sans-serif">Indoor only</button>
      <button data-intent="set_pet_lifestyle" data-payload='{"lifestyle":"outdoor","type":"cat","details":"Outdoor/indoor-outdoor cats"}' style="padding:8px;border:1px solid #0ea5e9;background:#e0f2fe;color:#0c4a6e;border-radius:6px;font:11px 'Cera Pro',sans-serif">Outdoor access</button>
    </div>
  </div>

  <div style="background:#ecfdf5;border:1px solid #10b981;border-radius:8px;padding:12px">
    <h4 style="margin:0 0 8px 0;font:600 13px 'Cera Pro',sans-serif;color:#065f46">📋 Cat-Specific Requirements</h4>
    <div style="font:12px 'Cera Pro',sans-serif;color:#065f46;line-height:1.5">
      • <strong>Rabies vaccination</strong> (minimum 21 days old)<br/>
      • <strong>Health certificate</strong> from accredited vet<br/>
      • <strong>Microchip identification</strong> (ISO standard)<br/>
      • <strong>Stress management</strong> for long flights
    </div>
  </div>
</div>`
          gullieSay(html, targetThreadId)
        }, 1000)
        
      } else if (petType === 'bird') {
        gullieSay(`Bird relocation requires very specific permits and documentation. Let me walk you through the requirements step by step.`)
        
        setTimeout(() => {
          const html = `
<div style="padding:16px;background:#fff;max-width:100%;font-family:'Cera Pro',sans-serif">
  <h3 style="margin:0 0 12px 0;font:600 16px 'Cera Pro',sans-serif;color:#1f2937">🐦 Bird Relocation Assessment</h3>
  
  <div style="background:#fef3c7;border:1px solid #f59e0b;border-radius:8px;padding:16px;margin-bottom:16px">
    <h4 style="margin:0 0 12px 0;font:600 13px 'Cera Pro',sans-serif;color:#92400e">What type of birds are you relocating?</h4>
    
    <div style="display:grid;gap:8px;margin-bottom:12px">
      <button data-intent="set_bird_type" data-payload='{"bird_type":"parrots","details":"Parrots (cockatoos, macaws, etc.)"}' style="padding:10px;border:1px solid #f59e0b;background:#fef3c7;color:#92400e;border-radius:6px;font:12px 'Cera Pro',sans-serif;text-align:left">🦜 Parrots (cockatoos, macaws, etc.)</button>
      <button data-intent="set_bird_type" data-payload='{"bird_type":"finches","details":"Small birds (finches, canaries, etc.)"}' style="padding:10px;border:1px solid #f59e0b;background:#fef3c7;color:#92400e;border-radius:6px;font:12px 'Cera Pro',sans-serif;text-align:left">🐦 Small birds (finches, canaries)</button>
      <button data-intent="set_bird_type" data-payload='{"bird_type":"poultry","details":"Poultry (chickens, ducks, etc.)"}' style="padding:10px;border:1px solid #f59e0b;background:#fef3c7;color:#92400e;border-radius:6px;font:12px 'Cera Pro',sans-serif;text-align:left">🐓 Poultry (chickens, ducks)</button>
    </div>
  </div>

  <div style="background:#fef2f2;border:1px solid #f87171;border-radius:8px;padding:12px">
    <h4 style="margin:0 0 8px 0;font:600 13px 'Cera Pro',sans-serif;color:#dc2626">⚠️ Important: CITES Requirements</h4>
    <div style="font:12px 'Cera Pro',sans-serif;color:#dc2626;line-height:1.5">
      Many bird species require <strong>CITES permits</strong> for international transport. I'll help you determine if your birds need special documentation and connect you with certified wildlife authorities.
    </div>
  </div>
</div>`
          gullieSay(html, targetThreadId)
        }, 1000)
        
      } else if (petType === 'exotic') {
        gullieSay(`Exotic pet relocation is complex and highly regulated. Let me assess what type of exotic pet you have so I can guide you through the specific requirements.`)
        
        setTimeout(() => {
          const html = `
<div style="padding:16px;background:#fff;max-width:100%;font-family:'Cera Pro',sans-serif">
  <h3 style="margin:0 0 12px 0;font:600 16px 'Cera Pro',sans-serif;color:#1f2937">🦎 Exotic Pet Relocation</h3>
  
  <div style="background:#f3e8ff;border:1px solid #a855f7;border-radius:8px;padding:16px;margin-bottom:16px">
    <h4 style="margin:0 0 12px 0;font:600 13px 'Cera Pro',sans-serif;color:#7c3aed">What type of exotic pet are you relocating?</h4>
    
    <div style="display:grid;gap:8px;margin-bottom:12px">
      <button data-intent="set_exotic_type" data-payload='{"exotic_type":"reptile","details":"Reptiles (snakes, lizards, turtles)"}' style="padding:10px;border:1px solid #a855f7;background:#f3e8ff;color:#7c3aed;border-radius:6px;font:12px 'Cera Pro',sans-serif;text-align:left">🦎 Reptiles (snakes, lizards, turtles)</button>
      <button data-intent="set_exotic_type" data-payload='{"exotic_type":"small_mammals","details":"Small mammals (ferrets, rabbits, etc.)"}' style="padding:10px;border:1px solid #a855f7;background:#f3e8ff;color:#7c3aed;border-radius:6px;font:12px 'Cera Pro',sans-serif;text-align:left">🐰 Small mammals (ferrets, rabbits)</button>
      <button data-intent="set_exotic_type" data-payload='{"exotic_type":"fish","details":"Aquarium fish"}' style="padding:10px;border:1px solid #a855f7;background:#f3e8ff;color:#7c3aed;border-radius:6px;font:12px 'Cera Pro',sans-serif;text-align:left">🐠 Aquarium fish</button>
      <button data-intent="set_exotic_type" data-payload='{"exotic_type":"other","details":"Other exotic species"}' style="padding:10px;border:1px solid #a855f7;background:#f3e8ff;color:#7c3aed;border-radius:6px;font:12px 'Cera Pro',sans-serif;text-align:left">🦄 Other exotic species</button>
    </div>
  </div>

  <div style="background:#fef2f2;border:1px solid #f87171;border-radius:8px;padding:12px">
    <h4 style="margin:0 0 8px 0;font:600 13px 'Cera Pro',sans-serif;color:#dc2626">🚨 Critical: Legal Requirements</h4>
    <div style="font:12px 'Cera Pro',sans-serif;color:#dc2626;line-height:1.5">
      Exotic pets often have <strong>strict import/export restrictions</strong>. Some species may be prohibited entirely. I'll research the specific regulations for your pet and destination.
    </div>
  </div>
</div>`
          gullieSay(html, targetThreadId)
        }, 1000)
      }
      break
    }
    case 'visa_status': {
      const status = (payload as any)?.status || 'unknown'
      updateRelocationPlan({ visaStatus: status })
      
      // Be proactive based on the specific visa status
      if (status === 'need_work_visa') {
        const fromCity = store.relocationPlan?.fromCity || 'your origin'
        const toCity = store.relocationPlan?.toCity || 'your destination'
        gullieSay(`Perfect! I'll guide you through the work visa process for ${fromCity} → ${toCity}. Let me gather the specific information I need to connect you with the right specialists and prepare your documentation.`)
        
        setTimeout(() => {
          const html = `
<div style="padding:16px;background:#fff;max-width:100%;font-family:'Cera Pro',sans-serif">
  <h3 style="margin:0 0 12px 0;font:600 16px 'Cera Pro',sans-serif;color:#1f2937">💼 Work Visa Assessment</h3>
  
  <div style="background:#e0f2fe;border:1px solid #0ea5e9;border-radius:8px;padding:16px;margin-bottom:16px">
    <h4 style="margin:0 0 12px 0;font:600 13px 'Cera Pro',sans-serif;color:#0c4a6e">Do you already have a job offer in New York?</h4>
    
    <div style="display:grid;gap:8px;margin-bottom:12px">
      <button data-intent="set_job_status" data-payload='{"status":"have_offer","details":"Already have job offer"}' style="padding:10px;border:1px solid #10b981;background:#ecfdf5;color:#065f46;border-radius:6px;font:12px 'Cera Pro',sans-serif;text-align:left">✅ Yes, I have a job offer</button>
      <button data-intent="set_job_status" data-payload='{"status":"searching","details":"Looking for job opportunities"}' style="padding:10px;border:1px solid #f59e0b;background:#fef3c7;color:#92400e;border-radius:6px;font:12px 'Cera Pro',sans-serif;text-align:left">🔍 No, I'm looking for opportunities</button>
      <button data-intent="set_job_status" data-payload='{"status":"internal_transfer","details":"Company internal transfer"}' style="padding:10px;border:1px solid #7c3aed;background:#f3e8ff;color:#581c87;border-radius:6px;font:12px 'Cera Pro',sans-serif;text-align:left">🏢 Internal company transfer</button>
    </div>
  </div>

  <div style="background:#ecfdf5;border:1px solid #10b981;border-radius:8px;padding:12px">
    <h4 style="margin:0 0 8px 0;font:600 13px 'Cera Pro',sans-serif;color:#065f46">📋 What I'll help you with next:</h4>
    <div style="font:12px 'Cera Pro',sans-serif;color:#065f46;line-height:1.5">
      • <strong>Visa type determination</strong> (H-1B, L-1, O-1, etc.)<br/>
      • <strong>Document checklist</strong> & timeline planning<br/>
      • <strong>Immigration lawyer connections</strong> in ${toCity}<br/>
      • <strong>Application preparation</strong> & filing strategy<br/>
      • <strong>Interview prep</strong> & approval tracking
    </div>
  </div>
</div>`
          gullieSay(html, targetThreadId)
        }, 1000)
        
      } else if (status === 'family_visa') {
        gullieSay(`I'll help you with family reunification visa requirements. Let me understand your family situation to guide you through the right process.`)
        
        setTimeout(() => {
          const html = `
<div style="padding:16px;background:#fff;max-width:100%;font-family:'Cera Pro',sans-serif">
  <h3 style="margin:0 0 12px 0;font:600 16px 'Cera Pro',sans-serif;color:#1f2937">👨‍👩‍👧‍👦 Family Reunification Visa</h3>
  
  <div style="background:#fef3c7;border:1px solid #f59e0b;border-radius:8px;padding:16px;margin-bottom:16px">
    <h4 style="margin:0 0 12px 0;font:600 13px 'Cera Pro',sans-serif;color:#92400e">What is your relationship to the US sponsor?</h4>
    
    <div style="display:grid;gap:8px;margin-bottom:12px">
      <button data-intent="set_family_relationship" data-payload='{"relationship":"spouse","details":"Spouse of US citizen/resident"}' style="padding:10px;border:1px solid #f59e0b;background:#fef3c7;color:#92400e;border-radius:6px;font:12px 'Cera Pro',sans-serif;text-align:left">💑 Spouse</button>
      <button data-intent="set_family_relationship" data-payload='{"relationship":"child","details":"Child of US citizen/resident"}' style="padding:10px;border:1px solid #f59e0b;background:#fef3c7;color:#92400e;border-radius:6px;font:12px 'Cera Pro',sans-serif;text-align:left">👶 Child</button>
      <button data-intent="set_family_relationship" data-payload='{"relationship":"parent","details":"Parent of US citizen"}' style="padding:10px;border:1px solid #f59e0b;background:#fef3c7;color:#92400e;border-radius:6px;font:12px 'Cera Pro',sans-serif;text-align:left">👨‍👩‍👧‍👦 Parent</button>
      <button data-intent="set_family_relationship" data-payload='{"relationship":"sibling","details":"Sibling of US citizen"}' style="padding:10px;border:1px solid #f59e0b;background:#fef3c7;color:#92400e;border-radius:6px;font:12px 'Cera Pro',sans-serif;text-align:left">👫 Sibling</button>
    </div>
  </div>

  <div style="background:#e0f2fe;border:1px solid #0ea5e9;border-radius:8px;padding:12px">
    <h4 style="margin:0 0 8px 0;font:600 13px 'Cera Pro',sans-serif;color:#0c4a6e">📅 Processing Times & Priority Dates</h4>
    <div style="font:12px 'Cera Pro',sans-serif;color:#0c4a6e;line-height:1.5">
      Family visa processing times vary significantly. I'll help you understand current wait times and priority dates for your specific category.
    </div>
  </div>
</div>`
          gullieSay(html, targetThreadId)
        }, 1000)
        
      } else if (status === 'student_visa') {
        gullieSay(`Great! Student visa process requires careful coordination with your school. Let me walk you through the F-1 or J-1 visa requirements step by step.`)
        
        setTimeout(() => {
          const html = `
<div style="padding:16px;background:#fff;max-width:100%;font-family:'Cera Pro',sans-serif">
  <h3 style="margin:0 0 12px 0;font:600 16px 'Cera Pro',sans-serif;color:#1f2937">🎓 Student Visa Process</h3>
  
  <div style="background:#f3e8ff;border:1px solid #7c3aed;border-radius:8px;padding:16px;margin-bottom:16px">
    <h4 style="margin:0 0 12px 0;font:600 13px 'Cera Pro',sans-serif;color:#581c87">Have you been accepted to a US school?</h4>
    
    <div style="display:grid;gap:8px;margin-bottom:12px">
      <button data-intent="set_school_status" data-payload='{"status":"accepted","details":"Already accepted to US school"}' style="padding:10px;border:1px solid #10b981;background:#ecfdf5;color:#065f46;border-radius:6px;font:12px 'Cera Pro',sans-serif;text-align:left">✅ Yes, I'm accepted</button>
      <button data-intent="set_school_status" data-payload='{"status":"applying","details":"Currently applying to schools"}' style="padding:10px;border:1px solid #f59e0b;background:#fef3c7;color:#92400e;border-radius:6px;font:12px 'Cera Pro',sans-serif;text-align:left">📝 Still applying</button>
      <button data-intent="set_school_status" data-payload='{"status":"researching","details":"Researching schools and programs"}' style="padding:10px;border:1px solid #0ea5e9;background:#e0f2fe;color:#0c4a6e;border-radius:6px;font:12px 'Cera Pro',sans-serif;text-align:left">🔍 Still researching</button>
    </div>
  </div>

  <div style="background:#ecfdf5;border:1px solid #10b981;border-radius:8px;padding:12px">
    <h4 style="margin:0 0 8px 0;font:600 13px 'Cera Pro',sans-serif;color:#065f46">📋 Student Visa Requirements</h4>
    <div style="font:12px 'Cera Pro',sans-serif;color:#065f46;line-height:1.5">
      • <strong>I-20 form</strong> from your school<br/>
      • <strong>Financial proof</strong> for tuition & living expenses<br/>
      • <strong>SEVIS fee payment</strong> ($350)<br/>
      • <strong>Embassy interview</strong> in Singapore<br/>
      • <strong>Academic records</strong> & English proficiency
    </div>
  </div>
</div>`
          gullieSay(html, targetThreadId)
        }, 1000)
        
      } else if (status === 'have_visa') {
        gullieSay(`Excellent! Since you already have a valid visa, I can focus on other aspects of your move. Let me help you with the immigration-related logistics for your arrival.`)
        
        setTimeout(() => {
          const html = `
<div style="padding:16px;background:#fff;max-width:100%;font-family:'Cera Pro',sans-serif">
  <h3 style="margin:0 0 12px 0;font:600 16px 'Cera Pro',sans-serif;color:#1f2937">✅ Arrival Preparation Checklist</h3>
  
  <div style="background:#ecfdf5;border:1px solid #10b981;border-radius:8px;padding:16px;margin-bottom:16px">
    <h4 style="margin:0 0 12px 0;font:600 13px 'Cera Pro',sans-serif;color:#065f46">Documents to prepare for arrival:</h4>
    
    <div style="display:grid;gap:6px;margin-bottom:12px">
      <button data-intent="prepare_arrival_docs" data-payload='{"doc":"passport_visa","details":"Passport with valid visa"}' style="padding:8px;border:1px solid #10b981;background:#ecfdf5;color:#065f46;border-radius:6px;font:11px 'Cera Pro',sans-serif;text-align:left">📖 Passport & visa</button>
      <button data-intent="prepare_arrival_docs" data-payload='{"doc":"i94","details":"I-94 arrival/departure record"}' style="padding:8px;border:1px solid #10b981;background:#ecfdf5;color:#065f46;border-radius:6px;font:11px 'Cera Pro',sans-serif;text-align:left">📋 I-94 record</button>
      <button data-intent="prepare_arrival_docs" data-payload='{"doc":"supporting_docs","details":"Supporting documents for entry"}' style="padding:8px;border:1px solid #10b981;background:#ecfdf5;color:#065f46;border-radius:6px;font:11px 'Cera Pro',sans-serif;text-align:left">📄 Supporting documents</button>
    </div>
  </div>

  <div style="background:#e0f2fe;border:1px solid #0ea5e9;border-radius:8px;padding:12px">
    <h4 style="margin:0 0 8px 0;font:600 13px 'Cera Pro',sans-serif;color:#0c4a6e">🏛️ Next steps after arrival:</h4>
    <div style="font:12px 'Cera Pro',sans-serif;color:#0c4a6e;line-height:1.5">
      • <strong>Social Security Number</strong> application<br/>
      • <strong>State ID/Driver's License</strong> setup<br/>
      • <strong>Bank account opening</strong> requirements<br/>
      • <strong>Address registration</strong> & mail forwarding
    </div>
  </div>
</div>`
          gullieSay(html, targetThreadId)
        }, 1000)
      }
      break
    }
    case 'immigration_consultation': {
      gullieSay(`I'll help you schedule a consultation with an immigration expert. They'll review your specific case and provide personalized guidance. What's the best way to reach you?`)
      break
    }
    case 'set_job_status':
    case 'set_family_relationship':
    case 'set_school_status':
    case 'prepare_arrival_docs': {
      const details = (payload as any)?.details || 'immigration information'
      updateRelocationPlan({ immigrationStatus: details })
      gullieSay(`Perfect! I've captured that information. Let me now guide you through the next steps in your immigration process and connect you with the right specialists.`)
      
      // Auto-trigger immigration partner connection after capturing job status
      setTimeout(() => {
        handleImmigrationPartnerConnection()
      }, 1500)
      break
    }
    case 'select_accommodation_type':
    case 'select_nyc_area': {
      const details = (payload as any)?.details || 'accommodation preference'
      updateRelocationPlan({ accommodationType: details })
      
      gullieSay(`Excellent choice! I've noted your preference for ${details}. Now let me gather your budget and timeline to find the best options for you.`)
      
      setTimeout(() => {
        const html = `
<div style="padding:16px;background:#fff;max-width:100%;font-family:'Cera Pro',sans-serif">
  <h3 style="margin:0 0 12px 0;font:600 16px 'Cera Pro',sans-serif;color:#1f2937">💰 Budget & Timeline</h3>
  
  <div style="background:#fef3c7;border:1px solid #f59e0b;border-radius:8px;padding:16px;margin-bottom:16px">
    <h4 style="margin:0 0 12px 0;font:600 13px 'Cera Pro',sans-serif;color:#92400e">What's your budget for accommodation?</h4>
    
    <div style="display:grid;gap:8px;grid-template-columns:1fr 1fr;margin-bottom:12px">
      <button data-intent="set_accommodation_budget" data-payload='{"budget":"100-150","details":"$100-150 per night"}' style="padding:10px;border:1px solid #f59e0b;background:#fef3c7;color:#92400e;border-radius:6px;font:12px 'Cera Pro',sans-serif">$100-150/night</button>
      <button data-intent="set_accommodation_budget" data-payload='{"budget":"150-250","details":"$150-250 per night"}' style="padding:10px;border:1px solid #f59e0b;background:#fef3c7;color:#92400e;border-radius:6px;font:12px 'Cera Pro',sans-serif">$150-250/night</button>
      <button data-intent="set_accommodation_budget" data-payload='{"budget":"250-400","details":"$250-400 per night"}' style="padding:10px;border:1px solid #f59e0b;background:#fef3c7;color:#92400e;border-radius:6px;font:12px 'Cera Pro',sans-serif">$250-400/night</button>
      <button data-intent="set_accommodation_budget" data-payload='{"budget":"400+","details":"$400+ per night"}' style="padding:10px;border:1px solid #f59e0b;background:#fef3c7;color:#92400e;border-radius:6px;font:12px 'Cera Pro',sans-serif">$400+/night</button>
    </div>
  </div>

  <div style="background:#e0f2fe;border:1px solid #0ea5e9;border-radius:8px;padding:16px;margin-bottom:16px">
    <h4 style="margin:0 0 12px 0;font:600 13px 'Cera Pro',sans-serif;color:#0c4a6e">How long do you need accommodation?</h4>
    
    <div style="display:grid;gap:8px;grid-template-columns:1fr 1fr;margin-bottom:12px">
      <button data-intent="set_accommodation_duration" data-payload='{"duration":"1-2 weeks","details":"1-2 weeks stay"}' style="padding:10px;border:1px solid #0ea5e9;background:#e0f2fe;color:#0c4a6e;border-radius:6px;font:12px 'Cera Pro',sans-serif">1-2 weeks</button>
      <button data-intent="set_accommodation_duration" data-payload='{"duration":"1 month","details":"1 month stay"}' style="padding:10px;border:1px solid #0ea5e9;background:#e0f2fe;color:#0c4a6e;border-radius:6px;font:12px 'Cera Pro',sans-serif">1 month</button>
      <button data-intent="set_accommodation_duration" data-payload='{"duration":"2-3 months","details":"2-3 months stay"}' style="padding:10px;border:1px solid #0ea5e9;background:#e0f2fe;color:#0c4a6e;border-radius:6px;font:12px 'Cera Pro',sans-serif">2-3 months</button>
      <button data-intent="set_accommodation_duration" data-payload='{"duration":"flexible","details":"Flexible timeline"}' style="padding:10px;border:1px solid #0ea5e9;background:#e0f2fe;color:#0c4a6e;border-radius:6px;font:12px 'Cera Pro',sans-serif">Flexible</button>
    </div>
  </div>

  <div style="background:#ecfdf5;border:1px solid #10b981;border-radius:8px;padding:12px">
    <h4 style="margin:0 0 8px 0;font:600 13px 'Cera Pro',sans-serif;color:#065f46">🔍 Next: Live Search Results</h4>
    <div style="font:12px 'Cera Pro',sans-serif;color:#065f46;line-height:1.5">
      Once you select your budget and timeline, I'll search for live availability and pricing from multiple booking platforms.
    </div>
  </div>
</div>`
        gullieSay(html, targetThreadId)
      }, 1000)
      break
    }
    case 'set_accommodation_budget':
    case 'set_accommodation_duration': {
      const details = (payload as any)?.details || 'preference'
      const budget = (payload as any)?.budget || ''
      const duration = (payload as any)?.duration || ''
      
      if (budget) {
        updateRelocationPlan({ accommodationBudget: details })
      }
      if (duration) {
        updateRelocationPlan({ accommodationDuration: details })
      }
      
      const budgetRange = store.relocationPlan?.accommodationBudget || details
      const stayDuration = store.relocationPlan?.accommodationDuration || details
      
      gullieSay(`Perfect! I've captured your ${budget ? 'budget' : 'timeline'}: ${details}. ${budgetRange && stayDuration ? 'Now I have both your budget and timeline. Let me search for live availability that matches your preferences.' : 'Please also select your ' + (budget ? 'timeline' : 'budget') + ' so I can find the best options for you.'}`)
      
      // If we have both budget and duration, the system instructions will guide the AI to search
      break
    }
    case 'pet_details_form': {
      gullieSay(`Perfect! I'll help you fill out detailed pet information. This will ensure we have everything needed for international pet travel. What type of pet are you relocating?`)
      break
    }
    case 'set_household_goods': {
      const description = (payload as any)?.description || ''
      const step = (payload as any)?.step || ''
      
      updateRelocationPlan({ specialRequirements: [...(store.relocationPlan?.specialRequirements || []), `Household: ${description}`] })
      gullieSay(`Perfect! I've noted your household size as: ${description}. This helps me estimate shipping volume.`)
      
      // If this was from the sequential workflow, ask the next question
      if (step === 'size_selected') {
        setTimeout(() => {
          // Import the function or call it through a dynamic import
          askShippingTypeQuestion(targetThreadId, description)
        }, 1500)
      }
      break
    }
    case 'household_survey': {
      gullieSay(`Great idea! I'll send you a virtual survey link to get a precise estimate of your belongings. This will help movers provide more accurate quotes. The survey takes about 10-15 minutes and includes room-by-room assessment.`)
      break
    }
    case 'shipping_type': {
      const description = (payload as any)?.description || ''
      const step = (payload as any)?.step || ''
      
      updateRelocationPlan({ specialRequirements: [...(store.relocationPlan?.specialRequirements || []), `Shipping: ${description}`] })
      gullieSay(`Perfect! You're shipping: ${description}. I now have all the information needed to help you.`)
      
      // If this was from the sequential workflow, provide next steps
      if (step === 'type_selected') {
        setTimeout(() => {
          gullieSay(`**Next steps for your shipping:**

• **Get 3-5 quotes** from verified international movers
• **Schedule virtual/in-home surveys** for accurate estimates  
• **Compare insurance options** & transit times
• **Plan packing timeline** (2-4 weeks before move)

Would you like me to start connecting you with trusted international moving companies for quotes?`, targetThreadId)
        }, 1500)
      }
      break
    }
    case 'housing_type': {
      const preference = (payload as any)?.preference || ''
      updateRelocationPlan({ accommodationType: preference })
      gullieSay(`Excellent! I've noted your preference for: ${preference}. I'll connect you with local real estate agents and provide resources specific to your housing needs. What's your target budget range?`)
      break
    }
    case 'moving_shipping':
    case 'moving_and_shipping':
    case 'moving':
    case 'shipping': {
      gullieSay(`Great! I'll help you with shipping and moving your belongings. Let me start by understanding what you need to move.`)
      break
    }
    case 'visa_immigration':
    case 'visa_and_immigration':
    case 'immigration': {
      gullieSay(`Perfect! I'm here to help with your visa and immigration needs. Let me understand your specific situation.`)
      break
    }
    case 'pet_relocation': {
      gullieSay(`Wonderful! I'll help you relocate your pets safely. Pet relocation requires careful planning and documentation.`)
      break
    }
    case 'temporary_housing': {
      const toCity = store.relocationPlan?.toCity || 'your destination'
      const fromCity = store.relocationPlan?.fromCity || ''
      
      gullieSay(`Perfect! I'll help you find temporary accommodation for your first month in ${toCity}. Let me gather your preferences and show you the best options.`)
      
      // Use LLM to generate dynamic content based on actual destination
      setTimeout(async () => {
        try {
          const contextMessage = `Create a temporary accommodation search interface for someone moving to ${toCity}${fromCity ? ` from ${fromCity}` : ''}. 

Generate HTML with:
1. Accommodation type options (extended stay hotels, serviced apartments, corporate housing, monthly rentals)
2. Area/neighborhood options specific to ${toCity} (use actual neighborhoods like SOMA, Mission, Marina for SF or Financial District, SoHo, Williamsburg for NYC)
3. Services overview

Use data-intent attributes on buttons:
- "select_accommodation_type" with type and details payload  
- "select_area" with area and details payload

Style with inline CSS using Cera Pro font family, rounded corners, appropriate colors. Be specific to ${toCity} neighborhoods and areas, not generic locations.`

          const serviceType = getServiceFromThread(targetThreadId)
          const dynamicContent = await callOpenAIResponse(contextMessage, {
            instructions: getServiceSpecificInstructions(serviceType),
            reasoningEffort: 'low'
          })
          
          gullieSay(dynamicContent, targetThreadId)
        } catch (e) {
          // Fallback to basic message if LLM call fails
          gullieSay(`I'll help you find temporary accommodation in ${toCity}. What type of accommodation do you prefer - extended stay hotels, serviced apartments, corporate housing, or monthly rentals?`, targetThreadId)
        }
      }, 1000)
      break
    }
    case 'finance_taxes':
    case 'finance_and_taxes':
    case 'finance': {
      gullieSay(`Excellent! I'll help you set up your finances in your new location. This includes banking, taxes, and money transfers.`)
      break
    }
    case 'healthcare': {
      gullieSay(`Important! I'll help you set up healthcare in your new location. This includes insurance, finding doctors, and transferring records.`)
      break
    }
    case 'transportation': {
      gullieSay(`Smart planning! I'll help you with transportation options in your new city. This includes licensing, vehicles, and public transport.`)
      break
    }
    case 'education': {
      gullieSay(`Great! I'll help you with education and schooling needs for your family. Let me understand your requirements.`)
      break
    }
    case 'housing': {
      gullieSay(`Perfect! I'll help you find the right housing in your new location. Let me understand your preferences.`)
      break
    }
    case 'select_move_type':
    case 'set_move_type':
    case 'choose_move_type': {
      const moveType = (payload as any)?.type || (payload as any)?.value || intent.split('_').pop()
      if (moveType) {
        updateRelocationPlan({ moveType })
        gullieSay(`Perfect! ${moveType} move noted. Now let me help you with the next steps to get accurate quotes and coordinate your ${moveType} relocation.`)
        
        // Auto-continue with relevant next steps based on move type
        setTimeout(() => {
          if (moveType === 'interstate') {
            gullieSay(`For interstate moves, I'll need to coordinate between states and ensure all regulations are met. Let's set your timeline and get quotes from licensed interstate movers.`, targetThreadId)
          } else if (moveType === 'international') {
            gullieSay(`International moves require customs documentation and specialized carriers. I'll help coordinate shipping, customs, and delivery to your destination country.`, targetThreadId)
          } else if (moveType === 'local') {
            gullieSay(`Local moves are simpler but still need proper planning. Let's schedule your move date and arrange local moving services.`, targetThreadId)
          }
        }, 1000)
      }
      break
    }
    case 'set_move_timeline':
    case 'confirm_move_date': {
      const date = (payload as any)?.date || (payload as any)?.value
      if (date) {
        updateRelocationPlan({ selectedDate: date })
        gullieSay(`Move date confirmed for ${date}. Now I'll coordinate all your relocation services around this timeline. Let's continue with getting quotes and booking your services.`)
        
        // Auto-continue with service booking
        setTimeout(() => {
          gullieSay(`Next, I recommend we get moving quotes and start your service bookings. Would you like me to connect you with verified movers and get preliminary estimates?`, targetThreadId)
        }, 1500)
      }
      break
    }
    default:
      // Handle common patterns and extract useful data
      let handled = false
      const data = payload || {}
      
      // Check for move type in intent name or payload
      if (intent.toLowerCase().includes('interstate') || (data as any)?.type === 'interstate' || (data as any)?.value === 'interstate') {
        updateRelocationPlan({ moveType: 'interstate' })
        gullieSay(`Perfect! Interstate move noted. I'll coordinate your move between states and ensure all regulations are met. Let's set your timeline and get quotes from licensed interstate movers.`)
        handled = true
      } else if (intent.toLowerCase().includes('international') || (data as any)?.type === 'international' || (data as any)?.value === 'international') {
        updateRelocationPlan({ moveType: 'international' })
        gullieSay(`Perfect! International move noted. This requires customs documentation and specialized carriers. I'll help coordinate shipping, customs, and delivery to your destination country.`)
        handled = true
      } else if (intent.toLowerCase().includes('local') || (data as any)?.type === 'local' || (data as any)?.value === 'local') {
        updateRelocationPlan({ moveType: 'local' })
        gullieSay(`Perfect! Local move noted. Local moves are simpler but still need proper planning. Let's schedule your move date and arrange local moving services.`)
        handled = true
      }
      
      // Check for date information
      if ((data as any)?.date && !handled) {
        updateRelocationPlan({ selectedDate: (data as any).date })
        gullieSay(`Move date confirmed for ${(data as any).date}. Now I'll coordinate all your relocation services around this timeline. Let's continue with getting quotes and booking your services.`)
        handled = true
      }
      
      // Check for household size
      if ((data as any)?.size && !handled) {
        updateRelocationPlan({ householdSize: Number((data as any).size) })
        gullieSay(`Household size noted: ${(data as any).size} people. This helps me plan your shipping, housing, and other services accordingly.`)
        handled = true
      }
      
      if (handled) {
        // Auto-continue with next steps after data capture
        setTimeout(async () => {
          try {
            const serviceType = getServiceFromThread(targetThreadId)
            const contextMessage = `User just provided: ${intent} with ${JSON.stringify(data)}. Continue guiding them through their ${serviceType} workflow with the next logical step. Be specific and actionable. Stay focused ONLY on ${serviceType}-related topics.`
            const reply = await callOpenAIResponse(contextMessage, { 
              instructions: getServiceSpecificInstructions(serviceType), 
              reasoningEffort: 'low'
            })
            gullieSay(reply, targetThreadId)
          } catch (e) {
            console.warn('Auto-continuation failed:', e)
          }
        }, 1500)
      } else if (typeof data === 'object' && Object.keys(data).length > 0) {
        gullieSay(`Got it! I've noted your selection. Let me continue helping you with the next steps in your relocation process.`)
        
        // Auto-continue conversation
        setTimeout(async () => {
          try {
            const serviceType = getServiceFromThread(targetThreadId)
            const contextMessage = `User selected: ${intent} with data: ${JSON.stringify(data)}. Continue the conversation by providing the next logical step in their ${serviceType} workflow. Be specific and actionable. Stay focused ONLY on ${serviceType}-related topics.`
            const reply = await callOpenAIResponse(contextMessage, { 
              instructions: getServiceSpecificInstructions(serviceType), 
              reasoningEffort: 'low'
            })
            gullieSay(reply, targetThreadId)
          } catch (e) {
            console.warn('Auto-continuation failed:', e)
          }
        }, 1000)
      } else {
        // Convert technical intent names to natural language
        const naturalLanguageMap: Record<string, string> = {
          'choose_location': 'choosing a location',
          'select_location': 'selecting a location',
          'pick_location': 'picking a location',
          'choose_date': 'choosing a date',
          'select_date': 'selecting a date',
          'pick_date': 'picking a date',
          'set_household_size': 'setting household size',
          'select_household_size': 'selecting household size',
          'choose_household_size': 'choosing household size',
          'set_move_type': 'selecting move type',
          'choose_move_type': 'choosing move type',
          'select_move_type': 'selecting move type'
        }
        
        const naturalIntent = naturalLanguageMap[intent] || intent.replace(/_/g, ' ')
        gullieSay(`I understand you want help with ${naturalIntent}. Let me see how I can assist you with that.`)
      }
  }
  
}

const SEARCH_CACHE = new Map<string, string>()

export async function handleHotelSearch(payload: any) {
  const date = payload?.date ? ` available ${payload.date}` : ''
  const near = payload?.near ? ` near ${payload.near}` : ' near Javits Center'
  const walk = payload?.walk ? ` within ${payload.walk}` : ' within 10 minute walk'
  const budget = payload?.budget ? ` under $${payload.budget}` : ''
  const query = payload?.query || `hotels${near}${walk}${date}${budget}`

  // Use cache if available to reduce latency
  if (SEARCH_CACHE.has(query)) {
    const cached = SEARCH_CACHE.get(query)!
    gullieSay(cached)
    return
  }

  // Show loading message
  gullieSay('<section style="padding:12px;border:1px solid #e5e7eb;border-radius:12px;background:#fff"><p style="margin:0;font:13px system-ui;color:#52525b">🔍 Searching hotels...</p></section>')

  try {
    const searchResults = await callOpenAIResponse(query, { tools: [{ type: 'web_search_preview' }], instructions: 'Return concise bullet context of hotel candidates with names, addresses, prices if available, and distances if present. Include absolute https source links.' })
    const html = await callOpenAIResponse(
      `Using only these web results, render a hotel results card with up to 4 options.\nInclude for each: name, short subtitle (area or address), optional price, optional distance/walk time.\nEach option must include a Select button with data-intent=\"choose_hotel\" and a data-payload JSON that includes {id,name,price,address,near}.\nKeep the same minimal inline style used in examples. Include a small \"Sources\" footer with links. Results:\n${searchResults}`,
      { instructions: SYSTEM_INSTRUCTIONS }
    )
    SEARCH_CACHE.set(query, html)
    gullieSay(html)
  } catch (e) {
    gullieSay(`<section style="padding:12px;border:1px solid #e5e7eb;border-radius:12px;background:#fff"><p style="margin:0;font:13px system-ui;color:#dc2626">❌ Search failed: ${String(e)}</p></section>`)
  }
}

export async function handleDatePicker(defaultDate: string) {
  const html = `
<div style="padding:16px;background:#fff;max-width:100%;font-family:'Cera Pro',sans-serif">
  <h3 style="margin:0 0 12px 0;font:600 16px 'Cera Pro',sans-serif;color:#1f2937">📅 Choose your moving date</h3>
  <p style="margin:0 0 16px 0;font:14px 'Cera Pro',sans-serif;color:#6b7280">Select your preferred arrival or departure date for the relocation.</p>
  
  <div style="background:#f0f9ff;border:1px solid #0ea5e9;border-radius:8px;padding:16px;margin-bottom:16px">
    <label style="display:block;font:600 13px 'Cera Pro',sans-serif;color:#0c4a6e;margin-bottom:8px">Select Date:</label>
    <input type="date" id="gullie-date-picker" value="${defaultDate}" style="width:100%;padding:10px;border:1px solid #e5e7eb;border-radius:6px;font:14px 'Cera Pro',sans-serif;background:#fff;margin-bottom:12px">
    
    <div style="display:grid;gap:8px;grid-template-columns:1fr 1fr">
      <button data-intent="choose_date" data-payload='{"date":"from-input"}' style="padding:10px;border:1px solid #0ea5e9;background:#0ea5e9;color:#fff;border-radius:6px;font:14px 'Cera Pro',sans-serif">✓ Confirm Date</button>
      <button data-intent="choose_date" data-payload='{"date":"flexible","preference":"any_time"}' style="padding:10px;border:1px solid #6b7280;background:#f9fafb;color:#374151;border-radius:6px;font:14px 'Cera Pro',sans-serif">I'm flexible</button>
    </div>
  </div>

  <div style="background:#ecfdf5;border:1px solid #10b981;border-radius:8px;padding:12px">
    <h4 style="margin:0 0 8px 0;font:600 13px 'Cera Pro',sans-serif;color:#065f46">Quick options:</h4>
    <div style="display:grid;gap:6px;grid-template-columns:1fr 1fr">
      <button data-intent="choose_date" data-payload='{"date":"2025-08-01"}' style="padding:8px;border:1px solid #10b981;background:#ecfdf5;color:#065f46;border-radius:6px;font:12px 'Cera Pro',sans-serif">August 2025</button>
      <button data-intent="choose_date" data-payload='{"date":"2025-09-01"}' style="padding:8px;border:1px solid #10b981;background:#ecfdf5;color:#065f46;border-radius:6px;font:12px 'Cera Pro',sans-serif">September 2025</button>
      <button data-intent="choose_date" data-payload='{"date":"2025-10-01"}' style="padding:8px;border:1px solid #10b981;background:#ecfdf5;color:#065f46;border-radius:6px;font:12px 'Cera Pro',sans-serif">October 2025</button>
      <button data-intent="choose_date" data-payload='{"date":"2025-11-01"}' style="padding:8px;border:1px solid #10b981;background:#ecfdf5;color:#065f46;border-radius:6px;font:12px 'Cera Pro',sans-serif">November 2025</button>
    </div>
  </div>
</div>`
  gullieSay(html)
}

// Workflow handlers for Gullie services
export async function handleShippingWorkflow(householdSize: number) {
  const html = `
<div style="padding:16px;background:#fff;max-width:100%;font-family:'Cera Pro',sans-serif">
  <h3 style="margin:0 0 12px 0;font:600 16px 'Cera Pro',sans-serif;color:#1f2937">📦 Shipping & Moving Plan</h3>
  <p style="margin:0 0 12px 0;font:14px 'Cera Pro',sans-serif;color:#6b7280">For ${householdSize} ${householdSize === 1 ? 'person' : 'people'} • Singapore → London</p>
  
  <div style="background:#f9fafb;border:1px solid #e5e7eb;border-radius:8px;padding:12px;margin-bottom:16px">
    <h4 style="margin:0 0 8px 0;font:600 13px 'Cera Pro',sans-serif">Step 1: Research Moving Companies</h4>
    <p style="margin:0 0 8px 0;font:12px 'Cera Pro',sans-serif;color:#6b7280">Get quotes from international movers and verify insurance coverage</p>
    <button data-intent="get_moving_quotes" data-payload='{"householdSize":${householdSize},"route":"Singapore-London"}' style="padding:6px 12px;border:1px solid #ea580c;background:#ea580c;color:#fff;border-radius:6px;font:12px 'Cera Pro',sans-serif">Get Quotes</button>
  </div>

  <div style="background:#f9fafb;border:1px solid #e5e7eb;border-radius:8px;padding:12px;margin-bottom:16px">
    <h4 style="margin:0 0 8px 0;font:600 13px 'Cera Pro',sans-serif">Step 2: Create Inventory</h4>
    <p style="margin:0 0 8px 0;font:12px 'Cera Pro',sans-serif;color:#6b7280">Document items, take photos, decide what to ship vs sell</p>
    <button data-intent="start_inventory" data-payload='{"householdSize":${householdSize}}' style="padding:6px 12px;border:1px solid #ea580c;background:#ea580c;color:#fff;border-radius:6px;font:12px 'Cera Pro',sans-serif">Start Inventory</button>
  </div>

  <div style="background:#f9fafb;border:1px solid #e5e7eb;border-radius:8px;padding:12px">
    <h4 style="margin:0 0 8px 0;font:600 13px 'Cera Pro',sans-serif">Step 3: Schedule & Pack</h4>
    <p style="margin:0 0 8px 0;font:12px 'Cera Pro',sans-serif;color:#6b7280">Book dates 2-3 months ahead, arrange professional packing</p>
    <button data-intent="schedule_move" data-payload='{"householdSize":${householdSize}}' style="padding:6px 12px;border:1px solid #ea580c;background:#ea580c;color:#fff;border-radius:6px;font:12px 'Cera Pro',sans-serif">Schedule Move</button>
  </div>

  <div style="margin-top:16px;padding-top:12px;border-top:1px solid #e5e7eb">
    <p style="margin:0 0 8px 0;font:12px 'Cera Pro',sans-serif;color:#6b7280">💡 <strong>Tip:</strong> Transit time: 4-8 weeks for international shipping</p>
    <button data-intent="show_all_services" data-payload='{"context":"shipping"}' style="padding:6px 12px;border:1px solid #6b7280;background:#f9fafb;color:#374151;border-radius:6px;font:12px 'Cera Pro',sans-serif">View All Services</button>
  </div>
</div>`
  gullieSay(html)
}

export async function handleHouseholdSizeSelection() {
  const html = `
<div style="padding:16px;background:#fff;max-width:100%;font-family:'Cera Pro',sans-serif">
  <h3 style="margin:0 0 12px 0;font:600 16px 'Cera Pro',sans-serif;color:#1f2937">👥 How many people are moving?</h3>
  <p style="margin:0 0 16px 0;font:14px 'Cera Pro',sans-serif;color:#6b7280">This helps me plan your shipping volume, housing needs, and visa requirements.</p>
  
  <div style="background:#f0f9ff;border:1px solid #0ea5e9;border-radius:8px;padding:12px;margin-bottom:16px">
    <h4 style="margin:0 0 8px 0;font:600 13px 'Cera Pro',sans-serif;color:#0c4a6e">Select your household size:</h4>
    <div style="display:grid;gap:8px;grid-template-columns:1fr 1fr 1fr 1fr">
      <button data-intent="confirm_household_size" data-payload='{"size":1}' style="padding:12px;border:1px solid #0ea5e9;background:#e0f2fe;color:#0c4a6e;border-radius:6px;font:14px 'Cera Pro',sans-serif;text-align:center">
        <div style="font:600 16px 'Cera Pro',sans-serif">1</div>
        <div style="font:11px 'Cera Pro',sans-serif">Just me</div>
      </button>
      <button data-intent="confirm_household_size" data-payload='{"size":2}' style="padding:12px;border:1px solid #0ea5e9;background:#e0f2fe;color:#0c4a6e;border-radius:6px;font:14px 'Cera Pro',sans-serif;text-align:center">
        <div style="font:600 16px 'Cera Pro',sans-serif">2</div>
        <div style="font:11px 'Cera Pro',sans-serif">Couple</div>
      </button>
      <button data-intent="confirm_household_size" data-payload='{"size":3}' style="padding:12px;border:1px solid #0ea5e9;background:#e0f2fe;color:#0c4a6e;border-radius:6px;font:14px 'Cera Pro',sans-serif;text-align:center">
        <div style="font:600 16px 'Cera Pro',sans-serif">3</div>
        <div style="font:11px 'Cera Pro',sans-serif">Small family</div>
      </button>
      <button data-intent="confirm_household_size" data-payload='{"size":4}' style="padding:12px;border:1px solid #0ea5e9;background:#e0f2fe;color:#0c4a6e;border-radius:6px;font:14px 'Cera Pro',sans-serif;text-align:center">
        <div style="font:600 16px 'Cera Pro',sans-serif">4</div>
        <div style="font:11px 'Cera Pro',sans-serif">Family</div>
      </button>
    </div>
    <div style="display:grid;gap:8px;grid-template-columns:1fr 1fr;margin-top:8px">
      <button data-intent="confirm_household_size" data-payload='{"size":5}' style="padding:12px;border:1px solid #0ea5e9;background:#e0f2fe;color:#0c4a6e;border-radius:6px;font:14px 'Cera Pro',sans-serif;text-align:center">
        <div style="font:600 16px 'Cera Pro',sans-serif">5+</div>
        <div style="font:11px 'Cera Pro',sans-serif">Large family</div>
      </button>
      <button data-intent="custom_household_size" data-payload='{"action":"custom"}' style="padding:12px;border:1px solid #6b7280;background:#f9fafb;color:#374151;border-radius:6px;font:14px 'Cera Pro',sans-serif;text-align:center">
        <div style="font:600 16px 'Cera Pro',sans-serif">?</div>
        <div style="font:11px 'Cera Pro',sans-serif">Other</div>
      </button>
    </div>
  </div>

  <div style="background:#ecfdf5;border:1px solid #10b981;border-radius:8px;padding:12px">
    <h4 style="margin:0 0 6px 0;font:600 13px 'Cera Pro',sans-serif;color:#065f46">💡 Why this matters:</h4>
    <div style="font:12px 'Cera Pro',sans-serif;color:#065f46;line-height:1.5">
      • <strong>Shipping:</strong> Volume affects container size & cost<br/>
      • <strong>Housing:</strong> Bedroom & space requirements<br/>
      • <strong>Visas:</strong> Family vs individual applications<br/>
      • <strong>Schools:</strong> Enrollment for children
    </div>
  </div>
</div>`
  gullieSay(html)
}

/**
 * Handle connecting user with immigration partner
 */
async function handleImmigrationPartnerConnection() {
  gullieSay('Perfect! Let me connect you with our immigration specialist. I\'ll need your contact information to make the introduction.')
  
  try {
    // Ensure we have user email and name
    const userEmail = await ensureUserEmail()
    const userName = await ensureUserName()
    
    if (!userEmail) {
      gullieSay('I need your email address to connect you with our immigration specialist. Please provide it so I can make the introduction.')
      return
    }
    
    gullieSay('Great! I\'m now connecting you with Aizada from Alma, our trusted immigration partner. I\'m sending your information to her team...')
    
    // Send email to immigration partner
    const emailSent = await sendImmigrationPartnerEmail(userEmail, userName || undefined)
    
    if (emailSent) {
      gullieSay(`✅ **Connection Successful!**

I've successfully sent your information to our team to connect you with **Aizada from Alma**, our trusted immigration specialist.

**What happens next:**
• Rachael from Gullie will receive your information at rachael@gullie.io
• Our team will coordinate with Aizada from Alma (aizada@tryalma.com)
• You'll be contacted within 24 hours to schedule your consultation
• You'll receive expert guidance on your visa options and timeline

**About Alma:**
Alma specializes in US immigration and has helped hundreds of professionals with their visa applications, from H-1B to green cards.

In the meantime, would you like me to help you with other aspects of your relocation like shipping, housing, or temporary accommodation?`)
      
      // Update relocation plan to track specialist connection
      updateRelocationPlan({ 
        immigrationStatus: 'specialist_connected',
        specialRequirements: [...(store.relocationPlan?.specialRequirements || []), 'Immigration specialist connected - Aizada@Alma']
      })
    } else {
      gullieSay('I encountered an issue sending your information to our immigration specialist. Please try again, or contact us directly at moves@gullie.io to get connected with Aizada from Alma.')
    }
  } catch (error) {
    console.error('Immigration partner connection failed:', error)
    gullieSay('I encountered an issue connecting you with our immigration specialist. Please contact us directly at moves@gullie.io and we\'ll connect you with Aizada from Alma manually.')
  }
}

// Enhanced dispatcher to handle hotel search intents
export function installExtendedIntents() {
  // placeholder for future runtime intent registration
}


