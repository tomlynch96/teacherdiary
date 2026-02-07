import React from 'react';
import { Clock, MapPin, Users } from 'lucide-react';
import { formatTime } from '../utils/dateHelpers';
import { getSubjectAccent } from '../utils/timetable';

// ===== LessonCard =====
// A single lesson displayed in the weekly calendar grid.
// Compact but informative. Clicking will eventually open a lesson detail view.

export default function LessonCard({ lesson, compact = false, onClick }) {
  const accent = getSubjectAccent(lesson.subject);

  return (
    <button
      onClick={() => onClick?.(lesson)}
      className={`
        w-full text-left group relative
        bg-white rounded-2xl border border-slate-100 shadow-sm
        hover:shadow-md hover:shadow-[#3D405B]/5 hover:scale-[1.02]
        active:scale-100 transition-smooth overflow-hidden
        ${compact ? 'p-3' : 'p-4'}
      `}
    >
      {/* Left accent bar */}
      <div
        className="absolute left-0 top-0 bottom-0 w-1 rounded-l-2xl"
        style={{ backgroundColor: accent }}
      />

      <div className="pl-2">
        {/* Class name + Period */}
        <div className="flex items-center justify-between gap-2 mb-1">
          <span className="font-serif font-bold text-navy text-base leading-tight">
            {lesson.className}
          </span>
          {lesson.period && (
            <span
              className="text-[11px] font-bold px-2 py-0.5 rounded-full shrink-0"
              style={{
                backgroundColor: `${accent}18`,
                color: accent,
              }}
            >
              P{lesson.period}
            </span>
          )}
        </div>

        {/* Subject */}
        <p className="text-xs text-navy/50 font-medium mb-2">
          {lesson.subject}
        </p>

        {/* Time + Room row */}
        <div className="flex items-center gap-3 text-navy/40">
          <span className="flex items-center gap-1 text-xs">
            <Clock size={12} />
            {formatTime(lesson.startTime)} – {formatTime(lesson.endTime)}
          </span>
          {lesson.room && (
            <span className="flex items-center gap-1 text-xs truncate">
              <MapPin size={12} />
              {lesson.room}
            </span>
          )}
        </div>

        {/* Class size (if available) */}
        {lesson.classSize && !compact && (
          <span className="flex items-center gap-1 text-xs text-navy/30 mt-1">
            <Users size={12} />
            {lesson.classSize} students
          </span>
        )}
      </div>
    </button>
  );
}
