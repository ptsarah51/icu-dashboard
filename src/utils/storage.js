const KEY = "icu_react_v1";
const AUTH_KEY = "icu_admins_v1";
const VIEWER_CACHE_KEY = "icu_viewer_cache_v1";
const SESSION_KEY = "icu_admin_session_v1";
const SESSION_DURATION_MS = 60 * 60 * 1000; // 1 hour

export const DEFAULT_PASSCODE = "ICU2024";

// ── Admins ───────────────────────────────────────────────────
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
  try { localStorage.setItem(AUTH_KEY, JSON.stringify(admins)); } catch (e) { console.warn(e); }
}
function defaultAdmins() {
  return [{ id: "superadmin", label: "Head Consultant", code: DEFAULT_PASSCODE, isSuper: true }];
}

// ── Board state ──────────────────────────────────────────────
export function loadState() {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return defaultState();
    const p = JSON.parse(raw);
    return {
      doctors:     p.doctors     || [],
      patients:    p.patients    || [],
      assignments: p.assignments || {},
      sessions:    p.sessions    || [],
      lastSaved:   p.lastSaved   || null,
    };
  } catch { return defaultState(); }
}
export function saveState(state) {
  try { localStorage.setItem(KEY, JSON.stringify({ ...state, lastSaved: state.lastSaved || new Date().toISOString() })); }
  catch (e) { console.warn(e); }
}
function defaultState() {
  return { doctors: [], patients: [], assignments: {}, sessions: [], lastSaved: null };
}

// ── Viewer cache — lightweight, viewer-specific ──────────────
// Stores only doctors + assignments + patients so the viewer
// can render instantly from cache before Firebase responds.
export function saveViewerCache(board) {
  try {
    localStorage.setItem(VIEWER_CACHE_KEY, JSON.stringify({
      doctors:     board.doctors     || [],
      patients:    board.patients    || [],
      assignments: board.assignments || {},
      lastSaved:   board.lastSaved   || null,
      cachedAt:    Date.now(),
    }));
  } catch (e) { console.warn(e); }
}
export function loadViewerCache() {
  try {
    const raw = localStorage.getItem(VIEWER_CACHE_KEY);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch { return null; }
}

// ── Admin session (survives page refresh for 1 hour) ────────
export function saveAdminSession(admin) {
  try {
    localStorage.setItem(SESSION_KEY, JSON.stringify({
      admin,
      expiresAt: Date.now() + SESSION_DURATION_MS,
    }));
  } catch (e) { console.warn(e); }
}

export function loadAdminSession() {
  try {
    const raw = localStorage.getItem(SESSION_KEY);
    if (!raw) return null;
    const { admin, expiresAt } = JSON.parse(raw);
    if (Date.now() > expiresAt) {
      localStorage.removeItem(SESSION_KEY);
      return null;
    }
    return admin;
  } catch { return null; }
}

export function clearAdminSession() {
  try { localStorage.removeItem(SESSION_KEY); } catch (e) {}
}
