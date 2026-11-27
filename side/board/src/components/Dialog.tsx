'use client'

import { useEffect, useRef, type ReactNode } from 'react'

type DialogProps = {
  title: string
  busy: boolean
  onClose: () => void
  children: ReactNode
}

export function Dialog({ title, busy, onClose, children }: DialogProps) {
  const ref = useRef<HTMLDialogElement>(null)

  useEffect(() => {
    const dialog = ref.current
    if (!dialog) return
    dialog.showModal()
    return () => dialog.close()
  }, [])

  return (
    <dialog
      ref={ref}
      aria-labelledby="dialog-title"
      onCancel={(event) => {
        event.preventDefault()
        if (!busy) onClose()
      }}
    >
      <h2 id="dialog-title">{title}</h2>
      {children}
    </dialog>
  )
}

