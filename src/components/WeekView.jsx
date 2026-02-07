import React, { useState, useMemo } from 'react';
import {
  ChevronLeft,
  ChevronRight,
  CalendarDays,
  RotateCcw,
  FileDown,
} from 'lucide-react';
import LessonCard from './LessonCard';
import {
  getWeekDays,
  getMonday,
  shiftWeek,
  formatWeekRange,
  formatDayShort,
  isToday,
  DAY_NAMES_SHORT,
} from '../utils/dateHelpers';
import { getLessonsForWeek, getTimeRange } from '../utils/timetable';

// ===== WeekView =====
// The main calendar view showing Mon-Fri with lesson cards.
// Uses a column-per-day layout (not a time-grid) for simplicity in Phase 1.
// Each day column lists its lessons in chronological order.

export default function WeekView({ timetableData, onClearData }) {
  // Track which week we're viewing
  const [currentDate, setCurrentDate] = useState(new Date());
  const monday = useMemo(() => getMonday(currentDate), [currentDate]);
  const weekDays = useMemo(() => getWeekDays(currentDate), [currentDate]);

  // Map recurring lessons onto this specific week
  const lessonsByDay = useMemo(
    () => getLessonsForWeek(timetableData, weekDays),
    [timetableData, weekDays]
  );

  // Count total lessons this week
  const totalLessons = Object.values(lessonsByDay).reduce(
    (sum, lessons) => sum + lessons.length,
    0
  );

  // Navigation
  const goToPrevWeek = () => setCurrentDate((d) => shiftWeek(d, -1));
  const goToNextWeek = () => setCurrentDate((d) => shiftWeek(d, 1));
  const goToToday = () => setCurrentDate(new Date());

  // Lesson click handler (placeholder for future detail view)
  const handleLessonClick = (lesson) => {
    console.log('Lesson clicked:', lesson);
    // TODO Phase 2: Open lesson detail/editing panel
  };

  return (
    <div className="flex-1 flex flex-col min-h-0">
      {/* ===== Header Bar ===== */}
      <header className="shrink-0 px-8 py-5 flex items-center justify-between border-b border-slate-100 bg-white/80 backdrop-blur-sm">
        <div>
          {/* Week range title */}
          <h2 className="font-serif text-2xl font-bold text-navy">
            {formatWeekRange(monday)}
          </h2>
          <p className="text-sm text-navy/40 mt-0.5">
            {totalLessons} lesson{totalLessons !== 1 ? 's' : ''} this week
          </p>
        </div>

        <div className="flex items-center gap-2">
          {/* Today button */}
          <button
            onClick={goToToday}
            className="flex items-center gap-2 px-4 py-2.5 rounded-full text-sm font-medium
                       text-navy/60 bg-sand hover:bg-[#81B29A]/10 hover:text-sage
                       transition-smooth"
          >
            <CalendarDays size={16} />
            Today
          </button>

          {/* Week navigation */}
          <div className="flex items-center bg-sand rounded-full p-1">
            <button
              onClick={goToPrevWeek}
              className="p-2 rounded-full hover:bg-white hover:shadow-sm transition-smooth text-navy/50 hover:text-navy"
              title="Previous week"
            >
              <ChevronLeft size={18} />
            </button>
            <button
              onClick={goToNextWeek}
              className="p-2 rounded-full hover:bg-white hover:shadow-sm transition-smooth text-navy/50 hover:text-navy"
              title="Next week"
            >
              <ChevronRight size={18} />
            </button>
          </div>

          {/* Clear data button */}
          <button
            onClick={onClearData}
            className="flex items-center gap-2 px-4 py-2.5 rounded-full text-sm font-medium
                       text-navy/40 hover:text-terracotta hover:bg-[#E07A5F]/5
                       transition-smooth"
            title="Clear timetable and start over"
          >
            <RotateCcw size={15} />
            Reset
          </button>
        </div>
      </header>

      {/* ===== Calendar Grid ===== */}
      <div className="flex-1 overflow-auto p-6">
        <div className="grid grid-cols-5 gap-4 h-full min-h-[500px]">
          {weekDays.map((day, i) => {
            const dayNum = day.getDay() === 0 ? 7 : day.getDay(); // 1=Mon...5=Fri
            const lessons = lessonsByDay[dayNum] || [];
            const today = isToday(day);

            return (
              <div key={i} className="flex flex-col min-w-0">
                {/* Day Header */}
                <div
                  className={`
                    text-center py-3 px-2 rounded-2xl mb-3 transition-smooth
                    ${today
                      ? 'bg-[#81B29A]/10'
                      : 'bg-white border border-slate-100'
                    }
                  `}
                >
                  <p className={`
                    text-xs font-semibold uppercase tracking-wider mb-0.5
                    ${today ? 'text-sage' : 'text-navy/30'}
                  `}>
                    {DAY_NAMES_SHORT[day.getDay()]}
                  </p>
                  <p className={`
                    font-serif text-xl font-bold
                    ${today ? 'text-sage' : 'text-navy'}
                  `}>
                    {day.getDate()}
                  </p>
                  {today && (
                    <div className="w-1.5 h-1.5 rounded-full bg-sage mx-auto mt-1" />
                  )}
                </div>

                {/* Lesson Cards Stack */}
                <div className="flex-1 space-y-3">
                  {lessons.length > 0 ? (
                    lessons.map((lesson) => (
                      <LessonCard
                        key={lesson.id}
                        lesson={lesson}
                        onClick={handleLessonClick}
                      />
                    ))
                  ) : (
                    <div className="flex items-center justify-center h-24 rounded-2xl border border-dashed border-slate-200 text-navy/20 text-xs">
                      No lessons
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
