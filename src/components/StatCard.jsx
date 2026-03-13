export default function StatCard({ value, label, colorClass }) {
  return (
    <div className={`stat-card ${colorClass}`}>
      <div className="stat-num">{value}</div>
      <div className="stat-label">{label}</div>
    </div>
  );
}
