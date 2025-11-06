import Image from 'next/image'
import type { PlanOption } from '@/types/plan'
import { AncillaryPills } from './AncillaryPills'

interface HotelCardProps {
  hotelData: PlanOption['hotels'][0]
}

export function HotelCard({ hotelData }: HotelCardProps) {
  const { hotel, highlights, ancillaries, bookUrl } = hotelData

  return (
    <div className="bg-surface border border-gray-800 rounded-lg overflow-hidden hover:border-gray-700 transition-colors">
      <div className="relative h-48 w-full">
        <Image
          src={hotel.heroImage}
          alt={hotel.name}
          fill
          className="object-cover"
          sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
        />
      </div>
      <div className="p-5">
        <div className="flex items-start justify-between mb-2">
          <h3 className="text-xl font-semibold text-text">{hotel.name}</h3>
          <span className="text-sm text-text/60 ml-2">
            ${hotel.basePriceUsd}/night
          </span>
        </div>
        <p className="text-text/70 text-sm mb-3">
          {hotel.city}, {hotel.country}
        </p>
        {highlights.length > 0 && (
          <ul className="list-disc list-inside text-sm text-text/80 mb-4 space-y-1">
            {highlights.map((highlight, idx) => (
              <li key={idx}>{highlight}</li>
            ))}
          </ul>
        )}
        <AncillaryPills ancillaries={ancillaries} />
        <a
          href={bookUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="mt-4 inline-block w-full text-center bg-text text-background py-2.5 px-4 rounded-md font-medium hover:bg-text/90 transition-colors"
        >
          Book Now
        </a>
      </div>
    </div>
  )
}

