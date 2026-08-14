import type { Team } from "../model/team";
import { TEAM_STATUS_LABELS } from "../model/team";

interface TeamListProps {
  teams: Team[];
  isLoading: boolean;
  hasAnyTeams: boolean;
  onEdit: (team: Team) => void;
  onDelete: (id: string) => void;
}

export function TeamList({ teams, isLoading, hasAnyTeams, onEdit, onDelete }: TeamListProps) {
  if (isLoading) {
    return <div className="panel state-panel">팀 목록을 불러오는 중입니다.</div>;
  }

  if (!hasAnyTeams) {
    return <div className="panel state-panel">아직 등록된 팀이 없습니다.</div>;
  }

  if (teams.length === 0) {
    return <div className="panel state-panel">검색 조건에 맞는 팀이 없습니다.</div>;
  }

  return (
    <section className="team-list" aria-label="팀 목록">
      {teams.map((team) => (
        <article className="team-card" key={team.id}>
          <div className="team-card-header">
            <div>
              <h3>{team.name}</h3>
              <p>{team.owner} 담당</p>
            </div>
            <span className={`status-badge status-${team.status}`}>
              {TEAM_STATUS_LABELS[team.status]}
            </span>
          </div>

          <dl className="team-meta">
            <div>
              <dt>인원</dt>
              <dd>{team.members}명</dd>
            </div>
            <div>
              <dt>생성일</dt>
              <dd>{new Date(team.createdAt).toLocaleDateString("ko-KR")}</dd>
            </div>
          </dl>

          <p className="team-description">{team.description || "설명이 없습니다."}</p>

          <div className="card-actions">
            <button className="secondary-button" type="button" onClick={() => onEdit(team)}>
              수정
            </button>
            <button className="danger-button" type="button" onClick={() => onDelete(team.id)}>
              삭제
            </button>
          </div>
        </article>
      ))}
    </section>
  );
}
