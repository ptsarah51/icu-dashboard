import { initializeApp } from "firebase/app";
import { getFirestore, doc, setDoc, getDoc, onSnapshot, collection, addDoc } from "firebase/firestore";

// ─────────────────────────────────────────────────────────────
//  PASTE YOUR FIREBASE CONFIG HERE (from Firebase console)
//  See README for step-by-step instructions
// ─────────────────────────────────────────────────────────────
const firebaseConfig = {
  apiKey: "PASTE_YOUR_API_KEY_HERE",
  authDomain: "PASTE_YOUR_AUTH_DOMAIN_HERE",
  projectId: "PASTE_YOUR_PROJECT_ID_HERE",
  storageBucket: "PASTE_YOUR_STORAGE_BUCKET_HERE",
  messagingSenderId: "PASTE_YOUR_MESSAGING_SENDER_ID_HERE",
  appId: "PASTE_YOUR_APP_ID_HERE",
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
