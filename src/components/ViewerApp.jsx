import { getInitials, DOC_COLORS, getDoctorPatients, isKuwaiti, isMale, fmtDate } from "../utils/helpers";

export default function ViewerApp({ state }) {
  const { doctors, patients, assignments, lastSaved } = state;

  return (
    <div>
      <div className="viewer-header">
        <div style={{ fontSize: "1.5rem", marginBottom: 4 }}>🏥</div>
        <div className="viewer-title">ICU Case Distribution</div>
        <div style={{ color: "var(--muted)", fontSize: "0.8rem", marginTop: 6 }}>
          Last updated: {fmtDate(lastSaved)} &nbsp;·&nbsp; Auto-refreshes every 20s
        </div>
        {patients.length > 0 && (
          <div style={{ marginTop: 8, fontSize: "0.82rem", color: "var(--muted)" }}>
            Total: <span style={{ color: "var(--accent)", fontWeight: 700 }}>{patients.length}</span> patients
          </div>
        )}
      </div>

      {doctors.length === 0 ? (
        <div style={{ textAlign: "center", padding: "60px 20px", color: "var(--muted)" }}>
          <div style={{ fontSize: "3rem" }}>📋</div>
          <div style={{ marginTop: 12 }}>No data published yet. Awaiting the consultant to save a session.</div>
        </div>
      ) : (
        <div className="viewer-grid">
          {doctors.map((doc, i) => {
            const pts = getDoctorPatients(doc.id, patients, assignments);
            const c1 = DOC_COLORS[i % DOC_COLORS.length];
            const c2 = DOC_COLORS[(i + 2) % DOC_COLORS.length];
            return (
              <div key={doc.id} className="viewer-col">
                <div className="viewer-doc-header">
                  <div
                    className="doctor-avatar"
                    style={{ background: `linear-gradient(135deg, ${c1}, ${c2})` }}
                  >
                    {getInitials(doc.name)}
                  </div>
                  <div>
                    <div style={{ fontFamily: "Syne, sans-serif", fontWeight: 700 }}>{doc.name}</div>
                    <div style={{ fontSize: "0.75rem", color: "var(--muted)" }}>
                      {pts.length} patient{pts.length !== 1 ? "s" : ""}
                    </div>
                  </div>
                </div>

                {pts.length === 0 ? (
                  <div style={{ padding: 20, textAlign: "center", color: "var(--muted)", fontSize: "0.8rem" }}>
                    No patients assigned
                  </div>
                ) : (
                  pts.map((p) => {
                    const male = isMale(p.gender);
                    const kw = isKuwaiti(p.nationality);
                    return (
                      <div key={p.id} className="viewer-patient">
                        <div style={{ fontWeight: 600, fontSize: "0.88rem", marginBottom: 4 }}>{p.name}</div>
                        <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                          {p.bed && <span className="tag bed">Bed {p.bed}</span>}
                          {p.age && <span className="tag">{p.age}y</span>}
                          {p.gender && (
                            <span className="tag" style={{ color: male ? "#93c5fd" : "#f9a8d4" }}>{p.gender}</span>
                          )}
                          {p.nationality && (
                            <span className={`tag ${kw ? "kw" : "non-kw"}`}>{p.nationality}</span>
                          )}
                          {p.diagnosis && (
                            <span className="tag diag" title={p.diagnosis}>{p.diagnosis}</span>
                          )}
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
