import { useState } from "react";
import { computeStats, computeDoctorStats, fmtDateOnly, todayISO, DOC_COLORS } from "../utils/helpers";

function StatBox({ label, value, color }) {
  return (
    <div style={{ background: "var(--surface2)", borderRadius: 8, padding: "10px 14px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
      <span style={{ fontSize: "0.78rem", color: "var(--muted)" }}>{label}</span>
      <span style={{ fontFamily: "Syne, sans-serif", fontWeight: 700, color: color || "var(--text)" }}>{value}</span>
    </div>
  );
}

function StatusDetailBlock({ label, detail, color, icon }) {
  if (!detail) return null;
  return (
    <div style={{ background: "var(--surface)", border: `1px solid ${color}33`, borderRadius: 10, padding: "12px 16px", marginBottom: 10 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
        <span>{icon}</span>
        <span style={{ fontFamily: "Syne, sans-serif", fontWeight: 700, color, fontSize: "0.88rem" }}>{label}</span>
        <span style={{ marginLeft: "auto", fontFamily: "Syne, sans-serif", fontWeight: 800, color, fontSize: "1.1rem" }}>{detail.total}</span>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6 }}>
        <StatBox label="🇰🇼 Kuwaiti ♂" value={detail.kwMale}     color="#10b981" />
        <StatBox label="🇰🇼 Kuwaiti ♀" value={detail.kwFemale}   color="#10b981" />
        <StatBox label="🌍 Non-KW ♂"   value={detail.nonKwMale}  color="#f59e0b" />
        <StatBox label="🌍 Non-KW ♀"   value={detail.nonKwFemale} color="#f59e0b" />
      </div>
    </div>
  );
}

export default function ReportsTab({ sessions, state, onClearSessions }) {
  const [fromDate, setFromDate]       = useState("");
  const [toDate, setToDate]           = useState(todayISO());
  const [reportView, setReportView]   = useState("summary"); // "summary" | "doctors"
  const [selectedDoc, setSelectedDoc] = useState("");

  const { doctors = [], patients = [], assignments = {} } = state || {};

  const filtered = sessions.filter((s) => {
    const d = s.date?.slice(0, 10);
    if (!d) return false;
    if (fromDate && d < fromDate) return false;
    if (toDate   && d > toDate)   return false;
    return true;
  });

  // Use LIVE patients (with up-to-date statuses from viewers) for current stats
  // Use sessions for historical/period stats
  const liveTotals = computeStats(patients);
  const allPts     = filtered.flatMap((s) => s.patients || []);
  const periodTotals = computeStats(allPts);
  const maxPts     = Math.max(...filtered.map((s) => (s.patients || []).length), 1);

  // Doctor-specific stats from live board
  const docStats = selectedDoc ? computeDoctorStats(selectedDoc, patients, assignments) : null;

  function exportCSV() {
    const rows = [[
      "Date","Physicians","Total","KW Male","KW Female","Non-KW Male","Non-KW Female",
      "Phase1 Total","Phase1 KW♂","Phase1 KW♀","Phase1 NonKW♂","Phase1 NonKW♀",
      "Discharge Total","Discharge KW♂","Discharge KW♀","Discharge NonKW♂","Discharge NonKW♀",
      "NotSeen Total","NotSeen KW♂","NotSeen KW♀","NotSeen NonKW♂","NotSeen NonKW♀",
      "New Patients","Recurrent","Unit Work","Unit Done","Unit In Progress","Unit Need Help"
    ]];
    filtered.forEach((s) => {
      const st = computeStats(s.patients || []);
      rows.push([
        fmtDateOnly(s.date), (s.doctors||[]).length,
        st.total, st.kwMale, st.kwFemale, st.nonKwMale, st.nonKwFemale,
        st.phase1,    st.phase1Detail.kwMale,    st.phase1Detail.kwFemale,    st.phase1Detail.nonKwMale,    st.phase1Detail.nonKwFemale,
        st.discharge, st.dischargeDetail.kwMale, st.dischargeDetail.kwFemale, st.dischargeDetail.nonKwMale, st.dischargeDetail.nonKwFemale,
        st.notSeen,   st.notSeenDetail.kwMale,   st.notSeenDetail.kwFemale,   st.notSeenDetail.nonKwMale,   st.notSeenDetail.nonKwFemale,
        st.newPts, st.recurrentPts, st.unitWork, st.unitDone, st.unitInProgress, st.unitNeedHelp,
      ]);
    });
    const csv = rows.map((r) => r.join(",")).join("\n");
    const a = document.createElement("a");
    a.href = "data:text/csv;charset=utf-8," + encodeURIComponent(csv);
    a.download = `sdcc_report_${fromDate||"all"}_to_${toDate||"all"}.csv`;
    a.click();
  }

  if (sessions.length === 0) {
    return (
      <div style={{ textAlign: "center", padding: "60px 20px", color: "var(--muted)" }}>
        <div style={{ fontSize: "3rem", marginBottom: 12 }}>📊</div>
        <div style={{ fontFamily: "Syne, sans-serif", fontSize: "1.1rem" }}>No reports yet</div>
        <div style={{ fontSize: "0.85rem", marginTop: 8 }}>Click "Save & Publish" to record a snapshot</div>
      </div>
    );
  }

  return (
    <div>
      {/* ── View toggle ── */}
      <div className="tabs" style={{ marginBottom: 20 }}>
        <div className={`tab${reportView==="summary"  ? " active":""}`} onClick={() => setReportView("summary")}>📊 Summary</div>
        <div className={`tab${reportView==="doctors"  ? " active":""}`} onClick={() => setReportView("doctors")}>👨‍⚕️ By Doctor</div>
        <div className={`tab${reportView==="sessions" ? " active":""}`} onClick={() => setReportView("sessions")}>🗓 Session Log</div>
      </div>

      {/* ── Date filter (shown on summary + sessions) ── */}
      {reportView !== "doctors" && (
        <div style={{
          background: "var(--surface)", border: "1px solid var(--border)",
          borderRadius: 12, padding: "16px 20px", marginBottom: 24,
          display: "flex", gap: 16, flexWrap: "wrap", alignItems: "flex-end",
        }}>
          <div>
            <label style={{ fontSize: "0.7rem", color: "var(--muted)", textTransform: "uppercase", letterSpacing: "0.08em", display: "block", marginBottom: 6 }}>From</label>
            <input type="date" className="input-field" style={{ width: 155 }} value={fromDate} onChange={(e) => setFromDate(e.target.value)} />
          </div>
          <div>
            <label style={{ fontSize: "0.7rem", color: "var(--muted)", textTransform: "uppercase", letterSpacing: "0.08em", display: "block", marginBottom: 6 }}>To</label>
            <input type="date" className="input-field" style={{ width: 155 }} value={toDate} onChange={(e) => setToDate(e.target.value)} />
          </div>
          <button className="btn btn-ghost btn-sm" onClick={() => { setFromDate(""); setToDate(todayISO()); }}>Reset</button>
          <div style={{ marginLeft: "auto", fontSize: "0.82rem", color: "var(--muted)", alignSelf: "center" }}>
            <strong style={{ color: "var(--accent)" }}>{filtered.length}</strong> of {sessions.length} sessions
          </div>
        </div>
      )}

      {/* ══ SUMMARY VIEW ══════════════════════════════════════════ */}
      {reportView === "summary" && (
        <div>
          {/* Live board stats note */}
          <div style={{ background: "rgba(0,212,255,0.06)", border: "1px solid rgba(0,212,255,0.15)", borderRadius: 8, padding: "8px 14px", marginBottom: 18, fontSize: "0.78rem", color: "var(--muted)" }}>
            💡 <strong style={{ color: "var(--accent)" }}>Live stats</strong> below reflect current board including all viewer status updates. Period breakdown uses saved sessions.
          </div>

          {/* Top counters — live */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(130px,1fr))", gap: 12, marginBottom: 20 }}>
            {[
              ["Total",       liveTotals.total,       "var(--accent)"],
              ["Male",        liveTotals.male,         "#3b82f6"],
              ["Female",      liveTotals.female,       "#ec4899"],
              ["Kuwaiti",     liveTotals.kw,           "var(--success)"],
              ["Non-Kuwaiti", liveTotals.nonKw,        "var(--warning)"],
              ["New",         liveTotals.newPts,       "#a78bfa"],
              ["Recurrent",   liveTotals.recurrentPts, "#14b8a6"],
              ["Unit Work",   liveTotals.unitWork,     "#f59e0b"],
            ].map(([label,val,color]) => (
              <div key={label} style={{ background:"var(--surface)", border:"1px solid var(--border)", borderRadius:10, padding:14 }}>
                <div style={{ fontFamily:"Syne,sans-serif", fontSize:"1.5rem", fontWeight:800, color }}>{val}</div>
                <div style={{ fontSize:"0.72rem", color:"var(--muted)", marginTop:4 }}>{label}</div>
              </div>
            ))}
          </div>

          {/* Status breakdowns with full detail */}
          <div className="section-title" style={{ marginBottom: 12 }}>Status Breakdown (Live)</div>
          <StatusDetailBlock label="Phase 1 CR"  detail={liveTotals.phase1Detail}    color="#10b981" icon="🟢" />
          <StatusDetailBlock label="Discharge"   detail={liveTotals.dischargeDetail} color="#3b82f6" icon="🔵" />
          <StatusDetailBlock label="Not Seen"    detail={liveTotals.notSeenDetail}   color="#f59e0b" icon="🟡" />

          {/* Unit work status */}
          {liveTotals.unitWork > 0 && (
            <div style={{ background:"var(--surface)", border:"1px solid rgba(245,158,11,0.2)", borderRadius:10, padding:"12px 16px", marginBottom:10 }}>
              <div style={{ fontFamily:"Syne,sans-serif", fontWeight:700, color:"#f59e0b", fontSize:"0.88rem", marginBottom:10 }}>🔧 Unit Work Status</div>
              <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr 1fr", gap:8 }}>
                <StatBox label="🟡 In Progress" value={liveTotals.unitInProgress} color="#f59e0b" />
                <StatBox label="🟢 Done"         value={liveTotals.unitDone}       color="#10b981" />
                <StatBox label="🔴 Need Help"    value={liveTotals.unitNeedHelp}   color="#ef4444" />
              </div>
            </div>
          )}

          {/* Period bar chart */}
          {filtered.length > 0 && (
            <div style={{ marginTop: 28 }}>
              <div className="section-title" style={{ marginBottom: 14 }}>Patient Load — Selected Period</div>
              <div style={{ maxWidth: 600 }}>
                {filtered.slice(-15).reverse().map((s, i) => {
                  const st = computeStats(s.patients || []);
                  const pct = Math.round((st.total / maxPts) * 100);
                  return (
                    <div key={i} className="chart-bar-row">
                      <div className="chart-bar-label">{fmtDateOnly(s.date)}</div>
                      <div className="chart-bar-track">
                        <div className="chart-bar-fill" style={{ width:`${pct}%`, background:"linear-gradient(90deg,var(--accent),var(--accent3))", color:"#000" }}>
                          {st.total}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ══ BY DOCTOR VIEW ════════════════════════════════════════ */}
      {reportView === "doctors" && (
        <div>
          <div style={{ marginBottom: 20 }}>
            <label style={{ fontSize: "0.7rem", color: "var(--muted)", textTransform: "uppercase", letterSpacing: "0.08em", display: "block", marginBottom: 8 }}>Select Physician</label>
            <select className="input-field" style={{ maxWidth: 320 }} value={selectedDoc} onChange={(e) => setSelectedDoc(e.target.value)}>
              <option value="">Choose a physician…</option>
              {doctors.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
            </select>
          </div>

          {!selectedDoc && (
            <div style={{ textAlign:"center", padding:"40px 20px", color:"var(--muted)", fontSize:"0.85rem" }}>
              Select a physician above to view their individual stats
            </div>
          )}

          {selectedDoc && docStats && (() => {
            const doc = doctors.find((d) => d.id === selectedDoc);
            const idx = doctors.indexOf(doc);
            const color = DOC_COLORS[idx % DOC_COLORS.length];
            return (
              <div>
                <div style={{ display:"flex", alignItems:"center", gap:12, marginBottom:20 }}>
                  <div className="doctor-avatar" style={{ background:`linear-gradient(135deg,${color},${DOC_COLORS[(idx+2)%DOC_COLORS.length]})`, width:44, height:44, fontSize:"1rem" }}>
                    {doc?.name?.split(" ").map(w=>w[0]).join("").toUpperCase().slice(0,2)}
                  </div>
                  <div>
                    <div style={{ fontFamily:"Syne,sans-serif", fontWeight:700, fontSize:"1rem" }}>{doc?.name}</div>
                    <div style={{ fontSize:"0.78rem", color:"var(--muted)" }}>{docStats.total} patients assigned</div>
                  </div>
                </div>

                <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill,minmax(120px,1fr))", gap:10, marginBottom:20 }}>
                  {[
                    ["Total",       docStats.total,       color],
                    ["Male",        docStats.male,        "#3b82f6"],
                    ["Female",      docStats.female,      "#ec4899"],
                    ["Kuwaiti",     docStats.kw,          "var(--success)"],
                    ["Non-Kuwaiti", docStats.nonKw,       "var(--warning)"],
                    ["New",         docStats.newPts,      "#a78bfa"],
                    ["Recurrent",   docStats.recurrentPts,"#14b8a6"],
                    ["Unit Work",   docStats.unitWork,    "#f59e0b"],
                  ].map(([label,val,c]) => (
                    <div key={label} style={{ background:"var(--surface)", border:"1px solid var(--border)", borderRadius:10, padding:12 }}>
                      <div style={{ fontFamily:"Syne,sans-serif", fontSize:"1.4rem", fontWeight:800, color:c }}>{val}</div>
                      <div style={{ fontSize:"0.7rem", color:"var(--muted)", marginTop:3 }}>{label}</div>
                    </div>
                  ))}
                </div>

                <div className="section-title" style={{ marginBottom:12 }}>Status Breakdown</div>
                <StatusDetailBlock label="Phase 1 CR" detail={docStats.phase1Detail}    color="#10b981" icon="🟢" />
                <StatusDetailBlock label="Discharge"  detail={docStats.dischargeDetail} color="#3b82f6" icon="🔵" />
                <StatusDetailBlock label="Not Seen"   detail={docStats.notSeenDetail}   color="#f59e0b" icon="🟡" />

                {docStats.unitWork > 0 && (
                  <div style={{ background:"var(--surface)", border:"1px solid rgba(245,158,11,0.2)", borderRadius:10, padding:"12px 16px" }}>
                    <div style={{ fontFamily:"Syne,sans-serif", fontWeight:700, color:"#f59e0b", fontSize:"0.88rem", marginBottom:10 }}>🔧 Unit Work</div>
                    <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr 1fr", gap:8 }}>
                      <StatBox label="🟡 In Progress" value={docStats.unitInProgress} color="#f59e0b" />
                      <StatBox label="🟢 Done"         value={docStats.unitDone}       color="#10b981" />
                      <StatBox label="🔴 Need Help"    value={docStats.unitNeedHelp}   color="#ef4444" />
                    </div>
                  </div>
                )}
              </div>
            );
          })()}
        </div>
      )}

      {/* ══ SESSION LOG VIEW ══════════════════════════════════════ */}
      {reportView === "sessions" && (
        <div>
          {filtered.length === 0 ? (
            <div style={{ padding:"30px", textAlign:"center", color:"var(--muted)", fontSize:"0.85rem" }}>No sessions in this date range</div>
          ) : (
            <div style={{ overflowX:"auto" }}>
              <table className="report-table">
                <thead>
                  <tr>
                    <th>Date</th><th>Docs</th><th>Total</th>
                    <th>KW♂</th><th>KW♀</th><th>Non-KW♂</th><th>Non-KW♀</th>
                    <th>New</th><th>Recurrent</th>
                    <th>Phase1</th><th>Discharge</th><th>Not Seen</th>
                    <th>Unit Work</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.slice().reverse().map((s, i) => {
                    const st = computeStats(s.patients || []);
                    return (
                      <tr key={i}>
                        <td style={{ whiteSpace:"nowrap" }}>{fmtDateOnly(s.date)}</td>
                        <td>{(s.doctors||[]).length}</td>
                        <td><strong>{st.total}</strong></td>
                        <td style={{ color:"var(--success)" }}>{st.kwMale}</td>
                        <td style={{ color:"var(--success)" }}>{st.kwFemale}</td>
                        <td style={{ color:"var(--warning)" }}>{st.nonKwMale}</td>
                        <td style={{ color:"var(--warning)" }}>{st.nonKwFemale}</td>
                        <td style={{ color:"#a78bfa" }}>{st.newPts}</td>
                        <td style={{ color:"#14b8a6" }}>{st.recurrentPts}</td>
                        <td style={{ color:"#10b981" }}>{st.phase1}</td>
                        <td style={{ color:"#3b82f6" }}>{st.discharge}</td>
                        <td style={{ color:"#f59e0b" }}>{st.notSeen}</td>
                        <td style={{ color:"#f59e0b" }}>{st.unitWork}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
          <div style={{ marginTop:14, display:"flex", gap:10, flexWrap:"wrap" }}>
            <button className="btn btn-ghost btn-sm" onClick={exportCSV}>⬇️ Export CSV</button>
            <button className="btn btn-danger btn-sm" onClick={() => { if (window.confirm("Clear all session history?")) onClearSessions(); }}>🗑️ Clear History</button>
          </div>
        </div>
      )}
    </div>
  );
}
