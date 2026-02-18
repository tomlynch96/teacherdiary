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
// Structure: { classId: [ { id, title, notes, links, order, topicId?, topicName?, linkedSourceId? }, ... ] }
// This is the CONTENT of lessons, independent of dates.
//
// Topic fields:
//   topicId   - unique ID grouping lessons into a topic (null = ungrouped)
//   topicName - display name of the topic
//
// Linked lesson fields:
//   linkedSourceId - if set, this lesson mirrors another lesson's content.
//                    Format: "classId::lessonId" pointing to the source lesson.
//                    When a linked lesson is edited, the source (and all its links) update too.

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
    topicId: data.topicId || null,
    topicName: data.topicName || null,
    linkedSourceId: data.linkedSourceId || null,
  };
  all[classId] = [...seq, newLesson];
  setLessonSequences(all);
  return newLesson;
}

/**
 * Update a lesson within a class's sequence.
 * `updates` can include title, notes, links, topicId, topicName.
 *
 * If the lesson has a linkedSourceId, also update the source lesson
 * and all other lessons linked to the same source.
 */
export function updateLessonInSequence(classId, lessonId, updates) {
  const all = getLessonSequences();
  const seq = all[classId] || [];
  const lesson = seq.find(l => l.id === lessonId);

  // Determine which fields are "content" fields that should propagate to linked lessons
  const contentFields = {};
  const metaFields = {};
  for (const [key, value] of Object.entries(updates)) {
    if (['title', 'notes', 'links'].includes(key)) {
      contentFields[key] = value;
    } else {
      metaFields[key] = value;
    }
  }

  // Update the lesson itself (all fields)
  all[classId] = seq.map(l => l.id === lessonId ? { ...l, ...updates } : l);

  // If there are content updates and this lesson is linked, propagate
  if (Object.keys(contentFields).length > 0 && lesson) {
    const sourceRef = lesson.linkedSourceId; // e.g. "12G2::12G2-lesson-123"

    if (sourceRef) {
      // This lesson IS a linked copy — update the source and all siblings
      const [sourceClassId, sourceLessonId] = sourceRef.split('::');
      const sourceKey = sourceRef;

      // Update the source lesson
      if (all[sourceClassId]) {
        all[sourceClassId] = all[sourceClassId].map(l =>
          l.id === sourceLessonId ? { ...l, ...contentFields } : l
        );
      }

      // Update all other lessons that link to the same source
      for (const cId of Object.keys(all)) {
        all[cId] = all[cId].map(l => {
          if (l.linkedSourceId === sourceKey && !(cId === classId && l.id === lessonId)) {
            return { ...l, ...contentFields };
          }
          return l;
        });
      }
    }

    // If this lesson IS a source for other linked lessons, propagate to them
    const thisRef = `${classId}::${lessonId}`;
    for (const cId of Object.keys(all)) {
      all[cId] = all[cId].map(l => {
        if (l.linkedSourceId === thisRef) {
          return { ...l, ...contentFields };
        }
        return l;
      });
    }
  }

  setLessonSequences(all);
}

/**
 * Delete a lesson from a class's sequence and reorder remaining.
 * If the lesson is a linked source, unlink all copies (they become independent).
 */
export function deleteLessonFromSequence(classId, lessonId) {
  const all = getLessonSequences();

  // Before deleting, unlink any lessons that point to this one
  const thisRef = `${classId}::${lessonId}`;
  for (const cId of Object.keys(all)) {
    all[cId] = (all[cId] || []).map(l => {
      if (l.linkedSourceId === thisRef) {
        return { ...l, linkedSourceId: null };
      }
      return l;
    });
  }

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

// ---- Topic Management ----

/**
 * Get unique topics from a class's lesson sequence.
 * Returns array of { topicId, topicName, lessonCount }.
 */
export function getClassTopics(classId) {
  const seq = getClassSequence(classId);
  const topicMap = new Map();
  for (const lesson of seq) {
    if (lesson.topicId) {
      if (!topicMap.has(lesson.topicId)) {
        topicMap.set(lesson.topicId, { topicId: lesson.topicId, topicName: lesson.topicName, lessonCount: 0 });
      }
      topicMap.get(lesson.topicId).lessonCount++;
    }
  }
  return Array.from(topicMap.values());
}

/**
 * Assign a topic to a lesson.
 */
export function setLessonTopic(classId, lessonId, topicId, topicName) {
  updateLessonInSequence(classId, lessonId, { topicId, topicName });
}

/**
 * Rename a topic across all lessons in a class that have that topicId.
 */
export function renameTopic(classId, topicId, newName) {
  const all = getLessonSequences();
  const seq = all[classId] || [];
  all[classId] = seq.map(l =>
    l.topicId === topicId ? { ...l, topicName: newName } : l
  );
  setLessonSequences(all);
}

/**
 * Remove topic grouping from all lessons with a given topicId in a class.
 * (Lessons remain, just ungrouped.)
 */
export function removeTopic(classId, topicId) {
  const all = getLessonSequences();
  const seq = all[classId] || [];
  all[classId] = seq.map(l =>
    l.topicId === topicId ? { ...l, topicId: null, topicName: null } : l
  );
  setLessonSequences(all);
}

/**
 * Copy an entire topic's lessons from one class to another.
 *
 * @param {string} sourceClassId - class to copy from
 * @param {string} topicId - which topic to copy
 * @param {string} targetClassId - class to copy to
 * @param {boolean} linked - if true, copies are linked to the source lessons
 *                           (editing one updates all). If false, independent copies.
 * @returns {number} number of lessons copied
 */
export function copyTopicToClass(sourceClassId, topicId, targetClassId, linked = false) {
  const all = getLessonSequences();
  const sourceSeq = (all[sourceClassId] || []).filter(l => l.topicId === topicId);
  if (sourceSeq.length === 0) return 0;

  // Sort by order to maintain lesson ordering
  sourceSeq.sort((a, b) => a.order - b.order);

  const targetSeq = all[targetClassId] || [];
  const maxOrder = targetSeq.length > 0 ? Math.max(...targetSeq.map(l => l.order)) + 1 : 0;

  // Generate a new topicId for the target class's copies
  const newTopicId = linked ? topicId : `topic-${Date.now()}`;

  const newLessons = sourceSeq.map((lesson, i) => ({
    id: `${targetClassId}-lesson-${Date.now()}-${i}`,
    title: lesson.title,
    notes: lesson.notes,
    links: lesson.links ? JSON.parse(JSON.stringify(lesson.links)) : [],
    order: maxOrder + i,
    topicId: newTopicId,
    topicName: lesson.topicName,
    linkedSourceId: linked ? `${sourceClassId}::${lesson.id}` : null,
  }));

  all[targetClassId] = [...targetSeq, ...newLessons];
  setLessonSequences(all);
  return newLessons.length;
}

/**
 * Add a lesson to a topic, and if that topic has linked copies in other classes,
 * automatically create linked copies there too.
 *
 * @param {string} classId - class to add the lesson to
 * @param {string} topicId - topic to add the lesson into
 * @param {string} topicName - display name of the topic
 * @param {object} data - lesson data (title, notes, links, etc.)
 * @returns {object} the new lesson object
 */
export function addLessonToLinkedTopic(classId, topicId, topicName, data = {}) {
  const all = getLessonSequences();

  // 1. Add the lesson to the source class, positioned after the last lesson in this topic
  const seq = all[classId] || [];
  const topicLessons = seq.filter(l => l.topicId === topicId).sort((a, b) => a.order - b.order);
  
  // Find the insertion point: right after the last lesson in this topic
  let insertAfterOrder;
  if (topicLessons.length > 0) {
    insertAfterOrder = topicLessons[topicLessons.length - 1].order;
  } else {
    // Topic has no lessons yet (shouldn't normally happen), append at end
    insertAfterOrder = seq.length > 0 ? Math.max(...seq.map(l => l.order)) : -1;
  }

  // Shift all lessons after the insertion point up by 1
  const updatedSeq = seq.map(l => 
    l.order > insertAfterOrder ? { ...l, order: l.order + 1 } : l
  );

  const newLesson = {
    id: `${classId}-lesson-${Date.now()}`,
    title: data.title || '',
    notes: data.notes || '',
    links: data.links || [],
    order: insertAfterOrder + 1,
    topicId: topicId,
    topicName: topicName,
    linkedSourceId: null,
  };

  all[classId] = [...updatedSeq, newLesson];

  // 2. Check if any lessons in this topic have linked copies elsewhere,
  //    which means this topic was copied as linked to other classes.
  //    Find all classes that have lessons linked to lessons in this topic.
  const sourceTopicLessonIds = new Set(
    [...topicLessons, newLesson].map(l => `${classId}::${l.id}`)
  );

  // Find classes that have linked copies of lessons in this topic
  const linkedClassesMap = new Map(); // classId -> topicId used in that class
  for (const cId of Object.keys(all)) {
    if (cId === classId) continue;
    for (const l of (all[cId] || [])) {
      if (l.linkedSourceId) {
        const [srcClassId] = l.linkedSourceId.split('::');
        if (srcClassId === classId && l.topicId) {
          // Check if the source lesson is in our topic
          const srcLesson = (all[classId] || []).find(sl => `${classId}::${sl.id}` === l.linkedSourceId);
          if (srcLesson && srcLesson.topicId === topicId) {
            linkedClassesMap.set(cId, l.topicId);
          }
        }
      }
    }
  }

  // 3. Create linked copies in each linked class
  for (const [targetClassId, targetTopicId] of linkedClassesMap) {
    const targetSeq = all[targetClassId] || [];
    const targetTopicLessons = targetSeq.filter(l => l.topicId === targetTopicId).sort((a, b) => a.order - b.order);
    
    let targetInsertAfterOrder;
    if (targetTopicLessons.length > 0) {
      targetInsertAfterOrder = targetTopicLessons[targetTopicLessons.length - 1].order;
    } else {
      targetInsertAfterOrder = targetSeq.length > 0 ? Math.max(...targetSeq.map(l => l.order)) : -1;
    }

    const updatedTargetSeq = targetSeq.map(l =>
      l.order > targetInsertAfterOrder ? { ...l, order: l.order + 1 } : l
    );

    const linkedCopy = {
      id: `${targetClassId}-lesson-${Date.now()}-linked`,
      title: data.title || '',
      notes: data.notes || '',
      links: data.links ? JSON.parse(JSON.stringify(data.links)) : [],
      order: targetInsertAfterOrder + 1,
      topicId: targetTopicId,
      topicName: topicName,
      linkedSourceId: `${classId}::${newLesson.id}`,
    };

    all[targetClassId] = [...updatedTargetSeq, linkedCopy];
  }

  setLessonSequences(all);
  return newLesson;
}

/**
 * Check if a lesson has linked copies anywhere.
 * Returns true if any lesson in any class has linkedSourceId pointing to this lesson.
 */
export function hasLinkedCopies(classId, lessonId) {
  const all = getLessonSequences();
  const ref = `${classId}::${lessonId}`;
  for (const cId of Object.keys(all)) {
    for (const l of (all[cId] || [])) {
      if (l.linkedSourceId === ref) return true;
    }
  }
  return false;
}

/**
 * Unlink a lesson — make it independent of its source.
 * Content remains as-is but future edits won't propagate.
 */
export function unlinkLesson(classId, lessonId) {
  const all = getLessonSequences();
  const seq = all[classId] || [];
  all[classId] = seq.map(l =>
    l.id === lessonId ? { ...l, linkedSourceId: null } : l
  );
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
 * startIndex = how many timetable slots are skipped (push back).
 * So occurrence 0 with startIndex 2 means the first two slots have no lesson,
 * and occurrence 2 maps to sequence[0].
 */
export function getLessonForOccurrence(classId, occurrenceNum) {
  const schedule = getClassSchedule(classId);
  const sequenceIndex = occurrenceNum - schedule.startIndex;
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
// Settings now includes:
// - workHoursStart: "HH:MM" string for day start (default "09:00")
// - workHoursEnd: "HH:MM" string for day end (default "16:00")
// - holidays: array of { id, name, startDate, endDate, weekMondays: string[] }
//   weekMondays contains ISO date strings of each Monday that falls within the holiday

const DEFAULT_SETTINGS = {
  theme: 'light',
  workHoursStart: '09:00',
  workHoursEnd: '16:00',
  holidays: [],
};

export function getSettings() {
  const saved = getItem(KEYS.SETTINGS);
  return { ...DEFAULT_SETTINGS, ...saved };
}

export function setSettings(settings) {
  return setItem(KEYS.SETTINGS, settings);
}

/**
 * Get all holiday week Monday ISO strings as a flat Set for quick lookup.
 * Used by generateTimetableOccurrences to skip holiday weeks.
 * Only includes full weeks (all 5 weekdays covered).
 */
export function getHolidayWeekMondays() {
  const settings = getSettings();
  const mondays = new Set();
  (settings.holidays || []).forEach(h => {
    (h.weekMondays || []).forEach(m => mondays.add(m));
  });
  return mondays;
}

/**
 * Get all individual holiday dates as a flat Set for quick lookup.
 * Used by WeekView to detect partial holiday days (e.g. bank holidays).
 */
export function getHolidayDates() {
  const settings = getSettings();
  const dates = new Set();
  (settings.holidays || []).forEach(h => {
    (h.holidayDates || []).forEach(d => dates.add(d));
  });
  return dates;
}

/**
 * Find the holiday name for a given date ISO string.
 * Returns the holiday name or null.
 */
export function getHolidayNameForDate(dateISO) {
  const settings = getSettings();
  for (const h of (settings.holidays || [])) {
    if (h.holidayDates && h.holidayDates.includes(dateISO)) {
      return h.name;
    }
    // Fallback: check if date falls within start/end range
    if (dateISO >= h.startDate && dateISO <= h.endDate) {
      return h.name;
    }
  }
  return null;
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
      topicId: null,
      topicName: null,
      linkedSourceId: null,
    }));
    schedules[classId] = { startIndex: 0 };
  }

  setLessonSequences(sequences);
  setLessonSchedules(schedules);

  return true;
}