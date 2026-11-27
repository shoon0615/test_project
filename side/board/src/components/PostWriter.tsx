'use client'

import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { PostForm } from '@/components/PostForm'

export function PostWriter() {
  const router = useRouter()
  const [open, setOpen] = useState(false)

  return (
    <>
      <button className="primary" type="button" onClick={() => setOpen(true)}>글쓰기</button>
      {open && (
        <PostForm
          onClose={() => setOpen(false)}
          onSave={(post) => {
            setOpen(false)
            router.push(`/posts/${post.id}`)
            router.refresh()
          }}
        />
      )}
    </>
  )
}
