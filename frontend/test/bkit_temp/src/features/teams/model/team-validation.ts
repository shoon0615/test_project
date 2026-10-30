import { isTeamStatus, type TeamInput } from "./team";

export interface TeamValidationErrors {
  name?: string;
  owner?: string;
  members?: string;
  status?: string;
  description?: string;
}

export function normalizeTeamInput(input: TeamInput): TeamInput {
  return {
    name: input.name.trim(),
    owner: input.owner.trim(),
    members: Number(input.members),
    status: input.status,
    description: input.description.trim()
  };
}

export function validateTeamInput(input: TeamInput): TeamValidationErrors {
  const normalized = normalizeTeamInput(input);
  const errors: TeamValidationErrors = {};

  if (!normalized.name) {
    errors.name = "팀 이름을 입력해주세요.";
  }

  if (!normalized.owner) {
    errors.owner = "담당자를 입력해주세요.";
  }

  if (!Number.isInteger(normalized.members) || normalized.members < 1 || normalized.members > 999) {
    errors.members = "인원 수는 1명 이상 999명 이하의 정수여야 합니다.";
  }

  if (!isTeamStatus(normalized.status)) {
    errors.status = "팀 상태를 선택해주세요.";
  }

  if (normalized.description.length > 300) {
    errors.description = "설명은 300자 이하로 입력해주세요.";
  }

  return errors;
}

export function hasValidationErrors(errors: TeamValidationErrors): boolean {
  return Object.keys(errors).length > 0;
}
