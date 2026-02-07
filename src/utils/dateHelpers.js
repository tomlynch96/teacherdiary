// ===== Date Helpers =====
// Using native Date objects. If things get complex, consider date-fns later.

const DAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const DAY_NAMES_SHORT = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];
const MONTH_NAMES_SHORT = [
  'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
  'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec',
];

/**
 * Get the Monday of the week containing the given date.
 * Our week runs Mon-Fri (dayOfWeek 1-5 in the timetable data).
 */
export function getMonday(date) {
  const d = new Date(date);
  const day = d.getDay(); // 0=Sun, 1=Mon, ...
  const diff = day === 0 ? -6 : 1 - day; // If Sunday, go back 6 days
  d.setDate(d.getDate() + diff);
  d.setHours(0, 0, 0, 0);
  return d;
}

/**
 * Get an array of 5 dates (Mon–Fri) for the week containing `date`.
 */
export function getWeekDays(date) {
  const monday = getMonday(date);
  return Array.from({ length: 5 }, (_, i) => {
    const d = new Date(monday);
    d.setDate(monday.getDate() + i);
    return d;
  });
}

/**
 * Move a date forward or backward by `weeks` weeks.
 */
export function shiftWeek(date, weeks) {
  const d = new Date(date);
  d.setDate(d.getDate() + weeks * 7);
  return d;
}

/**
 * Format a date as "Mon 21 Jan"
 */
export function formatDayShort(date) {
  return `${DAY_NAMES_SHORT[date.getDay()]} ${date.getDate()} ${MONTH_NAMES_SHORT[date.getMonth()]}`;
}

/**
 * Format a date as "21 January 2026"
 */
export function formatDateLong(date) {
  return `${date.getDate()} ${MONTH_NAMES[date.getMonth()]} ${date.getFullYear()}`;
}

/**
 * Format a week range as "20 – 24 Jan 2026"
 */
export function formatWeekRange(monday) {
  const friday = new Date(monday);
  friday.setDate(monday.getDate() + 4);

  const monMonth = MONTH_NAMES_SHORT[monday.getMonth()];
  const friMonth = MONTH_NAMES_SHORT[friday.getMonth()];

  if (monday.getMonth() === friday.getMonth()) {
    return `${monday.getDate()} – ${friday.getDate()} ${monMonth} ${friday.getFullYear()}`;
  }
  return `${monday.getDate()} ${monMonth} – ${friday.getDate()} ${friMonth} ${friday.getFullYear()}`;
}

/**
 * Check if a date is today.
 */
export function isToday(date) {
  const now = new Date();
  return (
    date.getDate() === now.getDate() &&
    date.getMonth() === now.getMonth() &&
    date.getFullYear() === now.getFullYear()
  );
}

/**
 * Parse "HH:MM" string to { hours, minutes } object.
 */
export function parseTime(timeStr) {
  const [hours, minutes] = timeStr.split(':').map(Number);
  return { hours, minutes };
}

/**
 * Format { hours, minutes } or "HH:MM" to "9:30" style display.
 */
export function formatTime(timeStr) {
  const { hours, minutes } = typeof timeStr === 'string' ? parseTime(timeStr) : timeStr;
  return `${hours}:${String(minutes).padStart(2, '0')}`;
}

/**
 * Convert "HH:MM" to minutes since midnight (for positioning).
 */
export function timeToMinutes(timeStr) {
  const { hours, minutes } = parseTime(timeStr);
  return hours * 60 + minutes;
}

/**
 * Get the dayOfWeek (1=Mon, 5=Fri) for a JS Date object.
 */
export function getDayOfWeek(date) {
  const day = date.getDay(); // 0=Sun, 1=Mon, ... 6=Sat
  return day === 0 ? 7 : day; // Convert Sunday from 0 to 7
}

export { DAY_NAMES, DAY_NAMES_SHORT, MONTH_NAMES, MONTH_NAMES_SHORT };
