// ===== Timetable Helpers =====
// Maps recurring lesson definitions onto specific calendar days.

import { getDayOfWeek, timeToMinutes } from './dateHelpers';

/**
 * Given the full timetable data and an array of 5 week-day Dates,
 * returns an object keyed by dayOfWeek (1-5) with sorted lesson arrays.
 *
 * Each lesson gets the actual date attached to it.
 */
export function getLessonsForWeek(timetableData, weekDays) {
  if (!timetableData?.recurringLessons) return {};

  const classMap = {};
  if (timetableData.classes) {
    timetableData.classes.forEach((c) => {
      classMap[c.id] = c;
    });
  }

  const lessonsByDay = {};

  weekDays.forEach((date) => {
    const dayNum = getDayOfWeek(date); // 1=Mon ... 5=Fri
    const dayLessons = timetableData.recurringLessons
      .filter((rl) => rl.dayOfWeek === dayNum)
      .map((rl) => ({
        ...rl,
        date,
        className: classMap[rl.classId]?.name || rl.classId,
        classSize: classMap[rl.classId]?.classSize || null,
      }))
      .sort((a, b) => timeToMinutes(a.startTime) - timeToMinutes(b.startTime));

    lessonsByDay[dayNum] = dayLessons;
  });

  return lessonsByDay;
}

/**
 * Get the earliest start time and latest end time across all lessons,
 * so we can size the calendar grid properly.
 */
export function getTimeRange(timetableData) {
  if (!timetableData?.recurringLessons?.length) {
    return { startHour: 8, endHour: 16 }; // sensible defaults
  }

  let earliest = 24 * 60;
  let latest = 0;

  timetableData.recurringLessons.forEach((rl) => {
    const start = timeToMinutes(rl.startTime);
    const end = timeToMinutes(rl.endTime);
    if (start < earliest) earliest = start;
    if (end > latest) latest = end;
  });

  // Round down/up to nearest hour and add a small buffer
  return {
    startHour: Math.floor(earliest / 60),
    endHour: Math.ceil(latest / 60),
  };
}

/**
 * Get a color class based on subject name.
 * This creates visual variety in the timetable.
 */
export function getSubjectColor(subject) {
  if (!subject) return 'lesson-default';
  const s = subject.toLowerCase();
  if (s.includes('physics')) return 'lesson-physics';
  if (s.includes('math')) return 'lesson-maths';
  if (s.includes('chem')) return 'lesson-chemistry';
  if (s.includes('bio')) return 'lesson-biology';
  if (s.includes('eng')) return 'lesson-english';
  return 'lesson-default';
}

/**
 * Get a solid accent color for subject badges.
 */
export function getSubjectAccent(subject) {
  if (!subject) return '#81B29A';
  const s = subject.toLowerCase();
  if (s.includes('physics')) return '#81B29A';
  if (s.includes('math')) return '#E07A5F';
  if (s.includes('chem')) return '#3D405B';
  if (s.includes('bio')) return '#6A994E';
  if (s.includes('eng')) return '#BC6C25';
  return '#81B29A';
}

/**
 * Validate imported JSON structure.
 * Returns { valid: boolean, errors: string[] }
 */
export function validateTimetableJSON(data) {
  const errors = [];

  if (!data || typeof data !== 'object') {
    return { valid: false, errors: ['Invalid JSON: not an object'] };
  }

  if (!data.teacher) errors.push('Missing "teacher" field');
  if (!data.classes || !Array.isArray(data.classes)) errors.push('Missing or invalid "classes" array');
  if (!data.recurringLessons || !Array.isArray(data.recurringLessons)) {
    errors.push('Missing or invalid "recurringLessons" array');
  }

  // Validate individual lessons
  if (data.recurringLessons?.length) {
    data.recurringLessons.forEach((rl, i) => {
      if (!rl.dayOfWeek || rl.dayOfWeek < 1 || rl.dayOfWeek > 5) {
        errors.push(`Lesson ${i}: dayOfWeek must be 1-5`);
      }
      if (!rl.startTime || !/^\d{2}:\d{2}$/.test(rl.startTime)) {
        errors.push(`Lesson ${i}: startTime must be HH:MM format`);
      }
      if (!rl.endTime || !/^\d{2}:\d{2}$/.test(rl.endTime)) {
        errors.push(`Lesson ${i}: endTime must be HH:MM format`);
      }
    });
  }

  return { valid: errors.length === 0, errors };
}
