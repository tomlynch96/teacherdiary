// ===== Lesson Instance Remapping Utility =====
// This handles moving saved lesson data when holiday weeks are added/removed

import { getMonday, formatDateISO, getWeekNumberWithHolidays } from './dateHelpers';
import { generateFutureLessons, lessonInstanceKey } from './timetable';

/**
 * Remap lesson instance keys when holiday weeks change.
 * This ensures that saved lesson data moves with the timetable rotation.
 * 
 * @param {object} lessonInstances - current lesson instances object
 * @param {object} timetableData - timetable configuration
 * @param {object} oldSettings - previous settings (with old holidayWeeks)
 * @param {object} newSettings - new settings (with new holidayWeeks)
 * @returns {object} remapped lesson instances
 */
export function remapLessonInstances(lessonInstances, timetableData, oldSettings, newSettings) {
  if (!timetableData?.classes) return lessonInstances;
  
  const oldHolidays = oldSettings?.holidayWeeks || [];
  const newHolidays = newSettings?.holidayWeeks || [];
  
  // If holidays haven't changed, no remapping needed
  if (JSON.stringify(oldHolidays) === JSON.stringify(newHolidays)) {
    return lessonInstances;
  }
  
  const remapped = {};
  const anchorDate = timetableData.teacher?.exportDate;
  const isTwoWeek = !!timetableData.twoWeekTimetable;
  
  if (!anchorDate || !isTwoWeek) {
    // For single-week timetables, no remapping needed
    return lessonInstances;
  }
  
  // For each class, generate lessons with OLD settings and NEW settings
  // Then create a mapping from old dates to new dates based on week number + day
  timetableData.classes.forEach(classInfo => {
    const classId = classInfo.id;
    
    // Generate future lessons with both old and new settings
    const oldLessons = generateFutureLessons(classId, timetableData, 52, oldSettings);
    const newLessons = generateFutureLessons(classId, timetableData, 52, newSettings);
    
    // Group by week number and day of week
    const oldByWeekDay = {};
    oldLessons.forEach(lesson => {
      const weekNum = getWeekNumberWithHolidays(lesson.date, anchorDate, oldHolidays);
      const dayOfWeek = lesson.date.getDay() === 0 ? 7 : lesson.date.getDay();
      const key = `${weekNum}-${dayOfWeek}-${lesson.period}`;
      oldByWeekDay[key] = lesson;
    });
    
    const newByWeekDay = {};
    newLessons.forEach(lesson => {
      const weekNum = getWeekNumberWithHolidays(lesson.date, anchorDate, newHolidays);
      const dayOfWeek = lesson.date.getDay() === 0 ? 7 : lesson.date.getDay();
      const key = `${weekNum}-${dayOfWeek}-${lesson.period}`;
      newByWeekDay[key] = lesson;
    });
    
    // For each old lesson with saved data, find its new date
    Object.keys(oldByWeekDay).forEach(weekDayKey => {
      const oldLesson = oldByWeekDay[weekDayKey];
      const oldKey = lessonInstanceKey(classId, oldLesson.date);
      
      // Check if this lesson has saved data
      if (lessonInstances[oldKey]) {
        const newLesson = newByWeekDay[weekDayKey];
        
        if (newLesson) {
          // Found the new date for this lesson
          const newKey = lessonInstanceKey(classId, newLesson.date);
          remapped[newKey] = lessonInstances[oldKey];
        } else {
          // This lesson no longer exists (maybe pushed beyond our projection window)
          // Keep it at the old key just in case
          remapped[oldKey] = lessonInstances[oldKey];
        }
      }
    });
  });
  
  // Also keep any lesson instances that we didn't process (e.g., for classes that no longer exist)
  Object.keys(lessonInstances).forEach(key => {
    if (!remapped[key]) {
      remapped[key] = lessonInstances[key];
    }
  });
  
  return remapped;
}