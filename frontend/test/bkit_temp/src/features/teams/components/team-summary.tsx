interface TeamSummaryProps {
  summary: {
    total: number;
    active: number;
    paused: number;
    archived: number;
  };
}

const SUMMARY_ITEMS = [
  ["전체", "total"],
  ["활성", "active"],
  ["보류", "paused"],
  ["보관", "archived"]
] as const;

export function TeamSummary({ summary }: TeamSummaryProps) {
  return (
    <section className="summary-grid" aria-label="팀 요약">
      {SUMMARY_ITEMS.map(([label, key]) => (
        <div className="summary-item" key={key}>
          <span>{label}</span>
          <strong>{summary[key]}</strong>
        </div>
      ))}
    </section>
  );
}
