import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { TeamList } from "../components/team-list";
import type { Team } from "../model/team";

const team: Team = {
  id: "team-1",
  name: "플랫폼 팀",
  owner: "김민준",
  members: 6,
  status: "active",
  description: "공통 플랫폼 담당",
  createdAt: "2026-08-14T00:00:00.000Z"
};

describe("TeamList", () => {
  it("로딩 상태를 표시한다", () => {
    render(<TeamList teams={[]} isLoading hasAnyTeams={false} onEdit={vi.fn()} onDelete={vi.fn()} />);

    expect(screen.getByText("팀 목록을 불러오는 중입니다.")).toBeInTheDocument();
  });

  it("팀 목록과 액션 버튼을 표시한다", async () => {
    const user = userEvent.setup();
    const onEdit = vi.fn();
    const onDelete = vi.fn();

    render(
      <TeamList
        teams={[team]}
        isLoading={false}
        hasAnyTeams
        onEdit={onEdit}
        onDelete={onDelete}
      />
    );

    expect(screen.getByRole("heading", { name: "플랫폼 팀" })).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "수정" }));
    await user.click(screen.getByRole("button", { name: "삭제" }));

    expect(onEdit).toHaveBeenCalledWith(team);
    expect(onDelete).toHaveBeenCalledWith("team-1");
  });
});
