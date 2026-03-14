import { initializeApp } from "firebase/app";
import {
  getFirestore, doc, setDoc, getDoc, onSnapshot,
  collection, addDoc, getDocs, query, orderBy, updateDoc,
  enableIndexedDbPersistence,
} from "firebase/firestore";

// ─────────────────────────────────────────────────────────────
//  PASTE YOUR FIREBASE CONFIG HERE
// ─────────────────────────────────────────────────────────────
const firebaseConfig = {
  apiKey: "AIzaSyAgJtRXV9pm2e8mF9eSH1WMHwhFJaHFHRo",
  authDomain: "icu-dashboard-ea208.firebaseapp.com",
  projectId: "icu-dashboard-ea208",
  storageBucket: "icu-dashboard-ea208.firebasestorage.app",
  messagingSenderId: "996328709559",
  appId: "1:996328709559:web:b7740aba195357a5e55c32",
  measurementId: "G-Q7WRSSLJ35"
};

// ─────────────────────────────────────────────────────────────
//  APP SECRET — must match your Firestore security rule below.
//  Change this to any private string you choose.
//  See FIREBASE_SETUP.md for the matching Firestore rule.
// ─────────────────────────────────────────────────────────────
export const APP_SECRET = "SDCC-HS-SARAHD-86";
// ─────────────────────────────────────────────────────────────

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);

// Enable offline persistence — Firestore caches data on the device
// so it works even with poor connectivity and loads from disk instantly
enableIndexedDbPersistence(db).catch((err) => {
  if (err.code === "failed-precondition") {
    // Multiple tabs open — persistence only works in one tab at a time
    console.warn("Firestore persistence unavailable: multiple tabs open");
  } else if (err.code === "unimplemented") {
    // Browser doesn't support it — graceful fallback
    console.warn("Firestore persistence not supported in this browser");
  }
});

const BOARD_REF    = () => doc(db, "icu", "board");
const ADMINS_REF   = () => doc(db, "icu", "admins");
const SESSIONS_COL = "icu_sessions";

// ── Board ────────────────────────────────────────────────────
export async function saveBoard(state) {
  await setDoc(BOARD_REF(), {
    doctors:     state.doctors,
    patients:    state.patients,
    assignments: state.assignments,
    lastSaved:   new Date().toISOString(),
    _secret:     APP_SECRET,
  });
}

export async function loadBoard() {
  const snap = await getDoc(BOARD_REF());
  return snap.exists() ? snap.data() : null;
}

// Real-time listener with error callback so we know if rules have expired
export function subscribeToBoardState(callback, onError) {
  return onSnapshot(
    BOARD_REF(),
    (snap) => { if (snap.exists()) callback(snap.data()); },
    (err) => {
      console.error("Firestore snapshot error:", err.code, err.message);
      if (onError) onError(err);
    }
  );
}

// Doctor saves their patient statuses
export async function savePatientStatuses(docId, statusMap) {
  const snap = await getDoc(BOARD_REF());
  if (!snap.exists()) return;
  const data = snap.data();
  const patients = (data.patients || []).map((p) =>
    statusMap[p.id] !== undefined ? { ...p, status: statusMap[p.id] } : p
  );
  await updateDoc(BOARD_REF(), { patients });
}

// ── Sessions ─────────────────────────────────────────────────
export async function saveSession(session) {
  await addDoc(collection(db, SESSIONS_COL), { ...session, _secret: APP_SECRET });
}

export async function overwriteTodaySession(session) {
  const col = collection(db, SESSIONS_COL);
  const q = query(col, orderBy("date", "desc"));
  const snap = await getDocs(q);
  const today = new Date().toISOString().slice(0, 10);
  const todayDoc = snap.docs.find((d) => d.data().date?.slice(0, 10) === today);
  if (todayDoc) {
    await setDoc(doc(db, SESSIONS_COL, todayDoc.id), session);
  } else {
    await addDoc(col, session);
  }
}

export async function loadSessions() {
  const col = collection(db, SESSIONS_COL);
  const q = query(col, orderBy("date", "asc"));
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
}

// ── Admins ───────────────────────────────────────────────────
export async function saveAdminsToFirebase(admins) {
  await setDoc(ADMINS_REF(), { list: admins, _secret: APP_SECRET });
}

export async function loadAdminsFromFirebase() {
  const snap = await getDoc(ADMINS_REF());
  return snap.exists() ? (snap.data().list || []) : null;
}
