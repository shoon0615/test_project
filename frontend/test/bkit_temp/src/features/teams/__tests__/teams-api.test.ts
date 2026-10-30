import { afterEach, describe, expect, it, vi } from "vitest";
import { createTeam, getTeams, TeamsApiError } from "../api/teams-api";

describe("teams api", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("팀 목록을 조회한다", async () => {
    const fetchMock = vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(
      new Response(JSON.stringify([{ id: "team-1", name: "플랫폼 팀" }]), {
        status: 200,
        headers: { "Content-Type": "application/json" }
      })
    );

    const teams = await getTeams();

    expect(fetchMock).toHaveBeenCalledWith(
      "http://localhost:4000/teams?_sort=createdAt&_order=desc",
      expect.objectContaining({ headers: expect.any(Object) })
    );
    expect(teams).toHaveLength(1);
  });

  it("팀 생성 요청을 보낸다", async () => {
    vi.stubGlobal("crypto", { randomUUID: () => "abc" });
    const fetchMock = vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(
      new Response(JSON.stringify({ id: "team-abc", name: "QA 팀" }), {
        status: 201,
        headers: { "Content-Type": "application/json" }
      })
    );

    await createTeam({
      name: "QA 팀",
      owner: "이서연",
      members: 4,
      status: "paused",
      description: "품질 검증"
    });

    expect(fetchMock).toHaveBeenCalledWith(
      "http://localhost:4000/teams",
      expect.objectContaining({
        method: "POST",
        body: expect.stringContaining("\"id\":\"team-abc\"")
      })
    );
  });

  it("네트워크 실패를 사용자 메시지 오류로 바꾼다", async () => {
    vi.spyOn(globalThis, "fetch").mockRejectedValueOnce(new Error("down"));

    await expect(getTeams()).rejects.toEqual(new TeamsApiError("서버에 연결할 수 없습니다."));
  });
});
