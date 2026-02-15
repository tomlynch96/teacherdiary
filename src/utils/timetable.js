import { formatDateISO, getMonday, getWeekNumberWithHolidays } from './dateHelpers';

// ===== Timetable Utilities =====

// 12-colour palette for class identification
const CLASS_COLORS = [
  '#E07A5F', // terracotta
  '#81B29A', // sage
  '#F2CC8F', // sand/gold
  '#6A4C93', // purple
  '#3D5A80', // steel blue
  '#EE6C4D', // coral
  '#98C1D9', // sky blue
  '#C9ADA7', // mauve
  '#9B59B6', // violet
  '#E67E22', // carrot
  '#16A085', // turquoise
  '#D35400', // pumpkin
];

/**
 * Get a unique, stable colour for a class based on its position in the class array.
 */
export function getClassColor(classId, allClasses) {
  const index = allClasses.findIndex((c) => c.id === classId);
  if (index === -1) return CLASS_COLORS[0];
  return CLASS_COLORS[index % CLASS_COLORS.length];
}

/**
 * Convert HH:MM time string to minutes since midnight.
 */
function timeToMinutes(timeStr) {
  const [h, m] = timeStr.split(':').map(Number);
  return h * 60 + m;
}

/**
 * Merge consecutive half-period lessons into single blocks.
 * E.g. 3a (11:30-12:00) + 3b (12:00-12:30) => 3a–3b (11:30-12:30)
 */
export function mergeConsecutiveLessons(lessons) {
  if (lessons.length === 0) return [];
  const sorted = [...lessons].sort((a, b) => timeToMinutes(a.startTime) - timeToMinutes(b.startTime));
  const merged = [];
  let current = { ...sorted[0] };
  for (let i = 1; i < sorted.length; i++) {
    const next = sorted[i];
    if (current.endTime === next.startTime) {
      current.endTime = next.endTime;
      current.period = `${current.period.split('–')[0]}–${next.period}`;
    } else {
      merged.push(current);
      current = { ...next };
    }
  }
  merged.push(current);
  return merged;
}

/**
 * Get all lessons for a specific class on a specific day/week.
 */
export function getLessonsForDay(classId, dayOfWeek, weekNumber, timetableData) {
  if (!timetableData?.recurringLessons) return [];
  
  const isTwoWeek = !!timetableData.twoWeekTimetable;
  
  const lessons = timetableData.recurringLessons.filter((rl) => {
    if (rl.classId !== classId) return false;
    if (rl.dayOfWeek !== dayOfWeek) return false;
    if (isTwoWeek && weekNumber && rl.weekNumber !== weekNumber) return false;
    return true;
  });
  
  return mergeConsecutiveLessons(lessons);
}

/**
 * Get the range of class times for a given day.
 * Returns [earliestStart, latestEnd] as time strings.
 */
export function getTimeRange(lessons) {
  if (!lessons || lessons.length === 0) return ['09:00', '16:00'];
  
  const starts = lessons.map((l) => l.startTime).filter(Boolean);
  const ends = lessons.map((l) => l.endTime).filter(Boolean);
  
  if (starts.length === 0 || ends.length === 0) return ['09:00', '16:00'];
  
  const earliest = starts.reduce((a, b) => (timeToMinutes(a) < timeToMinutes(b) ? a : b));
  const latest = ends.reduce((a, b) => (timeToMinutes(a) > timeToMinutes(b) ? a : b));
  
  return [earliest, latest];
}

/**
 * Get all lessons for a week, grouped by day.
 * Returns: { 1: [...], 2: [...], ... } where keys are dayOfWeek (1=Mon, 5=Fri)
 * Skips the entire week if it's a holiday week.
 */
export function getLessonsForWeek(date, timetableData, settings) {
  const lessonsByDay = {};
  const monday = getMonday(date);
  const mondayISO = formatDateISO(monday);
  const holidayWeeks = settings?.holidayWeeks || [];
  const isHolidayWeek = holidayWeeks.includes(mondayISO);
  
  if (isHolidayWeek) {
    for (let d = 1; d <= 5; d++) {
      lessonsByDay[d] = [];
    }
    return lessonsByDay;
  }
  
  if (!timetableData?.recurringLessons) {
    for (let d = 1; d <= 5; d++) {
      lessonsByDay[d] = [];
    }
    return lessonsByDay;
  }
  
  const isTwoWeek = !!timetableData.twoWeekTimetable;
  const anchorDate = timetableData.teacher?.exportDate;
  
  const weekNumber = isTwoWeek && anchorDate
    ? getWeekNumberWithHolidays(monday, anchorDate, holidayWeeks)
    : null;
  
  for (let d = 1; d <= 5; d++) {
    const dayLessons = timetableData.recurringLessons
      .filter((rl) => {
        if (rl.dayOfWeek !== d) return false;
        if (isTwoWeek && weekNumber !== null && rl.weekNumber !== weekNumber) return false;
        return true;
      })
      .sort((a, b) => timeToMinutes(a.startTime) - timeToMinutes(b.startTime));
    
    lessonsByDay[d] = mergeConsecutiveLessons(dayLessons);
  }
  
  return lessonsByDay;
}

/**
 * Get all duties for a week, grouped by day.
 */
export function getDutiesForWeek(date, timetableData, settings) {
  const dutiesByDay = {};
  const monday = getMonday(date);
  const mondayISO = formatDateISO(monday);
  const holidayWeeks = settings?.holidayWeeks || [];
  const isHolidayWeek = holidayWeeks.includes(mondayISO);
  
  if (isHolidayWeek) {
    for (let d = 1; d <= 5; d++) {
      dutiesByDay[d] = [];
    }
    return dutiesByDay;
  }
  
  if (!timetableData?.duties) {
    for (let d = 1; d <= 5; d++) {
      dutiesByDay[d] = [];
    }
    return dutiesByDay;
  }
  
  const isTwoWeek = !!timetableData.twoWeekTimetable;
  const anchorDate = timetableData.teacher?.exportDate;
  
  const weekNumber = isTwoWeek && anchorDate
    ? getWeekNumberWithHolidays(monday, anchorDate, holidayWeeks)
    : null;
  
  for (let d = 1; d <= 5; d++) {
    dutiesByDay[d] = timetableData.duties.filter((duty) => {
      if (duty.day !== d) return false;
      if (isTwoWeek && weekNumber !== null && duty.week !== weekNumber) return false;
      return true;
    });
  }
  
  return dutiesByDay;
}

/**
 * Validate timetable data structure.
 */
export function validateTimetableData(data) {
  const errors = [];
  
  if (!data || typeof data !== 'object') {
    errors.push('Timetable data must be an object');
    return { valid: false, errors };
  }
  
  if (!data.teacher || !data.teacher.name) {
    errors.push('Missing teacher name');
  }
  
  if (data.twoWeekTimetable && !data.teacher.exportDate) {
    errors.push('Two-week timetable requires exportDate');
  }
  
  if (!Array.isArray(data.classes) || data.classes.length === 0) {
    errors.push('Must have at least one class');
  } else {
    data.classes.forEach((cls, i) => {
      if (!cls.id) errors.push(`Class ${i}: missing id`);
      if (!cls.name) errors.push(`Class ${i}: missing name`);
      if (!cls.subject) errors.push(`Class ${i}: missing subject`);
    });
  }
  
  if (!Array.isArray(data.recurringLessons)) {
    errors.push('recurringLessons must be an array');
  } else {
    data.recurringLessons.forEach((rl, i) => {
      if (!rl.classId) errors.push(`Lesson ${i}: missing classId`);
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

// Alias for backward compatibility with FileImport component
export const validateTimetableJSON = validateTimetableData;

/**
 * Generate timetable occurrences for a class.
 * Returns array of occurrence objects with dates and occurrence numbers.
 * Skips holiday weeks entirely.
 * 
 * @param {string} classId
 * @param {object} timetableData
 * @param {number} weeksAhead - how many weeks to project (default 26)
 * @param {object} settings - optional settings with holidayWeeks array
 * @returns {Array} sorted array of { occurrenceNum, date, dateISO, dayName, weekNumber, dayOfWeek, startTime, endTime, period, room }
 */
export function generateTimetableOccurrences(classId, timetableData, weeksAhead = 26, settings = null) {
  if (!timetableData?.recurringLessons) return [];

  const isTwoWeek = !!timetableData.twoWeekTimetable;
  const anchorDate = timetableData.teacher?.exportDate;
  const holidayWeeks = settings?.holidayWeeks || [];
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
    
    const weekStartISO = formatDateISO(weekStart);
    const isHolidayWeek = holidayWeeks.includes(weekStartISO);
    
    if (isHolidayWeek) {
      continue;
    }

    const weekNum = isTwoWeek && anchorDate
      ? getWeekNumberWithHolidays(weekStart, anchorDate, holidayWeeks)
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
          occurrenceNum: occurrenceNum++,
          date: new Date(date),
          dateISO: formatDateISO(date),
          dayName: dayNames[date.getDay()],
          weekNumber: weekNum,
          dayOfWeek,
          startTime: lesson.startTime,
          endTime: lesson.endTime,
          period: lesson.period,
          room: lesson.room,
          classId,
        });
      }
    }
  }

  return results;
}