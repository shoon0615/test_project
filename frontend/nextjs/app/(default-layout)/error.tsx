'use client'

import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyTitle
} from '@/shared/components/shadcn/ui/empty'

export default function Error() {
  return (
    <Empty>
      <EmptyHeader>
        <EmptyTitle>500 - Internal server error</EmptyTitle>
        <EmptyDescription>
          The page you&apos;re looking for doesn&apos;t exist. Try searching for
          what you need below.
        </EmptyDescription>
      </EmptyHeader>
    </Empty>
  )
}

/* import { useEffect } from 'react'
import { AlertCircle } from 'lucide-react'

import { Button } from '@/shared/components/ui/button'
import {
  Alert,
  AlertDescription,
  AlertTitle
} from '@/shared/components/ui/alert'

export default function Error({
  error,
  reset
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    console.error(error)
  }, [error])

  return (
    <div className="flex min-h-[70vh] items-center justify-center">
      <div className="w-full max-w-lg space-y-4">
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>오류가 발생했습니다</AlertTitle>
          <AlertDescription>
            {error.message || '처리 중 문제가 발생했습니다.'}
          </AlertDescription>
        </Alert>

        <Button
          onClick={() => reset()}
          className="w-full">
          다시 시도
        </Button>
      </div>
    </div>
  )
} */
