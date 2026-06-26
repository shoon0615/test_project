import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyTitle
} from '@/shared/components/shadcn/ui/empty'
import { PackageOpen, SearchX } from 'lucide-react'

type EmptyStateProps = {
  title?: string
  description?: string
}

export default function EmptyState({
  title = '검색 결과가 없습니다.',
  description = '다른 검색어로 다시 시도해 보세요.'
}: EmptyStateProps) {
  return (
    <Empty className="h-96">
      <SearchX className="text-muted-foreground size-12" />
      <EmptyHeader>
        <EmptyTitle>{title}</EmptyTitle>
        <EmptyDescription>{description}</EmptyDescription>
      </EmptyHeader>
    </Empty>
  )
}
