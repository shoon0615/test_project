/**
 * @deprecated `구버전`
 * Redux/Zustand 없이 전역 store 처럼 동작 → sonner 로 대체
 */
'use client'

import { useToast } from '@/shared/hooks/use-toast'
import {
  Toast,
  ToastClose,
  ToastDescription,
  ToastProvider,
  ToastTitle,
  ToastViewport
} from '@/shared/components/shadcn/ui/toast'

/**
 * @deprecated `구버전`
 * Redux/Zustand 없이 전역 store 처럼 동작 → sonner 로 대체
 */
export function Toaster() {
  const { toasts } = useToast()

  return (
    <ToastProvider>
      {toasts.map(function ({ id, title, description, action, ...props }) {
        return (
          <Toast
            key={id}
            {...props}>
            <div className="grid gap-1">
              {title && <ToastTitle>{title}</ToastTitle>}
              {description && (
                <ToastDescription>{description}</ToastDescription>
              )}
            </div>
            {action}
            <ToastClose />
          </Toast>
        )
      })}
      <ToastViewport />
    </ToastProvider>
  )
}
