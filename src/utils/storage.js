const KEY = "icu_react_v1";
const AUTH_KEY = "icu_admins_v1";

// Default superadmin passcode — shown on first launch
export const DEFAULT_PASSCODE = "ICU2024";

export function loadAdmins() {
  try {
    const raw = localStorage.getItem(AUTH_KEY);
    if (!raw) return defaultAdmins();
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) && parsed.length > 0 ? parsed : defaultAdmins();
  } catch {
    return defaultAdmins();
  }
}

export function saveAdmins(admins) {
  try {
    localStorage.setItem(AUTH_KEY, JSON.stringify(admins));
  } catch (e) {
    console.warn("Save admins failed", e);
  }
}

function defaultAdmins() {
  // Seed with one superadmin on first use
  return [{ id: "superadmin", label: "Head Consultant", code: DEFAULT_PASSCODE, isSuper: true }];
}

export function checkPasscode(code, admins) {
  return admins.find((a) => a.code === code.trim()) || null;
}

export function loadState() {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return defaultState();
    const p = JSON.parse(raw);
    return {
      doctors: p.doctors || [],
      patients: p.patients || [],
      assignments: p.assignments || {},
      sessions: p.sessions || [],
      lastSaved: p.lastSaved || null,
    };
  } catch {
    return defaultState();
  }
}

export function saveState(state) {
  try {
    localStorage.setItem(KEY, JSON.stringify({ ...state, lastSaved: state.lastSaved || new Date().toISOString() }));
  } catch (e) {
    console.warn("Save failed", e);
  }
}

function defaultState() {
  return { doctors: [], patients: [], assignments: {}, sessions: [], lastSaved: null };
}
