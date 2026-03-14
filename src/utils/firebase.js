import { initializeApp } from "firebase/app";
import { getFirestore, doc, setDoc, getDoc, onSnapshot, collection, addDoc } from "firebase/firestore";

// ─────────────────────────────────────────────────────────────
//  PASTE YOUR FIREBASE CONFIG HERE (from Firebase console)
//  See README for step-by-step instructions
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

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);

// ── Document references ──────────────────────────────────────
const BOARD_DOC = "icu/board";
const ADMINS_DOC = "icu/admins";
const SESSIONS_COL = "icu_sessions";

// ── Board state (doctors, patients, assignments, lastSaved) ──
export async function saveBoard(state) {
  const ref = doc(db, ...BOARD_DOC.split("/"));
  await setDoc(ref, {
    doctors: state.doctors,
    patients: state.patients,
    assignments: state.assignments,
    lastSaved: new Date().toISOString(),
  });
}

export async function loadBoard() {
  const ref = doc(db, ...BOARD_DOC.split("/"));
  const snap = await getDoc(ref);
  if (!snap.exists()) return null;
  return snap.data();
}

// Real-time listener for viewer
export function subscribeToBoardState(callback) {
  const ref = doc(db, ...BOARD_DOC.split("/"));
  return onSnapshot(ref, (snap) => {
    if (snap.exists()) callback(snap.data());
  });
}

// ── Sessions (reports) ───────────────────────────────────────
export async function saveSession(session) {
  const col = collection(db, SESSIONS_COL);
  await addDoc(col, session);
}

export async function loadSessions() {
  const { getDocs, query, orderBy } = await import("firebase/firestore");
  const col = collection(db, SESSIONS_COL);
  const q = query(col, orderBy("date", "asc"));
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
}

// ── Admins ───────────────────────────────────────────────────
export async function saveAdminsToFirebase(admins) {
  const ref = doc(db, ...ADMINS_DOC.split("/"));
  await setDoc(ref, { list: admins });
}

export async function loadAdminsFromFirebase() {
  const ref = doc(db, ...ADMINS_DOC.split("/"));
  const snap = await getDoc(ref);
  if (!snap.exists()) return null;
  return snap.data().list || [];
}
