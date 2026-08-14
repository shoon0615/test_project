export const TEAM_STATUSES = ["active", "paused", "archived"] as const;

export type TeamStatus = (typeof TEAM_STATUSES)[number];
export type TeamStatusFilter = TeamStatus | "all";

export interface Team {
  id: string;
  name: string;
  owner: string;
  members: number;
  status: TeamStatus;
  description: string;
  createdAt: string;
  updatedAt?: string;
}

export interface TeamInput {
  name: string;
  owner: string;
  members: number;
  status: TeamStatus;
  description: string;
}

export const TEAM_STATUS_LABELS: Record<TeamStatus, string> = {
  active: "활성",
  paused: "보류",
  archived: "보관"
};

export function isTeamStatus(value: string): value is TeamStatus {
  return TEAM_STATUSES.includes(value as TeamStatus);
}
