// ===== localStorage Abstraction Layer =====
// All storage reads/writes go through here.
// When you move to a backend, only this file needs to change.

const KEYS = {
  TIMETABLE: 'timetableData',
  LESSONS: 'lessons',
  LESSON_INSTANCES: 'lessonInstances',
  LESSON_SEQUENCES: 'lessonSequences', // NEW: Lesson content sequences per class
  LESSON_SCHEDULES: 'lessonSchedules', // NEW: Schedule mapping (sequence index -> date)
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
// Keyed by classId, value is array of lesson objects in sequence order
// Each lesson: { id, title, notes, links, sequenceIndex }

export function getLessonSequences() {
  return getItem(KEYS.LESSON_SEQUENCES) || {};
}

export function setLessonSequences(sequences) {
  return setItem(KEYS.LESSON_SEQUENCES, sequences);
}

export function getClassSequence(classId) {
  const sequences = getLessonSequences();
  return sequences[classId] || [];
}

export function updateClassSequence(classId, lessons) {
  const sequences = getLessonSequences();
  sequences[classId] = lessons;
  setLessonSequences(sequences);
  return sequences;
}

export function addLessonToSequence(classId, lesson) {
  const sequence = getClassSequence(classId);
  const newLesson = {
    id: `${classId}-lesson-${Date.now()}`,
    title: lesson.title || '',
    notes: lesson.notes || '',
    links: lesson.links || [],
    sequenceIndex: sequence.length,
    ...lesson,
  };
  sequence.push(newLesson);
  return updateClassSequence(classId, sequence);
}

export function updateLessonInSequence(classId, lessonId, updates) {
  const sequence = getClassSequence(classId);
  const updatedSequence = sequence.map(lesson =>
    lesson.id === lessonId ? { ...lesson, ...updates } : lesson
  );
  return updateClassSequence(classId, updatedSequence);
}

export function deleteLessonFromSequence(classId, lessonId) {
  const sequence = getClassSequence(classId);
  const updatedSequence = sequence
    .filter(lesson => lesson.id !== lessonId)
    .map((lesson, index) => ({ ...lesson, sequenceIndex: index }));
  return updateClassSequence(classId, updatedSequence);
}

export function reorderLessonSequence(classId, fromIndex, toIndex) {
  const sequence = getClassSequence(classId);
  const result = Array.from(sequence);
  const [removed] = result.splice(fromIndex, 1);
  result.splice(toIndex, 0, removed);
  const reindexed = result.map((lesson, index) => ({ ...lesson, sequenceIndex: index }));
  return updateClassSequence(classId, reindexed);
}

// ---- Lesson Schedules ----
// Maps lesson sequence positions to calendar dates
// Keyed by classId, value is array of schedule entries
// Each entry: { sequenceIndex, date }

export function getLessonSchedules() {
  return getItem(KEYS.LESSON_SCHEDULES) || {};
}

export function setLessonSchedules(schedules) {
  return setItem(KEYS.LESSON_SCHEDULES, schedules);
}

export function getClassSchedule(classId) {
  const schedules = getLessonSchedules();
  return schedules[classId] || [];
}

export function updateClassSchedule(classId, schedule) {
  const schedules = getLessonSchedules();
  schedules[classId] = schedule;
  setLessonSchedules(schedules);
  return schedules;
}

export function scheduleLesson(classId, sequenceIndex, date) {
  const schedule = getClassSchedule(classId);
  const dateStr = typeof date === 'string' ? date : date.toISOString().split('T')[0];
  
  // Remove any existing schedule for this date
  const filtered = schedule.filter(entry => entry.date !== dateStr);
  
  // Add new schedule entry
  filtered.push({ sequenceIndex, date: dateStr });
  
  // Sort by date
  filtered.sort((a, b) => a.date.localeCompare(b.date));
  
  return updateClassSchedule(classId, filtered);
}

export function unscheduleLesson(classId, date) {
  const schedule = getClassSchedule(classId);
  const dateStr = typeof date === 'string' ? date : date.toISOString().split('T')[0];
  const filtered = schedule.filter(entry => entry.date !== dateStr);
  return updateClassSchedule(classId, filtered);
}

export function getScheduledLessonForDate(classId, date) {
  const schedules = getLessonSchedules();
  if (!schedules) return null;
  
  const dateStr = typeof date === 'string' ? date.split('T')[0] : date;
  
  // Get the schedule for this class
  const classSchedule = schedules[classId];
  if (!classSchedule || typeof classSchedule !== 'object') return null;
  
  // Get the sequence index for this date
  const sequenceIndex = classSchedule[dateStr];
  if (sequenceIndex === undefined) return null;
  
  return { date: dateStr, sequenceIndex };
}

export function pushBackSchedule(classId, fromDate, shiftAmount = 1) {
  const schedule = getClassSchedule(classId);
  const fromDateStr = typeof fromDate === 'string' ? fromDate : fromDate.toISOString().split('T')[0];
  
  const updatedSchedule = schedule.map(entry => {
    if (entry.date >= fromDateStr) {
      const date = new Date(entry.date);
      date.setDate(date.getDate() + shiftAmount);
      return { ...entry, date: date.toISOString().split('T')[0] };
    }
    return entry;
  });
  
  return updateClassSchedule(classId, updatedSchedule);
}

// ---- Legacy Lesson Instances (deprecated, kept for migration) ----
// Old system: keyed by "classId::YYYY-MM-DD"
// Will be migrated to new sequence/schedule system

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

// ---- To-Do List ----
// Array of tasks: [{ id, text, priority, completed, createdAt, scheduledSlot }]

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