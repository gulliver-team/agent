export interface Message {
  id: string
  role: 'user' | 'agent'
  text: string
  ts: number
}

export type StepKind =
  | 'GenericText'
  | 'MapCard'
  | 'HotelSelection'
  | 'BookingSummary'
  | 'PaymentForm'
  | 'Confirmation'
  | 'HtmlCard'

export interface GeoPoint { lat: number; lng: number }
export interface Venue { name: string; address: string; location: GeoPoint }

export interface HotelOption {
  id: string
  name: string
  price: number
  location: GeoPoint
  address: string
  distanceMeters?: number
  walkMinutes?: number
}

export interface TimelineStepBase {
  id: string
  kind: StepKind
  title?: string
  status: 'in_progress' | 'completed' | 'idle'
  ts?: number
  afterMessageId?: string
}

export interface GenericTextData { text: string }
export interface MapCardData {
  venue: Venue
  hotels: HotelOption[]
  radiusMeters: number
}
export interface HotelSelectionData {
  hotels: HotelOption[]
  budget?: number
}
export interface BookingSummaryData {
  venue: Venue
  hotel: HotelOption
  date?: string
}
export interface PaymentFormData {
  amount: number
  hotel: HotelOption
}
export interface ConfirmationData {
  reference: string
  hotel: HotelOption
}

export interface HtmlCardData {
  html: string
  height?: number
}

export type TimelineStep =
  | (TimelineStepBase & { kind: 'GenericText'; data: GenericTextData })
  | (TimelineStepBase & { kind: 'MapCard'; data: MapCardData })
  | (TimelineStepBase & { kind: 'HotelSelection'; data: HotelSelectionData })
  | (TimelineStepBase & { kind: 'BookingSummary'; data: BookingSummaryData })
  | (TimelineStepBase & { kind: 'PaymentForm'; data: PaymentFormData })
  | (TimelineStepBase & { kind: 'Confirmation'; data: ConfirmationData })
  | (TimelineStepBase & { kind: 'HtmlCard'; data: HtmlCardData })

export interface StoreState {
  messages: Message[]
  steps: TimelineStep[]
}


