import type { Intent } from '@/types/intent'
import type { Hotel, ExperienceTag } from '@/types/hotel'

export interface Ancillary {
  title: string
  description?: string
  priceHint?: string
}

const ANCILLARY_CATALOG: Record<string, Ancillary[]> = {
  waterpark: [
    { title: 'Waterpark Day Pass', description: 'Full access to resort waterpark', priceHint: 'From $50/person' },
    { title: 'Waterpark Season Pass', description: 'Unlimited waterpark access', priceHint: 'From $150/person' },
  ],
  spa: [
    { title: 'Couples Spa Package', description: '90-minute couples massage', priceHint: 'From $300/couple' },
    { title: 'Spa Day Pass', description: 'Access to spa facilities + treatment', priceHint: 'From $150/person' },
    { title: 'Relaxation Massage', description: '60-minute full body massage', priceHint: 'From $120/person' },
  ],
  romantic: [
    { title: 'Champagne Dinner', description: 'Private dinner with champagne', priceHint: 'From $200/couple' },
    { title: 'Romantic Sunset Cruise', description: 'Private boat tour at sunset', priceHint: 'From $250/couple' },
    { title: 'In-Room Romance Package', description: 'Rose petals, champagne, chocolates', priceHint: 'From $150' },
    { title: 'Late Checkout', description: 'Extended checkout until 2pm', priceHint: 'Complimentary' },
  ],
  family: [
    { title: 'Kids Club Access', description: 'Supervised activities for children', priceHint: 'From $50/day' },
    { title: 'Family Suite Upgrade', description: 'Upgrade to family-friendly suite', priceHint: 'From $100/night' },
    { title: 'Family Photo Session', description: 'Professional family photos', priceHint: 'From $200' },
  ],
  adventure: [
    { title: 'Guided Hiking Tour', description: 'Expert-led mountain hiking', priceHint: 'From $80/person' },
    { title: 'Adventure Gear Rental', description: 'Bikes, kayaks, and more', priceHint: 'From $40/day' },
    { title: 'Zipline Experience', description: 'Thrilling zipline adventure', priceHint: 'From $120/person' },
    { title: 'Rock Climbing Session', description: 'Indoor/outdoor climbing', priceHint: 'From $90/person' },
  ],
  beach: [
    { title: 'Beach Cabana Rental', description: 'Private beach cabana for the day', priceHint: 'From $150/day' },
    { title: 'Snorkeling Excursion', description: 'Guided snorkeling tour', priceHint: 'From $70/person' },
    { title: 'Surf Lesson', description: 'Professional surf instruction', priceHint: 'From $100/person' },
    { title: 'Beachside Dining', description: 'Private beach dinner setup', priceHint: 'From $180/couple' },
  ],
  mountain: [
    { title: 'Ski Equipment Rental', description: 'Full ski/snowboard gear', priceHint: 'From $60/day' },
    { title: 'Ski Lesson Package', description: 'Private or group lessons', priceHint: 'From $120/person' },
    { title: 'Mountain Guide Service', description: 'Expert mountain guide', priceHint: 'From $200/day' },
  ],
  culture: [
    { title: 'Cultural Tour', description: 'Guided city and culture tour', priceHint: 'From $80/person' },
    { title: 'Museum Pass', description: 'Access to local museums', priceHint: 'From $50/person' },
    { title: 'Cooking Class', description: 'Learn local cuisine', priceHint: 'From $120/person' },
  ],
  nightlife: [
    { title: 'VIP Nightclub Access', description: 'Skip-the-line club entry', priceHint: 'From $100/person' },
    { title: 'Bar Crawl Experience', description: 'Guided bar hopping tour', priceHint: 'From $80/person' },
  ],
}

export function getAncillariesForIntent(
  intent: Intent,
  hotel: Hotel
): Ancillary[] {
  const ancillaries: Ancillary[] = []

  // Mood-based ancillaries
  if (intent.mood === 'romantic' || intent.mood === 'relaxing') {
    ancillaries.push(...(ANCILLARY_CATALOG.romantic || []))
    ancillaries.push(...(ANCILLARY_CATALOG.spa || []))
  }

  if (intent.mood === 'adventure' || intent.mood === 'mountain') {
    ancillaries.push(...(ANCILLARY_CATALOG.adventure || []))
    if (intent.mood === 'mountain') {
      ancillaries.push(...(ANCILLARY_CATALOG.mountain || []))
    }
  }

  if (intent.mood === 'beach') {
    ancillaries.push(...(ANCILLARY_CATALOG.beach || []))
  }

  if (intent.mood === 'family') {
    ancillaries.push(...(ANCILLARY_CATALOG.family || []))
  }

  if (intent.mood === 'culture') {
    ancillaries.push(...(ANCILLARY_CATALOG.culture || []))
  }

  if (intent.mood === 'nightlife') {
    ancillaries.push(...(ANCILLARY_CATALOG.nightlife || []))
  }

  // Party-based ancillaries
  if (intent.party.kids && intent.party.kids > 0) {
    ancillaries.push(...(ANCILLARY_CATALOG.family || []))
  }

  if (intent.party.adults === 2 && !intent.party.kids) {
    ancillaries.push(...(ANCILLARY_CATALOG.romantic || []))
  }

  // Hotel experience-based ancillaries
  if (hotel.experiences.includes('waterpark')) {
    ancillaries.push(...(ANCILLARY_CATALOG.waterpark || []))
  }

  if (hotel.experiences.includes('spa')) {
    ancillaries.push(...(ANCILLARY_CATALOG.spa || []))
  }

  if (hotel.experiences.includes('beach')) {
    ancillaries.push(...(ANCILLARY_CATALOG.beach || []))
  }

  if (hotel.experiences.includes('mountain')) {
    ancillaries.push(...(ANCILLARY_CATALOG.mountain || []))
  }

  // Non-negotiables
  if (intent.nonNegotiables) {
    for (const req of intent.nonNegotiables) {
      const key = req.toLowerCase().replace(/\s+/g, '')
      if (ANCILLARY_CATALOG[key]) {
        ancillaries.push(...ANCILLARY_CATALOG[key])
      }
    }
  }

  // Deduplicate by title
  const seen = new Set<string>()
  return ancillaries.filter((anc) => {
    if (seen.has(anc.title)) return false
    seen.add(anc.title)
    return true
  })
}

