import * as React from 'react'

import { cn } from '@/shared/lib/utils'
import { Button } from '@/shared/components/shadcn/ui/button'
import {
  ChevronLeftIcon,
  ChevronRightIcon,
  MoreHorizontalIcon
} from 'lucide-react'
import Link from 'next/link'

function Pagination({ className, ...props }: React.ComponentProps<'nav'>) {
  return (
    <nav
      role="navigation"
      aria-label="pagination"
      data-slot="pagination"
      className={cn('mx-auto flex w-full justify-center', className)}
      {...props}
    />
  )
}

function PaginationContent({
  className,
  ...props
}: React.ComponentProps<'ul'>) {
  return (
    <ul
      data-slot="pagination-content"
      className={cn('flex items-center gap-1', className)}
      {...props}
    />
  )
}

function PaginationItem({ ...props }: React.ComponentProps<'li'>) {
  return (
    <li
      data-slot="pagination-item"
      {...props}
    />
  )
}

type PaginationLinkProps = {
  isActive?: boolean
  disabled?: boolean
} & Pick<React.ComponentProps<typeof Button>, 'size'> &
  // React.ComponentProps<"a">
  Omit<React.ComponentProps<typeof Link>, 'href'> & {
    href?: React.ComponentProps<typeof Link>['href']
  }

function PaginationLink({
  className,
  isActive,
  disabled,
  // href = '#',
  href = '',
  size = 'icon',
  ...props
}: PaginationLinkProps) {
  return (
    <Button
      asChild
      variant={isActive ? 'outline' : 'ghost'}
      size={size}
      className={cn(
        disabled && 'pointer-events-none',
        disabled && !isActive && 'opacity-50',
        className
      )}>
      <Link
        href={href}
        aria-current={isActive ? 'page' : undefined}
        aria-disabled={disabled}
        tabIndex={disabled ? -1 : undefined}
        data-slot="pagination-link"
        data-active={isActive}
        /* onClick={event => {
          if (disabled || href === '') {
            event.preventDefault()
          }
          props.onClick?.(event)
        }} */
        {...props}
      />
    </Button>
  )
}

// nuqs + setSearchParams() 방식으로 갈 거라면 Link 를 제거하고 Button 기반으로 만드는 것이 더 깔끔합니다.
type PaginationButtonProps = {
  isActive?: boolean
} & React.ComponentProps<typeof Button>

function PaginationButton({
  className,
  isActive,
  size = 'icon',
  ...props
}: PaginationButtonProps) {
  return (
    <Button
      variant={isActive ? 'outline' : 'ghost'}
      size={size}
      // aria-current={isActive ? 'page' : undefined}
      data-slot="pagination-link"
      data-active={isActive}
      // className={cn('aria-[current=page]:border-border', className)}
      className={cn(className)}
      {...props}
    />
  )
}

function PaginationPrevious({
  className,
  text = 'Previous',
  ...props
}: React.ComponentProps<typeof PaginationLink> & { text?: string }) {
  return (
    <PaginationLink
      aria-label="Go to previous page"
      size="default"
      className={cn('pl-2!', className)}
      {...props}>
      <ChevronLeftIcon
        data-icon="inline-start"
        className="cn-rtl-flip"
      />
      <span className="hidden sm:block">{text}</span>
    </PaginationLink>
  )
}

function PaginationNext({
  className,
  text = 'Next',
  ...props
}: React.ComponentProps<typeof PaginationLink> & { text?: string }) {
  return (
    <PaginationLink
      aria-label="Go to next page"
      size="default"
      className={cn('pr-2!', className)}
      {...props}>
      <span className="hidden sm:block">{text}</span>
      <ChevronRightIcon
        data-icon="inline-end"
        className="cn-rtl-flip"
      />
    </PaginationLink>
  )
}

function PaginationEllipsis({
  className,
  ...props
}: React.ComponentProps<'span'>) {
  return (
    <span
      aria-hidden
      data-slot="pagination-ellipsis"
      className={cn(
        "flex size-9 items-center justify-center [&_svg:not([class*='size-'])]:size-4",
        className
      )}
      {...props}>
      <MoreHorizontalIcon />
      <span className="sr-only">More pages</span>
    </span>
  )
}

export {
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
  PaginationButton
}
