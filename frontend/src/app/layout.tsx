import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'InterviewIQ — AI-Powered Interview Coaching',
  description: 'Master your interviews with multimodal AI analysis. Get real-time feedback on speech, body language, and answer quality.',
  keywords: ['interview coaching', 'AI interview', 'speech analysis', 'body language', 'job interview'],
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body className={inter.className}>
        {children}
      </body>
    </html>
  )
}
