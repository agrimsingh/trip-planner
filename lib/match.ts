import type { Intent } from '@/types/intent'
import type { Hotel } from '@/types/hotel'

const BUDGET_BANDS = {
  value: { min: 0, max: 150, typical: 100 },
  mid: { min: 150, max: 350, typical: 250 },
  premium: { min: 350, max: 700, typical: 525 },
  luxury: { min: 700, max: Infinity, typical: 1000 },
}

function normalizeLocation(loc: string): string {
  return loc
    .toLowerCase()
    .trim()
    .replace(/[^\w\s]/g, '') // Remove punctuation
    .replace(/\s+/g, ' ') // Normalize whitespace
}

function fuzzyMatch(str1: string, str2: string): boolean {
  const s1 = normalizeLocation(str1)
  const s2 = normalizeLocation(str2)
  
  // Exact match
  if (s1 === s2) return true
  
  // One contains the other
  if (s1.includes(s2) || s2.includes(s1)) return true
  
  // Word-level match (e.g., "new york" matches "new york city")
  const words1 = s1.split(' ').filter(w => w.length > 2)
  const words2 = s2.split(' ').filter(w => w.length > 2)
  
  if (words1.length > 0 && words2.length > 0) {
    const allWordsMatch = words1.every(w => words2.some(w2 => w2.includes(w) || w.includes(w2)))
    if (allWordsMatch) return true
  }
  
  return false
}

function locationMatch(hotel: Hotel, intentLocation: string): number {
  if (!intentLocation || intentLocation.trim().length === 0) {
    return 0 // No location specified
  }

  const intentLoc = normalizeLocation(intentLocation)
  const hotelCity = normalizeLocation(hotel.city)
  const hotelCountry = normalizeLocation(hotel.country)
  const hotelRegion = hotel.region ? normalizeLocation(hotel.region) : ''

  // Exact city match (highest priority)
  if (fuzzyMatch(intentLoc, hotelCity)) {
    return 5
  }

  // Country match
  if (fuzzyMatch(intentLoc, hotelCountry)) {
    return 4
  }

  // Check if intent location contains city or vice versa
  if (intentLoc.includes(hotelCity) || hotelCity.includes(intentLoc)) {
    return 4
  }

  // Region match
  if (hotelRegion && fuzzyMatch(intentLoc, hotelRegion)) {
    return 3
  }

  // Partial matches (e.g., "Hawaii" matches "Honolulu", "Maui")
  const commonAliases: Record<string, string[]> = {
    hawaii: ['honolulu', 'maui', 'wailea', 'lahaina'],
    maldives: ['malé', 'male'],
    'new york': ['nyc', 'manhattan', 'times square'],
    orlando: ['disney', 'walt disney world'],
    paris: ['france'],
    tokyo: ['japan'],
    dubai: ['uae', 'united arab emirates'],
  }

  for (const [key, aliases] of Object.entries(commonAliases)) {
    if (fuzzyMatch(intentLoc, key)) {
      if (aliases.some(alias => fuzzyMatch(hotelCity, alias) || fuzzyMatch(hotelCountry, alias))) {
        return 4
      }
    }
    if (aliases.some(alias => fuzzyMatch(intentLoc, alias))) {
      if (fuzzyMatch(hotelCity, key) || fuzzyMatch(hotelCountry, key)) {
        return 4
      }
    }
  }

  return 0
}

function budgetScore(hotel: Hotel, budget?: Intent['budget']): number {
  if (!budget) return 0

  const band = BUDGET_BANDS[budget]
  const price = hotel.basePriceUsd
  const distance = Math.abs(price - band.typical)

  if (price >= band.min && price <= band.max) {
    return 3 // Within budget band
  }
  if (distance < 100) {
    return 2 // Close to budget
  }
  if (distance < 200) {
    return 1 // Somewhat close
  }
  return -1 // Too far from budget
}

function experienceMatch(hotel: Hotel, mood: Intent['mood']): number {
  if (hotel.experiences.includes(mood)) {
    return 3
  }
  // Partial matches
  if (
    (mood === 'romantic' && hotel.experiences.includes('relaxing')) ||
    (mood === 'adventure' && hotel.experiences.includes('mountain'))
  ) {
    return 2
  }
  return 0
}

function partySuitability(hotel: Hotel, party: Intent['party']): number {
  let score = 0
  if (party.kids && party.kids > 0 && hotel.suitability.family) {
    score += 2
  }
  if (party.adults === 2 && !party.kids && hotel.suitability.couples) {
    score += 2
  }
  if (party.adults > 2 && hotel.suitability.groups) {
    score += 2
  }
  return score
}

function nonNegotiablesMatch(hotel: Hotel, nonNegotiables?: string[]): number {
  if (!nonNegotiables || nonNegotiables.length === 0) return 0

  let score = 0
  const hotelText = `${hotel.amenities.join(' ')} ${hotel.experiences.join(' ')}`.toLowerCase()

  for (const req of nonNegotiables) {
    if (hotelText.includes(req.toLowerCase())) {
      score += 3
    }
  }

  return score
}

function interestsMatch(hotel: Hotel, interests?: string[]): number {
  if (!interests || interests.length === 0) return 0

  let score = 0
  const hotelText = `${hotel.amenities.join(' ')} ${hotel.experiences.join(' ')} ${hotel.city} ${hotel.country}`.toLowerCase()

  for (const interest of interests) {
    if (hotelText.includes(interest.toLowerCase())) {
      score += 1
    }
  }

  return score
}

export interface ScoredHotel {
  hotel: Hotel
  score: number
}

export function scoreHotel(hotel: Hotel, intent: Intent): number {
  let score = 0

  // Location match (0-5 points) - highest weight
  const locScore = locationMatch(hotel, intent.location)
  score += locScore

  // If no location match and location was specified, heavily penalize
  if (intent.location && intent.location.trim().length > 0 && locScore === 0) {
    score -= 10 // Heavy penalty for wrong location
  }

  // Experience/mood match (0-3 points)
  score += experienceMatch(hotel, intent.mood)

  // Party suitability (0-2 points)
  score += partySuitability(hotel, intent.party)

  // Budget match (-1 to 3 points)
  score += budgetScore(hotel, intent.budget)

  // Non-negotiables match (0-3 points each)
  score += nonNegotiablesMatch(hotel, intent.nonNegotiables)

  // Interests match (0-1 point each)
  score += interestsMatch(hotel, intent.interests)

  return score
}

export function selectBestBrand(hotels: ScoredHotel[]): 'marriott' | 'hilton' | 'hyatt' {
  const brandScores: Record<string, number> = {}

  // Sum top 3 scores per brand
  const byBrand: Record<string, ScoredHotel[]> = {}
  for (const scored of hotels) {
    const brand = scored.hotel.brand
    if (!byBrand[brand]) {
      byBrand[brand] = []
    }
    byBrand[brand].push(scored)
  }

  for (const [brand, scoredHotels] of Object.entries(byBrand)) {
    const sorted = scoredHotels.sort((a, b) => b.score - a.score)
    const top3 = sorted.slice(0, 3)
    brandScores[brand] = top3.reduce((sum, h) => sum + h.score, 0)
  }

  // Find best brand
  let bestBrand: 'marriott' | 'hilton' | 'hyatt' = 'marriott'
  let bestScore = brandScores.marriott || 0

  for (const [brand, score] of Object.entries(brandScores)) {
    if (score > bestScore) {
      bestScore = score
      bestBrand = brand as 'marriott' | 'hilton' | 'hyatt'
    }
  }

  return bestBrand
}

export function getHighlights(hotel: Hotel, intent: Intent): string[] {
  const highlights: string[] = []

  if (hotel.experiences.includes(intent.mood)) {
    highlights.push(`Perfect for ${intent.mood} experiences`)
  }

  if (intent.party.kids && intent.party.kids > 0 && hotel.suitability.family) {
    highlights.push('Family-friendly')
  }

  if (intent.party.adults === 2 && !intent.party.kids && hotel.suitability.couples) {
    highlights.push('Ideal for couples')
  }

  if (hotel.experiences.includes('beach')) {
    highlights.push('Beachfront location')
  }

  if (hotel.experiences.includes('spa')) {
    highlights.push('World-class spa')
  }

  if (hotel.amenities.length > 0) {
    highlights.push(hotel.amenities[0])
  }

  return highlights.slice(0, 3)
}

