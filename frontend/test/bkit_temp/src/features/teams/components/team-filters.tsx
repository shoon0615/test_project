import type { TeamStatusFilter } from "../model/team";

interface TeamFiltersProps {
  searchQuery: string;
  statusFilter: TeamStatusFilter;
  onSearchChange: (value: string) => void;
  onStatusChange: (value: TeamStatusFilter) => void;
  onRefresh: () => void;
}

export function TeamFilters({
  searchQuery,
  statusFilter,
  onSearchChange,
  onStatusChange,
  onRefresh
}: TeamFiltersProps) {
  return (
    <section className="toolbar" aria-label="팀 검색과 필터">
      <label>
        <span>검색</span>
        <input
          value={searchQuery}
          onChange={(event) => onSearchChange(event.target.value)}
          placeholder="팀 이름, 담당자, 설명"
          type="search"
        />
      </label>
      <label>
        <span>상태</span>
        <select
          value={statusFilter}
          onChange={(event) => onStatusChange(event.target.value as TeamStatusFilter)}
        >
          <option value="all">전체</option>
          <option value="active">활성</option>
          <option value="paused">보류</option>
          <option value="archived">보관</option>
        </select>
      </label>
      <button className="secondary-button" type="button" onClick={onRefresh}>
        새로고침
      </button>
    </section>
  );
}
