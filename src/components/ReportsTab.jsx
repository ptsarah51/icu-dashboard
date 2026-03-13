import { computeStats, fmtDate } from "../utils/helpers";

export default function ReportsTab({ sessions, onClearSessions }) {
  if (sessions.length === 0) {
    return (
      <div style={{ textAlign: "center", padding: "60px 20px", color: "var(--muted)" }}>
        <div style={{ fontSize: "3rem", marginBottom: 12 }}>📊</div>
        <div style={{ fontFamily: "Syne, sans-serif", fontSize: "1.1rem" }}>No reports yet</div>
        <div style={{ fontSize: "0.85rem", marginTop: 8 }}>
          Click "Save & Publish" to record a snapshot for reporting
        </div>
      </div>
    );
  }

  const allPts = sessions.flatMap((s) => s.patients || []);
  const totals = computeStats(allPts);
  const maxPts = Math.max(...sessions.map((s) => (s.patients || []).length), 1);

  function exportCSV() {
    const rows = [["Date", "Physicians", "Total Patients", "Male", "Female", "Kuwaiti", "Non-Kuwaiti"]];
    sessions.forEach((s) => {
      const st = computeStats(s.patients || []);
      rows.push([fmtDate(s.date), (s.doctors || []).length, st.total, st.male, st.female, st.kw, st.nonKw]);
    });
    const csv = rows.map((r) => r.join(",")).join("\n");
    const a = document.createElement("a");
    a.href = "data:text/csv;charset=utf-8," + encodeURIComponent(csv);
    a.download = `icu_report_${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
  }

  return (
    <div>
      {/* Summary stats */}
      <div style={{ marginBottom: 28 }}>
        <div className="section-title" style={{ marginBottom: 14 }}>All-Time Totals</div>
        <div className="stats-grid" style={{ maxWidth: 700 }}>
          <div className="stat-card blue"><div className="stat-num">{sessions.length}</div><div className="stat-label">Sessions Recorded</div></div>
          <div className="stat-card orange"><div className="stat-num">{totals.total}</div><div className="stat-label">Total Patient Entries</div></div>
          <div className="stat-card purple"><div className="stat-num">{totals.male}</div><div className="stat-label">Male Patients</div></div>
          <div className="stat-card green"><div className="stat-num">{totals.kw}</div><div className="stat-label">Kuwaiti Patients</div></div>
        </div>
      </div>

      {/* Bar chart */}
      <div style={{ marginBottom: 28 }}>
        <div className="section-title" style={{ marginBottom: 14 }}>Patient Load — Last 10 Sessions</div>
        <div style={{ maxWidth: 580 }}>
          {sessions.slice(-10).reverse().map((s, i) => {
            const st = computeStats(s.patients || []);
            const pct = Math.round((st.total / maxPts) * 100);
            return (
              <div key={i} className="chart-bar-row">
                <div className="chart-bar-label">
                  {new Date(s.date).toLocaleDateString("en-GB", { day: "2-digit", month: "short" })}
                </div>
                <div className="chart-bar-track">
                  <div
                    className="chart-bar-fill"
                    style={{ width: `${pct}%`, background: "linear-gradient(90deg, var(--accent), var(--accent3))", color: "#000" }}
                  >
                    {st.total} pts
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Table */}
      <div>
        <div className="section-title" style={{ marginBottom: 14 }}>Session History</div>
        <div style={{ overflowX: "auto" }}>
          <table className="report-table">
            <thead>
              <tr>
                <th>Date & Time</th><th>Physicians</th><th>Patients</th>
                <th>Male</th><th>Female</th><th>Kuwaiti</th><th>Non-Kuwaiti</th>
              </tr>
            </thead>
            <tbody>
              {sessions.slice().reverse().map((s, i) => {
                const st = computeStats(s.patients || []);
                return (
                  <tr key={i}>
                    <td style={{ whiteSpace: "nowrap" }}>{fmtDate(s.date)}</td>
                    <td>{(s.doctors || []).length}</td>
                    <td><strong>{st.total}</strong></td>
                    <td>{st.male}</td>
                    <td>{st.female}</td>
                    <td style={{ color: "var(--success)" }}>{st.kw}</td>
                    <td style={{ color: "var(--warning)" }}>{st.nonKw}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        <div style={{ marginTop: 14, display: "flex", gap: 10, flexWrap: "wrap" }}>
          <button className="btn btn-ghost btn-sm" onClick={exportCSV}>⬇️ Export CSV</button>
          <button className="btn btn-danger btn-sm" onClick={() => { if (window.confirm("Clear all session history?")) onClearSessions(); }}>
            🗑️ Clear History
          </button>
        </div>
      </div>
    </div>
  );
}
