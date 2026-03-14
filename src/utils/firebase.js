import { initializeApp } from "firebase/app";
import { getFirestore, doc, setDoc, getDoc, onSnapshot,
         collection, addDoc, getDocs, query, orderBy, updateDoc } from "firebase/firestore";

// ─────────────────────────────────────────────────────────────
//  PASTE YOUR FIREBASE CONFIG HERE
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

const BOARD_REF  = () => doc(db, "icu", "board");
const ADMINS_REF = () => doc(db, "icu", "admins");
const SESSIONS_COL = "icu_sessions";

// ── Board ────────────────────────────────────────────────────
export async function saveBoard(state) {
  await setDoc(BOARD_REF(), {
    doctors:     state.doctors,
    patients:    state.patients,
    assignments: state.assignments,
    lastSaved:   new Date().toISOString(),
  });
}

export async function loadBoard() {
  const snap = await getDoc(BOARD_REF());
  return snap.exists() ? snap.data() : null;
}

export function subscribeToBoardState(callback) {
  return onSnapshot(BOARD_REF(), (snap) => {
    if (snap.exists()) callback(snap.data());
  });
}

// Doctor saves their patient statuses — updates patients array on board
export async function savePatientStatuses(docId, statusMap) {
  const snap = await getDoc(BOARD_REF());
  if (!snap.exists()) return;
  const data = snap.data();
  const patients = (data.patients || []).map((p) => {
    if (statusMap[p.id] !== undefined) return { ...p, status: statusMap[p.id] };
    return p;
  });
  await updateDoc(BOARD_REF(), { patients });
}

// ── Sessions ─────────────────────────────────────────────────
export async function saveSession(session) {
  await addDoc(collection(db, SESSIONS_COL), session);
}

export async function overwriteTodaySession(session) {
  // Find today's session doc if any and replace it, else create new
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
  await setDoc(ADMINS_REF(), { list: admins });
}

export async function loadAdminsFromFirebase() {
  const snap = await getDoc(ADMINS_REF());
  return snap.exists() ? (snap.data().list || []) : null;
}
