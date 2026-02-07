import React, { useState, useMemo } from 'react';
import {
  ChevronLeft,
  ChevronRight,
  CalendarDays,
  RotateCcw,
} from 'lucide-react';
import LessonCard from './LessonCard';
import DutyCard from './DutyCard';
import {
  getWeekDays,
  getMonday,
  shiftWeek,
  formatWeekRange,
  isToday,
  getWeekNumber,
  timeToMinutes,
  DAY_NAMES_SHORT,
} from '../utils/dateHelpers';
import {
  getLessonsForWeek,
  getDutiesForWeek,
  mergeConsecutiveLessons,
  getTimeRange,
  getClassColor,
} from '../utils/timetable';

// ===== WeekView =====
// Time-grid calendar: a vertical time axis on the left with lesson cards
// positioned absolutely at their correct time location.
// Free periods appear as empty gaps in the grid.

// How many pixels per minute of time — controls the vertical density.
const PX_PER_MINUTE = 1.8;

export default function WeekView({ timetableData, onClearData }) {
  const [currentDate, setCurrentDate] = useState(new Date());
  const monday = useMemo(() => getMonday(currentDate), [currentDate]);
  const weekDays = useMemo(() => getWeekDays(currentDate), [currentDate]);

  // Two-week support
  const isTwoWeek = !!timetableData.twoWeekTimetable;
  const anchorDate = timetableData.teacher?.exportDate;
  const weekNum = isTwoWeek && anchorDate
    ? getWeekNumber(currentDate, anchorDate)
    : null;

  // Get merged lessons and duties for this week
  const rawLessonsByDay = useMemo(
    () => getLessonsForWeek(timetableData, weekDays),
    [timetableData, weekDays]
  );

  const lessonsByDay = useMemo(() => {
    const merged = {};
    for (const [day, lessons] of Object.entries(rawLessonsByDay)) {
      merged[day] = mergeConsecutiveLessons(lessons);
    }
    return merged;
  }, [rawLessonsByDay]);

  const dutiesByDay = useMemo(
    () => getDutiesForWeek(timetableData, weekDays),
    [timetableData, weekDays]
  );

  // Calculate the time range for the grid.
  // We use the global range (across both weeks) so the grid height is consistent.
  const { startHour, endHour } = useMemo(
    () => getTimeRange(timetableData),
    [timetableData]
  );

  // Grid boundaries in minutes from midnight
  const gridStartMin = startHour * 60;
  const gridEndMin = endHour * 60;
  const gridTotalMin = gridEndMin - gridStartMin;
  const gridHeight = gridTotalMin * PX_PER_MINUTE;

  // Generate hour labels for the time axis
  const hourLabels = useMemo(() => {
    const labels = [];
    for (let h = startHour; h <= endHour; h++) {
      labels.push(h);
    }
    return labels;
  }, [startHour, endHour]);

  // Helpers to convert time → pixel position
  const timeToTop = (timeStr) => {
    const mins = timeToMinutes(timeStr);
    return (mins - gridStartMin) * PX_PER_MINUTE;
  };

  const durationToHeight = (startTime, endTime) => {
    const startMins = timeToMinutes(startTime);
    const endMins = timeToMinutes(endTime);
    return (endMins - startMins) * PX_PER_MINUTE;
  };

  const totalLessons = Object.values(lessonsByDay).reduce(
    (sum, lessons) => sum + lessons.length,
    0
  );

  // Navigation
  const goToPrevWeek = () => setCurrentDate((d) => shiftWeek(d, -1));
  const goToNextWeek = () => setCurrentDate((d) => shiftWeek(d, 1));
  const goToToday = () => setCurrentDate(new Date());

  const handleLessonClick = (lesson) => {
    console.log('Lesson clicked:', lesson);
  };

  return (
    <div className="flex-1 flex flex-col min-h-0">
      {/* ===== Header Bar ===== */}
      <header className="shrink-0 px-8 py-5 flex items-center justify-between border-b border-slate-100 bg-white/80 backdrop-blur-sm z-10">
        <div className="flex items-center gap-4">
          <div>
            <h2 className="font-serif text-2xl font-bold text-navy">
              {formatWeekRange(monday)}
            </h2>
            <p className="text-sm text-navy/40 mt-0.5">
              {totalLessons} lesson{totalLessons !== 1 ? 's' : ''} this week
            </p>
          </div>

          {weekNum && (
            <span className={`
              inline-flex items-center gap-1.5 px-4 py-1.5 rounded-full text-sm font-bold
              ${weekNum === 1
                ? 'bg-[#81B29A]/15 text-[#81B29A]'
                : 'bg-[#E07A5F]/15 text-[#E07A5F]'
              }
            `}>
              Week {weekNum}
            </span>
          )}
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={goToToday}
            className="flex items-center gap-2 px-4 py-2.5 rounded-full text-sm font-medium
                       text-navy/60 bg-sand hover:bg-[#81B29A]/10 hover:text-sage
                       transition-smooth"
          >
            <CalendarDays size={16} />
            Today
          </button>

          <div className="flex items-center bg-sand rounded-full p-1">
            <button
              onClick={goToPrevWeek}
              className="p-2 rounded-full hover:bg-white hover:shadow-sm transition-smooth text-navy/50 hover:text-navy"
            >
              <ChevronLeft size={18} />
            </button>
            <button
              onClick={goToNextWeek}
              className="p-2 rounded-full hover:bg-white hover:shadow-sm transition-smooth text-navy/50 hover:text-navy"
            >
              <ChevronRight size={18} />
            </button>
          </div>

          <button
            onClick={onClearData}
            className="flex items-center gap-2 px-4 py-2.5 rounded-full text-sm font-medium
                       text-navy/40 hover:text-terracotta hover:bg-[#E07A5F]/5
                       transition-smooth"
          >
            <RotateCcw size={15} />
            Reset
          </button>
        </div>
      </header>

      {/* ===== Time Grid ===== */}
      <div className="flex-1 overflow-auto">
        {/* Sticky day headers row */}
        <div className="sticky top-0 z-10 bg-cream/95 backdrop-blur-sm border-b border-slate-100">
          <div className="flex">
            {/* Spacer for time axis column */}
            <div className="w-16 shrink-0" />

            {/* Day headers */}
            <div className="flex-1 grid grid-cols-5 gap-2 px-2 py-3">
              {weekDays.map((day, i) => {
                const today = isToday(day);
                return (
                  <div
                    key={i}
                    className={`
                      text-center py-2 px-2 rounded-xl transition-smooth
                      ${today ? 'bg-[#81B29A]/10' : ''}
                    `}
                  >
                    <p className={`
                      text-xs font-semibold uppercase tracking-wider
                      ${today ? 'text-sage' : 'text-navy/30'}
                    `}>
                      {DAY_NAMES_SHORT[day.getDay()]}
                    </p>
                    <p className={`
                      font-serif text-lg font-bold
                      ${today ? 'text-sage' : 'text-navy'}
                    `}>
                      {day.getDate()}
                    </p>
                    {today && (
                      <div className="w-1.5 h-1.5 rounded-full bg-sage mx-auto mt-0.5" />
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Grid body: time axis + day columns */}
        <div className="flex px-2 pb-6">
          {/* ---- Time axis (left column) ---- */}
          <div className="w-16 shrink-0 relative" style={{ height: gridHeight }}>
            {hourLabels.map((hour) => {
              const top = (hour * 60 - gridStartMin) * PX_PER_MINUTE;
              return (
                <div
                  key={hour}
                  className="absolute right-3 flex items-start"
                  style={{ top }}
                >
                  <span className="text-[11px] font-medium text-navy/25 -translate-y-1/2 font-serif tabular-nums">
                    {hour}:00
                  </span>
                </div>
              );
            })}
          </div>

          {/* ---- Day columns with positioned cards ---- */}
          <div className="flex-1 grid grid-cols-5 gap-2 relative" style={{ height: gridHeight }}>
            {/* Horizontal hour grid lines (behind everything) */}
            {hourLabels.map((hour) => {
              const top = (hour * 60 - gridStartMin) * PX_PER_MINUTE;
              return (
                <div
                  key={`line-${hour}`}
                  className="absolute left-0 right-0 border-t border-slate-100"
                  style={{ top }}
                />
              );
            })}

            {/* Day columns */}
            {weekDays.map((day, i) => {
              const dayNum = day.getDay() === 0 ? 7 : day.getDay();
              const lessons = lessonsByDay[dayNum] || [];
              const duties = dutiesByDay[dayNum] || [];
              const today = isToday(day);

              return (
                <div
                  key={i}
                  className={`relative ${today ? 'bg-[#81B29A]/[0.03] rounded-2xl' : ''}`}
                  style={{ height: gridHeight }}
                >
                  {/* Duty cards positioned by time */}
                  {duties.map((duty, di) => {
                    const top = timeToTop(duty.startTime);
                    const height = durationToHeight(duty.startTime, duty.endTime);
                    return (
                      <div
                        key={`duty-${di}`}
                        className="absolute left-1 right-1 z-[2]"
                        style={{ top, height, minHeight: 28 }}
                      >
                        <DutyCard duty={duty} />
                      </div>
                    );
                  })}

                  {/* Lesson cards positioned by time */}
                  {lessons.map((lesson) => {
                    const top = timeToTop(lesson.startTime);
                    const height = durationToHeight(lesson.startTime, lesson.endTime);
                    const accent = getClassColor(lesson.classId, timetableData.classes);
                    return (
                      <div
                        key={lesson.id}
                        className="absolute left-1 right-1 z-[3]"
                        style={{ top, height }}
                      >
                        <LessonCard
                          lesson={lesson}
                          height={height}
                          accent={accent}
                          onClick={handleLessonClick}
                        />
                      </div>
                    );
                  })}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
