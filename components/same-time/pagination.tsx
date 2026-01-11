'use client'

import { Button } from "@/components/ui/button"
import { ChevronLeft, ChevronRight } from 'lucide-react'

export interface LocationPaginationProps {
  totalItems: number
  itemsPerPage: number
  onShowAll: () => void
  onPageChange: (page: number) => void
  currentPage: number
}

export function LocationPagination({ 
  totalItems, 
  itemsPerPage, 
  onShowAll,
  onPageChange,
  currentPage
}: LocationPaginationProps) {
  const totalPages = Math.ceil(totalItems / itemsPerPage)

  const handlePrevious = () => {
    if (currentPage > 1) {
      onPageChange(currentPage - 1)
    }
  }

  const handleNext = () => {
    if (currentPage < totalPages) {
      onPageChange(currentPage + 1)
    }
  }

  const getVisiblePages = () => {
    // Calculate pages to show - always up to 8 for desktop
    const maxVisiblePages = 8
    
    // If total pages is less than or equal to max visible, show all
    if (totalPages <= maxVisiblePages) {
      return Array.from({ length: totalPages }, (_, i) => i + 1)
    }
    
    const pages: (number | string)[] = []
    
    // Determine the range of pages to show
    let startPage: number
    let endPage: number
    
    if (currentPage <= maxVisiblePages) {
      // Near the beginning: show pages 1 through maxVisiblePages
      startPage = 1
      endPage = maxVisiblePages
    } else {
      // Show pages around currentPage
      const halfRange = Math.floor((maxVisiblePages - 1) / 2)
      startPage = Math.max(1, currentPage - halfRange)
      endPage = Math.min(totalPages, startPage + maxVisiblePages - 1)
      
      // Adjust if we went past the end
      if (endPage === totalPages) {
        startPage = Math.max(1, totalPages - maxVisiblePages + 1)
        endPage = totalPages
      }
    }
    
    // Add the page numbers
    for (let i = startPage; i <= endPage; i++) {
      pages.push(i)
    }
    
    // Add ellipsis after the last visible page if there are more pages
    if (endPage < totalPages) {
      pages.push('ellipsis')
    }
    
    return pages
  }

  return (
    <div className="flex flex-col items-center gap-4">
      <div className="flex items-center gap-2">
        <Button
          variant="outline"
          onClick={handlePrevious}
          disabled={currentPage === 1}
          size="icon"
          className="h-8 w-8"
        >
          <ChevronLeft className="h-4 w-4" />
          <span className="sr-only">Previous page</span>
        </Button>
        <div className="flex items-center [&>*:nth-child(n+4)]:hidden [&>*:nth-child(n+6)]:md:inline-flex [&>*:nth-child(n+6)]:lg:inline-flex">
          {getVisiblePages().map((pageNum, index) => 
            pageNum === 'ellipsis' ? (
              <span 
                key={`ellipsis-${index}`} 
                className="px-2 hidden md:inline-block"
              >
                ...
              </span>
            ) : (
              <Button
                key={pageNum}
                variant={pageNum === currentPage ? "default" : "ghost"}
                onClick={() => onPageChange(pageNum as number)}
                className="h-8 w-8 p-0"
                size="sm"
              >
                {pageNum}
              </Button>
            )
          )}
        </div>
        <Button
          variant="outline"
          onClick={handleNext}
          disabled={currentPage === totalPages}
          size="icon"
          className="h-8 w-8"
        >
          <ChevronRight className="h-4 w-4" />
          <span className="sr-only">Next page</span>
        </Button>
      </div>
      {totalPages > 1 && (
        <Button variant="outline" onClick={onShowAll}>
          Load All
        </Button>
      )}
    </div>
  )
} 