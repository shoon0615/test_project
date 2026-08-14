import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { TeamForm } from "../components/team-form";

describe("TeamForm", () => {
  it("새 팀 입력값을 제출한다", async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn().mockResolvedValue(true);

    render(
      <TeamForm
        editingTeam={null}
        validationErrors={{}}
        onSubmit={onSubmit}
        onCancelEdit={vi.fn()}
      />
    );

    await user.type(screen.getByLabelText("팀 이름"), "플랫폼 팀");
    await user.type(screen.getByLabelText("담당자"), "김민준");
    await user.clear(screen.getByLabelText("인원 수"));
    await user.type(screen.getByLabelText("인원 수"), "6");
    await user.type(screen.getByLabelText("설명"), "공통 플랫폼 담당");
    await user.click(screen.getByRole("button", { name: "팀 등록" }));

    expect(onSubmit).toHaveBeenCalledWith({
      name: "플랫폼 팀",
      owner: "김민준",
      members: 6,
      status: "active",
      description: "공통 플랫폼 담당"
    });
  });

  it("수정 모드일 때 기존 팀 값을 보여준다", () => {
    render(
      <TeamForm
        editingTeam={{
          id: "team-1",
          name: "QA 팀",
          owner: "이서연",
          members: 4,
          status: "paused",
          description: "품질 검증",
          createdAt: "2026-08-14T00:00:00.000Z"
        }}
        validationErrors={{}}
        onSubmit={vi.fn()}
        onCancelEdit={vi.fn()}
      />
    );

    expect(screen.getByRole("heading", { name: "팀 수정" })).toBeInTheDocument();
    expect(screen.getByDisplayValue("QA 팀")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "수정 저장" })).toBeInTheDocument();
  });
});
