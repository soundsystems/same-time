import type { Metadata } from "next"
import { Suspense } from "react"
import { NuqsAdapter } from 'nuqs/adapters/next/app'
import { Geist, Geist_Mono } from 'next/font/google'
import { TableSkeleton } from "@/components/same-time/table-skeleton"
import Script from "next/script"
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
  title: "Same Time | Time Zone Matcher",
  description: "Get on the same time as your friends, family, and colleagues",
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" className={`${geistSans.variable} ${geistMono.variable}`}>
      <body className={geistSans.className}>
        {/* biome-ignore lint/security/noDangerouslySetInnerHtml: Required for pre-hydration timezone detection */}
        <Script
          id="timezone-detection"
          strategy="beforeInteractive"
          dangerouslySetInnerHTML={{
            __html: `
              try {
                const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
                document.cookie = 'timezone=' + tz + '; max-age=' + (60*60*24*365) + '; path=/';
              } catch(e) {}
            `,
          }}
        />
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