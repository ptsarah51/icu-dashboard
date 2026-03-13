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

export const getInitials = (name) =>
  name.split(" ").map((w) => w[0]).join("").toUpperCase().slice(0, 2);

export const isKuwaiti = (nat) => {
  if (!nat) return false;
  const n = nat.toLowerCase();
  return n.includes("kuwait") || n === "kw" || n === "kuwaiti";
};

export const isMale = (gender) =>
  gender && gender.toLowerCase().charAt(0) === "m";

export const computeStats = (patients) => {
  const total = patients.length;
  const male = patients.filter((p) => isMale(p.gender)).length;
  const kw = patients.filter((p) => isKuwaiti(p.nationality)).length;
  return { total, male, female: total - male, kw, nonKw: total - kw };
};

export const DOC_COLORS = [
  "#00d4ff", "#7c3aed", "#ff6b35", "#10b981",
  "#f59e0b", "#ec4899", "#3b82f6", "#14b8a6",
];

export const getUnassigned = (patients, assignments) => {
  const assigned = new Set(Object.values(assignments).flat());
  return patients.filter((p) => !assigned.has(p.id));
};

export const getDoctorPatients = (docId, patients, assignments) => {
  return (assignments[docId] || []).map((id) => patients.find((p) => p.id === id)).filter(Boolean);
};
