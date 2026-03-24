import { useState, useRef, useCallback } from "react";
import PatientCard from "./PatientCard";
import DoctorColumn from "./DoctorColumn";
import StatCard from "./StatCard";
import ReportsTab from "./ReportsTab";
import AdminsTab from "./AdminsTab";
import ShareModal from "./ShareModal";
import { useToast } from "../context/ToastContext";
import { computeStats, getUnassigned, fmtDate, LOCATIONS, generateViewerCode } from "../utils/helpers";

const LOCATION_BADGE_COLORS = {
  DICU:    { bg: "rgba(0,212,255,0.1)",   text: "#00d4ff" },
  CCU:     { bg: "rgba(239,68,68,0.1)",   text: "#ef4444" },
  "SD W1": { bg: "rgba(124,58,237,0.1)",  text: "#a78bfa" },
  "SD W2": { bg: "rgba(16,185,129,0.1)",  text: "#10b981" },
};

export default function AdminBoard({
  state, admins, currentAdmin,
  onAddDoctor, onRemoveDoctor, onImportPatients,
  onAssignPatient, onSaveAndPublish, onClearSessions,
  onSaveAdmins, onLogout, onResetDashboard, onArchivePool,
}) {
  const [activeTab, setActiveTab]         = useState("board");
  const [showShare, setShowShare]         = useState(false);
  const [docName, setDocName]             = useState("");
  const [dragging, setDragging]           = useState(null);
  const [selectedLocation, setSelectedLocation] = useState(LOCATIONS[0]);
  const [showPublishModal, setShowPublishModal]  = useState(false);
  const [showResetModal, setShowResetModal]      = useState(false);
  const [unitWorkText, setUnitWorkText]   = useState("");
  const [unitWorkDoc, setUnitWorkDoc]     = useState("");
  const [poolLocation, setPoolLocation]  = useState("All");

  const fileInputRef = useRef(null);
  const showToast    = useToast();

  const { doctors, patients, assignments, sessions, lastSaved } = state;
  const allUnassigned = getUnassigned(patients, assignments);
  const poolPatients  = poolLocation === "All"
    ? allUnassigned
    : allUnassigned.filter((p) => p.location === poolLocation);
  const stats = computeStats(patients);

  const handleAddDoctor = () => {
    const name = docName.trim();
    if (!name) return;
    const vc = generateViewerCode();
    onAddDoctor(name, vc);
    setDocName("");
    showToast(`${name} added · Viewer code: ${vc}`);
  };

  const handleRemoveDoctor = (docId) => {
    if (!window.confirm("Remove this physician? Patients return to pool.")) return;
    onRemoveDoctor(docId);
  };

  const handleFile = useCallback(async (file) => {
    try {
      const count = await onImportPatients(file, selectedLocation);
      showToast(`${count} patients imported to ${selectedLocation}`);
    } catch (err) {
      // Only show error if it's a genuine failure, not a React state update quirk
      if (err && err.message) {
        showToast(`Could not read file: ${err.message}`, "error");
      }
    }
  }, [onImportPatients, selectedLocation, showToast]);

  const handleDragStart = useCallback((patientId, source) => setDragging({ id: patientId, source }), []);

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

  const handleAddUnitWork = () => {
    const name = unitWorkText.trim();
    if (!name || !unitWorkDoc) { showToast("Enter a task name and select a doctor", "error"); return; }
    onAssignPatient(null, null, null, { name, doctorId: unitWorkDoc });
    setUnitWorkText("");
    showToast("Unit work task added");
  };

  const handleArchivePool = () => {
    if (!window.confirm(`Archive and clear all ${allUnassigned.length} unassigned patients from the pool? They will be removed from the board but their data is saved in session history.`)) return;
    onArchivePool();
    showToast("Pool cleared for new day");
  };

  const handleLogout = () => { if (window.confirm("Log out?")) onLogout(); };

  return (
    <div>
      {/* ── HEADER ── */}
      <div className="header">
        <div className="logo">
          <div className="logo-icon">🏥</div>
          <div>
            <div className="logo-text">SDCC HS Command Center</div>
            <div className="logo-sub">Patient Distribution Dashboard</div>
          </div>
        </div>
        <div className="header-right">
          <div className="badge-live">Live</div>
          <div style={{
            display:"flex", alignItems:"center", gap:7,
            background:"rgba(124,58,237,0.12)", border:"1px solid rgba(124,58,237,0.25)",
            borderRadius:20, padding:"5px 12px", fontSize:"0.78rem", color:"#a78bfa",
          }}>
            {currentAdmin?.isSuper ? "👑" : "🔑"} {currentAdmin?.label}
          </div>
          <button className="btn btn-ghost btn-sm" onClick={() => setShowShare(true)}>📱 Viewer Link</button>
          <button className="btn btn-success btn-sm" onClick={() => setShowPublishModal(true)}>💾 Save &amp; Publish</button>
          <button className="btn btn-danger btn-sm" onClick={() => setShowResetModal(true)} title="Reset entire dashboard">🔄 Reset</button>
          <button className="btn btn-ghost btn-sm" onClick={handleLogout} title="Log out">🚪</button>
        </div>
      </div>

      <div className="app">
        {/* ── SIDEBAR ── */}
        <div className="sidebar">

          {/* Location Selector */}
          <div>
            <div className="section-title">Upload Location</div>
            <div style={{ display:"flex", flexDirection:"column", gap:6 }}>
              {LOCATIONS.map((loc) => {
                const lc = LOCATION_BADGE_COLORS[loc] || {};
                const active = selectedLocation === loc;
                return (
                  <button key={loc} onClick={() => setSelectedLocation(loc)} style={{
                    padding:"8px 14px", borderRadius:8, border:"1px solid",
                    cursor:"pointer", textAlign:"left", fontSize:"0.85rem", fontWeight:500,
                    background: active ? lc.bg : "transparent",
                    borderColor: active ? lc.text : "var(--border)",
                    color: active ? lc.text : "var(--muted)", transition:"all 0.15s",
                  }}>{loc}</button>
                );
              })}
            </div>
          </div>

          {/* Upload */}
          <div>
            <div className="section-title">Upload Excel → {selectedLocation}</div>
            <div className="upload-zone"
              onClick={() => fileInputRef.current?.click()}
              onDragOver={(e) => { e.preventDefault(); e.currentTarget.classList.add("drag-over"); }}
              onDragLeave={(e) => e.currentTarget.classList.remove("drag-over")}
              onDrop={(e) => { e.preventDefault(); e.currentTarget.classList.remove("drag-over"); const f=e.dataTransfer?.files?.[0]; if(f) handleFile(f); }}
            >
              <div className="upload-icon">📊</div>
              <div className="upload-text">Drop file or <span>browse</span></div>
              <div style={{ fontSize:"0.7rem", color:"var(--muted)", marginTop:4 }}>.xlsx · .xls · .csv</div>
            </div>
            <input ref={fileInputRef} type="file" accept=".xlsx,.xls,.csv" style={{ display:"none" }}
              onChange={(e) => { const f=e.target.files?.[0]; if(f) handleFile(f); e.target.value=""; }} />
          </div>

          {/* Add Physician */}
          <div>
            <div className="section-title">Add Physician</div>
            <div className="add-doc-form">
              <input className="input-field" placeholder="Dr. Full Name" value={docName}
                onChange={(e) => setDocName(e.target.value)}
                onKeyDown={(e) => e.key==="Enter" && handleAddDoctor()} />
              <button className="btn btn-primary" style={{ width:"100%" }} onClick={handleAddDoctor}>+ Add Physician</button>
            </div>
          </div>

          {/* Unit Work */}
          <div>
            <div className="section-title">Add Unit Work</div>
            <div className="add-doc-form">
              <input className="input-field" placeholder="Task description" value={unitWorkText}
                onChange={(e) => setUnitWorkText(e.target.value)} />
              <select className="input-field" value={unitWorkDoc} onChange={(e) => setUnitWorkDoc(e.target.value)}>
                <option value="">Assign to doctor…</option>
                {doctors.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
              </select>
              <button className="btn btn-ghost" style={{ width:"100%" }} onClick={handleAddUnitWork}>+ Add Unit Work</button>
            </div>
          </div>

          {/* Pool */}
          <div style={{ flex:1, minHeight:0 }}>
            <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:8, flexWrap:"wrap", gap:4 }}>
              <div className="section-title" style={{ marginBottom:0 }}>Pool ({allUnassigned.length})</div>
              <div style={{ display:"flex", gap:6, alignItems:"center" }}>
                <select
                  style={{ fontSize:"0.7rem", background:"var(--surface2)", border:"1px solid var(--border)", color:"var(--muted)", borderRadius:6, padding:"3px 6px" }}
                  value={poolLocation} onChange={(e) => setPoolLocation(e.target.value)}
                >
                  <option value="All">All</option>
                  {LOCATIONS.map((l) => <option key={l} value={l}>{l}</option>)}
                </select>
                {allUnassigned.length > 0 && (
                  <button
                    onClick={handleArchivePool}
                    title="Clear pool for new day"
                    style={{ fontSize:"0.68rem", padding:"3px 8px", borderRadius:6, border:"1px solid var(--danger)", background:"rgba(239,68,68,0.1)", color:"var(--danger)", cursor:"pointer" }}
                  >🗑 Clear</button>
                )}
              </div>
            </div>
            {/* Fixed-height scrollable pool with proper card sizing */}
            <div className="patient-pool"
              style={{ maxHeight:300, overflowY:"auto" }}
              onDragOver={(e) => e.preventDefault()}
              onDrop={handleDropToPool}
            >
              {poolPatients.length === 0 ? (
                <div style={{ textAlign:"center", padding:"20px 0", color:"var(--muted)", fontSize:"0.78rem" }}>
                  {patients.length === 0 ? "Upload an Excel file to begin" : "✓ All patients assigned"}
                </div>
              ) : (
                poolPatients.map((p) => (
                  <PatientCard key={p.id} patient={p} source="pool" onDragStart={handleDragStart} />
                ))
              )}
            </div>
          </div>

          <div style={{ fontSize:"0.72rem", color:"var(--muted)" }}>Last saved: {fmtDate(lastSaved)}</div>
        </div>

        {/* ── MAIN ── */}
        <div className="main">
          {/* Stats bar */}
          <div className="stats-grid">
            <StatCard value={stats.total}          label="Total Patients" colorClass="blue" />
            <StatCard value={stats.male}           label="Male"           colorClass="orange" />
            <StatCard value={stats.female}         label="Female"         colorClass="purple" />
            <StatCard value={stats.kw}             label="Kuwaiti"        colorClass="green" />
            <StatCard value={stats.nonKw}          label="Non-Kuwaiti"    colorClass="yellow" />
            <StatCard value={stats.newPts}         label="New"            colorClass="purple" />
            <StatCard value={stats.recurrentPts}   label="Recurrent"      colorClass="blue" />
            <StatCard value={allUnassigned.length} label="Unassigned"     colorClass="red" />
          </div>

          {/* Tabs */}
          <div className="tabs">
            {[["board","📋 Board"],["reports","📊 Reports"],["admins","🔐 Admins"]].map(([t,l]) => (
              <div key={t} className={`tab${activeTab===t?" active":""}`} onClick={() => setActiveTab(t)}>{l}</div>
            ))}
          </div>

          {/* Board */}
          {activeTab === "board" && (
            doctors.length === 0 ? (
              <div style={{ textAlign:"center", padding:"60px 20px", color:"var(--muted)" }}>
                <div style={{ fontSize:"3rem", marginBottom:12 }}>👨‍⚕️</div>
                <div style={{ fontFamily:"Syne,sans-serif", fontSize:"1.1rem", marginBottom:8 }}>No physicians added</div>
                <div style={{ fontSize:"0.85rem" }}>Add a physician using the panel on the left</div>
              </div>
            ) : (
              <div className="doctors-grid">
                {doctors.map((doc,i) => (
                  <DoctorColumn key={doc.id} doctor={doc} index={i}
                    patients={patients} assignments={assignments}
                    onDrop={handleDrop} onDragStart={handleDragStart} onRemove={handleRemoveDoctor} />
                ))}
              </div>
            )
          )}

          {/* Reports — pass full state for live stats */}
          {activeTab === "reports" && (
            <ReportsTab sessions={sessions} state={state} onClearSessions={onClearSessions} />
          )}

          {/* Admins */}
          {activeTab === "admins" && (
            <AdminsTab admins={admins} currentAdmin={currentAdmin} onSaveAdmins={onSaveAdmins} />
          )}
        </div>
      </div>

      {showShare && <ShareModal doctors={doctors} onClose={() => setShowShare(false)} />}

      {showPublishModal && (
        <PublishModal
          onClose={() => setShowPublishModal(false)}
          onOverwrite={() => { setShowPublishModal(false); onSaveAndPublish("overwrite"); showToast("Overwritten today's session"); }}
          onAddNew={() => { setShowPublishModal(false); onSaveAndPublish("new"); showToast("New session saved & published"); }}
        />
      )}

      {showResetModal && (
        <ResetModal
          onClose={() => setShowResetModal(false)}
          onReset={() => { setShowResetModal(false); onResetDashboard(); showToast("Dashboard reset"); }}
        />
      )}
    </div>
  );
}

function PublishModal({ onClose, onOverwrite, onAddNew }) {
  const today = new Date().toLocaleDateString("en-GB", { day:"2-digit", month:"long", year:"numeric" });
  return (
    <div className="modal-overlay open" onClick={(e) => { if(e.target===e.currentTarget) onClose(); }}>
      <div className="modal">
        <div className="modal-title">💾 Save &amp; Publish</div>
        <p style={{ color:"var(--muted)", fontSize:"0.85rem", marginBottom:20 }}>
          How would you like to save? <strong style={{ color:"var(--text)" }}>{today}</strong>
        </p>
        <div style={{ display:"flex", flexDirection:"column", gap:10, marginBottom:20 }}>
          <button className="btn btn-primary" style={{ justifyContent:"flex-start", padding:"14px 18px" }} onClick={onOverwrite}>
            <span style={{ fontSize:"1.2rem" }}>🔄</span>
            <div style={{ textAlign:"left" }}>
              <div style={{ fontWeight:600 }}>Overwrite Today</div>
              <div style={{ fontSize:"0.75rem", color:"rgba(0,0,0,0.6)", marginTop:2 }}>Replaces today's session. Stats stay accurate.</div>
            </div>
          </button>
          <button className="btn btn-ghost" style={{ justifyContent:"flex-start", padding:"14px 18px" }} onClick={onAddNew}>
            <span style={{ fontSize:"1.2rem" }}>➕</span>
            <div style={{ textAlign:"left" }}>
              <div style={{ fontWeight:600 }}>Add as New Session</div>
              <div style={{ fontSize:"0.75rem", color:"var(--muted)", marginTop:2 }}>Use for a second round or shift.</div>
            </div>
          </button>
        </div>
        <button className="btn btn-ghost btn-sm" onClick={onClose}>Cancel</button>
      </div>
    </div>
  );
}

function ResetModal({ onClose, onReset }) {
  return (
    <div className="modal-overlay open" onClick={(e) => { if(e.target===e.currentTarget) onClose(); }}>
      <div className="modal">
        <div className="modal-title">🔄 Reset Dashboard</div>
        <p style={{ color:"var(--muted)", fontSize:"0.85rem", marginBottom:8 }}>
          This will clear all patients and assignments from the board, resetting the live counters to zero.
        </p>
        <p style={{ color:"var(--success)", fontSize:"0.82rem", marginBottom:8 }}>
          ✅ Your physicians list is <strong>kept</strong> — no need to re-add them.
        </p>
        <p style={{ color:"var(--warning)", fontSize:"0.82rem", marginBottom:20 }}>
          ⚠️ Session history and reports are <strong>not</strong> affected.
        </p>
        <div style={{ display:"flex", gap:10 }}>
          <button className="btn btn-danger" style={{ flex:1, justifyContent:"center" }} onClick={onReset}>Yes, Reset Board</button>
          <button className="btn btn-ghost" style={{ flex:1, justifyContent:"center" }} onClick={onClose}>Cancel</button>
        </div>
      </div>
    </div>
  );
}
