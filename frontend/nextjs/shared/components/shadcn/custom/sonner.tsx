'use client'

import { useTheme } from 'next-themes'
import {
  Toaster as Sonner,
  type ToasterProps,
  toast as sonnerToast
} from 'sonner'
import {
  CircleCheckIcon,
  InfoIcon,
  TriangleAlertIcon,
  OctagonXIcon,
  Loader2Icon
} from 'lucide-react'

const Toaster = ({ ...props }: ToasterProps) => {
  const { theme = 'system' } = useTheme()

  return (
    <Sonner
      theme={theme as ToasterProps['theme']}
      className="toaster group"
      icons={{
        success: <CircleCheckIcon className="size-4" />,
        info: <InfoIcon className="size-4" />,
        warning: <TriangleAlertIcon className="size-4" />,
        error: <OctagonXIcon className="size-4" />,
        loading: <Loader2Icon className="size-4 animate-spin" />
      }}
      style={
        {
          '--normal-bg': 'var(--popover)',
          '--normal-text': 'var(--popover-foreground)',
          '--normal-border': 'var(--border)',
          '--border-radius': 'var(--radius)'
        } as React.CSSProperties
      }
      toastOptions={{
        classNames: {
          toast: 'cn-toast'
        }
      }}
      {...props}
    />
  )
}

/** You can pass jsx as the first argument instead of a string to render a custom toast while maintaining default styling. */
/** I recommend abstracting the toast function
 *  so that you can call it without having to use toast.custom everytime. */
function customToast(toast: Omit<CustomToastProps, 'id'>) {
  return sonnerToast.custom(id => (
    <CustomToastComponent
      id={id}
      title={toast.title}
      description={toast.description}
      button={{
        label: toast.button.label,
        onClick: () => console.log('Button clicked')
      }}
    />
  ))
}

/** A fully custom toast that still maintains the animations and interactions. */
function CustomToastComponent(props: CustomToastProps) {
  const { title, description, button, id } = props

  return (
    <div className="flex w-full items-center rounded-lg bg-white p-4 shadow-lg ring-1 ring-black/5 md:max-w-[364px]">
      <div className="flex flex-1 items-center">
        <div className="w-full">
          <p className="text-sm font-medium text-gray-900">{title}</p>
          <p className="mt-1 text-sm text-gray-500">{description}</p>
        </div>
      </div>
      <div className="ml-5 shrink-0 rounded-md text-sm font-medium text-indigo-600 hover:text-indigo-500 focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 focus:outline-hidden">
        <button
          className="rounded bg-indigo-50 px-3 py-1 text-sm font-semibold text-indigo-600 hover:bg-indigo-100"
          onClick={() => {
            button.onClick()
            sonnerToast.dismiss(id)
          }}>
          {button.label}
        </button>
      </div>
    </div>
  )
}

export default function Headless() {
  return (
    <button
      className="relative flex h-10 flex-shrink-0 items-center justify-center gap-2 overflow-hidden rounded-full bg-white px-4 text-sm font-medium shadow-sm transition-all hover:bg-[#FAFAFA] dark:bg-[#161615] dark:text-white dark:hover:bg-[#1A1A19]"
      onClick={() => {
        customToast({
          title: 'This is a headless toast',
          description:
            'You have full control of styles and jsx, while still having the animations.',
          button: {
            label: 'Reply',
            onClick: () => sonnerToast.dismiss()
          }
        })
      }}>
      Render toast
    </button>
  )
}

interface CustomToastProps {
  id: string | number
  title: string
  description: string
  button: {
    label: string
    onClick: () => void
  }
}

export { Toaster }
