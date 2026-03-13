import { useState } from "react";
import PatientCard from "./PatientCard";
import { getInitials, DOC_COLORS, getDoctorPatients } from "../utils/helpers";

export default function DoctorColumn({ doctor, index, patients, assignments, onDrop, onDragStart, onRemove }) {
  const [isOver, setIsOver] = useState(false);
  const pts = getDoctorPatients(doctor.id, patients, assignments);
  const c1 = DOC_COLORS[index % DOC_COLORS.length];
  const c2 = DOC_COLORS[(index + 2) % DOC_COLORS.length];

  return (
    <div
      className={`doctor-col${isOver ? " drop-target" : ""}`}
      onDragOver={(e) => { e.preventDefault(); setIsOver(true); }}
      onDragLeave={() => setIsOver(false)}
      onDrop={(e) => { e.preventDefault(); setIsOver(false); onDrop(doctor.id); }}
    >
      <div className="doctor-header">
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div
            className="doctor-avatar"
            style={{ background: `linear-gradient(135deg, ${c1}, ${c2})` }}
          >
            {getInitials(doctor.name)}
          </div>
          <div>
            <div className="doctor-name">{doctor.name}</div>
            <div className="doctor-count">{pts.length} patient{pts.length !== 1 ? "s" : ""}</div>
          </div>
        </div>
        <button className="btn btn-danger btn-sm" onClick={() => onRemove(doctor.id)}>✕</button>
      </div>

      <div className="doctor-drop-zone">
        {pts.length === 0 ? (
          <div className="drop-hint">Drop patients here</div>
        ) : (
          pts.map((p) => (
            <PatientCard key={p.id} patient={p} source={doctor.id} onDragStart={onDragStart} />
          ))
        )}
      </div>
    </div>
  );
}
