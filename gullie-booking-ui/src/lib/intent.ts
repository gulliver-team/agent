import { agentSay, upsertStep, createStepId } from '../store'
import type { TimelineStep } from '../types'
import { chooseHotel, payNow } from '../api/mock'
import { callOpenAIResponse } from './openai'
import { SYSTEM_INSTRUCTIONS } from '../instructions/system'

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

export function dispatchIntent(intent: string, rawPayload?: string | null) {
  const payload = safeParse(rawPayload)
  const i = (intent || '').toLowerCase().trim()
  switch (i) {
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
          const a = agentSay('')
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
        agentSay('I could not determine which hotel to choose.')
      }
      break
    }
    case 'select_hotel':
    case 'select': {
      const id = (payload as any)?.id
      if (typeof id === 'string') chooseHotel(id)
      else agentSay('I could not determine which hotel to choose.')
      break
    }
    case 'open_url': {
      const url = (payload as any)?.url
      if (typeof window !== 'undefined' && typeof url === 'string') {
        window.open(url, '_blank', 'noopener,noreferrer')
      } else {
        agentSay('(demo) Could not open URL')
      }
      break
    }
    case 'pay_now': {
      const amount = Number((payload as any)?.amount ?? 0)
      if (!Number.isNaN(amount) && amount > 0) payNow(amount)
      else agentSay('Payment amount missing.')
      break
    }
    case 'open_calendar': {
      const date = (payload as any)?.date
      agentSay(`(demo) Calendar would open here${date ? ` with ${date}` : ''}.`)
      break
    }
    default:
      agentSay(`(demo) Unknown intent: ${intent}`)
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
    const a = agentSay('')
    const cached = SEARCH_CACHE.get(query)!
    upsertStep({ id: createStepId('HtmlCard'), kind: 'HtmlCard', status: 'in_progress', afterMessageId: a.id, ts: Date.now(), data: { html: cached } } as any)
    return
  }

  // Show a small loading card
  const loadingAgent = agentSay('')
  const loadingStepId = createStepId('HtmlCard')
  upsertStep({ id: loadingStepId, kind: 'HtmlCard', status: 'in_progress', afterMessageId: loadingAgent.id, ts: Date.now(), data: { html: '<section style="padding:12px;border:1px solid #e5e7eb;border-radius:12px;background:#fff"><p style="margin:0;font:13px system-ui;color:#52525b">Searching hotels…</p></section>' } } as any)

  try {
    const searchResults = await callOpenAIResponse(query, { tools: [{ type: 'web_search_preview' }], instructions: 'Return concise bullet context of hotel candidates with names, addresses, prices if available, and distances if present. Include absolute https source links.' })
    const html = await callOpenAIResponse(
      `Using only these web results, render a hotel results card with up to 4 options.\nInclude for each: name, short subtitle (area or address), optional price, optional distance/walk time.\nEach option must include a Select button with data-intent=\"choose_hotel\" and a data-payload JSON that includes {id,name,price,address,near}.\nKeep the same minimal inline style used in examples. Include a small \"Sources\" footer with links. Results:\n${searchResults}`,
      { instructions: SYSTEM_INSTRUCTIONS }
    )
    SEARCH_CACHE.set(query, html)
    upsertStep({ id: loadingStepId, kind: 'HtmlCard', status: 'in_progress', afterMessageId: loadingAgent.id, ts: Date.now(), data: { html } } as any)
  } catch (e) {
    upsertStep({ id: loadingStepId, kind: 'HtmlCard', status: 'in_progress', afterMessageId: loadingAgent.id, ts: Date.now(), data: { html: `<section style=\"padding:12px;border:1px solid #e5e7eb;border-radius:12px;background:#fff\"><p style=\"margin:0;font:13px system-ui;color:#dc2626\">Search failed: ${String(e)}</p></section>` } } as any)
  }
}

// Enhance dispatcher to handle hotel search intents
export function installExtendedIntents() {
  // placeholder for future runtime intent registration
}


