import {
  Empty,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle
} from '@/shared/components/shadcn/ui/empty'
import { Spinner } from '@/shared/components/shadcn/ui/spinner'

export default function Loader() {
  return (
    <Empty className="w-full">
      <EmptyHeader>
        {/* <EmptyMedia variant="icon"> */}
        <EmptyMedia>
          <Spinner className="size-8" />
        </EmptyMedia>
        <EmptyTitle>Loading...</EmptyTitle>
      </EmptyHeader>
    </Empty>
  )
}
