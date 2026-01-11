"use client"

import * as React from "react"
import * as CollapsiblePrimitive from "@radix-ui/react-collapsible"
import { motion } from "motion/react"
import { cn } from "@/lib/utils"

const Collapsible = CollapsiblePrimitive.Root

const CollapsibleTrigger = CollapsiblePrimitive.Trigger

const CollapsibleContent = React.forwardRef<
  React.ElementRef<typeof CollapsiblePrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof CollapsiblePrimitive.Content>
>(({ className, children, ...props }, ref) => {
  const [isOpen, setIsOpen] = React.useState(false)
  const contentRef = React.useRef<HTMLDivElement>(null)
  
  React.useEffect(() => {
    const element = contentRef.current
    if (!element) return
    
    const observer = new MutationObserver(() => {
      const state = element.getAttribute('data-state')
      setIsOpen(state === 'open')
    })
    
    observer.observe(element, { attributes: true, attributeFilter: ['data-state'] })
    const state = element.getAttribute('data-state')
    setIsOpen(state === 'open')
    
    return () => observer.disconnect()
  }, [])

  return (
    <CollapsiblePrimitive.Content
      ref={(node) => {
        contentRef.current = node
        if (typeof ref === 'function') {
          ref(node)
        } else if (ref) {
          (ref as React.MutableRefObject<HTMLDivElement | null>).current = node
        }
      }}
      className={cn("overflow-hidden", className)}
      {...props}
      asChild
    >
      <motion.div
        initial={{ height: 0 }}
        animate={{ height: isOpen ? 'auto' : 0 }}
        transition={{ duration: 0.2, ease: 'easeInOut' }}
        style={{ overflow: 'hidden' }}
      >
        <div>{children}</div>
      </motion.div>
    </CollapsiblePrimitive.Content>
  )
})
CollapsibleContent.displayName = CollapsiblePrimitive.Content.displayName

export { Collapsible, CollapsibleTrigger, CollapsibleContent } 