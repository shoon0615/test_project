import type { Team, TeamStatusFilter } from "./team";

export function filterTeams(
  teams: Team[],
  searchQuery: string,
  statusFilter: TeamStatusFilter
): Team[] {
  const query = searchQuery.trim().toLowerCase();

  return teams.filter((team) => {
    const matchesStatus = statusFilter === "all" || team.status === statusFilter;
    const matchesSearch =
      !query ||
      [team.name, team.owner, team.description].some((value) =>
        value.toLowerCase().includes(query)
      );

    return matchesStatus && matchesSearch;
  });
}

export function countTeamsByStatus(teams: Team[]) {
  return {
    total: teams.length,
    active: teams.filter((team) => team.status === "active").length,
    paused: teams.filter((team) => team.status === "paused").length,
    archived: teams.filter((team) => team.status === "archived").length
  };
}
