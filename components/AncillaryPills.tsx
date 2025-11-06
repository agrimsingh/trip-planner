import type { PlanOption } from '@/types/plan'
import { buildBrandDeepLink } from '@/lib/brandLinks'

interface AncillaryPillsProps {
  ancillaries: PlanOption['hotels'][0]['ancillaries']
}

export function AncillaryPills({ ancillaries }: AncillaryPillsProps) {
  if (ancillaries.length === 0) return null

  return (
    <div className="flex flex-wrap gap-2 mt-3">
      {ancillaries.map((ancillary, idx) => (
        <div
          key={idx}
          className="px-3 py-1.5 bg-surface border border-gray-800 rounded-full text-sm text-text/80"
        >
          <span className="font-medium">{ancillary.title}</span>
          {ancillary.priceHint && (
            <span className="ml-2 text-text/60 text-xs">{ancillary.priceHint}</span>
          )}
        </div>
      ))}
    </div>
  )
}

