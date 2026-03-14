import { useState } from "react";
import { getInitials, DOC_COLORS, getDoctorPatients, isKuwaiti, isMale,
         fmtDate, STATUS_OPTIONS, LOCATION_COLORS, groupByLocation } from "../utils/helpers";
import { savePatientStatuses } from "../utils/firebase";

export default function ViewerApp({ state, loading }) {
  const [viewerCode, setViewerCode] = useState("");
  const [loggedInDoc, setLoggedInDoc] = useState(null);
  const [codeError, setCodeError] = useState("");
  const [localStatuses, setLocalStatuses] = useState({});
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  // State comes from App.jsx which holds a single live Firestore subscription.
  // Updates arrive in real-time the moment the admin saves — no polling needed.
  const { doctors, patients, assignments, lastSaved } = state;

  // Keep loggedInDoc in sync with live doctor data (e.g. name or code changes)
  const currentDoc = loggedInDoc
    ? doctors.find((d) => d.id === loggedInDoc.id) || loggedInDoc
    : null;

  // Login by viewer code
  const handleViewerLogin = () => {
    const code = viewerCode.trim().toUpperCase();
    // Match case-insensitively so codes work regardless of how they were stored
    const match = doctors.find((d) => d.viewerCode && d.viewerCode.toUpperCase() === code);
    if (match) {
      setLoggedInDoc(match);
      setCodeError("");
      // Seed local statuses from current patient statuses
      const statusMap = {};
      getDoctorPatients(match.id, patients, assignments).forEach((p) => {
        if (p.status) statusMap[p.id] = p.status;
      });
      setLocalStatuses(statusMap);
    } else {
      // If doctors haven't loaded from Firebase yet, give a clearer message
      if (doctors.length === 0) {
        setCodeError("Still loading — please wait a moment and try again.");
      } else {
        setCodeError("Code not recognised. Check with your consultant.");
      }
      setViewerCode("");
    }
  };

  const handleStatusChange = (patientId, status) => {
    setLocalStatuses((prev) => ({ ...prev, [patientId]: status }));
    setSaved(false);
  };

  const handleSaveProgress = async () => {
    setSaving(true);
    try {
      await savePatientStatuses(loggedInDoc.id, localStatuses);
      setSaved(true);
    } catch (e) {
      console.warn("Save failed", e);
    }
    setSaving(false);
  };

  // ── Viewer Login Screen ──────────────────────────────────
  if (!currentDoc) {
    return (
      <div style={{
        minHeight: "100vh", background: "var(--bg)",
        display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
        padding: 24,
      }}>
        <div style={{
          background: "var(--surface)", border: "1px solid var(--border)",
          borderRadius: 20, padding: "40px 32px", width: "100%", maxWidth: 380,
          textAlign: "center", boxShadow: "0 24px 64px rgba(0,0,0,0.4)",
        }}>
          <div style={{ fontSize: "2.5rem", marginBottom: 12 }}>🏥</div>
          <div style={{
            fontFamily: "Syne, sans-serif", fontWeight: 800, fontSize: "1.3rem",
            background: "linear-gradient(135deg, var(--accent), var(--accent3))",
            WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", backgroundClip: "text",
            marginBottom: 6,
          }}>SDCC HS Viewer</div>
          <div style={{ color: "var(--muted)", fontSize: "0.82rem", marginBottom: 28 }}>
            Enter your personal viewer code to see your patient list
          </div>

          {loading && (
            <div style={{
              display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
              marginBottom: 16, fontSize: "0.78rem", color: "var(--muted)",
            }}>
              <div style={{
                width: 14, height: 14,
                border: "2px solid var(--border)", borderTop: "2px solid var(--accent)",
                borderRadius: "50%", animation: "spin 0.8s linear infinite",
              }} />
              Connecting to server…
              <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
            </div>
          )}

          <input
            className="input-field"
            style={{ textAlign: "center", fontSize: "1.1rem", letterSpacing: "0.15em", fontFamily: "monospace", marginBottom: 12 }}
            placeholder="SD0000"
            value={viewerCode}
            maxLength={6}
            onChange={(e) => { setViewerCode(e.target.value.toUpperCase()); setCodeError(""); }}
            onKeyDown={(e) => e.key === "Enter" && handleViewerLogin()}
            autoFocus
          />
          {codeError && <div style={{ color: "var(--danger)", fontSize: "0.8rem", marginBottom: 12 }}>{codeError}</div>}
          <button className="btn btn-primary" style={{ width: "100%", justifyContent: "center" }} onClick={handleViewerLogin}>
            View My List
          </button>
        </div>
      </div>
    );
  }

  // ── Doctor's Patient List ────────────────────────────────
  const myPatients = getDoctorPatients(currentDoc.id, patients, assignments);
  const locationGroups = groupByLocation(myPatients.filter((p) => !p.isUnitWork));
  const unitWorkItems = myPatients.filter((p) => p.isUnitWork);
  const docIndex = doctors.findIndex((d) => d.id === currentDoc.id);
  const c1 = DOC_COLORS[docIndex % DOC_COLORS.length];
  const c2 = DOC_COLORS[(docIndex + 2) % DOC_COLORS.length];

  return (
    <div style={{ minHeight: "100vh", background: "var(--bg)" }}>
      {/* Header */}
      <div className="viewer-header">
        <div style={{ display: "flex", alignItems: "center", gap: 12, justifyContent: "center", marginBottom: 6 }}>
          <div className="doctor-avatar" style={{ background: `linear-gradient(135deg, ${c1}, ${c2})` }}>
            {getInitials(loggedInDoc.name)}
          </div>
          <div>
            <div className="viewer-title" style={{ textAlign: "left" }}>{currentDoc.name}</div>
            <div style={{ color: "var(--muted)", fontSize: "0.75rem" }}>
              {myPatients.filter(p => !p.isUnitWork).length} patients · Last updated: {fmtDate(lastSaved)}
            </div>
          </div>
        </div>
        <div style={{ display: "flex", gap: 10, justifyContent: "center", marginTop: 12, flexWrap: "wrap" }}>
          <button
            className={`btn btn-sm ${saved ? "btn-success" : "btn-primary"}`}
            onClick={handleSaveProgress}
            disabled={saving}
          >
            {saving ? "Saving…" : saved ? "✓ Saved" : "💾 Save My Progress"}
          </button>
          <button className="btn btn-ghost btn-sm" onClick={() => setLoggedInDoc(null)}>🚪 Log Out</button>
        </div>
      </div>

      <div style={{ padding: "20px", maxWidth: 700, margin: "0 auto" }}>
        {myPatients.length === 0 ? (
          <div style={{ textAlign: "center", padding: "60px 20px", color: "var(--muted)" }}>
            <div style={{ fontSize: "3rem" }}>📋</div>
            <div style={{ marginTop: 12 }}>No patients assigned to you yet.</div>
          </div>
        ) : (
          <>
            {/* Patients grouped by location */}
            {Object.entries(locationGroups).map(([loc, pts]) => {
              const locColor = LOCATION_COLORS[loc] || {};
              return (
                <div key={loc} style={{ marginBottom: 24 }}>
                  <div style={{
                    display: "flex", alignItems: "center", gap: 10, marginBottom: 10,
                    padding: "8px 14px", borderRadius: 8,
                    background: locColor.bg || "rgba(255,255,255,0.04)",
                    border: `1px solid ${locColor.border || "var(--border)"}`,
                  }}>
                    <span style={{ fontFamily: "Syne, sans-serif", fontWeight: 700, color: locColor.text || "var(--text)", fontSize: "0.85rem" }}>
                      📍 {loc}
                    </span>
                    <span style={{ fontSize: "0.75rem", color: "var(--muted)" }}>{pts.length} patient{pts.length !== 1 ? "s" : ""}</span>
                  </div>
                  <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                    {pts.map((p) => (
                      <ViewerPatientRow
                        key={p.id} patient={p}
                        status={localStatuses[p.id] || p.status || ""}
                        onStatusChange={(s) => handleStatusChange(p.id, s)}
                      />
                    ))}
                  </div>
                </div>
              );
            })}

            {/* Unit Work */}
            {unitWorkItems.length > 0 && (
              <div style={{ marginBottom: 24 }}>
                <div style={{
                  display: "flex", alignItems: "center", gap: 10, marginBottom: 10,
                  padding: "8px 14px", borderRadius: 8,
                  background: "rgba(245,158,11,0.08)", border: "1px solid rgba(245,158,11,0.2)",
                }}>
                  <span style={{ fontFamily: "Syne, sans-serif", fontWeight: 700, color: "#f59e0b", fontSize: "0.85rem" }}>
                    🔧 Unit Work
                  </span>
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                  {unitWorkItems.map((p) => (
                    <ViewerPatientRow
                      key={p.id} patient={p}
                      status={localStatuses[p.id] || p.status || ""}
                      onStatusChange={(s) => handleStatusChange(p.id, s)}
                    />
                  ))}
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

function ViewerPatientRow({ patient, status, onStatusChange }) {
  const male = isMale(patient.gender);
  const kw = isKuwaiti(patient.nationality);
  const locColor = LOCATION_COLORS[patient.location] || {};

  return (
    <div style={{
      background: "var(--surface)", border: "1px solid var(--border)",
      borderRadius: 12, padding: "14px 16px",
      borderLeft: `3px solid ${patient.isUnitWork ? "#f59e0b" : (male ? "#3b82f6" : "#ec4899")}`,
    }}>
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 8, marginBottom: 8 }}>
        <div>
          <div style={{ fontWeight: 600, fontSize: "0.9rem", marginBottom: 3 }}>
            {patient.isUnitWork ? "🔧 " : ""}{patient.name}
          </div>
          <div style={{ display: "flex", gap: 5, flexWrap: "wrap" }}>
            {patient.bed && <span className="tag bed">Bed {patient.bed}</span>}
            {patient.age && <span className="tag">{patient.age}y</span>}
            {patient.gender && <span className="tag" style={{ color: male ? "#93c5fd" : "#f9a8d4" }}>{patient.gender}</span>}
            {patient.nationality && <span className={`tag ${kw ? "kw" : "non-kw"}`}>{patient.nationality}</span>}
            {patient.diagnosis && <span className="tag diag" title={patient.diagnosis}>{patient.diagnosis}</span>}
            {patient.isUnitWork && <span className="tag" style={{ background: "rgba(245,158,11,0.1)", color: "#f59e0b" }}>Unit Work</span>}
          </div>
        </div>
      </div>

      {/* Status picker */}
      <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginTop: 8 }}>
        {STATUS_OPTIONS.map((opt) => (
          <button
            key={opt.value}
            onClick={() => onStatusChange(status === opt.value ? "" : opt.value)}
            style={{
              padding: "5px 12px", borderRadius: 20, fontSize: "0.75rem", fontWeight: 500,
              cursor: "pointer", transition: "all 0.15s", border: "1px solid",
              background: status === opt.value ? opt.color : "transparent",
              borderColor: status === opt.value ? opt.color : "var(--border)",
              color: status === opt.value ? "#000" : "var(--muted)",
            }}
          >
            {opt.icon} {opt.label}
          </button>
        ))}
      </div>
    </div>
  );
}
