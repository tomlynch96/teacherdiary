// ===== localStorage Abstraction Layer =====
// All storage reads/writes go through here.
// When you move to a backend, only this file needs to change.

const KEYS = {
  TIMETABLE: 'timetableData',
  LESSONS: 'lessons',
  LESSON_INSTANCES: 'lessonInstances', // kept for migration only
  LESSON_SEQUENCES: 'lessonSequences',
  LESSON_SCHEDULES: 'lessonSchedules',
  TODOS: 'todos',
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
  removeItem(KEYS.LESSON_SEQUENCES);
  removeItem(KEYS.LESSON_SCHEDULES);
}

// ---- Lesson Sequences ----
// Structure: { classId: [ { id, title, notes, links, order }, ... ] }
// This is the CONTENT of lessons, independent of dates.

export function getLessonSequences() {
  return getItem(KEYS.LESSON_SEQUENCES) || {};
}

export function setLessonSequences(sequences) {
  return setItem(KEYS.LESSON_SEQUENCES, sequences);
}

/**
 * Get the ordered lesson sequence for a single class.
 * Returns array sorted by `order`.
 */
export function getClassSequence(classId) {
  const all = getLessonSequences();
  const seq = all[classId] || [];
  return [...seq].sort((a, b) => a.order - b.order);
}

/**
 * Add a new lesson to a class's sequence at the end.
 * Returns the new lesson object.
 */
export function addLessonToSequence(classId, data = {}) {
  const all = getLessonSequences();
  const seq = all[classId] || [];
  const maxOrder = seq.length > 0 ? Math.max(...seq.map(l => l.order)) + 1 : 0;
  const newLesson = {
    id: `${classId}-lesson-${Date.now()}`,
    title: data.title || '',
    notes: data.notes || '',
    links: data.links || [],
    order: maxOrder,
  };
  all[classId] = [...seq, newLesson];
  setLessonSequences(all);
  return newLesson;
}

/**
 * Update a lesson within a class's sequence.
 * `updates` can include title, notes, links.
 */
export function updateLessonInSequence(classId, lessonId, updates) {
  const all = getLessonSequences();
  const seq = all[classId] || [];
  all[classId] = seq.map(l => l.id === lessonId ? { ...l, ...updates } : l);
  setLessonSequences(all);
}

/**
 * Delete a lesson from a class's sequence and reorder remaining.
 */
export function deleteLessonFromSequence(classId, lessonId) {
  const all = getLessonSequences();
  const seq = (all[classId] || []).filter(l => l.id !== lessonId);
  // Re-number order to be contiguous
  seq.sort((a, b) => a.order - b.order).forEach((l, i) => { l.order = i; });
  all[classId] = seq;
  setLessonSequences(all);
}

/**
 * Reorder lessons within a class's sequence.
 * `orderedIds` is an array of lesson IDs in the new desired order.
 */
export function reorderClassSequence(classId, orderedIds) {
  const all = getLessonSequences();
  const seq = all[classId] || [];
  const lookup = new Map(seq.map(l => [l.id, l]));
  all[classId] = orderedIds.map((id, i) => {
    const lesson = lookup.get(id);
    if (lesson) return { ...lesson, order: i };
    return null;
  }).filter(Boolean);
  setLessonSequences(all);
}

// ---- Lesson Schedules ----
// Structure: { classId: { startIndex: 0 } }
// startIndex = which lesson in the sequence maps to the FIRST timetable occurrence.
// Occurrence N gets lesson at sequence index (startIndex + N).
// "Push back" simply increments startIndex.
// This means: occurrence 0 → sequence[startIndex], occurrence 1 → sequence[startIndex+1], etc.

export function getLessonSchedules() {
  return getItem(KEYS.LESSON_SCHEDULES) || {};
}

export function setLessonSchedules(schedules) {
  return setItem(KEYS.LESSON_SCHEDULES, schedules);
}

/**
 * Get the schedule for a single class.
 * Returns { startIndex: number }
 */
export function getClassSchedule(classId) {
  const all = getLessonSchedules();
  return all[classId] || { startIndex: 0 };
}

/**
 * Update the schedule for a class.
 */
export function setClassSchedule(classId, schedule) {
  const all = getLessonSchedules();
  all[classId] = schedule;
  setLessonSchedules(all);
}

/**
 * Given a class and timetable occurrence number, get the lesson content.
 * Returns the lesson object from the sequence, or null if none mapped.
 */
export function getLessonForOccurrence(classId, occurrenceNum) {
  const schedule = getClassSchedule(classId);
  const sequenceIndex = schedule.startIndex + occurrenceNum;
  const sequence = getClassSequence(classId);
  if (sequenceIndex < 0 || sequenceIndex >= sequence.length) return null;
  return sequence[sequenceIndex];
}

// ---- To-Do List ----

export function getTodos() {
  return getItem(KEYS.TODOS) || [];
}

export function setTodos(todos) {
  return setItem(KEYS.TODOS, todos);
}

export function clearTodos() {
  removeItem(KEYS.TODOS);
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

// ---- Migration: convert old lessonInstances to new sequences ----
// Call this once on first load if old data exists.

export function migrateFromLessonInstances(timetableData, generateOccurrencesFn) {
  const oldInstances = getItem(KEYS.LESSON_INSTANCES);
  const existingSequences = getItem(KEYS.LESSON_SEQUENCES);

  // Only migrate if old data exists and new data doesn't
  if (!oldInstances || existingSequences) return false;

  const sequences = {};
  const schedules = {};

  // Group old instances by classId
  const byClass = {};
  for (const [key, data] of Object.entries(oldInstances)) {
    const [classId, dateStr] = key.split('::');
    if (!classId || !dateStr) continue;
    if (!data.title && !data.notes && (!data.links || data.links.length === 0)) continue;
    if (!byClass[classId]) byClass[classId] = [];
    byClass[classId].push({ dateStr, ...data });
  }

  // For each class, sort by date and create sequence
  for (const [classId, instances] of Object.entries(byClass)) {
    instances.sort((a, b) => a.dateStr.localeCompare(b.dateStr));
    sequences[classId] = instances.map((inst, i) => ({
      id: `${classId}-migrated-${i}`,
      title: inst.title || '',
      notes: inst.notes || '',
      links: inst.links || [],
      order: i,
    }));
    schedules[classId] = { startIndex: 0 };
  }

  setLessonSequences(sequences);
  setLessonSchedules(schedules);

  return true;
}