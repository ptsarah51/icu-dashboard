import { useState, useEffect, useCallback, useRef } from "react";
import * as XLSX from "xlsx";
import AdminBoard from "./components/AdminBoard";
import ViewerApp from "./components/ViewerApp";
import LoginPage from "./components/LoginPage";
import { loadAdmins, saveAdmins } from "./utils/storage";
import {
  saveBoard, loadBoard, saveSession, loadSessions,
  saveAdminsToFirebase, loadAdminsFromFirebase,
  subscribeToBoardState,
} from "./utils/firebase";
import { uid } from "./utils/helpers";

function defaultBoardState() {
  return { doctors: [], patients: [], assignments: {}, sessions: [], lastSaved: null };
}

export default function App() {
  const isViewer = new URLSearchParams(window.location.search).get("view") === "viewer";

  const [admins, setAdmins] = useState(() => loadAdmins());
  const [currentAdmin, setCurrentAdmin] = useState(null);
  const [state, setState] = useState(defaultBoardState());
  const [loading, setLoading] = useState(true);
  const stateRef = useRef(state);
  stateRef.current = state;

  // ── Load initial data from Firebase ─────────────────────
  useEffect(() => {
    async function init() {
      try {
        // Load admins from Firebase (fallback to localStorage)
        const firebaseAdmins = await loadAdminsFromFirebase();
        if (firebaseAdmins && firebaseAdmins.length > 0) {
          setAdmins(firebaseAdmins);
          saveAdmins(firebaseAdmins); // keep local copy in sync
        }

        // Load board state
        const board = await loadBoard();
        if (board) {
          const sessions = await loadSessions();
          setState({
            doctors: board.doctors || [],
            patients: board.patients || [],
            assignments: board.assignments || {},
            sessions: sessions || [],
            lastSaved: board.lastSaved || null,
          });
        }
      } catch (err) {
        console.warn("Firebase load failed, using local state:", err);
      } finally {
        setLoading(false);
      }
    }
    init();
  }, []);

  // ── Viewer: real-time subscription ──────────────────────
  useEffect(() => {
    if (!isViewer) return;
    setLoading(true);
    const unsub = subscribeToBoardState((board) => {
      setState((prev) => ({
        ...prev,
        doctors: board.doctors || [],
        patients: board.patients || [],
        assignments: board.assignments || {},
        lastSaved: board.lastSaved || null,
      }));
      setLoading(false);
    });
    return () => unsub();
  }, [isViewer]);

  const handleLogin = useCallback((admin) => setCurrentAdmin(admin), []);
  const handleLogout = useCallback(() => setCurrentAdmin(null), []);

  const handleSaveAdmins = useCallback(async (updated) => {
    setAdmins(updated);
    saveAdmins(updated);
    try { await saveAdminsToFirebase(updated); } catch (e) { console.warn(e); }
  }, []);

  const addDoctor = useCallback((name) => {
    const doc = { id: uid(), name };
    setState((prev) => ({
      ...prev,
      doctors: [...prev.doctors, doc],
      assignments: { ...prev.assignments, [doc.id]: [] },
    }));
  }, []);

  const removeDoctor = useCallback((docId) => {
    setState((prev) => {
      const assignments = { ...prev.assignments };
      delete assignments[docId];
      return { ...prev, doctors: prev.doctors.filter((d) => d.id !== docId), assignments };
    });
  }, []);

  const importPatients = useCallback((file) => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const wb = XLSX.read(e.target.result, { type: "binary" });
          const ws = wb.Sheets[wb.SheetNames[0]];
          const rows = XLSX.utils.sheet_to_json(ws, { defval: "" });
          const patients = rows.map((row) => {
            const get = (...keys) => {
              for (const k of keys) {
                for (const rk of Object.keys(row)) {
                  if (rk.toLowerCase().replace(/[\s_]/g, "") === k.toLowerCase().replace(/[\s_]/g, "")) {
                    return String(row[rk] || "").trim();
                  }
                }
              }
              return "";
            };
            return {
              id: uid(),
              name: get("name", "patientname", "fullname", "patient") || "Unknown",
              age: get("age"),
              nationality: get("nationality", "nat", "nation"),
              gender: get("gender", "sex"),
              patientId: get("id", "patientid", "mrn", "file", "filenumber"),
              diagnosis: get("diagnosis", "dx", "condition", "complaint"),
              bed: get("bed", "bednumber", "bedno", "room"),
            };
          }).filter((p) => p.name && p.name !== "Unknown");

          if (patients.length === 0) { reject(new Error("No patients found")); return; }

          setState((prev) => {
            const pidSet = new Set(patients.map((p) => p.id));
            const assignments = {};
            Object.keys(prev.assignments).forEach((docId) => {
              assignments[docId] = (prev.assignments[docId] || []).filter((id) => pidSet.has(id));
            });
            return { ...prev, patients, assignments };
          });
          resolve(patients.length);
        } catch (err) { reject(err); }
      };
      reader.readAsBinaryString(file);
    });
  }, []);

  const assignPatient = useCallback((patientId, fromSource, toDocId) => {
    setState((prev) => {
      const assignments = { ...prev.assignments };
      if (fromSource !== "pool" && assignments[fromSource]) {
        assignments[fromSource] = assignments[fromSource].filter((id) => id !== patientId);
      }
      if (toDocId !== "pool") {
        if (!assignments[toDocId]) assignments[toDocId] = [];
        if (!assignments[toDocId].includes(patientId)) {
          assignments[toDocId] = [...assignments[toDocId], patientId];
        }
      }
      return { ...prev, assignments };
    });
  }, []);

  // ── Save & Publish → writes to Firebase ─────────────────
  const saveAndPublish = useCallback(async () => {
    const current = stateRef.current;
    const snap = {
      date: new Date().toISOString(),
      patients: JSON.parse(JSON.stringify(current.patients)),
      assignments: JSON.parse(JSON.stringify(current.assignments)),
      doctors: JSON.parse(JSON.stringify(current.doctors)),
    };

    // Save board to Firebase (viewers see this instantly)
    await saveBoard(current);
    // Save session snapshot for reports
    await saveSession(snap);

    setState((prev) => ({
      ...prev,
      sessions: [...prev.sessions, snap],
      lastSaved: snap.date,
    }));
  }, []);

  const clearSessions = useCallback(() => {
    setState((prev) => ({ ...prev, sessions: [] }));
  }, []);

  // ── Loading screen ───────────────────────────────────────
  if (loading) {
    return (
      <div style={{
        minHeight: "100vh", background: "var(--bg)",
        display: "flex", flexDirection: "column",
        alignItems: "center", justifyContent: "center", gap: 16,
      }}>
        <div style={{
          width: 48, height: 48,
          border: "3px solid var(--border)",
          borderTop: "3px solid var(--accent)",
          borderRadius: "50%",
          animation: "spin 0.8s linear infinite",
        }} />
        <div style={{ color: "var(--muted)", fontSize: "0.9rem" }}>Connecting…</div>
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  if (isViewer) return <ViewerApp state={state} />;
  if (!currentAdmin) return <LoginPage admins={admins} onLogin={handleLogin} />;

  return (
    <AdminBoard
      state={state}
      admins={admins}
      currentAdmin={currentAdmin}
      onAddDoctor={addDoctor}
      onRemoveDoctor={removeDoctor}
      onImportPatients={importPatients}
      onAssignPatient={assignPatient}
      onSaveAndPublish={saveAndPublish}
      onClearSessions={clearSessions}
      onSaveAdmins={handleSaveAdmins}
      onLogout={handleLogout}
    />
  );
}
