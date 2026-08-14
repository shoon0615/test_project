import { describe, expect, it } from "vitest";
import { countTeamsByStatus, filterTeams } from "../model/team-filters";
import type { Team } from "../model/team";

const teams: Team[] = [
  {
    id: "team-1",
    name: "플랫폼 팀",
    owner: "김민준",
    members: 6,
    status: "active",
    description: "공통 플랫폼 담당",
    createdAt: "2026-08-14T00:00:00.000Z"
  },
  {
    id: "team-2",
    name: "QA 팀",
    owner: "이서연",
    members: 4,
    status: "paused",
    description: "품질 검증",
    createdAt: "2026-08-14T00:00:00.000Z"
  }
];

describe("team filters", () => {
  it("검색어로 팀 이름, 담당자, 설명을 찾는다", () => {
    expect(filterTeams(teams, "품질", "all")).toEqual([teams[1]]);
    expect(filterTeams(teams, "김민준", "all")).toEqual([teams[0]]);
  });

  it("상태 필터와 검색어를 함께 적용한다", () => {
    expect(filterTeams(teams, "팀", "active")).toEqual([teams[0]]);
    expect(filterTeams(teams, "팀", "archived")).toEqual([]);
  });

  it("상태별 개수를 계산한다", () => {
    expect(countTeamsByStatus(teams)).toEqual({
      total: 2,
      active: 1,
      paused: 1,
      archived: 0
    });
  });
});
