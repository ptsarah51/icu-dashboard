import { useState, useRef, useEffect } from "react";

const CODE_LENGTH = 7;

export default function LoginPage({ admins, onLogin }) {
  const [digits, setDigits] = useState(Array(CODE_LENGTH).fill(""));
  const [error, setError] = useState("");
  const [shake, setShake] = useState(false);
  const [success, setSuccess] = useState(false);
  const inputRefs = useRef([]);

  useEffect(() => {
    inputRefs.current[0]?.focus();
  }, []);

  const handleDigit = (i, val) => {
    const next = [...digits];
    next[i] = val.slice(-1);
    setDigits(next);
    setError("");

    if (val && i < CODE_LENGTH - 1) {
      inputRefs.current[i + 1]?.focus();
    }
    // Auto-submit when last digit filled
    if (val && i === CODE_LENGTH - 1) {
      const code = [...next].join("").trim();
      attemptLogin(code);
    }
  };

  const handleKeyDown = (i, e) => {
    if (e.key === "Backspace" && !digits[i] && i > 0) {
      inputRefs.current[i - 1]?.focus();
    }
    if (e.key === "Enter") {
      attemptLogin(digits.join("").trim());
    }
  };

  const handlePaste = (e) => {
    e.preventDefault();
    const pasted = e.clipboardData.getData("text").slice(0, CODE_LENGTH);
    const next = Array(CODE_LENGTH).fill("");
    pasted.split("").forEach((c, i) => { next[i] = c; });
    setDigits(next);
    if (pasted.length === CODE_LENGTH) {
      attemptLogin(pasted);
    } else {
      inputRefs.current[pasted.length]?.focus();
    }
  };

  function attemptLogin(code) {
    const match = admins.find((a) => a.code === code);
    if (match) {
      setSuccess(true);
      setTimeout(() => onLogin(match), 600);
    } else {
      setShake(true);
      setError("Incorrect passcode. Please try again.");
      setDigits(Array(CODE_LENGTH).fill(""));
      setTimeout(() => {
        setShake(false);
        inputRefs.current[0]?.focus();
      }, 600);
    }
  }

  return (
    <div style={{
      minHeight: "100vh",
      background: "var(--bg)",
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      justifyContent: "center",
      padding: 24,
      position: "relative",
      overflow: "hidden",
    }}>
      {/* Background glow */}
      <div style={{
        position: "absolute", top: "10%", left: "50%", transform: "translateX(-50%)",
        width: 500, height: 500,
        background: "radial-gradient(circle, rgba(0,212,255,0.07) 0%, transparent 70%)",
        pointerEvents: "none",
      }} />
      <div style={{
        position: "absolute", bottom: "5%", right: "5%",
        width: 300, height: 300,
        background: "radial-gradient(circle, rgba(124,58,237,0.07) 0%, transparent 70%)",
        pointerEvents: "none",
      }} />

      {/* Card */}
      <div style={{
        background: "var(--surface)",
        border: "1px solid var(--border)",
        borderRadius: 24,
        padding: "48px 40px",
        width: "100%",
        maxWidth: 420,
        textAlign: "center",
        position: "relative",
        zIndex: 1,
        boxShadow: "0 32px 80px rgba(0,0,0,0.4)",
      }}>
        {/* Logo */}
        <div style={{
          width: 64, height: 64,
          background: "linear-gradient(135deg, var(--accent), var(--accent3))",
          borderRadius: 18,
          display: "flex", alignItems: "center", justifyContent: "center",
          fontSize: 28,
          margin: "0 auto 20px",
          boxShadow: "0 8px 24px rgba(0,212,255,0.25)",
        }}>🏥</div>

        <div style={{
          fontFamily: "Syne, sans-serif",
          fontWeight: 800,
          fontSize: "1.6rem",
          marginBottom: 6,
          background: "linear-gradient(135deg, var(--text), var(--muted))",
          WebkitBackgroundClip: "text",
          WebkitTextFillColor: "transparent",
          backgroundClip: "text",
        }}>
          ICU Command Center
        </div>
        <div style={{ color: "var(--muted)", fontSize: "0.85rem", marginBottom: 36 }}>
          Enter your admin passcode to continue
        </div>



        {/* Digit inputs */}
        <div
          style={{
            display: "flex",
            gap: 10,
            justifyContent: "center",
            marginBottom: 24,
            animation: shake ? "shakeX 0.5s ease" : "none",
          }}
          onPaste={handlePaste}
        >
          {digits.map((d, i) => (
            <input
              key={i}
              ref={(el) => (inputRefs.current[i] = el)}
              type="text"
              inputMode="text"
              maxLength={1}
              value={d}
              onChange={(e) => handleDigit(i, e.target.value)}
              onKeyDown={(e) => handleKeyDown(i, e)}
              style={{
                width: 52, height: 62,
                textAlign: "center",
                fontSize: "1.4rem",
                fontFamily: "Syne, sans-serif",
                fontWeight: 700,
                background: d ? "rgba(0,212,255,0.08)" : "var(--surface2)",
                border: `2px solid ${success ? "var(--success)" : d ? "var(--accent)" : error ? "var(--danger)" : "var(--border)"}`,
                borderRadius: 12,
                color: "var(--text)",
                outline: "none",
                transition: "all 0.15s",
                caretColor: "transparent",
              }}
            />
          ))}
        </div>

        {/* Error */}
        {error && (
          <div style={{
            color: "var(--danger)",
            fontSize: "0.82rem",
            marginBottom: 16,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: 6,
          }}>
            ⚠️ {error}
          </div>
        )}

        {/* Success */}
        {success && (
          <div style={{
            color: "var(--success)",
            fontSize: "0.85rem",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: 6,
          }}>
            ✅ Access granted — loading dashboard…
          </div>
        )}

        {/* Submit button */}
        {!success && (
          <button
            className="btn btn-primary"
            style={{ width: "100%", justifyContent: "center", fontSize: "0.9rem", padding: "12px" }}
            onClick={() => attemptLogin(digits.join("").trim())}
          >
            🔓 Unlock Dashboard
          </button>
        )}

        <div style={{ marginTop: 20, fontSize: "0.72rem", color: "var(--muted)" }}>
          Passcode-protected · Admin access only
        </div>
      </div>

      <style>{`
        @keyframes shakeX {
          0%,100%{transform:translateX(0)}
          20%{transform:translateX(-8px)}
          40%{transform:translateX(8px)}
          60%{transform:translateX(-6px)}
          80%{transform:translateX(6px)}
        }
      `}</style>
    </div>
  );
}
