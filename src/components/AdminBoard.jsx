import { useState, useRef, useCallback } from "react";
import PatientCard from "./PatientCard";
import DoctorColumn from "./DoctorColumn";
import StatCard from "./StatCard";
import ReportsTab from "./ReportsTab";
import AdminsTab from "./AdminsTab";
import ShareModal from "./ShareModal";
import { useToast } from "../context/ToastContext";
import { computeStats, getUnassigned, fmtDate } from "../utils/helpers";

export default function AdminBoard({
  state, admins, currentAdmin,
  onAddDoctor, onRemoveDoctor, onImportPatients,
  onAssignPatient, onSaveAndPublish, onClearSessions,
  onSaveAdmins, onLogout,
}) {
  const [activeTab, setActiveTab] = useState("board");
  const [showShare, setShowShare] = useState(false);
  const [docName, setDocName] = useState("");
  const [dragging, setDragging] = useState(null);
  const fileInputRef = useRef(null);
  const showToast = useToast();

  const { doctors, patients, assignments, sessions, lastSaved } = state;
  const unassigned = getUnassigned(patients, assignments);
  const stats = computeStats(patients);

  const handleAddDoctor = () => {
    const name = docName.trim();
    if (!name) return;
    onAddDoctor(name);
    setDocName("");
    showToast(`${name} added as physician`);
  };

  const handleRemoveDoctor = (docId) => {
    if (!window.confirm("Remove this physician? Patients return to pool.")) return;
    onRemoveDoctor(docId);
  };

  const handleFile = useCallback(async (file) => {
    try {
      const count = await onImportPatients(file);
      showToast(`${count} patients imported successfully!`);
    } catch {
      showToast("Error reading file. Check columns: Name, Age, Gender, Nationality, ID, Diagnosis, Bed", "error");
    }
  }, [onImportPatients, showToast]);

  const handleDragStart = useCallback((patientId, source) => {
    setDragging({ id: patientId, source });
  }, []);

  const handleDrop = useCallback((toDocId) => {
    if (!dragging) return;
    onAssignPatient(dragging.id, dragging.source, toDocId);
    setDragging(null);
  }, [dragging, onAssignPatient]);

  const handleDropToPool = (e) => {
    e.preventDefault();
    if (!dragging || dragging.source === "pool") return;
    onAssignPatient(dragging.id, dragging.source, "pool");
    setDragging(null);
  };

  const handleSave = () => {
    onSaveAndPublish();
    showToast("Saved & published! Physicians can view updated list.");
  };

  const handleLogout = () => {
    if (window.confirm("Log out of the dashboard?")) onLogout();
  };

  return (
    <div>
      {/* ── HEADER ── */}
      <div className="header">
        <div className="logo">
          <div className="logo-icon">🏥</div>
          <div>
            <div className="logo-text">ICU Command Center</div>
            <div className="logo-sub">Patient Distribution Dashboard</div>
          </div>
        </div>
        <div className="header-right">
          <div className="badge-live">Live</div>
          {/* Logged-in admin badge */}
          <div style={{
            display: "flex", alignItems: "center", gap: 7,
            background: "rgba(124,58,237,0.12)",
            border: "1px solid rgba(124,58,237,0.25)",
            borderRadius: 20, padding: "5px 12px",
            fontSize: "0.78rem", color: "#a78bfa",
          }}>
            {currentAdmin?.isSuper ? "👑" : "🔑"} {currentAdmin?.label}
          </div>
          <button className="btn btn-ghost btn-sm" onClick={() => setShowShare(true)}>📱 Viewer Link</button>
          <button className="btn btn-success btn-sm" onClick={handleSave}>💾 Save &amp; Publish</button>
          <button className="btn btn-ghost btn-sm" onClick={handleLogout} title="Log out">🚪</button>
        </div>
      </div>

      <div className="app">
        {/* ── SIDEBAR ── */}
        <div className="sidebar">
          {/* Upload */}
          <div>
            <div className="section-title">Upload Patients (Excel)</div>
            <div
              className="upload-zone"
              onClick={() => fileInputRef.current?.click()}
              onDragOver={(e) => { e.preventDefault(); e.currentTarget.classList.add("drag-over"); }}
              onDragLeave={(e) => e.currentTarget.classList.remove("drag-over")}
              onDrop={(e) => {
                e.preventDefault();
                e.currentTarget.classList.remove("drag-over");
                const f = e.dataTransfer?.files?.[0];
                if (f) handleFile(f);
              }}
            >
              <div className="upload-icon">📊</div>
              <div className="upload-text">Drop file or <span>browse</span></div>
              <div style={{ fontSize: "0.7rem", color: "var(--muted)", marginTop: 4 }}>.xlsx · .xls · .csv</div>
            </div>
            <input
              ref={fileInputRef}
              type="file"
              accept=".xlsx,.xls,.csv"
              style={{ display: "none" }}
              onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFile(f); e.target.value = ""; }}
            />
          </div>

          {/* Add Physician */}
          <div>
            <div className="section-title">Add Physician</div>
            <div className="add-doc-form">
              <input
                className="input-field"
                placeholder="Dr. Full Name"
                value={docName}
                onChange={(e) => setDocName(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleAddDoctor()}
              />
              <button className="btn btn-primary" style={{ width: "100%" }} onClick={handleAddDoctor}>
                + Add Physician
              </button>
            </div>
          </div>

          {/* Pool */}
          <div style={{ flex: 1 }}>
            <div className="section-title">Unassigned Pool ({unassigned.length})</div>
            <div
              className="patient-pool"
              onDragOver={(e) => e.preventDefault()}
              onDrop={handleDropToPool}
            >
              {unassigned.length === 0 ? (
                <div style={{ textAlign: "center", padding: "20px 0", color: "var(--muted)", fontSize: "0.78rem" }}>
                  {patients.length === 0 ? "Upload an Excel file to begin" : "✓ All patients assigned"}
                </div>
              ) : (
                unassigned.map((p) => (
                  <PatientCard key={p.id} patient={p} source="pool" onDragStart={handleDragStart} />
                ))
              )}
            </div>
          </div>

          <div style={{ fontSize: "0.72rem", color: "var(--muted)" }}>
            Last saved: {fmtDate(lastSaved)}
          </div>
        </div>

        {/* ── MAIN ── */}
        <div className="main">
          {/* Stats */}
          <div className="stats-grid">
            <StatCard value={stats.total} label="Total Patients" colorClass="blue" />
            <StatCard value={stats.male} label="Male" colorClass="orange" />
            <StatCard value={stats.female} label="Female" colorClass="purple" />
            <StatCard value={stats.kw} label="Kuwaiti" colorClass="green" />
            <StatCard value={stats.nonKw} label="Non-Kuwaiti" colorClass="yellow" />
            <StatCard value={unassigned.length} label="Unassigned" colorClass="red" />
          </div>

          {/* Tabs */}
          <div className="tabs">
            <div className={`tab${activeTab === "board" ? " active" : ""}`} onClick={() => setActiveTab("board")}>
              📋 Assignment Board
            </div>
            <div className={`tab${activeTab === "reports" ? " active" : ""}`} onClick={() => setActiveTab("reports")}>
              📊 Reports
            </div>
            <div className={`tab${activeTab === "admins" ? " active" : ""}`} onClick={() => setActiveTab("admins")}>
              🔐 Admin Management
            </div>
          </div>

          {/* Board */}
          {activeTab === "board" && (
            doctors.length === 0 ? (
              <div style={{ textAlign: "center", padding: "60px 20px", color: "var(--muted)" }}>
                <div style={{ fontSize: "3rem", marginBottom: 12 }}>👨‍⚕️</div>
                <div style={{ fontFamily: "Syne, sans-serif", fontSize: "1.1rem", marginBottom: 8 }}>
                  No physicians added
                </div>
                <div style={{ fontSize: "0.85rem" }}>Add a physician using the panel on the left</div>
              </div>
            ) : (
              <div className="doctors-grid">
                {doctors.map((doc, i) => (
                  <DoctorColumn
                    key={doc.id}
                    doctor={doc}
                    index={i}
                    patients={patients}
                    assignments={assignments}
                    onDrop={handleDrop}
                    onDragStart={handleDragStart}
                    onRemove={handleRemoveDoctor}
                  />
                ))}
              </div>
            )
          )}

          {/* Reports */}
          {activeTab === "reports" && (
            <ReportsTab sessions={sessions} onClearSessions={onClearSessions} />
          )}

          {/* Admin Management */}
          {activeTab === "admins" && (
            <AdminsTab
              admins={admins}
              currentAdmin={currentAdmin}
              onSaveAdmins={onSaveAdmins}
            />
          )}
        </div>
      </div>

      {showShare && <ShareModal onClose={() => setShowShare(false)} />}
    </div>
  );
}
