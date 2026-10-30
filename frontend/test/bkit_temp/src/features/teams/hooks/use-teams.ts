"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { createTeam, deleteTeam, getTeams, updateTeam } from "../api/teams-api";
import { countTeamsByStatus, filterTeams } from "../model/team-filters";
import type { Team, TeamInput, TeamStatusFilter } from "../model/team";
import {
  hasValidationErrors,
  normalizeTeamInput,
  validateTeamInput,
  type TeamValidationErrors
} from "../model/team-validation";

export function useTeams() {
  const [teams, setTeams] = useState<Team[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");
  const [editingTeamId, setEditingTeamId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<TeamStatusFilter>("all");
  const [validationErrors, setValidationErrors] = useState<TeamValidationErrors>({});

  const loadTeams = useCallback(async () => {
    setIsLoading(true);
    setErrorMessage("");

    try {
      setTeams(await getTeams());
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "팀 목록을 불러오지 못했습니다.");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadTeams();
  }, [loadTeams]);

  const editingTeam = useMemo(
    () => teams.find((team) => team.id === editingTeamId) ?? null,
    [editingTeamId, teams]
  );

  const visibleTeams = useMemo(
    () => filterTeams(teams, searchQuery, statusFilter),
    [searchQuery, statusFilter, teams]
  );

  const summary = useMemo(() => countTeamsByStatus(teams), [teams]);

  async function submitTeam(input: TeamInput): Promise<boolean> {
    const normalized = normalizeTeamInput(input);
    const errors = validateTeamInput(normalized);
    setValidationErrors(errors);

    if (hasValidationErrors(errors)) {
      return false;
    }

    setErrorMessage("");

    try {
      if (editingTeamId) {
        const updated = await updateTeam(editingTeamId, normalized);
        setTeams((currentTeams) =>
          currentTeams.map((team) => (team.id === editingTeamId ? updated : team))
        );
        setEditingTeamId(null);
      } else {
        const created = await createTeam(normalized);
        setTeams((currentTeams) => [created, ...currentTeams]);
      }

      setValidationErrors({});
      return true;
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "팀 정보를 저장하지 못했습니다.");
      return false;
    }
  }

  function startEdit(team: Team) {
    setEditingTeamId(team.id);
    setValidationErrors({});
    setErrorMessage("");
  }

  function cancelEdit() {
    setEditingTeamId(null);
    setValidationErrors({});
  }

  async function removeTeam(id: string) {
    const confirmed = window.confirm("이 팀을 삭제할까요?");

    if (!confirmed) {
      return;
    }

    setErrorMessage("");

    try {
      await deleteTeam(id);
      setTeams((currentTeams) => currentTeams.filter((team) => team.id !== id));

      if (editingTeamId === id) {
        setEditingTeamId(null);
      }
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "팀을 삭제하지 못했습니다.");
    }
  }

  return {
    teams,
    visibleTeams,
    summary,
    isLoading,
    errorMessage,
    editingTeam,
    searchQuery,
    statusFilter,
    validationErrors,
    loadTeams,
    submitTeam,
    startEdit,
    cancelEdit,
    removeTeam,
    setSearchQuery,
    setStatusFilter
  };
}
