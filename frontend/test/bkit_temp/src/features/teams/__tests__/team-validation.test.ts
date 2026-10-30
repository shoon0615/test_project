import { describe, expect, it } from "vitest";
import { hasValidationErrors, normalizeTeamInput, validateTeamInput } from "../model/team-validation";

describe("team validation", () => {
  it("정상 입력값은 오류가 없다", () => {
    const errors = validateTeamInput({
      name: "플랫폼 팀",
      owner: "김민준",
      members: 6,
      status: "active",
      description: "공통 플랫폼 담당"
    });

    expect(hasValidationErrors(errors)).toBe(false);
  });

  it("필수값 누락과 잘못된 인원 수를 찾는다", () => {
    const errors = validateTeamInput({
      name: "",
      owner: " ",
      members: 0,
      status: "active",
      description: ""
    });

    expect(errors.name).toBe("팀 이름을 입력해주세요.");
    expect(errors.owner).toBe("담당자를 입력해주세요.");
    expect(errors.members).toBe("인원 수는 1명 이상 999명 이하의 정수여야 합니다.");
  });

  it("저장 전 공백을 정리한다", () => {
    const input = normalizeTeamInput({
      name: "  QA 팀  ",
      owner: "  이서연 ",
      members: 4,
      status: "paused",
      description: "  품질 검증  "
    });

    expect(input).toEqual({
      name: "QA 팀",
      owner: "이서연",
      members: 4,
      status: "paused",
      description: "품질 검증"
    });
  });
});
