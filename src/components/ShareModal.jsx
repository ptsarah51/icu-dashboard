import { useToast } from "../context/ToastContext";

export default function ShareModal({ onClose }) {
  const showToast = useToast();
  const url = `${window.location.origin}${window.location.pathname}?view=viewer`;

  function copyLink() {
    if (navigator.clipboard) {
      navigator.clipboard.writeText(url).then(() => showToast("Link copied to clipboard!"));
    } else {
      showToast("Copy this URL: " + url);
    }
    onClose();
  }

  return (
    <div className="modal-overlay open" onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="modal">
        <div className="modal-title">📱 Physician Viewer Link</div>
        <p style={{ color: "var(--muted)", fontSize: "0.85rem", marginBottom: 16 }}>
          Share this link with your physicians. It opens a live, read-only view on any phone or
          browser — no app installation required.
        </p>
        <div className="share-url-box" onClick={copyLink}>{url}</div>
        <p style={{ fontSize: "0.75rem", color: "var(--muted)", marginTop: 8 }}>
          Tap to copy · Auto-refreshes every 20 seconds
        </p>
        <div style={{ marginTop: 20, display: "flex", gap: 10, justifyContent: "flex-end" }}>
          <button className="btn btn-primary" onClick={copyLink}>Copy Link</button>
          <button className="btn btn-ghost" onClick={onClose}>Close</button>
        </div>
      </div>
    </div>
  );
}
