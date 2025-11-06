'use client'

import { useState } from 'react'
import { HotelCard } from '@/components/HotelCard'
import type { PlanOption } from '@/types/plan'

export default function Home() {
  const [prompt, setPrompt] = useState('')
  const [loading, setLoading] = useState(false)
  const [plan, setPlan] = useState<PlanOption | null>(null)
  const [error, setError] = useState<string | null>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!prompt.trim()) return

    setLoading(true)
    setError(null)
    setPlan(null)

    try {
      const res = await fetch('/api/plan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt }),
      })

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || 'Failed to generate plan')
      }

      const data = await res.json()
      setPlan(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong')
    } finally {
      setLoading(false)
    }
  }

  const brandNames: Record<PlanOption['brand'], string> = {
    marriott: 'Marriott Bonvoy',
    hilton: 'Hilton',
    hyatt: 'Hyatt',
  }

  return (
    <main className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-12 max-w-6xl">
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-text mb-4">AI Trip Planner</h1>
          <p className="text-text/70 text-lg">
            Describe your dream trip and we'll find the perfect hotels for you
          </p>
        </div>

        <form onSubmit={handleSubmit} className="mb-12">
          <div className="max-w-2xl mx-auto">
            <textarea
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              placeholder="e.g., I want a relaxing beach vacation with my partner in the Maldives, looking for luxury accommodations with spa access..."
              className="w-full h-32 px-4 py-3 bg-surface border border-gray-800 rounded-lg text-text placeholder:text-text/40 focus:outline-none focus:border-gray-700 resize-none"
              disabled={loading}
            />
            <button
              type="submit"
              disabled={loading || !prompt.trim()}
              className="mt-4 w-full bg-text text-background py-3 px-6 rounded-lg font-medium hover:bg-text/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Planning your trip...' : 'Plan My Trip'}
            </button>
          </div>
        </form>

        {error && (
          <div className="max-w-2xl mx-auto mb-8 p-4 bg-red-900/20 border border-red-800 rounded-lg text-red-400">
            {error}
          </div>
        )}

        {loading && (
          <div className="max-w-6xl mx-auto">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {[1, 2, 3].map((i) => (
                <div key={i} className="bg-surface border border-gray-800 rounded-lg overflow-hidden animate-pulse">
                  <div className="h-48 bg-gray-800" />
                  <div className="p-5 space-y-3">
                    <div className="h-6 bg-gray-800 rounded w-3/4" />
                    <div className="h-4 bg-gray-800 rounded w-1/2" />
                    <div className="h-4 bg-gray-800 rounded w-full" />
                    <div className="h-10 bg-gray-800 rounded" />
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {plan && (
          <div className="max-w-6xl mx-auto">
            <div className="mb-6">
              <h2 className="text-2xl font-semibold text-text mb-2">
                {brandNames[plan.brand]} Recommendations
              </h2>
              <p className="text-text/70">{plan.rationale}</p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {plan.hotels.map((hotelData, idx) => (
                <HotelCard key={hotelData.hotel.id || idx} hotelData={hotelData} />
              ))}
            </div>
          </div>
        )}
      </div>
    </main>
  )
}

