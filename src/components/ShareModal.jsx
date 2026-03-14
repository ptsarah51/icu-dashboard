import { useToast } from "../context/ToastContext";

export default function ShareModal({ doctors, onClose }) {
  const showToast = useToast();
  const baseUrl = `${window.location.origin}${window.location.pathname}?view=viewer`;

  function copy(text) {
    if (navigator.clipboard) navigator.clipboard.writeText(text).then(() => showToast("Copied!"));
  }

  return (
    <div className="modal-overlay open" onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="modal" style={{ maxWidth: 520 }}>
        <div className="modal-title">📱 Viewer Access Codes</div>
        <p style={{ color: "var(--muted)", fontSize: "0.83rem", marginBottom: 16 }}>
          Each physician has a unique code. Share the link + their personal code privately.
          They will only see their own patient list.
        </p>

        {/* Shared link */}
        <div style={{ marginBottom: 16 }}>
          <div style={{ fontSize: "0.7rem", color: "var(--muted)", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 6 }}>Viewer URL</div>
          <div className="share-url-box" onClick={() => copy(baseUrl)}>{baseUrl}</div>
          <div style={{ fontSize: "0.72rem", color: "var(--muted)", marginTop: 5 }}>Tap to copy · Same link for everyone</div>
        </div>

        {/* Per-doctor codes */}
        <div style={{ fontSize: "0.7rem", color: "var(--muted)", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 8 }}>Physician Codes</div>
        <div style={{ display: "flex", flexDirection: "column", gap: 8, maxHeight: 260, overflowY: "auto", marginBottom: 20 }}>
          {doctors.length === 0 ? (
            <div style={{ color: "var(--muted)", fontSize: "0.82rem", padding: "10px 0" }}>No physicians added yet</div>
          ) : doctors.map((doc) => (
            <div key={doc.id} style={{
              display: "flex", alignItems: "center", justifyContent: "space-between",
              background: "var(--surface2)", border: "1px solid var(--border)",
              borderRadius: 8, padding: "10px 14px",
            }}>
              <div>
                <div style={{ fontWeight: 600, fontSize: "0.85rem" }}>{doc.name}</div>
                <div style={{ fontFamily: "monospace", color: "var(--accent)", fontSize: "0.9rem", letterSpacing: "0.1em", marginTop: 2 }}>
                  {doc.viewerCode || "—"}
                </div>
              </div>
              <button className="btn btn-ghost btn-sm" onClick={() => copy(doc.viewerCode)}>Copy</button>
            </div>
          ))}
        </div>

        <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
          <button className="btn btn-primary" onClick={() => copy(baseUrl)}>Copy URL</button>
          <button className="btn btn-ghost" onClick={onClose}>Close</button>
        </div>
      </div>
    </div>
  );
}
