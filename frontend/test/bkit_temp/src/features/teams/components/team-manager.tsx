"use client";

import { TeamFilters } from "./team-filters";
import { TeamForm } from "./team-form";
import { TeamList } from "./team-list";
import { TeamSummary } from "./team-summary";
import { useTeams } from "../hooks/use-teams";

export function TeamManager() {
  const {
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
    setStatusFilter,
  } = useTeams();

  return (
    <main className="app-shell">
      <header className="hero">
        <div>
          <p className="eyebrow">Team CRUD System v1.0.1</p>
          <h1>팀 운영 데이터 관리</h1>
          <p>
            Next.js와 mock API 기반으로 팀 정보를 등록, 조회, 수정, 삭제합니다.
          </p>
        </div>
      </header>

      <TeamSummary summary={summary} />

      <TeamFilters
        searchQuery={searchQuery}
        statusFilter={statusFilter}
        onSearchChange={setSearchQuery}
        onStatusChange={setStatusFilter}
        onRefresh={loadTeams}
      />

      {errorMessage ? (
        <div className="error-banner" role="alert">
          {errorMessage}
        </div>
      ) : null}

      <section className="workspace">
        <TeamForm
          editingTeam={editingTeam}
          validationErrors={validationErrors}
          onSubmit={submitTeam}
          onCancelEdit={cancelEdit}
        />
        <TeamList
          teams={visibleTeams}
          isLoading={isLoading}
          hasAnyTeams={teams.length > 0}
          onEdit={startEdit}
          onDelete={removeTeam}
        />
      </section>
    </main>
  );
}
