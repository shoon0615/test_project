'use client'

import { useState } from 'react'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger
} from '@/shared/components/shadcn/ui/alert-dialog'
import { Button } from '@/shared/components/shadcn/ui/button'

type ConfirmDialogButtonProps = {
  label: string
  title?: string
  description?: string
  cancelLabel?: string
  confirmLabel?: string
  onConfirm: () => void | Promise<void>
  buttonProps?: React.ComponentProps<typeof Button>
}

function ConfirmDialogButton({
  label,
  title = '정말 진행하시겠습니까?',
  description = '이 작업은 되돌리기 어려울 수 있습니다.',
  cancelLabel = '취소',
  confirmLabel = '확인',
  onConfirm,
  buttonProps
}: ConfirmDialogButtonProps) {
  const [pending, setPending] = useState(false)

  async function handleConfirm() {
    try {
      setPending(true)
      await onConfirm()
    } finally {
      setPending(false)
    }
  }

  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>
        {/* <button type="button">{label}</button> */}
        <Button {...buttonProps}>{label}</Button>
      </AlertDialogTrigger>

      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{title}</AlertDialogTitle>
          <AlertDialogDescription>{description}</AlertDialogDescription>
        </AlertDialogHeader>

        <AlertDialogFooter>
          <AlertDialogCancel disabled={pending}>
            {cancelLabel}
          </AlertDialogCancel>

          <AlertDialogAction
            onClick={handleConfirm}
            disabled={pending}>
            {pending ? '처리 중...' : confirmLabel}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}

export { ConfirmDialogButton }
