import { Skeleton } from "@/components/ui/skeleton"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'

export function TableSkeleton() {
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Country</TableHead>
          <TableHead>Time</TableHead>
          <TableHead>Type</TableHead>
          <TableHead>Languages</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {[...Array(5)].map((_, i) => (
          <TableRow key={`skeleton-row-${i}`}>
            <TableCell>
              <div className="flex flex-col gap-2">
                <div className="flex items-center gap-2">
                  <Skeleton className="h-6 w-6 rounded-full" />
                  <Skeleton className="h-4 w-[200px]" />
                </div>
                <Skeleton className="h-4 w-[150px] ml-8" />
              </div>
            </TableCell>
            <TableCell>
              <div className="flex flex-col items-center gap-2">
                <Skeleton className="h-4 w-[100px]" />
                <Skeleton className="h-4 w-[80px]" />
              </div>
            </TableCell>
            <TableCell>
              <Skeleton className="h-6 w-[100px] mx-auto rounded-full" />
            </TableCell>
            <TableCell>
              <div className="flex flex-col items-center gap-1">
                <Skeleton className="h-6 w-[80px] rounded-full" />
                <Skeleton className="h-6 w-[60px] rounded-full" />
              </div>
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  )
} 