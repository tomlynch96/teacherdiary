// ===== Timetable Helpers =====
// Maps recurring lesson definitions onto specific calendar days.
// Supports both single-week and two-week timetable rotations.

import { getDayOfWeek, timeToMinutes, getWeekNumber, getWeekNumberWithHolidays, getMonday, formatDateISO } from './dateHelpers';

/**
 * Given the full timetable data and an array of 5 week-day Dates,
 * returns an object keyed by dayOfWeek (1-5) with sorted lesson arrays.
 *
 * For two-week timetables, we calculate which week (1 or 2) each date
 * falls in, accounting for holiday weeks, and only show lessons matching that week number.
 */
export function getLessonsForWeek(timetableData, weekDays, settings = null) {
  if (!timetableData?.recurringLessons) return {};

  const isTwoWeek = !!timetableData.twoWeekTimetable;
  const anchorDate = timetableData.teacher?.exportDate;
  const holidayWeeks = settings?.holidayWeeks || [];

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
    
    // Check if this week is a holiday week
    const monday = getMonday(date);
    const mondayISO = formatDateISO(monday);
    const isHolidayWeek = holidayWeeks.includes(mondayISO);
    
    // If this is a holiday week, return empty array for this day
    if (isHolidayWeek) {
      lessonsByDay[dayNum] = [];
      return;
    }

    // For two-week timetables, determine if this date is in week 1 or 2
    const currentWeekNum = isTwoWeek && anchorDate
      ? getWeekNumberWithHolidays(date, anchorDate, holidayWeeks)
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
export function getDutiesForWeek(timetableData, weekDays, settings = null) {
  if (!timetableData?.duties?.length) return {};

  const isTwoWeek = !!timetableData.twoWeekTimetable;
  const anchorDate = timetableData.teacher?.exportDate;
  const holidayWeeks = settings?.holidayWeeks || [];

  const dutiesByDay = {};

  weekDays.forEach((date) => {
    const dayNum = getDayOfWeek(date);
    
    // Check if this week is a holiday week
    const monday = getMonday(date);
    const mondayISO = formatDateISO(monday);
    const isHolidayWeek = holidayWeeks.includes(mondayISO);
    
    // If this is a holiday week, return empty array for this day
    if (isHolidayWeek) {
      dutiesByDay[dayNum] = [];
      return;
    }
    
    const currentWeekNum = isTwoWeek && anchorDate
      ? getWeekNumberWithHolidays(date, anchorDate, holidayWeeks)
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
 * classes array. Each class gets its own distinct color so they're
 * easy to tell apart at a glance on the week grid.
 *
 * @param {string} classId - the class ID
 * @param {Array} classes - the full classes array from timetable data
 * @returns {string} hex color
 */
export function getClassColor(classId, classes) {
  if (!classes || !classId) return CLASS_PALETTE[0];
  const index = classes.findIndex((c) => c.id === classId);
  if (index === -1) return CLASS_PALETTE[0];
  return CLASS_PALETTE[index % CLASS_PALETTE.length];
}

/** Expose the palette so ClassView can show swatches */
export { CLASS_PALETTE };

/**
 * Merge consecutive half-periods for the same class into single blocks.
 * e.g. 12G2 period 3a (11:30-12:00) + 12G2 period 3b (12:00-12:30)
 *   → single block 12G2 periods 3a–3b (11:30-12:30)
 *
 * This makes the timetable much cleaner since your school's half-periods
 * are really one continuous lesson.
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

    // Same class and the end time of current matches start time of next?
    if (current.classId === next.classId && current.endTime === next.startTime) {
      current.endTime = next.endTime;
      // Show combined period range, e.g. "3a–3b"
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
 * Generate a storage key for a lesson instance.
 * Format: "classId::YYYY-MM-DD" e.g. "12G2::2026-02-09"
 */
export function lessonInstanceKey(classId, date) {
  const dateStr = typeof date === 'string' ? date : formatDateISO(date);
  return `${classId}::${dateStr}`;
}

/**
 * Generate concrete future lesson dates for a given class.
 * Projects the recurring timetable forward from today for `weeksAhead` weeks.
 * Returns merged lessons (half-periods combined) with actual dates.
 *
 * @param {string} classId
 * @param {object} timetableData
 * @param {number} weeksAhead - how many weeks to project (default 20 = ~half a term)
 * @param {object} settings - optional settings with holidayWeeks array
 * @returns {Array} sorted array of { date, dayName, startTime, endTime, period, room, key }
 */
export function generateFutureLessons(classId, timetableData, weeksAhead = 20, settings = null) {
  console.log('🎯 generateFutureLessons called for class:', classId);
  console.log('  Settings received:', settings);
  console.log('  Holiday weeks from settings:', settings?.holidayWeeks);
  
  if (!timetableData?.recurringLessons) return [];

  const isTwoWeek = !!timetableData.twoWeekTimetable;
  const anchorDate = timetableData.teacher?.exportDate;
  const holidayWeeks = settings?.holidayWeeks || [];
  
  console.log('  Holiday weeks array:', holidayWeeks);
  console.log('  Array length:', holidayWeeks.length);
  
  const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

  const classLessons = timetableData.recurringLessons.filter(
    (rl) => rl.classId === classId
  );
  if (classLessons.length === 0) return [];

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const startMonday = getMonday(today);

  const results = [];

  for (let w = 0; w < weeksAhead; w++) {
    const weekStart = new Date(startMonday);
    weekStart.setDate(startMonday.getDate() + w * 7);
    
    // Check if this week is a holiday week
    const weekStartISO = formatDateISO(weekStart);
    const isHolidayWeek = holidayWeeks.includes(weekStartISO);
    
    if (w < 5) {  // Only log first 5 weeks to avoid spam
      console.log(`  Week ${w}: ${weekStartISO} - Is holiday? ${isHolidayWeek}`);
    }
    
    // Skip holiday weeks entirely
    if (isHolidayWeek) {
      console.log(`    ⏭️  SKIPPING week ${weekStartISO}`);
      continue;
    }

    const weekNum = isTwoWeek && anchorDate
      ? getWeekNumberWithHolidays(weekStart, anchorDate, holidayWeeks)
      : null;

    for (let d = 0; d < 5; d++) {
      const date = new Date(weekStart);
      date.setDate(weekStart.getDate() + d);

      // Skip days in the past
      if (date < today) continue;

      const dayOfWeek = d + 1; // 1=Mon..5=Fri

      const dayLessons = classLessons
        .filter((rl) => {
          if (rl.dayOfWeek !== dayOfWeek) return false;
          if (isTwoWeek && weekNum !== null && rl.weekNumber !== weekNum) return false;
          return true;
        })
        .sort((a, b) => timeToMinutes(a.startTime) - timeToMinutes(b.startTime));

      // Merge consecutive half-periods
      const merged = mergeConsecutiveLessons(dayLessons);

      for (const lesson of merged) {
        results.push({
          date: new Date(date),
          dateISO: formatDateISO(date),
          dayName: dayNames[date.getDay()],
          startTime: lesson.startTime,
          endTime: lesson.endTime,
          period: lesson.period,
          room: lesson.room,
          classId,
          key: lessonInstanceKey(classId, date),
        });
      }
    }
  }

  return results;
}