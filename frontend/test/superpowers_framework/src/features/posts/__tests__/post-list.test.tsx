import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { PostList } from "../components/post-list";

const samplePost = {
  id: "first-post",
  title: "첫 번째 게시글",
  author: "민수",
  content: "반갑습니다.",
  createdAt: "2026-08-17T09:00:00.000Z",
};

describe("PostList", () => {
  it("renders post metadata and detail links", () => {
    render(<PostList posts={[samplePost]} />);

    expect(screen.getByRole("link", { name: samplePost.title })).toHaveAttribute(
      "href",
      `/posts/${samplePost.id}`,
    );
    expect(screen.getByText(samplePost.author)).toBeInTheDocument();
    expect(screen.getByText("2026. 8. 17.")).toBeInTheDocument();
  });

  it("renders an actionable empty state", () => {
    render(<PostList posts={[]} />);

    expect(screen.getByText("아직 작성된 게시글이 없습니다.")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "첫 글 작성하기" })).toHaveAttribute(
      "href",
      "/posts/new",
    );
  });
});
