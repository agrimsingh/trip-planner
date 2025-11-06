export type ExperienceTag =
  | 'adventure'
  | 'relaxing'
  | 'romantic'
  | 'family'
  | 'nightlife'
  | 'culture'
  | 'beach'
  | 'mountain'
  | 'spa'
  | 'waterpark'
  | 'golf'

export interface Hotel {
  id: string
  brand: 'marriott' | 'hilton' | 'hyatt'
  name: string
  city: string
  country: string
  region?: string // e.g., 'europe', 'usa', 'apac'
  lat?: number
  lon?: number
  basePriceUsd: number // avg nightly
  suitability: { family: boolean; couples: boolean; groups: boolean }
  experiences: ExperienceTag[] // property vibe/features
  amenities: string[] // human readable
  heroImage: string
  deepLinkHint?: string // slug/identifier for deep-link builder
}

