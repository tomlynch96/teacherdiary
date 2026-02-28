import React, { useState, useMemo, useRef, useCallback, useEffect } from 'react';
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
  Check,
  ClipboardCheck,
  Printer,
  PartyPopper,
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

// ===== Helper Functions =====

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
    return "Nothing on the timetable today \u2014 a perfect day to get ahead.";
  }
  if (lessonCount <= 2) {
    return "A light day ahead. Plenty of time to plan and breathe.";
  }
  if (lessonCount <= 4) {
    return "A steady day ahead. You\u2019ve got this.";
  }
  return "A full day ahead \u2014 pace yourself and keep that energy up.";
}

function formatDayHeader(date) {
  const dayName = DAY_NAMES[date.getDay()];
  const day = date.getDate();
  const month = MONTH_NAMES[date.getMonth()];
  const suffix =
    day === 1 || day === 21 || day === 31
      ? 'st'
      : day === 2 || day === 22
        ? 'nd'
        : day === 3 || day === 23
          ? 'rd'
          : 'th';
  return { dayName, dateStr: day + suffix + ' ' + month };
}

function formatMinutes(totalMins) {
  var h = Math.floor(totalMins / 60);
  var m = totalMins % 60;
  return h + ':' + String(m).padStart(2, '0');
}

function getLessonReadiness(lessons, timetableData, lessonSequences, lessonSchedules) {
  // lessons = array of merged lesson objects for a day
  if (!lessons || lessons.length === 0) {
    return { totalLessons: 0, plannedCount: 0, printedCount: 0, allPlanned: true, allPrinted: true, allReady: true };
  }

  let plannedCount = 0;
  let printedCount = 0;

  for (const lesson of lessons) {
    const dateStr = formatDateISO(lesson.date || new Date());
    const occNum = getOccurrenceForDate(lesson.classId, dateStr, lesson.startTime, timetableData);
    if (occNum !== null) {
      const content = getLessonForOccurrence(lesson.classId, occNum);
      if (content?.fullyPlanned) plannedCount++;
      if (content?.allPrinted) printedCount++;
    }
  }

  return {
    totalLessons: lessons.length,
    plannedCount,
    printedCount,
    allPlanned: plannedCount === lessons.length,
    allPrinted: printedCount === lessons.length,
    allReady: plannedCount === lessons.length && printedCount === lessons.length,
  };
}

// --- Main component ---

export default function HomePage({
  timetableData,
  lessonSequences,
  lessonSchedules,
  settings,
  todos,
  onUpdateTodos,
  onNavigate,
}) {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [hoveredLesson, setHoveredLesson] = useState(null);
  const [isDismissing, setIsDismissing] = useState(false);
  const [readyBannerVisible, setReadyBannerVisible] = useState(true);

  // Hover management refs
  const hoverTimeoutRef = useRef(null);
  const activeHoverRef = useRef(null);
  const dismissRef = useRef(null);

  var clearAllTimeouts = useCallback(function () {
    if (hoverTimeoutRef.current) {
      clearTimeout(hoverTimeoutRef.current);
      hoverTimeoutRef.current = null;
    }
  }, []);

  var dismiss = useCallback(function () {
    clearAllTimeouts();
    if (dismissRef.current) clearTimeout(dismissRef.current);
    setIsDismissing(true);
    dismissRef.current = setTimeout(function () {
      activeHoverRef.current = null;
      setHoveredLesson(null);
      setIsDismissing(false);
    }, 250);
  }, [clearAllTimeouts]);

  var handlePillEnter = useCallback(function (idx) {
    clearAllTimeouts();
    if (dismissRef.current) {
      clearTimeout(dismissRef.current);
      dismissRef.current = null;
    }
    setIsDismissing(false);
    activeHoverRef.current = idx;
    setHoveredLesson(idx);
  }, [clearAllTimeouts]);

  var handlePillLeave = useCallback(function () {
    hoverTimeoutRef.current = setTimeout(function () {
      dismiss();
    }, 300);
  }, [dismiss]);

  var handlePanelEnter = useCallback(function () {
    clearAllTimeouts();
    if (dismissRef.current) {
      clearTimeout(dismissRef.current);
      dismissRef.current = null;
    }
    setIsDismissing(false);
  }, [clearAllTimeouts]);

  var handlePanelLeave = useCallback(function () {
    clearAllTimeouts();
    hoverTimeoutRef.current = setTimeout(function () {
      dismiss();
    }, 200);
  }, [clearAllTimeouts, dismiss]);

  // Data computations
  var monday = useMemo(function () { return getMonday(currentDate); }, [currentDate]);
  var weekDays = useMemo(function () { return getWeekDays(currentDate); }, [currentDate]);
  var currentDayOfWeek = currentDate.getDay() === 0 ? 7 : currentDate.getDay();

  var weekLessons = useMemo(function () {
    return getLessonsForWeek(timetableData, weekDays);
  }, [timetableData, weekDays]);

  var weekDuties = useMemo(function () {
    return getDutiesForWeek(timetableData, weekDays);
  }, [timetableData, weekDays]);

  var todayLessons = useMemo(function () {
    var raw = (weekLessons[currentDayOfWeek] || []).map(function(l) {
      return Object.assign({}, l, { date: currentDate });
    });
    return mergeConsecutiveLessons(raw);
  }, [weekLessons, currentDayOfWeek, currentDate]);

  var todayDuties = useMemo(function () {
    return (weekDuties[currentDayOfWeek] || []).sort(function (a, b) {
      return timeToMinutes(a.startTime) - timeToMinutes(b.startTime);
    });
  }, [weekDuties, currentDayOfWeek]);

  // Readiness computations
  var todayReadiness = useMemo(function () {
    return getLessonReadiness(todayLessons, timetableData, lessonSequences, lessonSchedules);
  }, [todayLessons, timetableData, lessonSequences, lessonSchedules]);

  var tomorrowReadiness = useMemo(function () {
    var tomorrow = new Date(currentDate);
    tomorrow.setDate(tomorrow.getDate() + 1);
    while (tomorrow.getDay() === 0 || tomorrow.getDay() === 6) {
      tomorrow.setDate(tomorrow.getDate() + 1);
    }
    var tomorrowWeekDays = getWeekDays(tomorrow);
    var tomorrowDOW = tomorrow.getDay() === 0 ? 7 : tomorrow.getDay();
    var tomorrowLessons = getLessonsForWeek(timetableData, tomorrowWeekDays, null);
    var tomorrowDayLessons = (tomorrowLessons[tomorrowDOW] || [])
      .map(function (l) { return Object.assign({}, l, { date: tomorrow }); });
    var merged = mergeConsecutiveLessons(tomorrowDayLessons);
    return getLessonReadiness(merged, timetableData, lessonSequences, lessonSchedules);
  }, [currentDate, timetableData, lessonSequences, lessonSchedules]);

  var weekReadiness = useMemo(function () {
    var allPlanned = true;
    var allPrinted = true;
    var totalLessons = 0;

    for (var i = 0; i < weekDays.length; i++) {
      var wd = weekDays[i];
      if (wd.getDay() === 0 || wd.getDay() === 6) continue;
      var dow = wd.getDay();
      var lessons = getLessonsForWeek(timetableData, weekDays, null);
      var dayL = (lessons[dow] || []).map(function (l) { return Object.assign({}, l, { date: wd }); });
      var merged = mergeConsecutiveLessons(dayL);
      var r = getLessonReadiness(merged, timetableData, lessonSequences, lessonSchedules);
      totalLessons += r.totalLessons;
      if (!r.allPlanned) allPlanned = false;
      if (!r.allPrinted) allPrinted = false;
    }

    return { allPlanned, allPrinted, allReady: allPlanned && allPrinted, totalLessons };
  }, [weekDays, timetableData, lessonSequences, lessonSchedules]);

  useEffect(function () {
    if (todayReadiness.allReady && todayReadiness.totalLessons > 0) {
      var timer = setTimeout(function () {
        setReadyBannerVisible(false);
      }, 5000);
      return function () { clearTimeout(timer); };
    } else {
      setReadyBannerVisible(true);
    }
  }, [todayReadiness.allReady, todayReadiness.totalLessons, currentDate]);

  var holidayName = useMemo(function () {
    return getHolidayNameForDate(formatDateISO(currentDate));
  }, [currentDate]);

  var enrichedLessons = useMemo(function () {
    return todayLessons.map(function (lesson) {
      var dateISO = formatDateISO(currentDate);
      var occNum = getOccurrenceForDate(lesson.classId, dateISO, lesson.startTime, timetableData);
      var seqLesson = occNum !== null ? getLessonForOccurrence(lesson.classId, occNum) : null;
      var classInfo = timetableData && timetableData.classes
        ? timetableData.classes.find(function (c) { return c.id === lesson.classId; })
        : null;
      var color = getClassColor(lesson.classId, (timetableData && timetableData.classes) || []);
      return Object.assign({}, lesson, {
        color: color,
        classInfo: classInfo,
        sequenceLesson: seqLesson,
        occurrenceNum: occNum,
        content: seqLesson // Attaching content for status icons
      });
    });
  }, [todayLessons, currentDate, timetableData, lessonSequences, lessonSchedules]);

  var scheduledAndUnscheduled = useMemo(function () {
    var dateISO = formatDateISO(currentDate);
    var scheduled = [];
    var unscheduled = [];
    (todos || []).forEach(function (t) {
      if (t.scheduledSlot) {
        var slotDate = typeof t.scheduledSlot.date === 'string'
          ? t.scheduledSlot.date.split('T')[0]
          : formatDateISO(t.scheduledSlot.date);
        if (slotDate === dateISO) scheduled.push(t);
      } else if (!t.completed) {
        unscheduled.push(t);
      }
    });
    var slotGroups = {};
    scheduled.forEach(function (t) {
      var key = t.scheduledSlot.startMinutes + '-' + t.scheduledSlot.endMinutes;
      if (!slotGroups[key]) slotGroups[key] = [];
      slotGroups[key].push(t);
    });
    Object.keys(slotGroups).forEach(function (key) {
      slotGroups[key].sort(function (a, b) {
        if (a.completed && !b.completed) return 1;
        if (!a.completed && b.completed) return -1;
        return (a.stackOrder || 0) - (b.stackOrder || 0);
      });
    });
    return { slotGroups: slotGroups, unscheduledTodos: unscheduled };
  }, [todos, currentDate]);

  var slotGroups = scheduledAndUnscheduled.slotGroups;
  var unscheduledTodos = scheduledAndUnscheduled.unscheduledTodos;

  var handleToggleTask = useCallback(function (taskId) {
    if (!onUpdateTodos) return;
    var updatedTodos = (todos || []).map(function (t) {
      return t.id === taskId ? Object.assign({}, t, { completed: !t.completed }) : t;
    });
    onUpdateTodos(updatedTodos);
  }, [todos, onUpdateTodos]);

  var weekNum = useMemo(function () {
    if (!timetableData || !timetableData.twoWeekTimetable) return null;
    var anchor = timetableData.teacher && timetableData.teacher.exportDate;
    if (!anchor) return null;
    var holidayMondays = getHolidayWeekMondays();
    return getWeekNumber(currentDate, anchor, holidayMondays);
  }, [currentDate, timetableData]);

  // Navigation
  var goToPrevDay = function () {
    var prev = new Date(currentDate);
    prev.setDate(prev.getDate() - 1);
    while (prev.getDay() === 0 || prev.getDay() === 6) prev.setDate(prev.getDate() - 1);
    setCurrentDate(prev);
  };

  var goToNextDay = function () {
    var next = new Date(currentDate);
    next.setDate(next.getDate() + 1);
    while (next.getDay() === 0 || next.getDay() === 6) next.setDate(next.getDate() + 1);
    setCurrentDate(next);
  };

  var goToToday = function () {
    var today = new Date();
    if (today.getDay() === 0) today.setDate(today.getDate() + 1);
    if (today.getDay() === 6) today.setDate(today.getDate() + 2);
    setCurrentDate(today);
  };

  var teacherName = (timetableData && timetableData.teacher && timetableData.teacher.name) || '';
  var firstName = teacherName.replace(/^(Mr|Mrs|Ms|Miss|Dr|Prof)\s+/i, '').split(' ')[0] || teacherName;
  var dayHeader = formatDayHeader(currentDate);
  var dayName = dayHeader.dayName;
  var dateStr = dayHeader.dateStr;
  var GreetingIcon = getGreetingIcon();
  var isTodayDate = isToday(currentDate);

  var allItems = useMemo(function () {
    var items = [];
    enrichedLessons.forEach(function (l) {
      items.push({ type: 'lesson', data: l, startMin: timeToMinutes(l.startTime) });
    });
    todayDuties.forEach(function (d) {
      items.push({ type: 'duty', data: d, startMin: timeToMinutes(d.startTime) });
    });
    Object.keys(slotGroups).forEach(function (key) {
      var tasks = slotGroups[key];
      var startMin = tasks[0].scheduledSlot.startMinutes;
      items.push({ type: 'taskGroup', data: tasks, startMin: startMin });
    });
    return items.sort(function (a, b) { return a.startMin - b.startMin; });
  }, [enrichedLessons, todayDuties, slotGroups]);

  return (
    <div className="flex-1 flex flex-col min-h-0 bg-cream overflow-auto">
      {/* Day navigation */}
      <div className="shrink-0 flex items-center justify-between px-8 pt-6 pb-2">
        <div className="flex items-center gap-2">
          <button onClick={goToPrevDay} className="p-2 rounded-xl text-navy/25 hover:text-navy/50 hover:bg-sand transition-smooth">
            <ChevronLeft size={20} />
          </button>
          <button
            onClick={goToToday}
            className={'px-4 py-1.5 rounded-full text-sm font-medium transition-smooth ' + (isTodayDate ? 'bg-[#81B29A]/10 text-sage' : 'text-navy/30 hover:text-navy/50 hover:bg-sand')}
          >
            Today
          </button>
          <button onClick={goToNextDay} className="p-2 rounded-xl text-navy/25 hover:text-navy/50 hover:bg-sand transition-smooth">
            <ChevronRight size={20} />
          </button>
        </div>
        {weekNum && (
          <span className={'px-3 py-1 rounded-full text-xs font-bold tracking-wide ' + (weekNum === 1 ? 'bg-[#81B29A]/10 text-sage' : 'bg-[#E07A5F]/10 text-terracotta')}>
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
            {!isTodayDate && <span className="text-navy/30"> &mdash; {dateStr}</span>}
          </p>
        </div>

        <div className="ml-[34px]">
          {/* Readiness banner */}
          {todayReadiness.totalLessons > 0 && !holidayName && (
            todayReadiness.allReady ? (
              <div
                className="mb-4 transition-all duration-1000 ease-out"
                style={{
                  opacity: readyBannerVisible ? 1 : 0,
                  maxHeight: readyBannerVisible ? '60px' : '0px',
                  overflow: 'hidden',
                }}
              >
                <div className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-sage/10 border border-sage/20">
                  <ClipboardCheck size={15} className="text-sage" strokeWidth={2.5} />
                  <Printer size={15} className="text-sage" strokeWidth={2.5} />
                  <span className="text-xs font-semibold text-sage">All planned and printed for today</span>
                </div>
              </div>
            ) : (
              <div className="mb-4">
                <div className="flex items-center gap-3 px-4 py-2.5 rounded-xl bg-terracotta/8 border border-terracotta/15">
                  {!todayReadiness.allPlanned && (
                    <div className="flex items-center gap-1.5">
                      <ClipboardCheck size={14} className="text-terracotta/60" strokeWidth={1.5} />
                      <span className="text-xs font-medium text-terracotta/70">
                        {todayReadiness.totalLessons - todayReadiness.plannedCount} lesson{todayReadiness.totalLessons - todayReadiness.plannedCount !== 1 ? 's' : ''} not yet planned
                      </span>
                    </div>
                  )}
                  {!todayReadiness.allPrinted && (
                    <div className="flex items-center gap-1.5">
                      <Printer size={14} className="text-terracotta/60" strokeWidth={1.5} />
                      <span className="text-xs font-medium text-terracotta/70">
                        {todayReadiness.totalLessons - todayReadiness.printedCount} lesson{todayReadiness.totalLessons - todayReadiness.printedCount !== 1 ? 's' : ''} not yet printed
                      </span>
                    </div>
                  )}
                </div>
              </div>
            )
          )}

          {/* Holiday notice */}
          {holidayName && (
            <div className="mb-8 px-5 py-4 rounded-2xl bg-[#F2CC8F]/15 border border-[#F2CC8F]/20">
              <p className="font-serif text-lg text-navy/70">{'\uD83C\uDFD6\uFE0F'} {holidayName}</p>
              <p className="text-sm text-navy/40 mt-1">Enjoy the break!</p>
            </div>
          )}

          {/* Encouraging message */}
          {!holidayName && (
            <p className="text-sm text-navy/30 mb-8 italic">
              {getEncouragingMessage(enrichedLessons.length, todayDuties.length)}
            </p>
          )}

          {/* Lessons + Info layout */}
          {!holidayName && (
            <div className="flex gap-0">
              {/* LEFT column: pills */}
              <div className="flex flex-col gap-3 w-72 shrink-0">
                {allItems.length === 0 && unscheduledTodos.length === 0 && (
                  <div className="py-8 text-center">
                    <Coffee size={32} className="mx-auto text-navy/15 mb-3" />
                    <p className="text-navy/30 text-sm">No lessons or duties today</p>
                  </div>
                )}

                {allItems.map(function (item, idx) {
                  var isInactive = hoveredLesson !== null && hoveredLesson !== idx;

                  if (item.type === 'duty') {
                    return (
                      <div
                        key={'duty-' + idx}
                        className="flex items-center gap-3 px-4 py-3 rounded-2xl bg-sand/60 border border-sand transition-all duration-300 ease-out origin-left"
                        style={{ width: isInactive ? '60%' : '100%', opacity: isInactive ? 0.45 : 1 }}
                      >
                        <div className="w-1 h-8 rounded-full bg-navy/15 shrink-0" />
                        <div className="min-w-0">
                          <p className="text-sm font-medium text-navy/50 truncate">{item.data.activity}</p>
                          <p className="text-xs text-navy/25">{formatTime(item.data.startTime)} &ndash; {formatTime(item.data.endTime)}</p>
                        </div>
                      </div>
                    );
                  }

                  if (item.type === 'taskGroup') {
                    var tasks = item.data;
                    var slot = tasks[0].scheduledSlot;
                    var timeStr = formatMinutes(slot.startMinutes) + ' \u2013 ' + formatMinutes(slot.endMinutes);
                    var remaining = tasks.filter(function (t) { return !t.completed; }).length;
                    var completed = tasks.length - remaining;
                    return (
                      <div
                        key={'taskgroup-' + idx}
                        className="rounded-2xl border border-[#81B29A]/15 bg-[#81B29A]/5 transition-all duration-300 ease-out origin-left overflow-hidden"
                        style={{ width: isInactive ? '60%' : '100%', opacity: isInactive ? 0.45 : 1 }}
                      >
                        <div className="flex items-center justify-between px-4 pt-3 pb-1.5">
                          <div className="flex items-center gap-2">
                            <CheckSquare size={13} className="text-sage/50" />
                            <span className="text-xs font-medium text-navy/35">{timeStr}</span>
                          </div>
                          <div className="flex items-center gap-2 text-[11px] text-navy/25">
                            {remaining > 0 && <span>{remaining} remaining</span>}
                            {completed > 0 && <span className="text-sage/60">{completed} done</span>}
                          </div>
                        </div>
                        <div className="px-2 pb-2 space-y-1">
                          {tasks.map(function (task) {
                            return (
                              <div key={task.id} className="flex items-center gap-2.5 px-2 py-1.5 rounded-xl hover:bg-white/60 transition-smooth group">
                                <button
                                  onClick={function (e) { e.stopPropagation(); handleToggleTask(task.id); }}
                                  className="shrink-0 w-4 h-4 rounded border-2 flex items-center justify-center transition-smooth"
                                  style={{
                                    borderColor: task.completed ? '#81B29A' : 'rgb(203 213 225)',
                                    backgroundColor: task.completed ? '#81B29A' : 'transparent',
                                  }}
                                >
                                  {task.completed && <Check size={10} className="text-white" strokeWidth={3} />}
                                </button>
                                <span className={'text-sm truncate ' + (task.completed ? 'line-through text-navy/25' : 'text-navy/60 font-medium')}>
                                  {task.text}
                                </span>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    );
                  }

                  var lesson = item.data;
                  var isHovered = hoveredLesson === idx;

                  return (
                    <div
                      key={'lesson-' + idx}
                      className="relative transition-all duration-300 ease-out origin-left"
                      style={{ width: isInactive ? '60%' : '100%' }}
                      onMouseEnter={function () { handlePillEnter(idx); }}
                      onMouseLeave={handlePillLeave}
                    >
                      <div
                        className={'flex items-center gap-3 px-4 py-3.5 rounded-2xl border-2 cursor-pointer transition-all duration-300 ease-out ' + (isHovered ? 'shadow-lg border-opacity-60' : 'shadow-sm hover:shadow-md border-opacity-20')}
                        style={{
                          backgroundColor: lesson.color + (isInactive ? '05' : '08'),
                          borderColor: isHovered ? lesson.color : lesson.color + (isInactive ? '15' : '30'),
                          opacity: isInactive ? 0.5 : 1,
                        }}
                      >
                        <div
                          className="w-1.5 h-10 rounded-full shrink-0 transition-all duration-300"
                          style={{ backgroundColor: lesson.color, opacity: isHovered ? 1 : 0.6 }}
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
                              {formatTime(lesson.startTime)} &ndash; {formatTime(lesson.endTime)}
                              <span className="mx-1.5 text-navy/15">&middot;</span>
                              {lesson.period}
                            </p>
                          )}
                        </div>
                        
                        <div className="flex items-center gap-1 shrink-0 ml-auto">
                          <ClipboardCheck
                            size={13}
                            className={lesson.content?.fullyPlanned ? 'text-sage' : 'text-navy/15'}
                            strokeWidth={lesson.content?.fullyPlanned ? 2.5 : 1.5}
                          />
                          <Printer
                            size={13}
                            className={lesson.content?.allPrinted ? 'text-sage' : 'text-navy/15'}
                            strokeWidth={lesson.content?.allPrinted ? 2.5 : 1.5}
                          />
                        </div>
                      </div>

                      {isHovered && (
                        <div className="absolute top-0 bottom-0 left-full" style={{ width: 'calc(100vw - 100%)' }} />
                      )}
                    </div>
                  );
                })}

                {unscheduledTodos.length > 0 && (
                  <div className="mt-4 pt-4 border-t border-slate-100">
                    <p className="text-xs font-semibold text-navy/25 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                      <CheckSquare size={12} />
                      Unscheduled tasks
                    </p>
                    {unscheduledTodos.map(function (todo) {
                      return (
                        <div key={todo.id} className="flex items-center gap-2.5 py-1.5 group">
                          <button
                            onClick={function () { handleToggleTask(todo.id); }}
                            className="shrink-0 w-3.5 h-3.5 rounded border-2 border-slate-300 hover:border-sage hover:bg-sage/10 transition-smooth flex items-center justify-center"
                          />
                          <span className="text-sm text-navy/40 truncate">{todo.text}</span>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* RIGHT: Info panel */}
              <div className="flex-1 min-w-0 pl-4 relative">
                {hoveredLesson !== null && allItems[hoveredLesson] && allItems[hoveredLesson].type === 'lesson' && (
                  <div
                    onMouseEnter={handlePanelEnter}
                    onMouseLeave={handlePanelLeave}
                    className="inline-block w-full"
                  >
                    <InfoPanel
                      lesson={allItems[hoveredLesson].data}
                      timetableData={timetableData}
                      isDismissing={isDismissing}
                    />
                  </div>
                )}

                {hoveredLesson === null && !isDismissing && enrichedLessons.length > 0 && (
                  <div className="flex items-center justify-center h-64 rounded-2xl border-2 border-dashed border-slate-100">
                    <p className="text-navy/15 text-sm">Hover over a lesson for details</p>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Tomorrow / week readiness — bottom of page */}
          {todayReadiness.totalLessons > 0 && !holidayName && (
            <div className="mt-12 space-y-2 w-72">
              {tomorrowReadiness.totalLessons > 0 && tomorrowReadiness.allReady && (
                <div className="flex items-center gap-2 px-4 py-3 rounded-xl bg-sage/5 border border-sage/10">
                  <span className="text-sm">✨</span>
                  <span className="text-xs font-medium text-sage/80">
                    Tomorrow is fully planned and printed too — you're ahead of the game!
                  </span>
                </div>
              )}

              {weekReadiness.totalLessons > 0 && weekReadiness.allReady && (
                <div className="flex items-center gap-2 px-4 py-3 rounded-xl bg-gradient-to-r from-sage/8 to-[#81B29A]/5 border border-sage/15">
                  <span className="text-sm">🌟</span>
                  <span className="text-xs font-semibold text-sage">
                    The entire week is planned and printed — incredible work! Enjoy teaching without the prep stress.
                  </span>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ===== Info Panel =====

function InfoPanel({ lesson, timetableData, isDismissing }) {
  var seq = lesson.sequenceLesson;
  var classInfo = lesson.classInfo;
  var hasContent = seq && (seq.title || seq.notes || (seq.links && seq.links.length > 0));

  return (
    <div className={isDismissing ? 'info-panel-dismiss' : 'info-panel-appear'}>
      <div className="rounded-2xl overflow-hidden bg-white border border-slate-100 shadow-sm">
        <div className="px-5 py-3 flex items-center justify-between" style={{ backgroundColor: lesson.color + '0D' }}>
          <div className="flex items-center gap-2 min-w-0">
            <span className="font-serif text-sm font-bold" style={{ color: lesson.color }}>{lesson.className}</span>
            <span className="text-xs text-navy/30">{(classInfo && classInfo.subject) || lesson.subject}</span>
          </div>
          <div className="flex items-center gap-3 text-xs text-navy/35 shrink-0">
            <span className="flex items-center gap-1">
              <Clock size={11} className="text-navy/25" />
              {formatTime(lesson.startTime)}&ndash;{formatTime(lesson.endTime)}
            </span>
            <span className="flex items-center gap-1">
              <MapPin size={11} className="text-navy/25" />
              {lesson.room || '\u2014'}
            </span>
            {classInfo && classInfo.classSize && (
              <span className="flex items-center gap-1">
                <Users size={11} className="text-navy/25" />
                {classInfo.classSize}
              </span>
            )}
          </div>
        </div>

        <div className="px-5 py-4">
          {hasContent ? (
            <div className="space-y-4">
              {seq.title && (
                <div>
                  {seq.topicName && (
                    <div className="flex items-center gap-1.5 mb-1">
                      <FolderOpen size={12} className="text-navy/20" />
                      <span className="text-[11px] font-medium text-navy/30 uppercase tracking-wider">{seq.topicName}</span>
                    </div>
                  )}
                  <h2 className="font-serif text-2xl font-bold text-navy leading-snug">{seq.title}</h2>
                </div>
              )}

              {seq.notes && (
                <div>
                  <div className="flex items-center gap-1.5 mb-1.5">
                    <StickyNote size={12} className="text-navy/20" />
                    <span className="text-[11px] font-semibold text-navy/25 uppercase tracking-wider">Notes</span>
                  </div>
                  <p className="text-sm text-navy/60 whitespace-pre-wrap leading-relaxed">{seq.notes}</p>
                </div>
              )}

              {seq.links && seq.links.length > 0 && (
                <div>
                  <div className="flex items-center gap-1.5 mb-2">
                    <Link2 size={12} className="text-navy/20" />
                    <span className="text-[11px] font-semibold text-navy/25 uppercase tracking-wider">Resources</span>
                  </div>
                  <div className="space-y-1.5">
                    {seq.links.map(function (link, i) {
                      return (
                        <a
                          key={i}
                          href={link.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center gap-3 px-3 py-2.5 rounded-xl bg-sand/40 border border-sand/60 hover:bg-[#81B29A]/8 hover:border-sage/20 transition-smooth group"
                        >
                          <div className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0" style={{ backgroundColor: lesson.color + '15' }}>
                            <ExternalLink size={13} style={{ color: lesson.color }} />
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className="text-sm font-medium text-navy group-hover:text-sage transition-colors truncate">{link.label || 'Open link'}</p>
                            <p className="text-[11px] text-navy/20 truncate">{link.url}</p>
                          </div>
                          <ChevronRight size={13} className="text-navy/10 group-hover:text-sage/40 shrink-0 transition-colors" />
                        </a>
                      );
                    })}
                  </div>
                </div>
              )}

              {classInfo && classInfo.notes && (
                <div className="pt-3 border-t border-slate-100">
                  <p className="text-xs text-navy/25 italic leading-relaxed">
                    <span className="text-navy/35 font-medium not-italic">Class note:</span> {classInfo.notes}
                  </p>
                </div>
              )}
            </div>
          ) : (
            <div className="py-4 text-center">
              <p className="text-sm text-navy/25 italic">No lesson details yet &mdash; add them in Class View</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}