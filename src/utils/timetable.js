// ===== Timetable Utilities =====

import {
  getMonday,
  getWeekNumber,
  timeToMinutes,
  formatDateISO,
} from './dateHelpers';
import { getHolidayWeekMondays } from './storage';

// ---- 12-colour palette for per-class colouring ----
const CLASS_COLOURS = [
  '#81B29A', '#E07A5F', '#3D405B', '#F2CC8F',
  '#A8DADC', '#E63946', '#457B9D', '#F4A261',
  '#2A9D8F', '#264653', '#E76F51', '#606C38',
];

/**
 * Get the accent colour for a class, based on its position in the classes array.
 */
export function getClassColor(classId, classes = []) {
  const index = classes.findIndex((c) => c.id === classId);
  return CLASS_COLOURS[index >= 0 ? index % CLASS_COLOURS.length : 0];
}

/**
 * For a given week (Mon–Fri dates), return an object { dayNum: [lessons] }
 * where dayNum is 1-5 (Mon-Fri) and lessons have a `date` field added.
 */
export function getLessonsForWeek(timetableData, weekDays) {
  if (!timetableData?.recurringLessons) return {};

  const isTwoWeek = !!timetableData.twoWeekTimetable;
  const anchorDate = timetableData.teacher?.exportDate;
  const weekNum = isTwoWeek && anchorDate
    ? getWeekNumber(weekDays[0], anchorDate)
    : null;

  const result = {};

  weekDays.forEach((day) => {
    const dayOfWeek = day.getDay() === 0 ? 7 : day.getDay();

    const dayLessons = timetableData.recurringLessons
      .filter((rl) => {
        if (rl.dayOfWeek !== dayOfWeek) return false;
        if (isTwoWeek && weekNum !== null && rl.weekNumber !== weekNum) return false;
        return true;
      })
      .map((rl) => ({
        ...rl,
        date: day,
        className: timetableData.classes?.find((c) => c.id === rl.classId)?.name || rl.classId,
        classSize: timetableData.classes?.find((c) => c.id === rl.classId)?.classSize,
      }))
      .sort((a, b) => timeToMinutes(a.startTime) - timeToMinutes(b.startTime));

    result[dayOfWeek] = dayLessons;
  });

  return result;
}

/**
 * For a given week (Mon–Fri dates), return duties { dayNum: [duties] }.
 */
export function getDutiesForWeek(timetableData, weekDays) {
  if (!timetableData?.duties) return {};

  const isTwoWeek = !!timetableData.twoWeekTimetable;
  const anchorDate = timetableData.teacher?.exportDate;
  const weekNum = isTwoWeek && anchorDate
    ? getWeekNumber(weekDays[0], anchorDate)
    : null;

  const result = {};

  timetableData.duties.forEach((duty) => {
    if (isTwoWeek && weekNum !== null && duty.week !== weekNum) return;
    if (!result[duty.day]) result[duty.day] = [];
    result[duty.day].push(duty);
  });

  return result;
}

/**
 * Merge consecutive half-periods for the same class into single blocks.
 * e.g. 3a (11:30–12:00) + 3b (12:00–12:30) for "12G2" becomes one card: 3a–3b (11:30–12:30).
 */
export function mergeConsecutiveLessons(lessons) {
  if (!lessons || lessons.length === 0) return [];

  const sorted = [...lessons].sort((a, b) => timeToMinutes(a.startTime) - timeToMinutes(b.startTime));
  const merged = [];
  let current = { ...sorted[0], periods: [sorted[0].period] };

  for (let i = 1; i < sorted.length; i++) {
    const next = sorted[i];
    if (next.classId === current.classId && next.startTime === current.endTime) {
      current = {
        ...current,
        endTime: next.endTime,
        periods: [...current.periods, next.period],
        period: `${current.periods[0]}–${next.period}`,
      };
    } else {
      merged.push(current);
      current = { ...next, periods: [next.period] };
    }
  }
  merged.push(current);
  return merged;
}

/**
 * Get the earliest start and latest end across all lessons + duties.
 * Used to define the calendar grid range.
 * Now accepts optional settings for work hours override.
 */
export function getTimeRange(timetableData, settings = null) {
  let earliest = 24;
  let latest = 0;

  // If settings have work hours, use those as the base
  if (settings?.workHoursStart && settings?.workHoursEnd) {
    const startParts = settings.workHoursStart.split(':').map(Number);
    const endParts = settings.workHoursEnd.split(':').map(Number);
    earliest = startParts[0];
    latest = endParts[1] > 0 ? endParts[0] + 1 : endParts[0];
  }

  // Also check timetable data to ensure we cover everything
  const allTimes = [];
  if (timetableData?.recurringLessons) {
    timetableData.recurringLessons.forEach((rl) => {
      allTimes.push(rl.startTime, rl.endTime);
    });
  }
  if (timetableData?.duties) {
    timetableData.duties.forEach((d) => {
      allTimes.push(d.startTime, d.endTime);
    });
  }

  allTimes.forEach((t) => {
    const mins = timeToMinutes(t);
    const hour = Math.floor(mins / 60);
    earliest = Math.min(earliest, hour);
    latest = Math.max(latest, mins % 60 > 0 ? hour + 1 : hour);
  });

  return { startHour: earliest, endHour: latest };
}

/**
 * Validate imported timetable JSON structure.
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
 * NOW SKIPS HOLIDAY WEEKS: reads holiday week Mondays from settings
 * and excludes any dates that fall within a holiday week.
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

  // Get holiday week Mondays for skipping
  const holidayMondays = getHolidayWeekMondays();

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const startMonday = getMonday(today);

  const results = [];
  let occurrenceNum = 0;

  for (let w = 0; w < weeksAhead; w++) {
    const weekStart = new Date(startMonday);
    weekStart.setDate(startMonday.getDate() + w * 7);

    // Skip this week if it's a holiday week
    const weekMondayISO = formatDateISO(weekStart);
    if (holidayMondays.has(weekMondayISO)) {
      continue;
    }

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