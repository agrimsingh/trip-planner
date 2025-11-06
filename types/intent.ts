export type BudgetBand = 'value' | 'mid' | 'premium' | 'luxury'

export interface Party {
  adults: number
  kids?: number
}

export interface Intent {
  raw: string
  mood:
    | 'adventure'
    | 'relaxing'
    | 'romantic'
    | 'family'
    | 'nightlife'
    | 'culture'
    | 'beach'
    | 'mountain'
  location: string // city/region/country string
  party: Party
  dates?: { start?: string; end?: string }
  budget?: BudgetBand
  nonNegotiables?: string[] // e.g., waterpark, spa, beachfront
  interests?: string[] // free-text to boost features
}

