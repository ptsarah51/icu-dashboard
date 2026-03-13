import { createContext, useContext, useState, useCallback, useRef } from "react";

const ToastContext = createContext(null);

export function ToastProvider({ children }) {
  const [toast, setToast] = useState(null);
  const timerRef = useRef(null);

  const showToast = useCallback((msg, type = "success") => {
    setToast({ msg, type });
    clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => setToast(null), 3200);
  }, []);

  return (
    <ToastContext.Provider value={showToast}>
      {children}
      {toast && (
        <div
          style={{
            position: "fixed", bottom: 24, right: 24,
            background: "var(--surface)", border: `1px solid ${toast.type === "success" ? "var(--success)" : "var(--danger)"}`,
            borderRadius: 12, padding: "14px 20px", fontSize: "0.85rem",
            zIndex: 9999, maxWidth: 320, boxShadow: "0 8px 32px rgba(0,0,0,0.4)",
            animation: "slideUp 0.3s ease",
            display: "flex", alignItems: "center", gap: 8,
            color: "var(--text)",
          }}
        >
          <span>{toast.type === "success" ? "✅" : "❌"}</span>
          <span>{toast.msg}</span>
        </div>
      )}
    </ToastContext.Provider>
  );
}

export const useToast = () => useContext(ToastContext);
