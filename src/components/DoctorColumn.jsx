import { useState } from "react";
import PatientCard from "./PatientCard";
import { getInitials, DOC_COLORS, getDoctorPatients, groupByLocation, LOCATION_COLORS } from "../utils/helpers";

export default function DoctorColumn({ doctor, index, patients, assignments, onDrop, onDragStart, onRemove }) {
  const [isOver, setIsOver] = useState(false);
  const [showCode, setShowCode] = useState(false);
  const pts = getDoctorPatients(doctor.id, patients, assignments);
  const realPts = pts.filter((p) => !p.isUnitWork);
  const unitPts = pts.filter((p) => p.isUnitWork);
  const c1 = DOC_COLORS[index % DOC_COLORS.length];
  const c2 = DOC_COLORS[(index + 2) % DOC_COLORS.length];
  const locationGroups = groupByLocation(realPts);

  return (
    <div
      className={`doctor-col${isOver ? " drop-target" : ""}`}
      onDragOver={(e) => { e.preventDefault(); setIsOver(true); }}
      onDragLeave={() => setIsOver(false)}
      onDrop={(e) => { e.preventDefault(); setIsOver(false); onDrop(doctor.id); }}
    >
      <div className="doctor-header">
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div className="doctor-avatar" style={{ background: `linear-gradient(135deg, ${c1}, ${c2})` }}>
            {getInitials(doctor.name)}
          </div>
          <div>
            <div className="doctor-name">{doctor.name}</div>
            <div className="doctor-count">{realPts.length} patient{realPts.length !== 1 ? "s" : ""}
              {unitPts.length > 0 && <span style={{ color: "#f59e0b" }}> · {unitPts.length} unit work</span>}
            </div>
            {/* Viewer code */}
            {doctor.viewerCode && (
              <div style={{ display: "flex", alignItems: "center", gap: 5, marginTop: 3 }}>
                <span style={{ fontSize: "0.65rem", color: "var(--muted)", fontFamily: "monospace" }}>
                  {showCode ? doctor.viewerCode : "••••••"}
                </span>
                <button onClick={() => setShowCode(!showCode)}
                  style={{ background: "none", border: "none", color: "var(--muted)", cursor: "pointer", fontSize: "0.7rem", padding: 0 }}>
                  {showCode ? "🙈" : "👁️"}
                </button>
              </div>
            )}
          </div>
        </div>
        <button className="btn btn-danger btn-sm" onClick={() => onRemove(doctor.id)}>✕</button>
      </div>

      <div className="doctor-drop-zone">
        {pts.length === 0 ? (
          <div className="drop-hint">Drop patients here</div>
        ) : (
          <>
            {/* Patients grouped by location */}
            {Object.entries(locationGroups).map(([loc, locPts]) => {
              const lc = LOCATION_COLORS[loc] || {};
              return (
                <div key={loc} style={{ marginBottom: 8 }}>
                  <div style={{
                    fontSize: "0.65rem", fontWeight: 700, padding: "3px 8px", borderRadius: 6, marginBottom: 5,
                    background: lc.bg || "rgba(255,255,255,0.04)",
                    color: lc.text || "var(--muted)",
                    border: `1px solid ${lc.border || "var(--border)"}`,
                    display: "inline-block",
                  }}>📍 {loc}</div>
                  {locPts.map((p) => <PatientCard key={p.id} patient={p} source={doctor.id} onDragStart={onDragStart} />)}
                </div>
              );
            })}
            {/* Unit work */}
            {unitPts.length > 0 && (
              <div style={{ marginTop: 8 }}>
                <div style={{
                  fontSize: "0.65rem", fontWeight: 700, padding: "3px 8px", borderRadius: 6, marginBottom: 5,
                  background: "rgba(245,158,11,0.08)", color: "#f59e0b",
                  border: "1px solid rgba(245,158,11,0.2)", display: "inline-block",
                }}>🔧 Unit Work</div>
                {unitPts.map((p) => <PatientCard key={p.id} patient={p} source={doctor.id} onDragStart={onDragStart} />)}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
