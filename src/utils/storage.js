// ===== LocalStorage Abstraction Layer =====
// All localStorage reads/writes go through these helpers.
// When migrating to a backend, only this file needs to change.

const KEYS = {
  TIMETABLE: 'timetableData',
  LESSON_SEQUENCE: 'lessonSequence',
  LESSON_SCHEDULE: 'lessonSchedule',
  TODOS: 'todos',
  SETTINGS: 'settings',
};

// ===== Timetable Data =====

export function getTimetableData() {
  const raw = localStorage.getItem(KEYS.TIMETABLE);
  return raw ? JSON.parse(raw) : null;
}

export function setTimetableData(data) {
  localStorage.setItem(KEYS.TIMETABLE, JSON.stringify(data));
}

export function clearTimetableData() {
  localStorage.removeItem(KEYS.TIMETABLE);
  localStorage.removeItem(KEYS.LESSON_SEQUENCE);
  localStorage.removeItem(KEYS.LESSON_SCHEDULE);
}

// ===== Lesson Sequence (Content) =====
// Structure: { classId: [{ id, title, notes, links, order }, ...] }

export function getLessonSequence() {
  const raw = localStorage.getItem(KEYS.LESSON_SEQUENCE);
  return raw ? JSON.parse(raw) : {};
}

export function setLessonSequence(sequence) {
  localStorage.setItem(KEYS.LESSON_SEQUENCE, JSON.stringify(sequence));
}

export function getClassLessonSequence(classId) {
  const allSequences = getLessonSequence();
  return allSequences[classId] || [];
}

export function setClassLessonSequence(classId, lessons) {
  const allSequences = getLessonSequence();
  allSequences[classId] = lessons;
  setLessonSequence(allSequences);
}

export function updateLessonInSequence(classId, lessonId, updates) {
  const lessons = getClassLessonSequence(classId);
  const index = lessons.findIndex(l => l.id === lessonId);
  
  if (index !== -1) {
    lessons[index] = { ...lessons[index], ...updates };
    setClassLessonSequence(classId, lessons);
  }
}

export function addLessonToSequence(classId, lesson) {
  const lessons = getClassLessonSequence(classId);
  const maxOrder = lessons.length > 0 ? Math.max(...lessons.map(l => l.order)) : -1;
  
  const newLesson = {
    id: `${classId}-lesson-${Date.now()}`,
    title: lesson.title || '',
    notes: lesson.notes || '',
    links: lesson.links || [],
    order: maxOrder + 1,
  };
  
  lessons.push(newLesson);
  setClassLessonSequence(classId, lessons);
  return newLesson;
}

export function deleteLessonFromSequence(classId, lessonId) {
  const lessons = getClassLessonSequence(classId);
  const filtered = lessons.filter(l => l.id !== lessonId);
  
  // Reorder remaining lessons
  filtered.forEach((lesson, index) => {
    lesson.order = index;
  });
  
  setClassLessonSequence(classId, filtered);
}

export function reorderLessonSequence(classId, lessonId, newOrder) {
  const lessons = getClassLessonSequence(classId);
  const lesson = lessons.find(l => l.id === lessonId);
  
  if (!lesson) return;
  
  const oldOrder = lesson.order;
  
  // Adjust orders of affected lessons
  lessons.forEach(l => {
    if (l.id === lessonId) {
      l.order = newOrder;
    } else if (oldOrder < newOrder && l.order > oldOrder && l.order <= newOrder) {
      l.order--;
    } else if (oldOrder > newOrder && l.order >= newOrder && l.order < oldOrder) {
      l.order++;
    }
  });
  
  // Sort by order
  lessons.sort((a, b) => a.order - b.order);
  
  setClassLessonSequence(classId, lessons);
}

// ===== Lesson Schedule (Mapping) =====
// Structure: { classId: { currentIndex: 0, schedule: { occurrenceNum: sequenceIndex } } }

export function getLessonSchedule() {
  const raw = localStorage.getItem(KEYS.LESSON_SCHEDULE);
  return raw ? JSON.parse(raw) : {};
}

export function setLessonSchedule(schedule) {
  localStorage.setItem(KEYS.LESSON_SCHEDULE, JSON.stringify(schedule));
}

export function getClassSchedule(classId) {
  const allSchedules = getLessonSchedule();
  return allSchedules[classId] || { currentIndex: 0, schedule: {} };
}

export function setClassSchedule(classId, scheduleData) {
  const allSchedules = getLessonSchedule();
  allSchedules[classId] = scheduleData;
  setLessonSchedule(allSchedules);
}

export function getLessonForOccurrence(classId, occurrenceNum) {
  const schedule = getClassSchedule(classId);
  const sequenceIndex = schedule.schedule[occurrenceNum];
  
  if (sequenceIndex === undefined) {
    // Auto-assign: map occurrence to sequence index
    const newSequenceIndex = schedule.currentIndex;
    schedule.schedule[occurrenceNum] = newSequenceIndex;
    schedule.currentIndex = newSequenceIndex + 1;
    setClassSchedule(classId, schedule);
    return newSequenceIndex;
  }
  
  return sequenceIndex;
}

export function pushBackAllLessons(classId, fromOccurrence) {
  const schedule = getClassSchedule(classId);
  const newSchedule = {};
  
  // Shift all mappings from fromOccurrence onwards
  Object.keys(schedule.schedule).forEach(occNum => {
    const num = parseInt(occNum);
    if (num >= fromOccurrence) {
      newSchedule[num + 1] = schedule.schedule[occNum];
    } else {
      newSchedule[num] = schedule.schedule[occNum];
    }
  });
  
  schedule.schedule = newSchedule;
  setClassSchedule(classId, schedule);
}

// ===== To-Do List =====

export function getTodos() {
  const raw = localStorage.getItem(KEYS.TODOS);
  return raw ? JSON.parse(raw) : [];
}

export function setTodos(todos) {
  localStorage.setItem(KEYS.TODOS, JSON.stringify(todos));
}

// ===== Settings =====

export function getSettings() {
  const raw = localStorage.getItem(KEYS.SETTINGS);
  if (raw) {
    return JSON.parse(raw);
  }
  
  // Default settings
  return {
    workdayStart: '09:00',
    workdayEnd: '16:00',
    holidayWeeks: [],
  };
}

export function setSettings(settings) {
  localStorage.setItem(KEYS.SETTINGS, JSON.stringify(settings));
}