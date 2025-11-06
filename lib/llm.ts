import OpenAI from 'openai'
import type { Intent } from '@/types/intent'

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
})

const INTENT_SCHEMA = {
  type: 'object',
  properties: {
    mood: {
      type: 'string',
      enum: ['adventure', 'relaxing', 'romantic', 'family', 'nightlife', 'culture', 'beach', 'mountain'],
      description: 'Primary mood or experience type desired',
    },
    location: {
      type: 'string',
      description: 'City, region, or country name',
    },
    party: {
      type: 'object',
      properties: {
        adults: { type: 'number', description: 'Number of adults' },
        kids: { type: 'number', description: 'Number of children, if any' },
      },
      required: ['adults'],
    },
    dates: {
      type: 'object',
      properties: {
        start: { type: 'string', description: 'Start date in YYYY-MM-DD format' },
        end: { type: 'string', description: 'End date in YYYY-MM-DD format' },
      },
    },
    budget: {
      type: 'string',
      enum: ['value', 'mid', 'premium', 'luxury'],
      description: 'Budget band: value (<$150/night), mid ($150-350), premium ($350-700), luxury ($700+)',
    },
    nonNegotiables: {
      type: 'array',
      items: { type: 'string' },
      description: 'Must-have features or amenities',
    },
    interests: {
      type: 'array',
      items: { type: 'string' },
      description: 'Additional interests or activities',
    },
  },
  required: ['mood', 'location', 'party'],
} as const

export async function extractIntent(prompt: string): Promise<Intent> {
  try {
    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        {
          role: 'system',
          content: `You are a travel intent extraction system. Extract structured information from user travel requests.

CRITICAL: For location extraction:
- Extract the most specific location mentioned (city, region, or country)
- Use the exact name as mentioned (e.g., "Maldives", "Paris", "New York", "Orlando")
- If multiple locations are mentioned, use the primary destination
- If location is ambiguous, extract what the user likely means
- Common locations: Maldives, Paris, Rome, New York, Orlando, Tokyo, Dubai, Cancun, Maui, Hawaii, etc.

For mood: Choose from: adventure, relaxing, romantic, family, nightlife, culture, beach, mountain
For party: Extract number of adults and children (if mentioned)
For budget: value (<$150/night), mid ($150-350), premium ($350-700), luxury ($700+)

Return valid JSON only.`,
        },
        {
          role: 'user',
          content: `Extract travel intent from this request: "${prompt}"

Return JSON with: mood, location (as string - city/region/country name), party (object with adults and optional kids), dates (optional), budget (optional), nonNegotiables (array), interests (array).`,
        },
      ],
      response_format: { type: 'json_object' },
      temperature: 0.2,
    })

    const content = completion.choices[0]?.message?.content
    if (!content) {
      throw new Error('No content in OpenAI response')
    }

    const parsed = JSON.parse(content)

    // Validate and normalize
    const intent: Intent = {
      raw: prompt,
      mood: parsed.mood || 'relaxing',
      location: parsed.location || '',
      party: {
        adults: parsed.party?.adults || 2,
        kids: parsed.party?.kids,
      },
      dates: parsed.dates,
      budget: parsed.budget || 'mid',
      nonNegotiables: parsed.nonNegotiables || [],
      interests: parsed.interests || [],
    }

    return intent
  } catch (error) {
    console.error('OpenAI extraction failed, using fallback:', error)
    return fallbackExtractIntent(prompt)
  }
}

function fallbackExtractIntent(prompt: string): Intent {
  const lower = prompt.toLowerCase()

  // Mood detection
  let mood: Intent['mood'] = 'relaxing'
  if (lower.includes('adventure') || lower.includes('adventurous')) mood = 'adventure'
  else if (lower.includes('romantic') || lower.includes('partner') || lower.includes('couple')) mood = 'romantic'
  else if (lower.includes('family') || lower.includes('kids') || lower.includes('children')) mood = 'family'
  else if (lower.includes('nightlife') || lower.includes('party')) mood = 'nightlife'
  else if (lower.includes('culture') || lower.includes('museum') || lower.includes('historic')) mood = 'culture'
  else if (lower.includes('beach') || lower.includes('ocean') || lower.includes('coast')) mood = 'beach'
  else if (lower.includes('mountain') || lower.includes('ski') || lower.includes('hiking')) mood = 'mountain'

  // Party detection
  const adultsMatch = lower.match(/(\d+)\s*(?:adults?|people|travelers?)/)
  const adults = adultsMatch ? parseInt(adultsMatch[1]) : 2

  const kidsMatch = lower.match(/(\d+)\s*(?:kids?|children|child)/)
  const kids = kidsMatch ? parseInt(kidsMatch[1]) : undefined

  // Location detection - improved pattern matching (case-insensitive)
  const locationPatterns = [
    /(?:in|to|at|near|for)\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*)/g, // "in Paris", "to New York"
    /([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*)\s+(?:vacation|trip|getaway|holiday)/gi, // "Maldives vacation"
    /(?:going|traveling|visiting)\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*)/gi, // "going to Tokyo"
  ]

  let location = ''
  for (const pattern of locationPatterns) {
    const matches = [...prompt.matchAll(pattern)]
    if (matches.length > 0) {
      // Take the last match (usually the most specific)
      const match = matches[matches.length - 1]
      if (match && match[1]) {
        location = match[1].trim()
        break
      }
    }
  }

  // Common location aliases (check original prompt for capitalization)
  if (!location) {
    const commonLocations = [
      'maldives', 'paris', 'rome', 'tokyo', 'dubai', 'new york', 'orlando',
      'hawaii', 'maui', 'cancun', 'london', 'barcelona', 'bali', 'santorini',
      'denver', 'aspen', 'sedona', 'whistler', 'istanbul', 'vienna', 'kyoto',
    ]
    for (const loc of commonLocations) {
      if (lower.includes(loc)) {
        // Try to preserve capitalization from original prompt
        const locIndex = lower.indexOf(loc)
        const originalLoc = prompt.substring(locIndex, locIndex + loc.length)
        location = originalLoc || loc
        break
      }
    }
  }

  // Budget detection
  let budget: Intent['budget'] = 'mid'
  if (lower.includes('budget') || lower.includes('cheap') || lower.includes('affordable')) budget = 'value'
  else if (lower.includes('luxury') || lower.includes('premium') || lower.includes('high-end')) budget = 'luxury'
  else if (lower.includes('premium')) budget = 'premium'

  // Non-negotiables
  const nonNegotiables: string[] = []
  if (lower.includes('waterpark')) nonNegotiables.push('waterpark')
  if (lower.includes('spa')) nonNegotiables.push('spa')
  if (lower.includes('beachfront') || lower.includes('beach front')) nonNegotiables.push('beachfront')

  return {
    raw: prompt,
    mood,
    location,
    party: { adults, kids },
    budget,
    nonNegotiables,
    interests: [],
  }
}

