// ===== Lesson Sequence Utilities =====
// Helpers for working with lesson sequences and schedules

import {
    getClassSequence,
    getClassSchedule,
    getScheduledLessonForDate,
    scheduleLesson,
  } from './storage';
  import { formatDateISO } from './dateHelpers';
  
  /**
   * Get the lesson content for a specific date
   * Returns the lesson object from the sequence if scheduled, otherwise null
   */
  export function getLessonForDate(classId, date) {
    // Handle both Date objects and ISO strings
    const dateStr = typeof date === 'string' 
      ? date.split('T')[0] // If already a string, take just the date part
      : formatDateISO(date); // If Date object, format it
    
    const scheduleEntry = getScheduledLessonForDate(classId, dateStr);
    
    if (!scheduleEntry) return null;
    
    const sequence = getClassSequence(classId);
    return sequence[scheduleEntry.sequenceIndex] || null;
  }
  
  /**
   * Get all scheduled lessons for a class with their dates
   * Returns array of { lesson, date }
   */
  export function getScheduledLessons(classId) {
    const sequence = getClassSequence(classId);
    const schedule = getClassSchedule(classId);
    
    return schedule.map(entry => ({
      lesson: sequence[entry.sequenceIndex] || null,
      date: entry.date,
      sequenceIndex: entry.sequenceIndex,
    })).filter(item => item.lesson !== null);
  }
  
  /**
   * Get unscheduled lessons for a class
   * Returns lessons that don't have a schedule entry
   */
  export function getUnscheduledLessons(classId) {
    const sequence = getClassSequence(classId);
    const schedule = getClassSchedule(classId);
    const scheduledIndices = new Set(schedule.map(entry => entry.sequenceIndex));
    
    return sequence
      .filter((lesson, index) => !scheduledIndices.has(index))
      .map((lesson, arrayIndex) => ({
        lesson,
        sequenceIndex: sequence.indexOf(lesson),
      }));
  }
  
  /**
   * Get the next lesson in sequence after a given date
   * Useful for auto-scheduling
   */
  export function getNextLesson(classId, afterDate) {
    const dateStr = typeof afterDate === 'string' 
      ? afterDate.split('T')[0]
      : formatDateISO(afterDate);
    
    const schedule = getClassSchedule(classId);
    
    // Find the highest sequence index before or on this date
    const relevantSchedules = schedule
      .filter(entry => entry.date <= dateStr)
      .sort((a, b) => b.sequenceIndex - a.sequenceIndex);
    
    const lastScheduledIndex = relevantSchedules.length > 0 
      ? relevantSchedules[0].sequenceIndex 
      : -1;
    
    const sequence = getClassSequence(classId);
    const nextIndex = lastScheduledIndex + 1;
    
    if (nextIndex < sequence.length) {
      return {
        lesson: sequence[nextIndex],
        sequenceIndex: nextIndex,
      };
    }
    
    return null;
  }
  
  /**
   * Auto-schedule next lesson to a date
   * Finds the next unscheduled lesson and assigns it
   */
  export function autoScheduleNext(classId, date) {
    const nextLesson = getNextLesson(classId, date);
    if (nextLesson) {
      scheduleLesson(classId, nextLesson.sequenceIndex, date);
      return nextLesson.lesson;
    }
    return null;
  }
  
  /**
   * Get lesson sequence progress
   * Returns stats about how many lessons are scheduled vs total
   */
  export function getSequenceProgress(classId) {
    const sequence = getClassSequence(classId);
    const schedule = getClassSchedule(classId);
    
    return {
      total: sequence.length,
      scheduled: schedule.length,
      remaining: sequence.length - schedule.length,
      percentComplete: sequence.length > 0 
        ? Math.round((schedule.length / sequence.length) * 100) 
        : 0,
    };
  }
  
  /**
   * Check if a date has a scheduled lesson
   */
  export function hasScheduledLesson(classId, date) {
    const dateStr = typeof date === 'string'
      ? date.split('T')[0]
      : formatDateISO(date);
    return getScheduledLessonForDate(classId, dateStr) !== undefined;
  }
  
  /**
   * Get the sequence index for a date (if scheduled)
   */
  export function getSequenceIndexForDate(classId, date) {
    const dateStr = typeof date === 'string'
      ? date.split('T')[0]
      : formatDateISO(date);
    const entry = getScheduledLessonForDate(classId, dateStr);
    return entry ? entry.sequenceIndex : null;
  }