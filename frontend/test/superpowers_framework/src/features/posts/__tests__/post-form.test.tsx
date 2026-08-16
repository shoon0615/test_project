import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { PostForm } from "../components/post-form";

describe("PostForm", () => {
  it("shows all required errors without submitting whitespace", async () => {
    const onSubmit = vi.fn();
    render(<PostForm mode="create" cancelHref="/posts" onSubmit={onSubmit} />);

    await userEvent.click(screen.getByRole("button", { name: "게시글 등록" }));

    expect(await screen.findAllByText("필수 입력 항목입니다.")).toHaveLength(3);
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it("associates each validation error with its control", async () => {
    render(<PostForm mode="create" cancelHref="/posts" onSubmit={vi.fn()} />);

    await userEvent.click(screen.getByRole("button", { name: "게시글 등록" }));

    for (const label of ["제목", "작성자", "내용"]) {
      const control = screen.getByLabelText(label);
      const errorId = control.getAttribute("aria-describedby");
      expect(errorId).toBeTruthy();
      expect(control).toHaveAttribute("aria-invalid", "true");
      expect(document.getElementById(errorId ?? "")).toHaveTextContent(
        "필수 입력 항목입니다.",
      );
    }
  });

  it("submits trimmed values once", async () => {
    const pending = new Promise<void>(() => undefined);
    const onSubmit = vi.fn(() => pending);
    render(<PostForm mode="create" cancelHref="/posts" onSubmit={onSubmit} />);

    await userEvent.type(screen.getByLabelText("제목"), "  첫 글  ");
    await userEvent.type(screen.getByLabelText("작성자"), "  민수  ");
    await userEvent.type(screen.getByLabelText("내용"), "  반갑습니다  ");
    await userEvent.click(screen.getByRole("button", { name: "게시글 등록" }));

    expect(onSubmit).toHaveBeenCalledTimes(1);
    expect(onSubmit).toHaveBeenCalledWith({
      title: "첫 글",
      author: "민수",
      content: "반갑습니다",
    });
    expect(screen.getByRole("button", { name: "저장 중…" })).toBeDisabled();
  });

  it("preserves values and shows an error when submission is rejected", async () => {
    const onSubmit = vi.fn().mockRejectedValueOnce(new Error("network"));
    render(<PostForm mode="create" cancelHref="/posts" onSubmit={onSubmit} />);

    const title = screen.getByLabelText("제목");
    const author = screen.getByLabelText("작성자");
    const content = screen.getByLabelText("내용");
    await userEvent.type(title, "  유지할 제목  ");
    await userEvent.type(author, "  민수  ");
    await userEvent.type(content, "  유지할 내용  ");
    await userEvent.click(screen.getByRole("button", { name: "게시글 등록" }));

    expect(await screen.findByText("저장하지 못했습니다. 다시 시도해 주세요.")).toHaveAttribute(
      "aria-live",
      "polite",
    );
    expect(title).toHaveValue("  유지할 제목  ");
    expect(author).toHaveValue("  민수  ");
    expect(content).toHaveValue("  유지할 내용  ");
    expect(screen.getByRole("button", { name: "게시글 등록" })).toBeEnabled();
  });

  it("links the cancel action to the supplied destination", () => {
    render(<PostForm mode="edit" cancelHref="/posts/42" onSubmit={vi.fn()} />);

    expect(screen.getByRole("link", { name: "취소" })).toHaveAttribute("href", "/posts/42");
    expect(screen.getByRole("button", { name: "게시글 수정" })).toBeInTheDocument();
  });
});
