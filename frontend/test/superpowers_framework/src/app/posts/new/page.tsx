"use client";

import { useRouter } from "next/navigation";
import { createPost } from "@/features/posts/api/posts-api";
import { PostForm } from "@/features/posts/components/post-form";
import type { PostDraft } from "@/features/posts/model/post";

export default function NewPostPage() {
  const router = useRouter();

  const handleSubmit = async (draft: PostDraft) => {
    const createdPost = await createPost(draft);
    router.push(`/posts/${createdPost.id}`);
  };

  return (
    <main className="shell">
      <PostForm mode="create" cancelHref="/" onSubmit={handleSubmit} />
    </main>
  );
}
