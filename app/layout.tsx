import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'AI Trip Planner',
  description: 'Plan your perfect trip with AI-powered hotel recommendations',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body className="flex flex-col min-h-screen">
        {children}
        <footer className="mt-auto py-6 px-4 border-t border-gray-800">
          <div className="container mx-auto max-w-6xl text-center text-text/60 text-sm">
            Trip Planner 2025
          </div>
        </footer>
      </body>
    </html>
  )
}

