import { isMale, isKuwaiti } from "../utils/helpers";

export default function PatientCard({ patient, source, onDragStart }) {
  const male = isMale(patient.gender);
  const kw = isKuwaiti(patient.nationality);

  return (
    <div
      className={`patient-card ${male ? "male" : "female"}`}
      draggable
      data-id={patient.id}
      data-source={source}
      onDragStart={(e) => {
        e.dataTransfer.effectAllowed = "move";
        onDragStart(patient.id, source);
      }}
      title={patient.diagnosis || ""}
    >
      <div className="patient-name">{patient.name}</div>
      <div className="patient-meta">
        {patient.bed && <span className="tag bed">Bed {patient.bed}</span>}
        {patient.age && <span className="tag">{patient.age}y</span>}
        {patient.gender && (
          <span className="tag" style={{ color: male ? "#93c5fd" : "#f9a8d4" }}>
            {patient.gender}
          </span>
        )}
        {patient.nationality && (
          <span className={`tag ${kw ? "kw" : "non-kw"}`}>{patient.nationality}</span>
        )}
        {patient.diagnosis && (
          <span className="tag diag" title={patient.diagnosis}>
            {patient.diagnosis}
          </span>
        )}
      </div>
    </div>
  );
}
