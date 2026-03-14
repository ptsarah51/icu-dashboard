export const uid = () => Math.random().toString(36).slice(2, 9);

export const fmtDate = (iso) => {
  if (!iso) return "—";
  const d = new Date(iso);
  return (
    d.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" }) +
    " " +
    d.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" })
  );
};

export const fmtDateOnly = (iso) => {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
};

export const getInitials = (name) =>
  name.split(" ").map((w) => w[0]).join("").toUpperCase().slice(0, 2);

export const isKuwaiti = (nat) => {
  if (!nat) return false;
  const n = nat.toLowerCase();
  return n.includes("kuwait") || n === "kw" || n === "kuwaiti";
};

export const isMale = (gender) =>
  gender && gender.toLowerCase().charAt(0) === "m";

// Full detailed stats used for reports
export const computeStats = (patients) => {
  const real = patients.filter((p) => !p.isUnitWork);
  const total = real.length;
  const male = real.filter((p) => isMale(p.gender)).length;
  const female = total - male;
  const kw = real.filter((p) => isKuwaiti(p.nationality)).length;
  const nonKw = total - kw;
  const kwMale = real.filter((p) => isKuwaiti(p.nationality) && isMale(p.gender)).length;
  const kwFemale = kw - kwMale;
  const nonKwMale = real.filter((p) => !isKuwaiti(p.nationality) && isMale(p.gender)).length;
  const nonKwFemale = nonKw - nonKwMale;

  // Status breakdown
  const phase1 = real.filter((p) => p.status === "phase1").length;
  const discharge = real.filter((p) => p.status === "discharge").length;
  const notSeen = real.filter((p) => p.status === "notSeen").length;
  const unitWork = patients.filter((p) => p.isUnitWork).length;

  return { total, male, female, kw, nonKw, kwMale, kwFemale, nonKwMale, nonKwFemale, phase1, discharge, notSeen, unitWork };
};

export const LOCATIONS = ["DICU", "CCU", "SD W1", "SD W2"];

export const LOCATION_COLORS = {
  DICU:  { bg: "rgba(0,212,255,0.08)",  border: "rgba(0,212,255,0.25)",  text: "#00d4ff" },
  CCU:   { bg: "rgba(239,68,68,0.08)",  border: "rgba(239,68,68,0.25)",  text: "#ef4444" },
  "SD W1": { bg: "rgba(124,58,237,0.08)", border: "rgba(124,58,237,0.25)", text: "#a78bfa" },
  "SD W2": { bg: "rgba(16,185,129,0.08)", border: "rgba(16,185,129,0.25)", text: "#10b981" },
};

export const STATUS_OPTIONS = [
  { value: "phase1",   label: "Phase 1 CR",  color: "#10b981", icon: "🟢" },
  { value: "discharge", label: "Discharge",  color: "#3b82f6", icon: "🔵" },
  { value: "notSeen",  label: "Not Seen",    color: "#f59e0b", icon: "🟡" },
];

export const DOC_COLORS = [
  "#00d4ff", "#7c3aed", "#ff6b35", "#10b981",
  "#f59e0b", "#ec4899", "#3b82f6", "#14b8a6",
];

// Generate viewer passcode: SD + 4 random digits
export const generateViewerCode = () =>
  "SD" + Math.floor(1000 + Math.random() * 9000).toString();

export const getUnassigned = (patients, assignments) => {
  const assigned = new Set(Object.values(assignments).flat());
  return patients.filter((p) => !assigned.has(p.id));
};

export const getDoctorPatients = (docId, patients, assignments) => {
  return (assignments[docId] || []).map((id) => patients.find((p) => p.id === id)).filter(Boolean);
};

// Group patients by location
export const groupByLocation = (patients) => {
  const groups = {};
  patients.forEach((p) => {
    const loc = p.location || "Unspecified";
    if (!groups[loc]) groups[loc] = [];
    groups[loc].push(p);
  });
  return groups;
};

// isoDate string YYYY-MM-DD for a Date
export const toISODate = (d) => d.toISOString().slice(0, 10);
export const todayISO = () => toISODate(new Date());
