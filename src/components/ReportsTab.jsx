import { useState } from "react";
import { computeStats, fmtDate, fmtDateOnly, toISODate, todayISO } from "../utils/helpers";

export default function ReportsTab({ sessions, onClearSessions }) {
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState(todayISO());

  const filtered = sessions.filter((s) => {
    const d = s.date?.slice(0, 10);
    if (!d) return false;
    if (fromDate && d < fromDate) return false;
    if (toDate && d > toDate) return false;
    return true;
  });

  if (sessions.length === 0) {
    return (
      <div style={{ textAlign: "center", padding: "60px 20px", color: "var(--muted)" }}>
        <div style={{ fontSize: "3rem", marginBottom: 12 }}>📊</div>
        <div style={{ fontFamily: "Syne, sans-serif", fontSize: "1.1rem" }}>No reports yet</div>
        <div style={{ fontSize: "0.85rem", marginTop: 8 }}>Click "Save & Publish" to record a snapshot</div>
      </div>
    );
  }

  // Aggregate stats over filtered sessions
  const allPts = filtered.flatMap((s) => s.patients || []);
  const totals = computeStats(allPts);
  const maxPts = Math.max(...filtered.map((s) => (s.patients || []).length), 1);

  function exportCSV() {
    const rows = [[
      "Date", "Physicians", "Total", "Male", "Female",
      "Kuwaiti", "Kuwaiti Male", "Kuwaiti Female",
      "Non-Kuwaiti", "Non-Kuwaiti Male", "Non-Kuwaiti Female",
      "Phase 1 CR", "Discharge", "Not Seen", "Unit Work"
    ]];
    filtered.forEach((s) => {
      const st = computeStats(s.patients || []);
      rows.push([
        fmtDateOnly(s.date), (s.doctors || []).length,
        st.total, st.male, st.female,
        st.kw, st.kwMale, st.kwFemale,
        st.nonKw, st.nonKwMale, st.nonKwFemale,
        st.phase1, st.discharge, st.notSeen, st.unitWork
      ]);
    });
    const csv = rows.map((r) => r.join(",")).join("\n");
    const a = document.createElement("a");
    a.href = "data:text/csv;charset=utf-8," + encodeURIComponent(csv);
    a.download = `icu_report_${fromDate||"all"}_to_${toDate||"all"}.csv`;
    a.click();
  }

  return (
    <div>
      {/* ── Calendar filter ── */}
      <div style={{
        background: "var(--surface)", border: "1px solid var(--border)",
        borderRadius: 12, padding: "16px 20px", marginBottom: 24,
        display: "flex", gap: 16, flexWrap: "wrap", alignItems: "flex-end",
      }}>
        <div>
          <label style={{ fontSize: "0.7rem", color: "var(--muted)", textTransform: "uppercase", letterSpacing: "0.08em", display: "block", marginBottom: 6 }}>From Date</label>
          <input type="date" className="input-field" style={{ width: 160 }} value={fromDate} onChange={(e) => setFromDate(e.target.value)} />
        </div>
        <div>
          <label style={{ fontSize: "0.7rem", color: "var(--muted)", textTransform: "uppercase", letterSpacing: "0.08em", display: "block", marginBottom: 6 }}>To Date</label>
          <input type="date" className="input-field" style={{ width: 160 }} value={toDate} onChange={(e) => setToDate(e.target.value)} />
        </div>
        <button className="btn btn-ghost btn-sm" onClick={() => { setFromDate(""); setToDate(todayISO()); }}>Reset</button>
        <div style={{ marginLeft: "auto", fontSize: "0.82rem", color: "var(--muted)", alignSelf: "center" }}>
          Showing <strong style={{ color: "var(--accent)" }}>{filtered.length}</strong> of {sessions.length} sessions
        </div>
      </div>

      {/* ── Summary stats ── */}
      <div style={{ marginBottom: 28 }}>
        <div className="section-title" style={{ marginBottom: 14 }}>Summary for Selected Period</div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(140px, 1fr))", gap: 12, marginBottom: 16 }}>
          {[
            ["Total Patients", totals.total, "var(--accent)"],
            ["Male", totals.male, "#3b82f6"],
            ["Female", totals.female, "#ec4899"],
            ["Kuwaiti", totals.kw, "var(--success)"],
            ["Non-Kuwaiti", totals.nonKw, "var(--warning)"],
            ["Unit Work", totals.unitWork, "#f59e0b"],
          ].map(([label, val, color]) => (
            <div key={label} style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 10, padding: 14 }}>
              <div style={{ fontFamily: "Syne, sans-serif", fontSize: "1.6rem", fontWeight: 800, color }}>{val}</div>
              <div style={{ fontSize: "0.72rem", color: "var(--muted)", marginTop: 4 }}>{label}</div>
            </div>
          ))}
        </div>

        {/* Nationality × Gender breakdown */}
        <div style={{
          background: "var(--surface)", border: "1px solid var(--border)",
          borderRadius: 12, padding: "16px 20px",
        }}>
          <div className="section-title" style={{ marginBottom: 12 }}>Breakdown</div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
            {[
              ["🇰🇼 Kuwaiti Male",        totals.kwMale,    "#10b981"],
              ["🇰🇼 Kuwaiti Female",      totals.kwFemale,  "#10b981"],
              ["🌍 Non-Kuwaiti Male",     totals.nonKwMale, "#f59e0b"],
              ["🌍 Non-Kuwaiti Female",   totals.nonKwFemale,"#f59e0b"],
            ].map(([label, val, color]) => (
              <div key={label} style={{ display: "flex", justifyContent: "space-between", alignItems: "center",
                padding: "10px 14px", background: "var(--surface2)", borderRadius: 8 }}>
                <span style={{ fontSize: "0.8rem", color: "var(--muted)" }}>{label}</span>
                <span style={{ fontFamily: "Syne, sans-serif", fontWeight: 700, color }}>{val}</span>
              </div>
            ))}
          </div>

          {/* Status breakdown */}
          <div style={{ marginTop: 12, display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10 }}>
            {[
              ["🟢 Phase 1 CR",  totals.phase1,   "#10b981"],
              ["🔵 Discharge",   totals.discharge, "#3b82f6"],
              ["🟡 Not Seen",    totals.notSeen,   "#f59e0b"],
            ].map(([label, val, color]) => (
              <div key={label} style={{ display: "flex", justifyContent: "space-between", alignItems: "center",
                padding: "10px 14px", background: "var(--surface2)", borderRadius: 8 }}>
                <span style={{ fontSize: "0.78rem", color: "var(--muted)" }}>{label}</span>
                <span style={{ fontFamily: "Syne, sans-serif", fontWeight: 700, color }}>{val}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── Bar chart ── */}
      {filtered.length > 0 && (
        <div style={{ marginBottom: 28 }}>
          <div className="section-title" style={{ marginBottom: 14 }}>Patient Load Per Session</div>
          <div style={{ maxWidth: 600 }}>
            {filtered.slice(-15).reverse().map((s, i) => {
              const st = computeStats(s.patients || []);
              const pct = Math.round((st.total / maxPts) * 100);
              return (
                <div key={i} className="chart-bar-row">
                  <div className="chart-bar-label">{fmtDateOnly(s.date)}</div>
                  <div className="chart-bar-track">
                    <div className="chart-bar-fill"
                      style={{ width: `${pct}%`, background: "linear-gradient(90deg, var(--accent), var(--accent3))", color: "#000" }}>
                      {st.total}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ── Session table ── */}
      <div>
        <div className="section-title" style={{ marginBottom: 14 }}>Session Log</div>
        {filtered.length === 0 ? (
          <div style={{ padding: "30px", textAlign: "center", color: "var(--muted)", fontSize: "0.85rem" }}>
            No sessions found in this date range
          </div>
        ) : (
          <div style={{ overflowX: "auto" }}>
            <table className="report-table">
              <thead>
                <tr>
                  <th>Date</th><th>Docs</th><th>Total</th>
                  <th>KW ♂</th><th>KW ♀</th><th>Non-KW ♂</th><th>Non-KW ♀</th>
                  <th>Phase1</th><th>Discharge</th><th>Not Seen</th><th>Unit Work</th>
                </tr>
              </thead>
              <tbody>
                {filtered.slice().reverse().map((s, i) => {
                  const st = computeStats(s.patients || []);
                  return (
                    <tr key={i}>
                      <td style={{ whiteSpace: "nowrap" }}>{fmtDateOnly(s.date)}</td>
                      <td>{(s.doctors || []).length}</td>
                      <td><strong>{st.total}</strong></td>
                      <td style={{ color: "var(--success)" }}>{st.kwMale}</td>
                      <td style={{ color: "var(--success)" }}>{st.kwFemale}</td>
                      <td style={{ color: "var(--warning)" }}>{st.nonKwMale}</td>
                      <td style={{ color: "var(--warning)" }}>{st.nonKwFemale}</td>
                      <td style={{ color: "#10b981" }}>{st.phase1}</td>
                      <td style={{ color: "#3b82f6" }}>{st.discharge}</td>
                      <td style={{ color: "#f59e0b" }}>{st.notSeen}</td>
                      <td style={{ color: "#f59e0b" }}>{st.unitWork}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
        <div style={{ marginTop: 14, display: "flex", gap: 10, flexWrap: "wrap" }}>
          <button className="btn btn-ghost btn-sm" onClick={exportCSV}>⬇️ Export CSV</button>
          <button className="btn btn-danger btn-sm" onClick={() => { if (window.confirm("Clear all history?")) onClearSessions(); }}>🗑️ Clear History</button>
        </div>
      </div>
    </div>
  );
}
