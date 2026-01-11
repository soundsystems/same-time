"use client"

import { cn } from "@/lib/utils"
import { cva, type VariantProps } from "class-variance-authority"
import { motion } from "motion/react"

const loaderVariants = cva(
  "rounded-full border-current",
  {
    variants: {
      variant: {
        default: "border-2 border-t-transparent",
        soft: "border-4 border-muted border-t-primary",
        dots: "border-0" // For dots animation
      },
      size: {
        sm: "h-3 w-3",
        default: "h-4 w-4",
        lg: "h-6 w-6",
        xl: "h-8 w-8"
      }
    },
    defaultVariants: {
      variant: "default",
      size: "default"
    }
  }
)

interface LoaderProps extends React.HTMLAttributes<HTMLDivElement>, VariantProps<typeof loaderVariants> {
  dots?: boolean
}

export function Loader({ className, variant, size, dots, ...props }: LoaderProps) {
  if (dots) {
    return (
      <div className="flex space-x-1.5" {...props}>
        <motion.div
          className="h-2 w-2 rounded-full bg-current"
          animate={{ y: [0, -8, 0] }}
          transition={{ duration: 0.6, repeat: Infinity, ease: "easeInOut", delay: 0 }}
        />
        <motion.div
          className="h-2 w-2 rounded-full bg-current"
          animate={{ y: [0, -8, 0] }}
          transition={{ duration: 0.6, repeat: Infinity, ease: "easeInOut", delay: 0.2 }}
        />
        <motion.div
          className="h-2 w-2 rounded-full bg-current"
          animate={{ y: [0, -8, 0] }}
          transition={{ duration: 0.6, repeat: Infinity, ease: "easeInOut", delay: 0.4 }}
        />
        <span className="sr-only">Loading...</span>
      </div>
    )
  }

  return (
    <motion.div
      className={cn(loaderVariants({ variant, size }), className)}
      animate={{ rotate: 360 }}
      transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
      {...props}
    >
      <span className="sr-only">Loading...</span>
    </motion.div>
  )
}