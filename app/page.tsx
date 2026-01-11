import { Suspense } from 'react'
import { TableSkeleton } from '@/components/same-time/table-skeleton'
import SameTimeClient from '@/components/same-time'
import { getLocationsData } from '@/lib/data'
import { searchParamsCache } from '@/lib/search-params'
import { cookies } from 'next/headers'

export default async function Home({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>
}) {
  // Parse search params using nuqs cache
  await searchParamsCache.parse(searchParams)
  
  // Extract runtime data OUTSIDE cache scope
  const cookieStore = await cookies()
  const savedTimezone = cookieStore.get('timezone')?.value
  const urlTimezone = searchParamsCache.get('timezone')
  // Ensure timezone is valid (not empty string)
  // Default to Africa/Abidjan (UTC+0) if no timezone specified
  const timezone = (urlTimezone && urlTimezone.trim()) || (savedTimezone && savedTimezone.trim()) || 'Africa/Abidjan'

  return (
    <main className="container mx-auto px-4 py-4">
      <h1 
        className="text-5xl font-bold text-center rounded-lg shadow-lg shadow-black text-white border-4 border-[#B19F70] z-20 mb-2 py-2 text-shadow-black sun-fade-in"
      >
        same time
      </h1>
      <Suspense fallback={<TableSkeleton />}>
        <SameTimeData timezone={timezone} />
      </Suspense>
    </main>
  )
}

// Server component for data fetching
async function SameTimeData({ timezone }: { timezone: string }) {
  const data = await getLocationsData(timezone)
  return <SameTimeClient initialData={data} />
}

