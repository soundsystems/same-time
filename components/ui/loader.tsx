import { cn } from "@/lib/utils"
import { cva, type VariantProps } from "class-variance-authority"

const loaderVariants = cva(
  "animate-spin rounded-full border-current",
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
        <div className="h-2 w-2 animate-loader-bounce rounded-full bg-current" />
        <div className="h-2 w-2 animate-loader-bounce rounded-full bg-current [animation-delay:0.2s]" />
        <div className="h-2 w-2 animate-loader-bounce rounded-full bg-current [animation-delay:0.4s]" />
        <span className="sr-only">Loading...</span>
      </div>
    )
  }

  return (
    <div
      className={cn(loaderVariants({ variant, size }), className)}
      {...props}
    >
      <span className="sr-only">Loading...</span>
    </div>
  )
}