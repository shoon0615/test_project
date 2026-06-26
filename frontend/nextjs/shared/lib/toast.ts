// shared/lib/toast.ts
// import React from 'react'
import type { ComponentProps } from 'react'
import { toast, type ExternalToast } from 'sonner'

type PromiseMessages<T> = {
  loading: string
  success: string | ((data: T) => string)
  // error: string | ((error: Error) => string)
  error: string | ((error: unknown) => string)
}

const defaultMessages = {
  loading: '처리 중...',
  success: '성공했습니다.',
  // error: '처리 중 문제가 발생했습니다.'
  // error: (error: Error) => error.message
  error: (error: unknown) =>
    error instanceof Error ? error.message : '처리 중 문제가 발생했습니다.'
} satisfies Required<PromiseMessages<unknown>>

const appToast = {
  success(message: string = defaultMessages.success, options?: ExternalToast) {
    // toast.success(message, { ...options })
    toast.success(message, options)
  },

  successAction(
    message: string = defaultMessages.success,
    description?: string
  ) {
    toast.success(message, {
      description,
      action: {
        label: '완료',
        onClick: () => console.log('Success')
      },
      /* actionButtonStyle: {
        backgroundColor: 'green'
      } */
      classNames: {
        actionButton: '!bg-green-500 !text-white hover:!bg-green-600'
      }
    })
  },

  error(
    message: string = '실패했습니다.',
    description = '잠시 후 다시 시도해주세요.',
    options?: ExternalToast
  ) {
    toast.error(message, { description, ...options })
  },

  warning(message: string, options?: ExternalToast) {
    toast.warning(message, options)
  },

  info(message: string, options?: ExternalToast) {
    toast.info(message, options)
  },

  loading(message: string = defaultMessages.loading, id?: string) {
    return toast.loading(message, { id })
  },

  dismiss(id?: string) {
    toast.dismiss(id)
  },

  /** @param `Partial<T>` 객체의 모든 속성을 optional(?) 로 바꿔주는 유틸 */
  promise<T>(promise: Promise<T>, messages?: Partial<PromiseMessages<T>>) {
    return toast.promise(promise, {
      loading: messages?.loading ?? defaultMessages.loading,
      success: messages?.success ?? defaultMessages.success,
      error: messages?.error ?? defaultMessages.error
    })
  }
}

export { appToast as toast }
