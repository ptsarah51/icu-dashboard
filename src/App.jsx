import { useState, useEffect, useCallback, useRef } from "react";
import * as XLSX from "xlsx";
import AdminBoard from "./components/AdminBoard";
import ViewerApp from "./components/ViewerApp";
import LoginPage from "./components/LoginPage";
import { loadAdmins, saveAdmins, loadState, saveViewerCache, loadViewerCache, saveAdminSession, loadAdminSession, clearAdminSession } from "./utils/storage";
import {
  saveBoard, loadBoard, saveSession, overwriteTodaySession, loadSessions,
  saveAdminsToFirebase, loadAdminsFromFirebase, subscribeToBoardState,
} from "./utils/firebase";
import { uid, generateViewerCode, markNewRecurrent } from "./utils/helpers";

function defaultBoardState() {
  return { doctors: [], patients: [], assignments: {}, sessions: [], lastSaved: null };
}

export default function App() {
  const isViewer = new URLSearchParams(window.location.search).get("view") === "viewer";

  const [admins, setAdmins] = useState(() => loadAdmins());
  const [currentAdmin, setCurrentAdmin] = useState(() => loadAdminSession());

  // For viewer: seed from localStorage cache instantly so UI is ready before Firebase responds
  const [state, setState] = useState(() => {
    if (isViewer) {
      const cache = loadViewerCache();
      if (cache) return { ...defaultBoardState(), ...cache };
    }
    return defaultBoardState();
  });

  // loading=true only blocks the admin login screen, NOT the viewer
  // Viewer shows cached data immediately and updates silently
  const [loading, setLoading] = useState(!isViewer);
  const [firebaseError, setFirebaseError] = useState(null);
  const stateRef = useRef(state);
  stateRef.current = state;

  useEffect(() => {
    async function init() {
      try {
        const firebaseAdmins = await loadAdminsFromFirebase();
        if (firebaseAdmins && firebaseAdmins.length > 0) {
          setAdmins(firebaseAdmins);
          saveAdmins(firebaseAdmins);
        }
        const board = await loadBoard();
        if (board) {
          const sessions = await loadSessions();
          // Auto-fix: assign viewerCodes to any doctor that was added before this feature existed
          let doctors = board.doctors || [];
          let needsSave = false;
          doctors = doctors.map((d) => {
            if (!d.viewerCode) {
              needsSave = true;
              return { ...d, viewerCode: generateViewerCode() };
            }
            return d;
          });
          const newState = {
            doctors,
            patients:    board.patients    || [],
            assignments: board.assignments || {},
            sessions:    sessions          || [],
            lastSaved:   board.lastSaved   || null,
          };
          setState(newState);
          // Save the patched doctors back to Firebase silently
          if (needsSave) {
            await saveBoard(newState).catch(() => {});
          }
        }
      } catch (err) {
        console.warn("Firebase load failed:", err);
      } finally {
        setLoading(false);
      }
    }
    init();
  }, []);

  useEffect(() => {
    if (!isViewer) return;
    // Subscribe to Firestore. First snapshot arrives fast (~200-500ms).
    // Each update is also written to localStorage so next visit is instant.
    const unsub = subscribeToBoardState(
      (board) => {
        setFirebaseError(null);
        // Auto-fix missing viewer codes
        let doctors = board.doctors || [];
        doctors = doctors.map((d) =>
          !d.viewerCode ? { ...d, viewerCode: generateViewerCode() } : d
        );
        const updated = {
          doctors,
          patients:    board.patients    || [],
          assignments: board.assignments || {},
          lastSaved:   board.lastSaved   || null,
        };
        saveViewerCache(updated);
        setState((prev) => ({ ...prev, ...updated }));
      },
      (err) => {
        setFirebaseError(err.code || "unknown");
      }
    );
    return () => unsub();
  }, [isViewer]);

  const handleLogin = useCallback((admin) => {
    setCurrentAdmin(admin);
    saveAdminSession(admin);
  }, []);
  const handleLogout = useCallback(() => {
    setCurrentAdmin(null);
    clearAdminSession();
  }, []);

  const handleSaveAdmins = useCallback(async (updated) => {
    setAdmins(updated);
    saveAdmins(updated);
    try { await saveAdminsToFirebase(updated); } catch (e) { console.warn(e); }
  }, []);

  // addDoctor now receives viewerCode too
  const addDoctor = useCallback((name, viewerCode) => {
    const doc = { id: uid(), name, viewerCode: viewerCode || generateViewerCode() };
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

  const importPatients = useCallback((file, location) => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const wb = XLSX.read(e.target.result, { type: "binary" });
          const ws = wb.Sheets[wb.SheetNames[0]];
          const rows = XLSX.utils.sheet_to_json(ws, { defval: "" });
          const rawPatients = rows.map((row) => {
            // Flexible column matcher — normalises key names for comparison
            const get = (...keys) => {
              for (const k of keys) {
                const needle = k.toLowerCase().replace(/[\s_\-]/g, "");
                for (const rk of Object.keys(row)) {
                  if (rk.toLowerCase().replace(/[\s_\-]/g, "") === needle) {
                    const v = row[rk];
                    if (v === null || v === undefined) return "";
                    return String(v).trim();
                  }
                }
              }
              return "";
            };

            // Age: prefer direct Age column, fall back to calculating from Birth Date
            let age = get("age");
            if (!age) {
              const bd = get("birthdate", "dateofbirth", "dob", "birth date");
              if (bd) {
                const born = new Date(bd);
                if (!isNaN(born)) {
                  age = String(Math.floor((Date.now() - born) / 31557600000));
                }
              }
            }

            return {
              id: uid(),
              // Supports both "Patient Name" (hospital export) and plain "Name"
              name: get("patientname", "patient name", "name", "fullname", "patient") || "Unknown",
              age,
              nationality: get("nationality", "nat", "nation"),
              gender: get("gender", "sex"),
              // Supports "File Number" (hospital export) and "ID", "MRN" etc.
              patientId: get("filenumber", "file number", "fileno", "id", "patientid", "mrn", "file"),
              diagnosis: get("diagnosis", "dx", "condition", "complaint"),
              // Supports "Bed Number" (hospital export) and plain "Bed"
              bed: get("bednumber", "bed number", "bedno", "bed", "room"),
              location: location || "Unspecified",
              status: "",
              isUnitWork: false,
            };
          }).filter((p) => p.name && p.name !== "Unknown" && p.name.trim() !== "" && p.name.toLowerCase() !== "patient name");

          if (rawPatients.length === 0) { reject(new Error("No patients found")); return; }

          // Merge: keep existing patients from other locations, replace this location's patients
          setState((prev) => {
            // Mark new vs recurrent using session history
            const patients = markNewRecurrent(rawPatients, prev.sessions);
            const existing = prev.patients.filter((p) => p.location !== location && !p.isUnitWork);
            const merged = [...existing, ...patients];
            // Clean up assignments for removed patients
            const pidSet = new Set(merged.map((p) => p.id));
            const assignments = {};
            Object.keys(prev.assignments).forEach((docId) => {
              assignments[docId] = (prev.assignments[docId] || []).filter((id) =>
                pidSet.has(id) || prev.patients.find((p) => p.id === id && p.isUnitWork)
              );
            });
            return { ...prev, patients: merged, assignments };
          });
          resolve(rawPatients.length);
        } catch (err) { reject(err); }
      };
      reader.readAsBinaryString(file);
    });
  }, []);

  const assignPatient = useCallback((patientId, fromSource, toDocId, unitWorkTask) => {
    // Unit work task: { name, doctorId }
    if (unitWorkTask) {
      const task = {
        id: uid(), name: unitWorkTask.name,
        isUnitWork: true, location: "Unit Work", status: "",
      };
      setState((prev) => {
        const assignments = { ...prev.assignments };
        if (!assignments[unitWorkTask.doctorId]) assignments[unitWorkTask.doctorId] = [];
        assignments[unitWorkTask.doctorId] = [...assignments[unitWorkTask.doctorId], task.id];
        return { ...prev, patients: [...prev.patients, task], assignments };
      });
      return;
    }

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

  const saveAndPublish = useCallback(async (mode) => {
    saveViewerCache(stateRef.current); // pre-warm cache so viewer is instant
    const current = stateRef.current;
    const snap = {
      date: new Date().toISOString(),
      patients: JSON.parse(JSON.stringify(current.patients)),
      assignments: JSON.parse(JSON.stringify(current.assignments)),
      doctors: JSON.parse(JSON.stringify(current.doctors)),
    };
    await saveBoard(current);
    if (mode === "overwrite") {
      await overwriteTodaySession(snap);
    } else {
      await saveSession(snap);
    }
    const sessions = await loadSessions();
    setState((prev) => ({ ...prev, sessions, lastSaved: snap.date }));
  }, []);

  const clearSessions = useCallback(() => {
    setState((prev) => ({ ...prev, sessions: [] }));
  }, []);

  const resetDashboard = useCallback(async () => {
    setState((prev) => {
      // Keep doctors and their assignments structure, just clear patients
      const freshAssignments = {};
      prev.doctors.forEach((d) => { freshAssignments[d.id] = []; });
      const updated = {
        ...prev,
        patients: [],
        assignments: freshAssignments,
        lastSaved: new Date().toISOString(),
      };
      // Save to Firebase in background
      saveBoard(updated).catch((e) => console.warn(e));
      return updated;
    });
  }, []);

  const archivePool = useCallback(async () => {
    // Remove all unassigned patients from the board (assigned ones stay)
    setState((prev) => {
      const assignedIds = new Set(Object.values(prev.assignments).flat());
      const patients = prev.patients.filter((p) => assignedIds.has(p.id));
      return { ...prev, patients };
    });
  }, []);

  if (loading) {
    return (
      <div style={{ minHeight: "100vh", background: "var(--bg)", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 16 }}>
        <div style={{ width: 48, height: 48, border: "3px solid var(--border)", borderTop: "3px solid var(--accent)", borderRadius: "50%", animation: "spin 0.8s linear infinite" }} />
        <div style={{ color: "var(--muted)", fontSize: "0.9rem" }}>Connecting…</div>
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  if (isViewer) return <ViewerApp state={state} firebaseError={firebaseError} />;
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
      onResetDashboard={resetDashboard}
      onArchivePool={archivePool}
    />
  );
}
