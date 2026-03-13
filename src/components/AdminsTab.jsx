import { useState } from "react";
import { uid } from "../utils/helpers";
import { useToast } from "../context/ToastContext";

export default function AdminsTab({ admins, currentAdmin, onSaveAdmins }) {
  const showToast = useToast();
  const [newLabel, setNewLabel] = useState("");
  const [newCode, setNewCode] = useState("");
  const [showCodes, setShowCodes] = useState({});
  const [editingId, setEditingId] = useState(null);
  const [editCode, setEditCode] = useState("");

  const toggleShow = (id) => setShowCodes((prev) => ({ ...prev, [id]: !prev[id] }));

  const handleAdd = () => {
    const label = newLabel.trim();
    const code = newCode.trim();
    if (!label) { showToast("Please enter a name/label for this admin", "error"); return; }
    if (code.length < 4) { showToast("Passcode must be at least 4 characters", "error"); return; }
    if (admins.find((a) => a.code === code)) { showToast("That passcode is already in use", "error"); return; }
    const updated = [...admins, { id: uid(), label, code, isSuper: false }];
    onSaveAdmins(updated);
    setNewLabel("");
    setNewCode("");
    showToast(`Admin "${label}" added successfully`);
  };

  const handleRemove = (id) => {
    const target = admins.find((a) => a.id === id);
    if (target?.isSuper) { showToast("Cannot remove the superadmin account", "error"); return; }
    if (!window.confirm(`Remove admin "${target?.label}"?`)) return;
    onSaveAdmins(admins.filter((a) => a.id !== id));
    showToast("Admin removed");
  };

  const handleEditCode = (id) => {
    const code = editCode.trim();
    if (code.length < 4) { showToast("Passcode must be at least 4 characters", "error"); return; }
    if (admins.find((a) => a.code === code && a.id !== id)) { showToast("That passcode is already in use", "error"); return; }
    onSaveAdmins(admins.map((a) => a.id === id ? { ...a, code } : a));
    setEditingId(null);
    setEditCode("");
    showToast("Passcode updated");
  };

  return (
    <div style={{ maxWidth: 680 }}>
      {/* Info banner */}
      <div style={{
        background: "rgba(0,212,255,0.06)",
        border: "1px solid rgba(0,212,255,0.15)",
        borderRadius: 12,
        padding: "14px 18px",
        marginBottom: 28,
        fontSize: "0.83rem",
        color: "var(--muted)",
        lineHeight: 1.6,
      }}>
        🔐 <strong style={{ color: "var(--accent)" }}>Passcode-only access.</strong> Each admin has a unique code.
        Anyone with a code can log into the dashboard. Codes can be letters, numbers, or symbols — minimum 4 characters.
        {currentAdmin && (
          <span style={{ marginLeft: 8 }}>
            You are logged in as <strong style={{ color: "var(--text)" }}>{currentAdmin.label}</strong>.
          </span>
        )}
      </div>

      {/* Current admins list */}
      <div className="section-title" style={{ marginBottom: 14 }}>Current Admins ({admins.length})</div>
      <div style={{ display: "flex", flexDirection: "column", gap: 10, marginBottom: 32 }}>
        {admins.map((admin) => (
          <div key={admin.id} style={{
            background: "var(--surface)",
            border: `1px solid ${admin.id === currentAdmin?.id ? "rgba(0,212,255,0.3)" : "var(--border)"}`,
            borderRadius: 12,
            padding: "14px 18px",
            display: "flex",
            alignItems: "center",
            gap: 14,
            flexWrap: "wrap",
          }}>
            {/* Avatar */}
            <div style={{
              width: 38, height: 38,
              borderRadius: "50%",
              background: admin.isSuper
                ? "linear-gradient(135deg, var(--accent), var(--accent3))"
                : "linear-gradient(135deg, var(--accent3), #ec4899)",
              display: "flex", alignItems: "center", justifyContent: "center",
              fontSize: "1rem", flexShrink: 0,
            }}>
              {admin.isSuper ? "👑" : "🔑"}
            </div>

            {/* Info */}
            <div style={{ flex: 1, minWidth: 120 }}>
              <div style={{ fontFamily: "Syne, sans-serif", fontWeight: 700, fontSize: "0.9rem" }}>
                {admin.label}
                {admin.isSuper && (
                  <span style={{
                    marginLeft: 8, fontSize: "0.65rem", padding: "2px 8px",
                    background: "rgba(0,212,255,0.1)", color: "var(--accent)",
                    borderRadius: 20, verticalAlign: "middle",
                  }}>SUPERADMIN</span>
                )}
                {admin.id === currentAdmin?.id && (
                  <span style={{
                    marginLeft: 6, fontSize: "0.65rem", padding: "2px 8px",
                    background: "rgba(16,185,129,0.1)", color: "var(--success)",
                    borderRadius: 20, verticalAlign: "middle",
                  }}>YOU</span>
                )}
              </div>
              {/* Passcode display / edit */}
              {editingId === admin.id ? (
                <div style={{ display: "flex", gap: 6, marginTop: 6, alignItems: "center", flexWrap: "wrap" }}>
                  <input
                    className="input-field"
                    style={{ maxWidth: 160, padding: "5px 10px", fontSize: "0.82rem" }}
                    value={editCode}
                    onChange={(e) => setEditCode(e.target.value)}
                    placeholder="New passcode"
                    autoFocus
                    onKeyDown={(e) => e.key === "Enter" && handleEditCode(admin.id)}
                  />
                  <button className="btn btn-primary btn-sm" onClick={() => handleEditCode(admin.id)}>Save</button>
                  <button className="btn btn-ghost btn-sm" onClick={() => setEditingId(null)}>Cancel</button>
                </div>
              ) : (
                <div style={{ fontSize: "0.8rem", color: "var(--muted)", marginTop: 3, display: "flex", alignItems: "center", gap: 8 }}>
                  <span style={{ fontFamily: "monospace", letterSpacing: "0.1em" }}>
                    {showCodes[admin.id] ? admin.code : "•".repeat(admin.code.length)}
                  </span>
                  <button
                    onClick={() => toggleShow(admin.id)}
                    style={{ background: "none", border: "none", color: "var(--muted)", cursor: "pointer", fontSize: "0.8rem", padding: 0 }}
                  >
                    {showCodes[admin.id] ? "🙈" : "👁️"}
                  </button>
                </div>
              )}
            </div>

            {/* Actions */}
            {editingId !== admin.id && (
              <div style={{ display: "flex", gap: 6 }}>
                <button
                  className="btn btn-ghost btn-sm"
                  onClick={() => { setEditingId(admin.id); setEditCode(""); }}
                >
                  ✏️ Change Code
                </button>
                {!admin.isSuper && (
                  <button className="btn btn-danger btn-sm" onClick={() => handleRemove(admin.id)}>
                    ✕
                  </button>
                )}
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Add new admin */}
      <div className="section-title" style={{ marginBottom: 14 }}>Add New Admin</div>
      <div style={{
        background: "var(--surface)",
        border: "1px solid var(--border)",
        borderRadius: 14,
        padding: "20px",
        display: "flex",
        flexDirection: "column",
        gap: 12,
      }}>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
          <div>
            <label style={{ fontSize: "0.72rem", color: "var(--muted)", textTransform: "uppercase", letterSpacing: "0.08em", display: "block", marginBottom: 6 }}>
              Name / Label
            </label>
            <input
              className="input-field"
              placeholder="e.g. Dr. Al-Rashidi"
              value={newLabel}
              onChange={(e) => setNewLabel(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleAdd()}
            />
          </div>
          <div>
            <label style={{ fontSize: "0.72rem", color: "var(--muted)", textTransform: "uppercase", letterSpacing: "0.08em", display: "block", marginBottom: 6 }}>
              Passcode (min 4 chars)
            </label>
            <input
              className="input-field"
              placeholder="e.g. MED2025 or 8844"
              value={newCode}
              onChange={(e) => setNewCode(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleAdd()}
            />
          </div>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <button className="btn btn-primary" onClick={handleAdd}>
            + Add Admin
          </button>
          <span style={{ fontSize: "0.78rem", color: "var(--muted)" }}>
            Passcode can be letters, numbers, or symbols
          </span>
        </div>
      </div>

      {/* Security note */}
      <div style={{
        marginTop: 20,
        padding: "12px 16px",
        borderRadius: 10,
        background: "rgba(239,68,68,0.06)",
        border: "1px solid rgba(239,68,68,0.15)",
        fontSize: "0.78rem",
        color: "var(--muted)",
      }}>
        ⚠️ <strong style={{ color: "var(--danger)" }}>Security reminder:</strong> Share passcodes privately.
        Anyone with a valid code gets full admin access. Remove codes promptly when access is no longer needed.
      </div>
    </div>
  );
}
