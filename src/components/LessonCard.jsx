import React from 'react';
import { Clock, MapPin, Users } from 'lucide-react';
import { formatTime } from '../utils/dateHelpers';

// ===== LessonCard =====
// Positioned absolutely within the time grid. Fills its parent container.
// Color is passed in from the parent (per-class, not per-subject).
// Adapts content density based on available height.

export default function LessonCard({ lesson, height = 100, accent = '#81B29A', hasData = false, onClick }) {
  const isCompact = height < 80;
  const isTiny = height < 50;

  return (
    <button
      onClick={() => onClick?.(lesson)}
      className={`
        w-full h-full text-left group relative overflow-hidden
        bg-white rounded-xl border border-slate-100 shadow-sm
        hover:shadow-md hover:shadow-[#3D405B]/5 hover:border-slate-200
        active:scale-[0.99] transition-smooth
      `}
    >
      {/* Left accent bar */}
      <div
        className="absolute left-0 top-0 bottom-0 w-1 rounded-l-xl"
        style={{ backgroundColor: accent }}
      />

      {/* Dot indicator: lesson has title/notes/links */}
      {hasData && (
        <div className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full z-10"
          style={{ backgroundColor: accent }} />
      )}

      {isTiny ? (
        /* ---- Tiny layout: single row ---- */
        <div className="pl-3 pr-2 h-full flex items-center gap-2 min-w-0">
          <span className="font-serif font-bold text-navy text-xs truncate">
            {lesson.className}
          </span>
          <span className="text-[10px] text-navy/35 shrink-0">
            {formatTime(lesson.startTime)}–{formatTime(lesson.endTime)}
          </span>
          {lesson.room && (
            <span className="text-[10px] text-navy/25 truncate hidden xl:inline">
              {lesson.room}
            </span>
          )}
        </div>
      ) : isCompact ? (
        /* ---- Compact layout: two rows ---- */
        <div className="pl-3 pr-2 py-1.5 h-full flex flex-col justify-center min-w-0">
          <div className="flex items-center justify-between gap-1">
            <span className="font-serif font-bold text-navy text-sm truncate leading-tight">
              {lesson.className}
            </span>
            {lesson.period && (
              <span
                className="text-[10px] font-bold px-1.5 py-0.5 rounded-full shrink-0"
                style={{ backgroundColor: `${accent}18`, color: accent }}
              >
                P{lesson.period}
              </span>
            )}
          </div>
          <div className="flex items-center gap-2 text-navy/35 mt-0.5">
            <span className="text-[11px]">
              {formatTime(lesson.startTime)}–{formatTime(lesson.endTime)}
            </span>
            {lesson.room && (
              <span className="text-[11px] truncate">
                {lesson.room}
              </span>
            )}
          </div>
        </div>
      ) : (
        /* ---- Full layout ---- */
        <div className="pl-3 pr-2 py-2 h-full flex flex-col justify-center min-w-0">
          <div className="flex items-center justify-between gap-2 mb-0.5">
            <span className="font-serif font-bold text-navy text-base leading-tight truncate">
              {lesson.className}
            </span>
            {lesson.period && (
              <span
                className="text-[11px] font-bold px-2 py-0.5 rounded-full shrink-0"
                style={{ backgroundColor: `${accent}18`, color: accent }}
              >
                P{lesson.period}
              </span>
            )}
          </div>

          <p className="text-xs text-navy/45 font-medium mb-1.5">
            {lesson.subject}
          </p>

          <div className="flex items-center gap-3 text-navy/35">
            <span className="flex items-center gap-1 text-[11px]">
              <Clock size={11} />
              {formatTime(lesson.startTime)}–{formatTime(lesson.endTime)}
            </span>
            {lesson.room && (
              <span className="flex items-center gap-1 text-[11px] truncate">
                <MapPin size={11} />
                {lesson.room}
              </span>
            )}
          </div>

          {lesson.classSize && (
            <span className="flex items-center gap-1 text-[11px] text-navy/25 mt-1">
              <Users size={11} />
              {lesson.classSize} students
            </span>
          )}
        </div>
      )}
    </button>
  );
}