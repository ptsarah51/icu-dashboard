import { useState, useEffect, useCallback } from "react";
import * as XLSX from "xlsx";
import AdminBoard from "./components/AdminBoard";
import ViewerApp from "./components/ViewerApp";
import LoginPage from "./components/LoginPage";
import { loadState, saveState, loadAdmins, saveAdmins } from "./utils/storage";
import { uid } from "./utils/helpers";

export default function App() {
  const isViewer = new URLSearchParams(window.location.search).get("view") === "viewer";

  const [admins, setAdmins] = useState(() => loadAdmins());
  const [currentAdmin, setCurrentAdmin] = useState(null); // null = not logged in
  const [state, setState] = useState(() => loadState());

  // Auto-save app state
  useEffect(() => {
    saveState(state);
  }, [state]);

  // Viewer auto-refresh
  useEffect(() => {
    if (!isViewer) return;
    const interval = setInterval(() => {
      setState(loadState());
    }, 20000);
    return () => clearInterval(interval);
  }, [isViewer]);

  const handleLogin = useCallback((admin) => {
    setCurrentAdmin(admin);
  }, []);

  const handleLogout = useCallback(() => {
    setCurrentAdmin(null);
  }, []);

  const handleSaveAdmins = useCallback((updated) => {
    setAdmins(updated);
    saveAdmins(updated);
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

          if (patients.length === 0) {
            reject(new Error("No patients found"));
            return;
          }

          setState((prev) => {
            const pidSet = new Set(patients.map((p) => p.id));
            const assignments = {};
            Object.keys(prev.assignments).forEach((docId) => {
              assignments[docId] = (prev.assignments[docId] || []).filter((id) => pidSet.has(id));
            });
            return { ...prev, patients, assignments };
          });
          resolve(patients.length);
        } catch (err) {
          reject(err);
        }
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

  const saveAndPublish = useCallback(() => {
    setState((prev) => {
      const snap = {
        date: new Date().toISOString(),
        patients: JSON.parse(JSON.stringify(prev.patients)),
        assignments: JSON.parse(JSON.stringify(prev.assignments)),
        doctors: JSON.parse(JSON.stringify(prev.doctors)),
      };
      return { ...prev, sessions: [...prev.sessions, snap], lastSaved: snap.date };
    });
  }, []);

  const clearSessions = useCallback(() => {
    setState((prev) => ({ ...prev, sessions: [] }));
  }, []);

  // Viewer mode — no login needed
  if (isViewer) {
    return <ViewerApp state={state} />;
  }

  // Not logged in — show login
  if (!currentAdmin) {
    return <LoginPage admins={admins} onLogin={handleLogin} />;
  }

  // Logged in — show dashboard
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
