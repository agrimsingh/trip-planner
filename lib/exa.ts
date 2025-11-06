import Exa from 'exa-js'
import type { Hotel, ExperienceTag } from '@/types/hotel'

const exa = new Exa(process.env.EXA_API_KEY!)

const BRAND_DOMAIN = {
  marriott: 'marriott.com',
  hilton: 'hilton.com',
  hyatt: 'hyatt.com',
} as const

const isPropertyUrl = (url: string, brand: Hotel['brand']): boolean => {
  try {
    const u = new URL(url)
    const p = u.pathname
    if (brand === 'marriott') {
      return /\/hotels\//.test(p) && !/\/(search|default\.mi)/.test(p)
    }
    if (brand === 'hilton') {
      return /\/en\/hotels\//.test(p)
    }
    if (brand === 'hyatt') {
      return /\/en-US\/hotel\//.test(p)
    }
  } catch {
    // Invalid URL
  }
  return false
}

export interface ExaHotelResult {
  hotel: Hotel
  bookUrl: string
}

export async function searchBrandProperties(
  location: string,
  brand: Hotel['brand'],
  limit = 8
): Promise<ExaHotelResult[]> {
  try {
    // If location is empty, use a generic query
    const query = location.trim()
      ? `${brand} hotel in ${location}:`
      : `${brand} hotel:`
    const resp = await exa.searchAndContents(query, {
      numResults: limit,
      includeDomains: [BRAND_DOMAIN[brand]],
      text: { maxCharacters: 2400 },
      useAutoprompt: false,
    } as any)

    const results = (resp.results ?? resp) as Array<any>
    return results
      .filter((r) => r.url && isPropertyUrl(r.url, brand))
      .map((r) => toHotel(r, brand, location))
  } catch (error) {
    console.error(`Exa search failed for ${brand} in ${location}:`, error)
    return []
  }
}

function toHotel(r: any, brand: Hotel['brand'], location: string): ExaHotelResult {
  let name = r.title?.replace(/\s*-\s*(Hilton|Hyatt|Marriott).*/i, '')?.trim()
  if (!name) {
    try {
      name = new URL(r.url).pathname
        .split('/')
        .pop()
        ?.replace(/[-_]/g, ' ') || 'Unknown'
    } catch {
      name = 'Unknown'
    }
  }

  const text: string = r.extract || r.text || ''
  const tags = inferTags(text)
  const suitability = inferSuitability(text)
  const heroImage = heroFor(brand, tags)

  const hotel: Hotel = {
    id: `${brand}:${r.url}`,
    brand,
    name,
    city: location,
    country: '',
    basePriceUsd: 250, // Will be overwritten by budget-typical at callsite
    suitability,
    experiences: tags,
    amenities: [],
    heroImage,
  }

  return { hotel, bookUrl: r.url }
}

function inferTags(text: string): ExperienceTag[] {
  const lower = text.toLowerCase()
  const tags: ExperienceTag[] = []

  if (/beach|ocean|coast|seaside|waterfront/i.test(lower)) tags.push('beach')
  if (/spa|massage|wellness|relaxation/i.test(lower)) tags.push('spa')
  if (/mountain|ski|hiking|alpine/i.test(lower)) tags.push('mountain')
  if (/family|kids|children|playground/i.test(lower)) tags.push('family')
  if (/nightlife|bar|club|entertainment/i.test(lower)) tags.push('nightlife')
  if (/museum|culture|historic|art|gallery/i.test(lower)) tags.push('culture')
  if (/romantic|couples|honeymoon|intimate/i.test(lower)) tags.push('romantic')
  if (/adventure|outdoor|sports|activities/i.test(lower)) tags.push('adventure')
  if (/waterpark|water park|slides/i.test(lower)) tags.push('waterpark')
  if (/golf|course|fairway/i.test(lower)) tags.push('golf')

  // Default to relaxing if no specific tags found
  if (tags.length === 0) {
    tags.push('relaxing')
  }

  return tags
}

function inferSuitability(text: string): Hotel['suitability'] {
  const lower = text.toLowerCase()
  return {
    family: /family|kids|children|playground|family-friendly/i.test(lower),
    couples: /couples?|romantic|honeymoon|intimate/i.test(lower),
    groups: /group|conference|meeting|business|event/i.test(lower),
  }
}

function heroFor(brand: Hotel['brand'], tags: Hotel['experiences']): string {
  // Curated Unsplash images based on brand and experience tags
  if (tags.includes('beach')) {
    return 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=800'
  }
  if (tags.includes('mountain')) {
    return 'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=800'
  }
  if (tags.includes('spa') || tags.includes('relaxing')) {
    return 'https://images.unsplash.com/photo-1571896349842-33c89424de2d?w=800'
  }
  if (tags.includes('culture')) {
    return 'https://images.unsplash.com/photo-1529260830199-42c24126f198?w=800'
  }
  if (tags.includes('romantic')) {
    return 'https://images.unsplash.com/photo-1502602898657-3e91760cbb34?w=800'
  }
  // Default fallback
  return 'https://images.unsplash.com/photo-1566073771259-6a8506099945?w=800'
}

