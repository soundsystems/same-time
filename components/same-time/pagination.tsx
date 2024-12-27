'use client'

import { useLocationState } from '@/lib/hooks/useLocationState'
import {
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination"

interface LocationPaginationProps {
  totalItems: number
  itemsPerPage: number
}

export function LocationPagination({ 
  totalItems,
  itemsPerPage
}: LocationPaginationProps) {
  const { page, setPage } = useLocationState()
  const totalPages = Math.ceil(totalItems / itemsPerPage)

  const handlePageChange = (newPage: number) => {
    if (newPage >= 1 && newPage <= totalPages) {
      setPage(newPage)
      window.scrollTo({ top: 0, behavior: 'smooth' })
    }
  }

  if (totalPages <= 1) return null

  const getPageNumbers = () => {
    const pages: number[] = []
    const showEllipsisStart = page > 2
    const showEllipsisEnd = page < totalPages - 1

    if (totalPages <= 5) {
      return Array.from({ length: totalPages }, (_, i) => i + 1)
    }

    pages.push(1)

    if (showEllipsisStart) {
      pages.push(-1)
    }

    for (let i = Math.max(2, page - 1); i <= Math.min(page + 1, totalPages - 1); i++) {
      pages.push(i)
    }

    if (showEllipsisEnd) {
      pages.push(-1)
    }

    if (totalPages > 1) {
      pages.push(totalPages)
    }

    return pages
  }

  return (
    <Pagination>
      <PaginationContent>
        <PaginationItem>
          <PaginationPrevious 
            href="#" 
            onClick={(e) => {
              e.preventDefault()
              handlePageChange(page - 1)
            }}
          />
        </PaginationItem>

        {getPageNumbers().map((pageNum) => (
          <PaginationItem key={pageNum === -1 ? `ellipsis-${Math.random()}` : pageNum}>
            {pageNum === -1 ? (
              <PaginationEllipsis />
            ) : (
              <PaginationLink
                href="#"
                isActive={pageNum === page}
                onClick={(e) => {
                  e.preventDefault()
                  handlePageChange(pageNum)
                }}
              >
                {pageNum}
              </PaginationLink>
            )}
          </PaginationItem>
        ))}

        <PaginationItem>
          <PaginationNext 
            href="#" 
            onClick={(e) => {
              e.preventDefault()
              handlePageChange(page + 1)
            }}
          />
        </PaginationItem>
      </PaginationContent>
    </Pagination>
  )
} 