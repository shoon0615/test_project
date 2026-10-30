import type { Team, TeamInput } from "../model/team";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:4000";

export class TeamsApiError extends Error {
  constructor(message: string, public readonly status?: number) {
    super(message);
    this.name = "TeamsApiError";
  }
}

async function requestJson<T>(path: string, init?: RequestInit): Promise<T> {
  let response: Response;

  try {
    response = await fetch(`${API_BASE_URL}${path}`, {
      ...init,
      headers: {
        "Content-Type": "application/json",
        ...init?.headers
      }
    });
  } catch {
    throw new TeamsApiError("서버에 연결할 수 없습니다.");
  }

  if (!response.ok) {
    throw new TeamsApiError("요청을 처리하지 못했습니다.", response.status);
  }

  if (response.status === 204) {
    return undefined as T;
  }

  return response.json() as Promise<T>;
}

export function getTeams(): Promise<Team[]> {
  return requestJson<Team[]>("/teams?_sort=createdAt&_order=desc");
}

export function createTeam(input: TeamInput): Promise<Team> {
  const now = new Date().toISOString();

  return requestJson<Team>("/teams", {
    method: "POST",
    body: JSON.stringify({
      ...input,
      id: `team-${crypto.randomUUID()}`,
      createdAt: now,
      updatedAt: now
    })
  });
}

export function updateTeam(id: string, input: TeamInput): Promise<Team> {
  return requestJson<Team>(`/teams/${id}`, {
    method: "PATCH",
    body: JSON.stringify({
      ...input,
      updatedAt: new Date().toISOString()
    })
  });
}

export function deleteTeam(id: string): Promise<void> {
  return requestJson<void>(`/teams/${id}`, {
    method: "DELETE"
  });
}
