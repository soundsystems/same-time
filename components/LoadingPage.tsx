import { Loader } from "@/components/ui/loader"
import { TableSkeleton } from "@/components/same-time/table-skeleton"

export function LoadingPage() {
  return (
    <div className="mt-8">
      <div className="flex flex-col space-y-4 mb-4">
        <div className="font-mono space-y-2">
          <div className="animate-pulse space-y-2">
            <div className="h-4 w-48 bg-muted rounded" />
            <div className="h-4 w-32 bg-muted rounded" />
            <div className="h-4 w-40 bg-muted rounded" />
            <div className="h-4 w-36 bg-muted rounded" />
            <div className="h-4 w-52 bg-muted rounded" />
          </div>
        </div>
        <div className="flex items-center justify-center space-x-4">
          <div className="w-[400px] h-10 bg-muted rounded" />
          <div className="w-40 h-10 bg-muted rounded" />
          <div className="w-[180px] h-10 bg-muted rounded" />
          <div className="w-[180px] h-10 bg-muted rounded" />
        </div>
      </div>
      <div className="h-8 w-64 bg-muted rounded mb-4" />
      <TableSkeleton />
    </div>
  )
} 