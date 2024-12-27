import { cn } from "@/lib/utils"

interface LoaderProps extends React.HTMLAttributes<HTMLDivElement> {}

export function Loader({ className, ...props }: LoaderProps) {
  return (
    <div
      className={cn(
        "h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent",
        className
      )}
      {...props}
    >
      <span className="sr-only">Loading...</span>
    </div>
  )
}