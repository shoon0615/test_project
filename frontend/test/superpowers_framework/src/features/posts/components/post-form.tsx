"use client";

import { useState, type FormEvent } from "react";
import type { PostDraft } from "../model/post";

const EMPTY_DRAFT: PostDraft = { title: "", author: "", content: "" };
const REQUIRED_MESSAGE = "필수 입력 항목입니다.";
const SUBMIT_ERROR_MESSAGE = "저장하지 못했습니다. 다시 시도해 주세요.";

type DraftField = keyof PostDraft;
type FieldErrors = Partial<Record<DraftField, string>>;

export type PostFormProps = {
  mode: "create" | "edit";
  initialValue?: PostDraft;
  cancelHref: string;
  onSubmit: (draft: PostDraft) => Promise<void>;
};

const fields: Array<{ key: DraftField; label: string; id: string }> = [
  { key: "title", label: "제목", id: "post-title" },
  { key: "author", label: "작성자", id: "post-author" },
  { key: "content", label: "내용", id: "post-content" },
];

function validate(draft: PostDraft): FieldErrors {
  const errors: FieldErrors = {};

  for (const { key } of fields) {
    if (draft[key].trim() === "") {
      errors[key] = REQUIRED_MESSAGE;
    }
  }

  return errors;
}

export function PostForm({
  mode,
  initialValue = EMPTY_DRAFT,
  cancelHref = "/posts",
  onSubmit,
}: PostFormProps) {
  const [draft, setDraft] = useState<PostDraft>(() => ({ ...initialValue }));
  const [errors, setErrors] = useState<FieldErrors>({});
  const [submitError, setSubmitError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const submitLabel = mode === "create" ? "게시글 등록" : "게시글 수정";

  const handleChange = (field: DraftField, value: string) => {
    setDraft((currentDraft) => ({ ...currentDraft, [field]: value }));

    if (errors[field]) {
      setErrors((currentErrors) => {
        const nextErrors = { ...currentErrors };
        delete nextErrors[field];
        return nextErrors;
      });
    }

    if (submitError) {
      setSubmitError("");
    }
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (isSubmitting) {
      return;
    }

    const trimmedDraft: PostDraft = {
      title: draft.title.trim(),
      author: draft.author.trim(),
      content: draft.content.trim(),
    };
    const nextErrors = validate(trimmedDraft);

    if (Object.keys(nextErrors).length > 0) {
      setErrors(nextErrors);
      setSubmitError("");
      return;
    }

    setErrors({});
    setSubmitError("");
    setIsSubmitting(true);

    try {
      await onSubmit(trimmedDraft);
    } catch {
      setSubmitError(SUBMIT_ERROR_MESSAGE);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} noValidate>
      <h1>{mode === "create" ? "게시글 작성" : "게시글 수정"}</h1>

      {fields.map(({ key, label, id }) => {
        const errorId = `${id}-error`;
        const error = errors[key];
        const Control = key === "content" ? "textarea" : "input";

        return (
          <div key={key}>
            <label htmlFor={id}>{label}</label>
            <Control
              id={id}
              name={key}
              {...(key === "content" ? {} : { type: "text" })}
              value={draft[key]}
              onChange={(event) => handleChange(key, event.target.value)}
              aria-describedby={error ? errorId : undefined}
              aria-invalid={Boolean(error)}
              aria-required="true"
            />
            {error ? (
              <p id={errorId}>{error}</p>
            ) : null}
          </div>
        );
      })}

      <div aria-live="polite" role="status">
        {submitError}
      </div>

      <div>
        <a href={cancelHref} className="button button-secondary">
          취소
        </a>
        <button type="submit" disabled={isSubmitting}>
          {isSubmitting ? "저장 중…" : submitLabel}
        </button>
      </div>
    </form>
  );
}
