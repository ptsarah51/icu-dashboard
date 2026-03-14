import { useState, useEffect, useRef } from "react";
import { getInitials, DOC_COLORS, getDoctorPatients, isKuwaiti, isMale,
         fmtDate, STATUS_OPTIONS, LOCATION_COLORS, groupByLocation } from "../utils/helpers";
import { savePatientStatuses } from "../utils/firebase";

export default function ViewerApp({ state, firebaseError }) {
  const [syncing, setSyncing] = useState(false);
  const prevLastSaved = useRef(state.lastSaved);
  const [viewerCode, setViewerCode] = useState("");
  const [loggedInDoc, setLoggedInDoc] = useState(null);
  const [codeError, setCodeError] = useState("");
  const [localStatuses, setLocalStatuses] = useState({});
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  // Track whether Firebase has delivered at least one snapshot yet.
  // Start as true if we already have cached doctors (instant load),
  // false if doctors list is empty (first visit, waiting for Firebase).
  const [firebaseReady, setFirebaseReady] = useState(() => state.doctors.length > 0);

  // State comes from App.jsx which holds a single live Firestore subscription.
  const { doctors, patients, assignments, lastSaved } = state;

  // Mark Firebase as ready the moment doctors arrive
  useEffect(() => {
    if (doctors.length > 0) setFirebaseReady(true);
  }, [doctors.length]);

  // Flash a brief "Updated" indicator when fresh data arrives from Firebase
  useEffect(() => {
    if (lastSaved && lastSaved !== prevLastSaved.current) {
      prevLastSaved.current = lastSaved;
      setSyncing(true);
      setTimeout(() => setSyncing(false), 2000);
    }
  }, [lastSaved]);

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
      setCodeError("Code not recognised. Please check the code and try again.");
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

  // ── Firebase error diagnostic screen ───────────────────────
  if (firebaseError) {
    const isRules = firebaseError === "permission-denied";
    const isMissing = firebaseError === "not-found";
    return (
      <div style={{
        minHeight: "100vh", background: "var(--bg)",
        display: "flex", alignItems: "center", justifyContent: "center", padding: 24,
      }}>
        <div style={{
          background: "var(--surface)", border: "1px solid var(--danger)",
          borderRadius: 20, padding: "36px 28px", width: "100%", maxWidth: 420,
          textAlign: "center",
        }}>
          <div style={{ fontSize: "2.5rem", marginBottom: 12 }}>⚠️</div>
          <div style={{ fontFamily: "Syne, sans-serif", fontWeight: 800, fontSize: "1.1rem", color: "var(--danger)", marginBottom: 12 }}>
            Firebase Connection Error
          </div>
          <div style={{
            background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.2)",
            borderRadius: 8, padding: "10px 14px", marginBottom: 16,
            fontFamily: "monospace", fontSize: "0.82rem", color: "var(--danger)",
          }}>
            Error code: {firebaseError}
          </div>

          {isRules && (
            <div style={{ color: "var(--muted)", fontSize: "0.83rem", lineHeight: 1.7, textAlign: "left" }}>
              <strong style={{ color: "var(--text)" }}>Your Firestore security rules have expired.</strong>
              <br />Fix it in 30 seconds:
              <ol style={{ marginTop: 8, paddingLeft: 18 }}>
                <li>Go to <strong>console.firebase.google.com</strong></li>
                <li>Open your project → <strong>Firestore Database</strong></li>
                <li>Click the <strong>Rules</strong> tab</li>
                <li>Replace everything with:</li>
              </ol>
              <div style={{
                background: "var(--surface2)", borderRadius: 6, padding: "10px 12px",
                fontFamily: "monospace", fontSize: "0.75rem", marginTop: 8,
                color: "var(--accent)", textAlign: "left",
              }}>
                {`rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /{document=**} {
      allow read, write: if true;
    }
  }
}`}
              </div>
              <div style={{ marginTop: 8 }}>5. Click <strong>Publish</strong> → then reload this page.</div>
            </div>
          )}

          {!isRules && (
            <div style={{ color: "var(--muted)", fontSize: "0.83rem", lineHeight: 1.7 }}>
              Unable to connect to the database. Please check:<br />
              <ul style={{ textAlign: "left", marginTop: 8, paddingLeft: 18 }}>
                <li>Your Firebase config in <code>firebase.js</code> is correct</li>
                <li>Firestore Database is enabled in Firebase console</li>
                <li>Your Firestore security rules allow read/write</li>
              </ul>
              <div style={{ marginTop: 12 }}>
                Reload the page to try again.
              </div>
            </div>
          )}

          <button
            className="btn btn-ghost"
            style={{ marginTop: 20, width: "100%", justifyContent: "center" }}
            onClick={() => window.location.reload()}
          >
            🔄 Reload Page
          </button>
        </div>
      </div>
    );
  }

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
          <div style={{ color: "var(--muted)", fontSize: "0.82rem", marginBottom: 24 }}>
            Enter your personal viewer code to see your patient list
          </div>

          {/* Connecting indicator — only shown on first-ever visit before cache exists */}
          {!firebaseReady ? (
            <div style={{ marginBottom: 20 }}>
              <div style={{
                display: "flex", alignItems: "center", justifyContent: "center", gap: 10,
                background: "rgba(0,212,255,0.06)", border: "1px solid rgba(0,212,255,0.15)",
                borderRadius: 10, padding: "12px 16px", marginBottom: 16,
              }}>
                <div style={{
                  width: 16, height: 16, flexShrink: 0,
                  border: "2px solid var(--border)", borderTop: "2px solid var(--accent)",
                  borderRadius: "50%", animation: "spin 0.8s linear infinite",
                }} />
                <div style={{ textAlign: "left" }}>
                  <div style={{ fontSize: "0.82rem", color: "var(--accent)", fontWeight: 600 }}>Connecting…</div>
                  <div style={{ fontSize: "0.72rem", color: "var(--muted)", marginTop: 2 }}>
                    Loading your list — this takes a few seconds on first visit
                  </div>
                </div>
              </div>
              <input
                className="input-field"
                style={{ textAlign: "center", fontSize: "1.1rem", letterSpacing: "0.15em", fontFamily: "monospace", marginBottom: 12, opacity: 0.5 }}
                placeholder="SD0000"
                value={viewerCode}
                maxLength={6}
                disabled
              />
              <button className="btn btn-primary" style={{ width: "100%", justifyContent: "center", opacity: 0.5 }} disabled>
                Waiting for connection…
              </button>
            </div>
          ) : (
            <div>
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
          )}
        </div>
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
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
