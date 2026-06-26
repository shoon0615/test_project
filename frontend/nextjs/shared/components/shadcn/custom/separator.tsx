import * as React from 'react'
import { cn } from '@/shared/lib/utils'

interface SeparatorProps extends React.HTMLAttributes<HTMLSpanElement> {
  separator?: React.ReactNode
}

const Separator = React.forwardRef<HTMLSpanElement, SeparatorProps>(
  ({ className, separator = '-', ...props }, ref) => (
    <span
      ref={ref}
      // className={cn("mx-2 text-muted-foreground", className)}
      className={cn('text-muted-foreground', className)}
      {...props}>
      {separator}
    </span>
  )
)
Separator.displayName = 'Separator'

export { Separator }
