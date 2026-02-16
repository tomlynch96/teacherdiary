import React from 'react';
import { getClassColor } from '../utils/timetable';
import { timeToMinutes } from '../utils/dateHelpers';

// ===== LessonCard =====
// Displays a single lesson block on the calendar

export default function LessonCard({
  lesson,
  gridStartMin,
  pxPerMinute,
  onClick,
  hasData = false,
  classes = [],
}) {
  if (!lesson) return null;

  const accent = getClassColor(lesson.classId, classes);
  
  // Calculate position from time strings
  const startMin = timeToMinutes(lesson.startTime);
  const endMin = timeToMinutes(lesson.endTime);
  const top = (startMin - gridStartMin) * pxPerMinute;
  const height = (endMin - startMin) * pxPerMinute;

  return (
    <button
      onClick={onClick}
      className="absolute left-0 right-0 rounded-lg overflow-hidden transition-smooth hover:shadow-md hover:scale-[1.02] hover:z-10 group"
      style={{
        top: `${top}px`,
        height: `${height}px`,
        backgroundColor: `${accent}18`,
        border: `2px solid ${accent}40`,
      }}
    >
      {/* Content */}
      <div className="p-2 h-full flex flex-col">
        {/* Class name */}
        <p
          className="font-serif font-bold text-sm leading-tight truncate"
          style={{ color: accent }}
        >
          {lesson.className}
        </p>

        {/* Period & room */}
        <div className="flex items-center gap-2 mt-0.5">
          <span
            className="text-xs font-bold px-1.5 py-0.5 rounded"
            style={{ backgroundColor: `${accent}30`, color: accent }}
          >
            P{lesson.period}
          </span>
          {lesson.room && (
            <span className="text-xs text-navy/40 truncate">{lesson.room}</span>
          )}
        </div>

        {/* Data indicator dot */}
        {hasData && (
          <div className="mt-auto flex items-center gap-1">
            <div
              className="w-1.5 h-1.5 rounded-full"
              style={{ backgroundColor: accent }}
            />
            <span className="text-xs text-navy/40">Has content</span>
          </div>
        )}
      </div>
    </button>
  );
}