// ===== localStorage Abstraction Layer =====
// All storage reads/writes go through here.
// When you move to a backend, only this file needs to change.

const KEYS = {
  TIMETABLE: 'timetableData',
  LESSONS: 'lessons',
  LESSON_INSTANCES: 'lessonInstances',
  SETTINGS: 'settings',
};

// ---- Generic helpers ----

function getItem(key) {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : null;
  } catch (err) {
    console.error(`Error reading ${key} from localStorage:`, err);
    return null;
  }
}

function setItem(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
    return true;
  } catch (err) {
    console.error(`Error writing ${key} to localStorage:`, err);
    return false;
  }
}

function removeItem(key) {
  localStorage.removeItem(key);
}

// ---- Timetable data ----

export function getTimetableData() {
  return getItem(KEYS.TIMETABLE);
}

export function setTimetableData(data) {
  return setItem(KEYS.TIMETABLE, data);
}

export function clearTimetableData() {
  removeItem(KEYS.TIMETABLE);
  removeItem(KEYS.LESSONS);
  removeItem(KEYS.LESSON_INSTANCES);
}

// ---- Lesson Instances ----
// Keyed by "classId::YYYY-MM-DD" e.g. "12G2::2026-02-09"
// Each value: { title, notes, links: [{url, label}] }

export function getLessonInstances() {
  return getItem(KEYS.LESSON_INSTANCES) || {};
}

export function setLessonInstances(instances) {
  return setItem(KEYS.LESSON_INSTANCES, instances);
}

export function updateLessonInstance(key, updates) {
  const all = getLessonInstances();
  const existing = all[key] || { title: '', notes: '', links: [] };
  all[key] = { ...existing, ...updates };
  setLessonInstances(all);
  return all;
}

// ---- Settings ----

export function getSettings() {
  return getItem(KEYS.SETTINGS) || { theme: 'light' };
}

export function setSettings(settings) {
  return setItem(KEYS.SETTINGS, settings);
}

// ---- Check if data is loaded ----

export function hasData() {
  return !!getItem(KEYS.TIMETABLE);
}