// ===== Timetable Helpers =====
// Maps recurring lesson definitions onto specific calendar days.
// Supports both single-week and two-week timetable rotations.

import { getDayOfWeek, timeToMinutes, getWeekNumber, getMonday, formatDateISO } from './dateHelpers';

/**
 * Given the full timetable data and an array of 5 week-day Dates,
 * returns an object keyed by dayOfWeek (1-5) with sorted lesson arrays.
 *
 * For two-week timetables, we calculate which week (1 or 2) each date
 * falls in, and only show lessons matching that week number.
 */
export function getLessonsForWeek(timetableData, weekDays) {
  if (!timetableData?.recurringLessons) return {};

  const isTwoWeek = !!timetableData.twoWeekTimetable;
  const anchorDate = timetableData.teacher?.exportDate;

  // Build a lookup map for class details
  const classMap = {};
  if (timetableData.classes) {
    timetableData.classes.forEach((c) => {
      classMap[c.id] = c;
    });
  }

  const lessonsByDay = {};

  weekDays.forEach((date) => {
    const dayNum = getDayOfWeek(date); // 1=Mon ... 5=Fri

    // For two-week timetables, determine if this date is in week 1 or 2
    const currentWeekNum = isTwoWeek && anchorDate
      ? getWeekNumber(date, anchorDate)
      : null;

    const dayLessons = timetableData.recurringLessons
      .filter((rl) => {
        if (rl.dayOfWeek !== dayNum) return false;
        if (isTwoWeek && currentWeekNum !== null && rl.weekNumber !== currentWeekNum) return false;
        return true;
      })
      .map((rl) => ({
        ...rl,
        date,
        className: classMap[rl.classId]?.name || rl.classId,
        classSize: classMap[rl.classId]?.classSize || null,
        timetableCode: classMap[rl.classId]?.timetableCode || null,
      }))
      .sort((a, b) => timeToMinutes(a.startTime) - timeToMinutes(b.startTime));

    lessonsByDay[dayNum] = dayLessons;
  });

  return lessonsByDay;
}

/**
 * Get duties (break duty, line manage, detention) for the given week.
 */
export function getDutiesForWeek(timetableData, weekDays) {
  if (!timetableData?.duties?.length) return {};

  const isTwoWeek = !!timetableData.twoWeekTimetable;
  const anchorDate = timetableData.teacher?.exportDate;

  const dutiesByDay = {};

  weekDays.forEach((date) => {
    const dayNum = getDayOfWeek(date);
    const currentWeekNum = isTwoWeek && anchorDate
      ? getWeekNumber(date, anchorDate)
      : null;

    dutiesByDay[dayNum] = (timetableData.duties || []).filter((d) => {
      if (d.day !== dayNum) return false;
      if (isTwoWeek && currentWeekNum !== null && d.week !== currentWeekNum) return false;
      return true;
    });
  });

  return dutiesByDay;
}

/**
 * Get the earliest start time and latest end time across all lessons.
 */
export function getTimeRange(timetableData) {
  if (!timetableData?.recurringLessons?.length) {
    return { startHour: 8, endHour: 16 };
  }

  let earliest = 24 * 60;
  let latest = 0;

  timetableData.recurringLessons.forEach((rl) => {
    const start = timeToMinutes(rl.startTime);
    const end = timeToMinutes(rl.endTime);
    if (start < earliest) earliest = start;
    if (end > latest) latest = end;
  });

  return {
    startHour: Math.floor(earliest / 60),
    endHour: Math.ceil(latest / 60),
  };
}

/**
 * A palette of 12 visually distinct, warm-professional colors.
 * Each class gets assigned a unique color by index.
 */
const CLASS_PALETTE = [
  '#81B29A', // sage
  '#E07A5F', // terracotta
  '#3D405B', // navy
  '#6A994E', // forest
  '#BC6C25', // amber
  '#7B68EE', // medium slate blue
  '#D4A373', // tan
  '#457B9D', // steel blue
  '#E63946', // red
  '#2A9D8F', // teal
  '#A855F7', // purple
  '#F4845F', // coral
];

/**
 * Get a consistent color for a class based on its position in the
 * classes array.
 */
export function getClassColor(classId, classes) {
  if (!classes || !classId) return CLASS_PALETTE[0];
  const index = classes.findIndex((c) => c.id === classId);
  if (index === -1) return CLASS_PALETTE[0];
  return CLASS_PALETTE[index % CLASS_PALETTE.length];
}

export { CLASS_PALETTE };

/**
 * Merge consecutive half-periods for the same class into single blocks.
 */
export function mergeConsecutiveLessons(lessons) {
  if (!lessons || lessons.length === 0) return [];

  const sorted = [...lessons].sort(
    (a, b) => timeToMinutes(a.startTime) - timeToMinutes(b.startTime)
  );

  const merged = [];
  let current = { ...sorted[0] };

  for (let i = 1; i < sorted.length; i++) {
    const next = sorted[i];

    if (current.classId === next.classId && current.endTime === next.startTime) {
      current.endTime = next.endTime;
      const firstPeriod = current.period.split('–')[0];
      current.period = `${firstPeriod}–${next.period}`;
    } else {
      merged.push(current);
      current = { ...next };
    }
  }
  merged.push(current);

  return merged;
}

/**
 * Validate imported JSON structure.
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
      if (data.twoWeekTimetable && !rl.weekNumber) {
        errors.push(`Lesson ${i}: weekNumber required for two-week timetable`);
      }
    });
  }

  return { valid: errors.length === 0, errors };
}

/**
 * Generate a storage key for a lesson instance (kept for backward compat).
 */
export function lessonInstanceKey(classId, date) {
  const dateStr = typeof date === 'string' ? date : formatDateISO(date);
  return `${classId}::${dateStr}`;
}

/**
 * Generate timetable occurrences for a class — a numbered list of
 * every future timetable slot. Each occurrence gets a sequential number
 * which is used to map to the lesson sequence.
 *
 * @param {string} classId
 * @param {object} timetableData
 * @param {number} weeksAhead
 * @returns {Array} sorted array of { occurrenceNum, date, dateISO, dayName, startTime, endTime, period, room, classId }
 */
export function generateTimetableOccurrences(classId, timetableData, weeksAhead = 26) {
  if (!timetableData?.recurringLessons) return [];

  const isTwoWeek = !!timetableData.twoWeekTimetable;
  const anchorDate = timetableData.teacher?.exportDate;
  const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

  const classLessons = timetableData.recurringLessons.filter(
    (rl) => rl.classId === classId
  );
  if (classLessons.length === 0) return [];

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const startMonday = getMonday(today);

  const results = [];
  let occurrenceNum = 0;

  for (let w = 0; w < weeksAhead; w++) {
    const weekStart = new Date(startMonday);
    weekStart.setDate(startMonday.getDate() + w * 7);

    const weekNum = isTwoWeek && anchorDate
      ? getWeekNumber(weekStart, anchorDate)
      : null;

    for (let d = 0; d < 5; d++) {
      const date = new Date(weekStart);
      date.setDate(weekStart.getDate() + d);

      if (date < today) continue;

      const dayOfWeek = d + 1;

      const dayLessons = classLessons
        .filter((rl) => {
          if (rl.dayOfWeek !== dayOfWeek) return false;
          if (isTwoWeek && weekNum !== null && rl.weekNumber !== weekNum) return false;
          return true;
        })
        .sort((a, b) => timeToMinutes(a.startTime) - timeToMinutes(b.startTime));

      const merged = mergeConsecutiveLessons(dayLessons);

      for (const lesson of merged) {
        results.push({
          occurrenceNum,
          date: new Date(date),
          dateISO: formatDateISO(date),
          dayName: dayNames[date.getDay()],
          startTime: lesson.startTime,
          endTime: lesson.endTime,
          period: lesson.period,
          room: lesson.room,
          classId,
        });
        occurrenceNum++;
      }
    }
  }

  return results;
}

/**
 * For a given class and date, find the occurrence number.
 * Used by WeekView/LessonPanel to look up what lesson content to show.
 *
 * @param {string} classId
 * @param {string} dateISO - YYYY-MM-DD format
 * @param {string} startTime - HH:MM format (to disambiguate if a class has 2 slots on same day)
 * @param {object} timetableData
 * @returns {number|null} occurrence number or null if not found
 */
export function getOccurrenceForDate(classId, dateISO, startTime, timetableData) {
  const occurrences = generateTimetableOccurrences(classId, timetableData, 26);
  const match = occurrences.find(
    occ => occ.dateISO === dateISO && occ.startTime === startTime
  );
  return match ? match.occurrenceNum : null;
}

/**
 * Generate concrete future lesson dates for a given class.
 * KEPT for backward compatibility with ClassView's "See All" and other uses.
 * Now also includes occurrenceNum on each result.
 */
export function generateFutureLessons(classId, timetableData, weeksAhead = 20) {
  const occurrences = generateTimetableOccurrences(classId, timetableData, weeksAhead);
  return occurrences.map(occ => ({
    ...occ,
    key: lessonInstanceKey(classId, occ.date), // kept for backward compat
  }));
}