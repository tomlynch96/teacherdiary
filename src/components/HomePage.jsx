import React, { useState, useMemo, useRef, useCallback } from 'react';
import {
  ChevronLeft,
  ChevronRight,
  Clock,
  MapPin,
  Users,
  BookOpen,
  StickyNote,
  ExternalLink,
  Link2,
  Coffee,
  Sun,
  Sunrise,
  FolderOpen,
  CheckSquare,
} from 'lucide-react';
import {
  getWeekDays,
  getMonday,
  isToday,
  getWeekNumber,
  timeToMinutes,
  formatDateISO,
  formatTime,
  DAY_NAMES,
  MONTH_NAMES,
} from '../utils/dateHelpers';
import {
  getLessonsForWeek,
  getDutiesForWeek,
  mergeConsecutiveLessons,
  getClassColor,
  getOccurrenceForDate,
} from '../utils/timetable';
import {
  getLessonForOccurrence,
  getHolidayWeekMondays,
  getHolidayDates,
  getHolidayNameForDate,
} from '../utils/storage';

// ===== HomePage =====
// Daily briefing view. Shows a warm greeting and the day's lessons as
// hoverable pills with an info panel that appears on hover.
// Uses prediction zones so the user can move from pill to panel without flickering.

// --- Greeting helpers ---

function getGreetingPhrase() {
  const hour = new Date().getHours();
  if (hour < 12) return 'Good morning';
  if (hour < 17) return 'Good afternoon';
  return 'Good evening';
}

function getGreetingIcon() {
  const hour = new Date().getHours();
  if (hour < 7) return Sunrise;
  if (hour < 12) return Sun;
  if (hour < 17) return Sun;
  return Coffee;
}

function getEncouragingMessage(lessonCount, dutyCount) {
  if (lessonCount === 0 && dutyCount === 0) {
    return "Nothing on the timetable today — a perfect day to get ahead.";
  }
  if (lessonCount <= 2) {
    return "A light day ahead. Plenty of time to plan and breathe.";
  }
  if (lessonCount <= 4) {
    return "A steady day ahead. You've got this.";
  }
  return "A full day ahead — pace yourself and keep that energy up.";
}

function formatDayHeader(date) {
  const dayName = DAY_NAMES[date.getDay()];
  const day = date.getDate();
  const month = MONTH_NAMES[date.getMonth()];
  const suffix = (day === 1 || day === 21 || day === 31) ? 'st'
    : (day === 2 || day === 22) ? 'nd'
    : (day === 3 || day === 23) ? 'rd'
    : 'th';
  return { dayName, dateStr: `${day}${suffix} ${month}` };
}

// --- Main component ---

export default function HomePage({
  timetableData,
  lessonSequences,
  lessonSchedules,
  settings,
  todos,
  onNavigate,
}) {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [hoveredLesson, setHoveredLesson] = useState(null);
  
  // Prediction zone: delayed unhover so the user can move to the info panel
  // without it disappearing when crossing the gap between pill and panel.
  const hoverTimeoutRef = useRef(null);
  const activeHoverRef = useRef(null);

  const handlePillEnter = useCallback((idx) => {
    if (hoverTimeoutRef.current) {
      clearTimeout(hoverTimeoutRef.current);
      hoverTimeoutRef.current = null;
    }
    activeHoverRef.current = idx;
    setHoveredLesson(idx);
  }, []);

  const handlePillLeave = useCallback(() => {
    // Delay clearing — gives the user ~300ms to reach the info panel
    hoverTimeoutRef.current = setTimeout(() => {
      // Only clear if nothing else has claimed the hover
      setHoveredLesson((current) => {
        if (current === activeHoverRef.current) {
          activeHoverRef.current = null;
          return null;
        }
        return current;
      });
    }, 300);
  }, []);

  const handlePanelEnter = useCallback(() => {
    // Mouse reached the info panel — cancel the timeout
    if (hoverTimeoutRef.current) {
      clearTimeout(hoverTimeoutRef.current);
      hoverTimeoutRef.current = null;
    }
  }, []);

  const handlePanelLeave = useCallback(() => {
    // Left the panel — same delayed clear
    hoverTimeoutRef.current = setTimeout(() => {
      activeHoverRef.current = null;
      setHoveredLesson(null);
    }, 200);
  }, []);

  // Get the Monday of the current week for lesson lookup
  const monday = useMemo(() => getMonday(currentDate), [currentDate]);
  const weekDays = useMemo(() => getWeekDays(currentDate), [currentDate]);

  // Find the current day within the week
  const currentDayOfWeek = currentDate.getDay() === 0 ? 7 : currentDate.getDay();

  // Get lessons and duties for the whole week, then extract just today
  const weekLessons = useMemo(
    () => getLessonsForWeek(timetableData, weekDays),
    [timetableData, weekDays]
  );
  const weekDuties = useMemo(
    () => getDutiesForWeek(timetableData, weekDays),
    [timetableData, weekDays]
  );

  // Get today's lessons (merged consecutive periods) and duties
  const todayLessons = useMemo(() => {
    const raw = weekLessons[currentDayOfWeek] || [];
    return mergeConsecutiveLessons(raw);
  }, [weekLessons, currentDayOfWeek]);

  const todayDuties = useMemo(() => {
    return (weekDuties[currentDayOfWeek] || []).sort(
      (a, b) => timeToMinutes(a.startTime) - timeToMinutes(b.startTime)
    );
  }, [weekDuties, currentDayOfWeek]);

  // Check if current date is a holiday
  const holidayName = useMemo(() => {
    return getHolidayNameForDate(formatDateISO(currentDate));
  }, [currentDate]);

  // Map each lesson to its sequence content (title, notes, links, topic)
  const enrichedLessons = useMemo(() => {
    return todayLessons.map((lesson) => {
      const dateISO = formatDateISO(currentDate);
      const occNum = getOccurrenceForDate(lesson.classId, dateISO, lesson.startTime, timetableData);
      const seqLesson = occNum !== null ? getLessonForOccurrence(lesson.classId, occNum) : null;
      const classInfo = timetableData?.classes?.find((c) => c.id === lesson.classId);
      const color = getClassColor(lesson.classId, timetableData?.classes || []);

      return {
        ...lesson,
        color,
        classInfo,
        sequenceLesson: seqLesson,
        occurrenceNum: occNum,
      };
    });
  }, [todayLessons, currentDate, timetableData, lessonSequences, lessonSchedules]);

  // Get todos scheduled for today
  const todayTodos = useMemo(() => {
    const dateISO = formatDateISO(currentDate);
    return (todos || []).filter((t) => {
      if (t.completed) return false;
      if (!t.scheduledSlot) return false;
      const slotDate = typeof t.scheduledSlot.date === 'string'
        ? t.scheduledSlot.date.split('T')[0]
        : formatDateISO(t.scheduledSlot.date);
      return slotDate === dateISO;
    });
  }, [todos, currentDate]);

  // Week number for two-week timetables
  const weekNum = useMemo(() => {
    if (!timetableData?.twoWeekTimetable) return null;
    const anchor = timetableData.teacher?.exportDate;
    if (!anchor) return null;
    const holidayMondays = getHolidayWeekMondays();
    return getWeekNumber(currentDate, anchor, holidayMondays);
  }, [currentDate, timetableData]);

  // Navigation
  const goToPrevDay = () => {
    const prev = new Date(currentDate);
    prev.setDate(prev.getDate() - 1);
    // Skip weekends going backward
    while (prev.getDay() === 0 || prev.getDay() === 6) {
      prev.setDate(prev.getDate() - 1);
    }
    setCurrentDate(prev);
  };

  const goToNextDay = () => {
    const next = new Date(currentDate);
    next.setDate(next.getDate() + 1);
    // Skip weekends going forward
    while (next.getDay() === 0 || next.getDay() === 6) {
      next.setDate(next.getDate() + 1);
    }
    setCurrentDate(next);
  };

  const goToToday = () => {
    const today = new Date();
    // If weekend, go to next Monday
    if (today.getDay() === 0) today.setDate(today.getDate() + 1);
    if (today.getDay() === 6) today.setDate(today.getDate() + 2);
    setCurrentDate(today);
  };

  const teacherName = timetableData?.teacher?.name || '';
  const firstName = teacherName.replace(/^(Mr|Mrs|Ms|Miss|Dr|Prof)\s+/i, '').split(' ')[0] || teacherName;
  const { dayName, dateStr } = formatDayHeader(currentDate);
  const GreetingIcon = getGreetingIcon();
  const isTodayDate = isToday(currentDate);

  // All items sorted chronologically
  const allItems = useMemo(() => {
    const items = [];
    enrichedLessons.forEach((l) => {
      items.push({ type: 'lesson', data: l, startMin: timeToMinutes(l.startTime) });
    });
    todayDuties.forEach((d) => {
      items.push({ type: 'duty', data: d, startMin: timeToMinutes(d.startTime) });
    });
    return items.sort((a, b) => a.startMin - b.startMin);
  }, [enrichedLessons, todayDuties]);

  return (
    <div className="flex-1 flex flex-col min-h-0 bg-cream overflow-auto">
      {/* Day navigation */}
      <div className="shrink-0 flex items-center justify-between px-8 pt-6 pb-2">
        <div className="flex items-center gap-2">
          <button
            onClick={goToPrevDay}
            className="p-2 rounded-xl text-navy/25 hover:text-navy/50 hover:bg-sand transition-smooth"
          >
            <ChevronLeft size={20} />
          </button>
          <button
            onClick={goToToday}
            className={`px-4 py-1.5 rounded-full text-sm font-medium transition-smooth ${
              isTodayDate
                ? 'bg-[#81B29A]/10 text-sage'
                : 'text-navy/30 hover:text-navy/50 hover:bg-sand'
            }`}
          >
            Today
          </button>
          <button
            onClick={goToNextDay}
            className="p-2 rounded-xl text-navy/25 hover:text-navy/50 hover:bg-sand transition-smooth"
          >
            <ChevronRight size={20} />
          </button>
        </div>
        {weekNum && (
          <span
            className={`px-3 py-1 rounded-full text-xs font-bold tracking-wide ${
              weekNum === 1
                ? 'bg-[#81B29A]/10 text-sage'
                : 'bg-[#E07A5F]/10 text-terracotta'
            }`}
          >
            Week {weekNum}
          </span>
        )}
      </div>

      {/* Main content area */}
      <div className="flex-1 px-8 pb-12">
        {/* Greeting */}
        <div className="mb-8 pt-2">
          <div className="flex items-center gap-3 mb-2">
            <GreetingIcon size={22} className="text-[#F2CC8F]" strokeWidth={1.5} />
            <h1 className="font-serif text-3xl font-bold text-navy tracking-tight">
              {getGreetingPhrase()}, {firstName}
            </h1>
          </div>
          <p className="text-navy/40 text-lg ml-[34px]">
            Here's what your <span className="font-medium text-navy/60">{dayName}</span> looks like
            {!isTodayDate && (
              <span className="text-navy/30"> — {dateStr}</span>
            )}
          </p>
        </div>

        {/* Holiday notice */}
        {holidayName && (
          <div className="mb-8 ml-[34px] px-5 py-4 rounded-2xl bg-[#F2CC8F]/15 border border-[#F2CC8F]/20">
            <p className="font-serif text-lg text-navy/70">
              🏖️ {holidayName}
            </p>
            <p className="text-sm text-navy/40 mt-1">Enjoy the break!</p>
          </div>
        )}

        {/* Encouraging message */}
        {!holidayName && (
          <p className="text-sm text-navy/30 ml-[34px] mb-8 italic">
            {getEncouragingMessage(enrichedLessons.length, todayDuties.length)}
          </p>
        )}

        {/* Lessons + Info layout */}
        {!holidayName && (
          <div className="ml-[34px]">
            {/* 
              Prediction zone layout: each lesson is a full-width row.
              The pill sits on the left, the info panel on the right.
              Because the entire row belongs to one lesson, diagonal mouse 
              movement from pill to panel never crosses another lesson's zone.
            */}
            <div className="flex gap-0">
              {/* LEFT column: pills + duties + tasks */}
              <div className="flex flex-col gap-3 w-72 shrink-0">
                {allItems.length === 0 && (
                  <div className="py-8 text-center">
                    <Coffee size={32} className="mx-auto text-navy/15 mb-3" />
                    <p className="text-navy/30 text-sm">No lessons or duties today</p>
                  </div>
                )}

                {allItems.map((item, idx) => {
                  if (item.type === 'duty') {
                    const isInactive = hoveredLesson !== null && hoveredLesson !== idx;
                    return (
                      <div
                        key={`duty-${idx}`}
                        className="flex items-center gap-3 px-4 py-3 rounded-2xl bg-sand/60 border border-sand transition-all duration-300 ease-out origin-left"
                        style={{
                          width: isInactive ? '60%' : '100%',
                          opacity: isInactive ? 0.45 : 1,
                        }}
                      >
                        <div className="w-1 h-8 rounded-full bg-navy/15 shrink-0" />
                        <div className="min-w-0">
                          <p className="text-sm font-medium text-navy/50 truncate">
                            {item.data.activity}
                          </p>
                          <p className="text-xs text-navy/25">
                            {formatTime(item.data.startTime)} – {formatTime(item.data.endTime)}
                          </p>
                        </div>
                      </div>
                    );
                  }

                  const lesson = item.data;
                  const isHovered = hoveredLesson === idx;
                  const isInactive = hoveredLesson !== null && !isHovered;

                  return (
                    <div
                      key={`lesson-${idx}`}
                      className="relative transition-all duration-300 ease-out origin-left"
                      style={{
                        width: isInactive ? '60%' : '100%',
                      }}
                      onMouseEnter={() => handlePillEnter(idx)}
                      onMouseLeave={handlePillLeave}
                    >
                      {/* The pill */}
                      <div
                        className={`
                          flex items-center gap-3 px-4 py-3.5 rounded-2xl
                          border-2 cursor-pointer
                          transition-all duration-300 ease-out
                          ${isHovered
                            ? 'shadow-lg border-opacity-60'
                            : 'shadow-sm hover:shadow-md border-opacity-20'
                          }
                        `}
                        style={{
                          backgroundColor: `${lesson.color}${isInactive ? '05' : '08'}`,
                          borderColor: isHovered ? lesson.color : `${lesson.color}${isInactive ? '15' : '30'}`,
                          opacity: isInactive ? 0.5 : 1,
                        }}
                      >
                        <div
                          className="w-1.5 h-10 rounded-full shrink-0 transition-all duration-300"
                          style={{
                            backgroundColor: lesson.color,
                            opacity: isHovered ? 1 : 0.6,
                          }}
                        />
                        <div className="min-w-0 flex-1">
                          <p
                            className="font-serif text-sm font-bold truncate transition-colors duration-300"
                            style={{ color: isHovered ? lesson.color : '#3D405B' }}
                          >
                            {lesson.className}
                          </p>
                          {!isInactive && (
                            <p className="text-xs text-navy/35 mt-0.5">
                              {formatTime(lesson.startTime)} – {formatTime(lesson.endTime)}
                              <span className="mx-1.5 text-navy/15">·</span>
                              {lesson.period}
                            </p>
                          )}
                        </div>
                        {!isInactive && lesson.sequenceLesson?.title && (
                          <div
                            className="w-2 h-2 rounded-full shrink-0"
                            style={{ backgroundColor: lesson.color }}
                            title="Lesson planned"
                          />
                        )}
                      </div>

                      {/* Prediction bridge */}
                      {isHovered && (
                        <div
                          className="absolute top-0 bottom-0 left-full"
                          style={{ width: 'calc(100vw - 100%)' }}
                        />
                      )}
                    </div>
                  );
                })}

                {/* Today's tasks summary */}
                {todayTodos.length > 0 && (
                  <div className="mt-4 pt-4 border-t border-slate-100">
                    <p className="text-xs font-semibold text-navy/25 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                      <CheckSquare size={12} />
                      Tasks today
                    </p>
                    {todayTodos.slice(0, 3).map((todo) => (
                      <div key={todo.id} className="flex items-center gap-2 py-1.5 text-sm text-navy/40">
                        <div className="w-1 h-1 rounded-full bg-sage/40" />
                        <span className="truncate">{todo.title}</span>
                      </div>
                    ))}
                    {todayTodos.length > 3 && (
                      <p className="text-xs text-navy/25 mt-1">
                        +{todayTodos.length - 3} more
                      </p>
                    )}
                  </div>
                )}
              </div>

              {/* RIGHT: Info panel */}
              <div
                className="flex-1 min-w-0 pl-4 relative"
                onMouseEnter={handlePanelEnter}
                onMouseLeave={handlePanelLeave}
              >
                {hoveredLesson !== null && allItems[hoveredLesson]?.type === 'lesson' && (
                  <InfoPanel
                    lesson={allItems[hoveredLesson].data}
                    timetableData={timetableData}
                  />
                )}

                {/* Empty state when nothing hovered */}
                {hoveredLesson === null && enrichedLessons.length > 0 && (
                  <div className="flex items-center justify-center h-64 rounded-2xl border-2 border-dashed border-slate-100">
                    <p className="text-navy/15 text-sm">Hover over a lesson for details</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ===== Info Panel =====
// Appears on the right when a lesson pill is hovered.
// Simple fade-in animation, no blur effects.

function InfoPanel({ lesson, timetableData }) {
  const seq = lesson.sequenceLesson;
  const classInfo = lesson.classInfo;
  const hasContent = seq && (seq.title || seq.notes || (seq.links && seq.links.length > 0));

  return (
    <div className="info-panel-appear">
      <div
        className="rounded-2xl overflow-hidden bg-white border border-slate-100 shadow-sm"
      >
        {/* Header bar: class + metadata — compact */}
        <div
          className="px-5 py-3 flex items-center justify-between"
          style={{ backgroundColor: `${lesson.color}0D` }}
        >
          <div className="flex items-center gap-2 min-w-0">
            <span className="font-serif text-sm font-bold" style={{ color: lesson.color }}>
              {lesson.className}
            </span>
            <span className="text-xs text-navy/30">
              {classInfo?.subject || lesson.subject}
            </span>
          </div>
          <div className="flex items-center gap-3 text-xs text-navy/35 shrink-0">
            <span className="flex items-center gap-1">
              <Clock size={11} className="text-navy/25" />
              {formatTime(lesson.startTime)}–{formatTime(lesson.endTime)}
            </span>
            <span className="flex items-center gap-1">
              <MapPin size={11} className="text-navy/25" />
              {lesson.room || '—'}
            </span>
            {classInfo?.classSize && (
              <span className="flex items-center gap-1">
                <Users size={11} className="text-navy/25" />
                {classInfo.classSize}
              </span>
            )}
          </div>
        </div>

        {/* Body */}
        <div className="px-5 py-4">
          {hasContent ? (
            <div className="space-y-4">
              {/* LESSON TITLE — the hero */}
              {seq.title && (
                <div>
                  {seq.topicName && (
                    <div className="flex items-center gap-1.5 mb-1">
                      <FolderOpen size={12} className="text-navy/20" />
                      <span className="text-[11px] font-medium text-navy/30 uppercase tracking-wider">
                        {seq.topicName}
                      </span>
                    </div>
                  )}
                  <h2 className="font-serif text-2xl font-bold text-navy leading-snug">
                    {seq.title}
                  </h2>
                </div>
              )}

              {/* NOTES */}
              {seq.notes && (
                <div>
                  <div className="flex items-center gap-1.5 mb-1.5">
                    <StickyNote size={12} className="text-navy/20" />
                    <span className="text-[11px] font-semibold text-navy/25 uppercase tracking-wider">Notes</span>
                  </div>
                  <p className="text-sm text-navy/60 whitespace-pre-wrap leading-relaxed">
                    {seq.notes}
                  </p>
                </div>
              )}

              {/* LINKS */}
              {seq.links && seq.links.length > 0 && (
                <div>
                  <div className="flex items-center gap-1.5 mb-2">
                    <Link2 size={12} className="text-navy/20" />
                    <span className="text-[11px] font-semibold text-navy/25 uppercase tracking-wider">
                      Resources
                    </span>
                  </div>
                  <div className="space-y-1.5">
                    {seq.links.map((link, i) => (
                      <a
                        key={i}
                        href={link.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-3 px-3 py-2.5 rounded-xl bg-sand/40 border border-sand/60
                                   hover:bg-[#81B29A]/8 hover:border-sage/20
                                   transition-smooth group"
                      >
                        <div
                          className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0"
                          style={{ backgroundColor: `${lesson.color}15` }}
                        >
                          <ExternalLink size={13} style={{ color: lesson.color }} />
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-medium text-navy group-hover:text-sage transition-colors truncate">
                            {link.label || 'Open link'}
                          </p>
                          <p className="text-[11px] text-navy/20 truncate">
                            {link.url}
                          </p>
                        </div>
                        <ChevronRight size={13} className="text-navy/10 group-hover:text-sage/40 shrink-0 transition-colors" />
                      </a>
                    ))}
                  </div>
                </div>
              )}

              {/* Class notes */}
              {classInfo?.notes && (
                <div className="pt-3 border-t border-slate-100">
                  <p className="text-xs text-navy/25 italic leading-relaxed">
                    <span className="text-navy/35 font-medium not-italic">Class note:</span> {classInfo.notes}
                  </p>
                </div>
              )}
            </div>
          ) : (
            <div className="py-4 text-center">
              <p className="text-sm text-navy/25 italic">No lesson details yet — add them in Class View</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}