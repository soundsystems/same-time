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
import { Button } from "@/components/ui/button"
import { motion, AnimatePresence } from "motion/react"

interface LocationPaginationProps {
  totalItems: number
  itemsPerPage: number
  onShowAll?: () => void
}

export function LocationPagination({ 
  totalItems,
  itemsPerPage,
  onShowAll
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
    const pages: Array<{ type: 'page' | 'ellipsis', value: number }> = []
    const showEllipsisStart = page > 2
    const showEllipsisEnd = page < totalPages - 1

    if (totalPages <= 5) {
      return Array.from({ length: totalPages }, (_, i) => ({
        type: 'page',
        value: i + 1
      }))
    }

    // Always show first page
    pages.push({ type: 'page', value: 1 })

    if (showEllipsisStart) {
      pages.push({ type: 'ellipsis', value: 1 }) // Use index as value for ellipsis
    }

    // Show current page and adjacent pages
    for (let i = Math.max(2, page - 1); i <= Math.min(page + 1, totalPages - 1); i++) {
      pages.push({ type: 'page', value: i })
    }

    if (showEllipsisEnd) {
      pages.push({ type: 'ellipsis', value: 2 }) // Use different index for end ellipsis
    }

    if (totalPages > 1) {
      pages.push({ type: 'page', value: totalPages })
    }

    return pages
  }

  return (
    <motion.div
      initial={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="flex flex-col items-center gap-4"
    >
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

          {getPageNumbers().map((item, index) => (
            <PaginationItem key={item.type === 'ellipsis' ? `ellipsis-${item.value}` : `page-${item.value}`}>
              {item.type === 'ellipsis' ? (
                <PaginationEllipsis />
              ) : (
                <PaginationLink
                  href="#"
                  isActive={item.value === page}
                  onClick={(e) => {
                    e.preventDefault()
                    handlePageChange(item.value)
                  }}
                >
                  {item.value}
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

      {onShowAll && (
        <Button
          variant="default"
          className="bg-blue-500 hover:bg-blue-600 text-white"
          onClick={onShowAll}
        >
          Load All Results
        </Button>
      )}
    </motion.div>
  )
} 