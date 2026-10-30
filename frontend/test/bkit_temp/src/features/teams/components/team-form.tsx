"use client";

import { useEffect, useState } from "react";
import type { FormEvent } from "react";
import type { Team, TeamInput } from "../model/team";
import type { TeamValidationErrors } from "../model/team-validation";

const EMPTY_FORM: TeamInput = {
  name: "",
  owner: "",
  members: 1,
  status: "active",
  description: ""
};

interface TeamFormProps {
  editingTeam: Team | null;
  validationErrors: TeamValidationErrors;
  onSubmit: (input: TeamInput) => Promise<boolean>;
  onCancelEdit: () => void;
}

export function TeamForm({ editingTeam, validationErrors, onSubmit, onCancelEdit }: TeamFormProps) {
  const [form, setForm] = useState<TeamInput>(EMPTY_FORM);

  useEffect(() => {
    if (editingTeam) {
      setForm({
        name: editingTeam.name,
        owner: editingTeam.owner,
        members: editingTeam.members,
        status: editingTeam.status,
        description: editingTeam.description
      });
      return;
    }

    setForm(EMPTY_FORM);
  }, [editingTeam]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const saved = await onSubmit(form);

    if (saved) {
      setForm(EMPTY_FORM);
    }
  }

  return (
    <form className="panel form-panel" onSubmit={handleSubmit}>
      <div className="panel-heading">
        <h2>{editingTeam ? "팀 수정" : "새 팀 등록"}</h2>
        {editingTeam ? (
          <button className="text-button" type="button" onClick={onCancelEdit}>
            취소
          </button>
        ) : null}
      </div>

      <label>
        <span>팀 이름</span>
        <input
          value={form.name}
          onChange={(event) => setForm({ ...form, name: event.target.value })}
          aria-invalid={Boolean(validationErrors.name)}
        />
        {validationErrors.name ? <small>{validationErrors.name}</small> : null}
      </label>

      <label>
        <span>담당자</span>
        <input
          value={form.owner}
          onChange={(event) => setForm({ ...form, owner: event.target.value })}
          aria-invalid={Boolean(validationErrors.owner)}
        />
        {validationErrors.owner ? <small>{validationErrors.owner}</small> : null}
      </label>

      <label>
        <span>인원 수</span>
        <input
          min={1}
          max={999}
          type="number"
          value={form.members}
          onChange={(event) => setForm({ ...form, members: Number(event.target.value) })}
          aria-invalid={Boolean(validationErrors.members)}
        />
        {validationErrors.members ? <small>{validationErrors.members}</small> : null}
      </label>

      <label>
        <span>상태</span>
        <select
          value={form.status}
          onChange={(event) => setForm({ ...form, status: event.target.value as TeamInput["status"] })}
        >
          <option value="active">활성</option>
          <option value="paused">보류</option>
          <option value="archived">보관</option>
        </select>
      </label>

      <label>
        <span>설명</span>
        <textarea
          rows={4}
          value={form.description}
          onChange={(event) => setForm({ ...form, description: event.target.value })}
          aria-invalid={Boolean(validationErrors.description)}
        />
        {validationErrors.description ? <small>{validationErrors.description}</small> : null}
      </label>

      <button className="primary-button" type="submit">
        {editingTeam ? "수정 저장" : "팀 등록"}
      </button>
    </form>
  );
}
