export type Post = {
  id: string;
  title: string;
  author: string;
  content: string;
  createdAt: string;
};

export type PostDraft = Pick<Post, "title" | "author" | "content">;

export class ApiError extends Error {
  constructor(message: string, public readonly status: number) {
    super(message);
  }
}
