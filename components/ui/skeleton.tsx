"use client"

import { cn } from "@/lib/utils"
import { motion } from "motion/react"

function Skeleton({
  className,
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <motion.div
      className={cn("rounded-md bg-muted", className)}
      animate={{ opacity: [1, 0.5, 1] }}
      transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
      role="status"
      aria-label="Loading"
    />
  )
}

export { Skeleton } 