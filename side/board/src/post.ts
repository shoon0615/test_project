export type PostInput = {
  title: string
  content: string
}

export type Post = PostInput & {
  id: string
  createdAt: string
}
