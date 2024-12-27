import type { Metadata } from "next"
import { Suspense } from "react"
import { NuqsAdapter } from 'nuqs/adapters/next/app'
import { Geist, Geist_Mono } from 'next/font/google'
import { TableSkeleton } from "@/components/same-time/table-skeleton"
import "./globals.css"
import { Toaster } from "@/components/ui/toaster"

const geistSans = Geist({
  subsets: ['latin'],
  variable: '--font-sans',
  display: 'swap',
})

const geistMono = Geist_Mono({
  subsets: ['latin'],
  variable: '--font-mono',
  display: 'swap',
})

export const metadata: Metadata = {
  title: "Time Zone Matcher",
  description: "Find locations in similar time zones",
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" className={`${geistSans.variable} ${geistMono.variable}`}>
      <body className={geistSans.className}>
        <NuqsAdapter>
          <Suspense fallback={
            <div className="container mx-auto px-4 py-8">
              <div className="mt-8">
                <TableSkeleton />
              </div>
            </div>
          }>
            {children}
          </Suspense>
        </NuqsAdapter>
        <Toaster />
      </body>
    </html>
  )
}