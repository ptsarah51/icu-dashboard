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
  !!(gender && gender.toLowerCase().charAt(0) === "m");

export const isFemale = (gender) =>
  !!(gender && gender.toLowerCase().charAt(0) === "f");

// ── Full detailed stats — single source of truth ──────────────────────────────
// Accepts a flat array of patient objects.
// Statuses come from p.status field — written back by viewers on save.
export const computeStats = (patients) => {
  const real = patients.filter((p) => !p.isUnitWork);

  const total    = real.length;
  const male     = real.filter((p) => isMale(p.gender)).length;
  const female   = real.filter((p) => isFemale(p.gender)).length;
  const kw       = real.filter((p) => isKuwaiti(p.nationality)).length;
  const nonKw    = real.filter((p) => !isKuwaiti(p.nationality)).length;

  // Nationality × Gender — counted independently (no subtraction that could mix numbers)
  const kwMale      = real.filter((p) => isKuwaiti(p.nationality)  && isMale(p.gender)).length;
  const kwFemale    = real.filter((p) => isKuwaiti(p.nationality)  && isFemale(p.gender)).length;
  const nonKwMale   = real.filter((p) => !isKuwaiti(p.nationality) && isMale(p.gender)).length;
  const nonKwFemale = real.filter((p) => !isKuwaiti(p.nationality) && isFemale(p.gender)).length;

  // Status counts
  const phase1    = real.filter((p) => p.status === "phase1").length;
  const discharge = real.filter((p) => p.status === "discharge").length;
  const notSeen   = real.filter((p) => p.status === "notSeen").length;

  // Status × Nationality × Gender
  const statusBreakdown = (statusVal) => {
    const s = real.filter((p) => p.status === statusVal);
    return {
      total:      s.length,
      kwMale:     s.filter((p) => isKuwaiti(p.nationality)  && isMale(p.gender)).length,
      kwFemale:   s.filter((p) => isKuwaiti(p.nationality)  && isFemale(p.gender)).length,
      nonKwMale:  s.filter((p) => !isKuwaiti(p.nationality) && isMale(p.gender)).length,
      nonKwFemale:s.filter((p) => !isKuwaiti(p.nationality) && isFemale(p.gender)).length,
    };
  };

  // New vs recurrent
  const newPts       = real.filter((p) => p.isNew === true).length;
  const recurrentPts = real.filter((p) => p.isNew === false).length;

  // Unit work statuses
  const unitWorkItems   = patients.filter((p) => p.isUnitWork);
  const unitWork        = unitWorkItems.length;
  const unitDone        = unitWorkItems.filter((p) => p.status === "done").length;
  const unitInProgress  = unitWorkItems.filter((p) => p.status === "inProgress").length;
  const unitNeedHelp    = unitWorkItems.filter((p) => p.status === "needHelp").length;

  return {
    total, male, female, kw, nonKw,
    kwMale, kwFemale, nonKwMale, nonKwFemale,
    phase1, discharge, notSeen,
    phase1Detail:    statusBreakdown("phase1"),
    dischargeDetail: statusBreakdown("discharge"),
    notSeenDetail:   statusBreakdown("notSeen"),
    newPts, recurrentPts,
    unitWork, unitDone, unitInProgress, unitNeedHelp,
  };
};

// Doctor-specific stats
export const computeDoctorStats = (docId, patients, assignments) => {
  const ids   = new Set(assignments[docId] || []);
  const mine  = patients.filter((p) => ids.has(p.id));
  return computeStats(mine);
};

export const LOCATIONS = ["DICU", "CCU", "SD W1", "SD W2"];

export const LOCATION_COLORS = {
  DICU:    { bg: "rgba(0,212,255,0.08)",  border: "rgba(0,212,255,0.25)",  text: "#00d4ff" },
  CCU:     { bg: "rgba(239,68,68,0.08)",  border: "rgba(239,68,68,0.25)",  text: "#ef4444" },
  "SD W1": { bg: "rgba(124,58,237,0.08)", border: "rgba(124,58,237,0.25)", text: "#a78bfa" },
  "SD W2": { bg: "rgba(16,185,129,0.08)", border: "rgba(16,185,129,0.25)", text: "#10b981" },
};

export const STATUS_OPTIONS = [
  { value: "phase1",    label: "Phase 1 CR", color: "#10b981", icon: "🟢" },
  { value: "discharge", label: "Discharge",  color: "#3b82f6", icon: "🔵" },
  { value: "notSeen",   label: "Not Seen",   color: "#f59e0b", icon: "🟡" },
];

export const UNIT_WORK_STATUS_OPTIONS = [
  { value: "inProgress", label: "In Progress", color: "#f59e0b", icon: "🟡" },
  { value: "done",       label: "Done",         color: "#10b981", icon: "🟢" },
  { value: "needHelp",   label: "Need Help",    color: "#ef4444", icon: "🔴" },
];

export const DOC_COLORS = [
  "#00d4ff", "#7c3aed", "#ff6b35", "#10b981",
  "#f59e0b", "#ec4899", "#3b82f6", "#14b8a6",
];

export const generateViewerCode = () =>
  "SD" + Math.floor(1000 + Math.random() * 9000).toString();

export const getUnassigned = (patients, assignments) => {
  const assigned = new Set(Object.values(assignments).flat());
  return patients.filter((p) => !assigned.has(p.id));
};

export const getDoctorPatients = (docId, patients, assignments) => {
  return (assignments[docId] || []).map((id) => patients.find((p) => p.id === id)).filter(Boolean);
};

export const groupByLocation = (patients) => {
  const groups = {};
  patients.forEach((p) => {
    const loc = p.location || "Unspecified";
    if (!groups[loc]) groups[loc] = [];
    groups[loc].push(p);
  });
  return groups;
};

export const toISODate = (d) => d.toISOString().slice(0, 10);
export const todayISO  = () => toISODate(new Date());

// Detect new vs recurrent: compare incoming name+patientId against historical sessions
export const markNewRecurrent = (incomingPatients, sessions) => {
  // Build a set of all patientIds and normalised names seen in past sessions
  const seenIds   = new Set();
  const seenNames = new Set();
  sessions.forEach((s) => {
    (s.patients || []).forEach((p) => {
      if (p.patientId) seenIds.add(p.patientId.trim().toLowerCase());
      if (p.name)      seenNames.add(p.name.trim().toLowerCase());
    });
  });

  return incomingPatients.map((p) => {
    const idMatch   = p.patientId && seenIds.has(p.patientId.trim().toLowerCase());
    const nameMatch = p.name      && seenNames.has(p.name.trim().toLowerCase());
    return { ...p, isNew: !(idMatch || nameMatch) };
  });
};
