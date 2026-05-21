import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'PlayCraft — AI Party Game Generator',
  description: 'Create and share custom party games powered by AI. Truth or Dare, Would You Rather, Trivia, and more.',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="dark">
      <body className="antialiased">{children}</body>
    </html>
  )
}
