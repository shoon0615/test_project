import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyTitle
} from '@/shared/components/shadcn/ui/empty'
import {
  InputGroup,
  InputGroupAddon,
  InputGroupInput
} from '@/shared/components/shadcn/ui/input-group'
import { Kbd } from '@/shared/components/shadcn/ui/kbd'
import { SearchIcon } from 'lucide-react'

export default function EmptyInputGroup() {
  return (
    <Empty>
      <EmptyHeader>
        <EmptyTitle>404 - Not Found</EmptyTitle>
        <EmptyDescription>
          The page you&apos;re looking for doesn&apos;t exist. Try searching for
          what you need below.
        </EmptyDescription>
      </EmptyHeader>
      <EmptyContent>
        <InputGroup className="sm:w-3/4">
          <InputGroupInput placeholder="Try searching for pages..." />
          <InputGroupAddon>
            <SearchIcon />
          </InputGroupAddon>
          <InputGroupAddon align="inline-end">
            <Kbd>/</Kbd>
          </InputGroupAddon>
        </InputGroup>
        <EmptyDescription>
          Need help? <a href="#">Contact support</a>
        </EmptyDescription>
      </EmptyContent>
    </Empty>
  )
}

/* import Link from 'next/link'
import { Button } from '@/shared/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle
} from '@/shared/components/ui/card'

export default function NotFound() {
  return (
    <div className="flex min-h-[70vh] items-center justify-center">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <CardTitle className="text-6xl font-bold">
            404
          </CardTitle>

          <CardDescription>
            요청하신 페이지를 찾을 수 없습니다.
          </CardDescription>
        </CardHeader>

        <CardContent>
          <Button
            asChild
            className="w-full">
            <Link href="/">홈으로 이동</Link>
          </Button>
        </CardContent>
      </Card>
    </div>
  )
} */
