import type { Hotel } from '@/types/hotel'

export function buildBrandDeepLink(hotel: Hotel): string {
  const city = encodeURIComponent(hotel.city)
  const baseUrl = 'utm_source=trip-planner&utm_medium=web'

  switch (hotel.brand) {
    case 'marriott':
      return `https://www.marriott.com/search/default.mi?destination=${city}&${baseUrl}`
    case 'hilton':
      return `https://www.hilton.com/en/locations/?search=${city}&${baseUrl}`
    case 'hyatt':
      return `https://www.hyatt.com/en-US/hotelsearch?location=${city}&${baseUrl}`
    default:
      return `https://www.google.com/search?q=${city}+hotels`
  }
}

