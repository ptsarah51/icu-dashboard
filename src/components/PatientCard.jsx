import { isMale, isKuwaiti, STATUS_OPTIONS, LOCATION_COLORS } from "../utils/helpers";

export default function PatientCard({ patient, source, onDragStart, compact = false }) {
  const male = isMale(patient.gender);
  const kw = isKuwaiti(patient.nationality);
  const locColor = LOCATION_COLORS[patient.location] || {};
  const statusObj = STATUS_OPTIONS.find((s) => s.value === patient.status);

  if (patient.isUnitWork) {
    return (
      <div
        className="patient-card"
        draggable
        data-id={patient.id}
        data-source={source}
        onDragStart={(e) => { e.dataTransfer.effectAllowed = "move"; onDragStart(patient.id, source); }}
        style={{ borderLeft: "3px solid #f59e0b" }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <span style={{ fontSize: "0.75rem" }}>🔧</span>
          <div className="patient-name" style={{ color: "#f59e0b" }}>{patient.name}</div>
        </div>
        <div className="patient-meta">
          <span className="tag" style={{ background: "rgba(245,158,11,0.1)", color: "#f59e0b" }}>Unit Work</span>
          {statusObj && <span className="tag" style={{ color: statusObj.color }}>{statusObj.icon} {statusObj.label}</span>}
        </div>
      </div>
    );
  }

  return (
    <div
      className={`patient-card ${male ? "male" : "female"}`}
      draggable
      data-id={patient.id}
      data-source={source}
      onDragStart={(e) => { e.dataTransfer.effectAllowed = "move"; onDragStart(patient.id, source); }}
      title={patient.diagnosis || ""}
    >
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 4 }}>
        <div className="patient-name">{patient.name}</div>
        {patient.location && (
          <span style={{
            fontSize: "0.6rem", padding: "1px 6px", borderRadius: 20, whiteSpace: "nowrap", flexShrink: 0,
            background: locColor.bg || "rgba(255,255,255,0.07)",
            border: `1px solid ${locColor.border || "var(--border)"}`,
            color: locColor.text || "var(--muted)",
          }}>{patient.location}</span>
        )}
      </div>
      <div className="patient-meta">
        {patient.bed && <span className="tag bed">Bed {patient.bed}</span>}
        {patient.age && <span className="tag">{patient.age}y</span>}
        {patient.gender && <span className="tag" style={{ color: male ? "#93c5fd" : "#f9a8d4" }}>{patient.gender}</span>}
        {patient.nationality && <span className={`tag ${kw ? "kw" : "non-kw"}`}>{patient.nationality}</span>}
        {patient.diagnosis && <span className="tag diag" title={patient.diagnosis}>{patient.diagnosis}</span>}
        {statusObj && <span className="tag" style={{ color: statusObj.color }}>{statusObj.icon} {statusObj.label}</span>}
      </div>
    </div>
  );
}
