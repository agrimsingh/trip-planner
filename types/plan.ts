import type { Hotel } from './hotel'

export interface PlanOption {
  brand: Hotel['brand']
  rationale: string // brief explanation of brand fit
  hotels: Array<{
    hotel: Hotel
    score: number
    highlights: string[]
    ancillaries: { title: string; description?: string; priceHint?: string }[]
    bookUrl: string // deep link
  }>
}

