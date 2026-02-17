import React, { useState, useMemo } from 'react';
import {
  ChevronLeft,
  ChevronRight,
  CalendarDays,
  RotateCcw,
  Calendar,
  CalendarRange,
} from 'lucide-react';
import DayColumn from './DayColumn';
import LessonPanel from './LessonPanel';
import TaskSchedulePanel from './TaskSchedulePanel';
import TaskStackManager from './TaskStackManager';
import {
  getWeekDays,
  getMonday,
  shiftWeek,
  formatWeekRange,
  isToday,
  getWeekNumber,
  timeToMinutes,
  formatDateISO,
  DAY_NAMES_SHORT,
} from '../utils/dateHelpers';
import {
  getLessonsForWeek,
  getDutiesForWeek,
  mergeConsecutiveLessons,
  getTimeRange,
  getOccurrenceForDate,
} from '../utils/timetable';
import { getLessonForOccurrence } from '../utils/storage';

const PX_PER_MINUTE = 1.8;

export default function WeekView({
  timetableData,
  lessonSequences,
  lessonSchedules,
  onUpdateLesson,
  onAddLesson,
  onClearData,
  todos,
  onUpdateTodos,
}) {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedLesson, setSelectedLesson] = useState(null);
  const [viewMode, setViewMode] = useState('week');
  const [selectedDayIndex, setSelectedDayIndex] = useState(null);
  const [selectedFreeSlot, setSelectedFreeSlot] = useState(null);
  const [stackManagerData, setStackManagerData] = useState(null);
  const [showTaskScheduler, setShowTaskScheduler] = useState(false);

  const monday = useMemo(() => getMonday(currentDate), [currentDate]);
  const weekDays = useMemo(() => getWeekDays(currentDate), [currentDate]);

  const isTwoWeek = !!timetableData.twoWeekTimetable;
  const anchorDate = timetableData.teacher?.exportDate;
  const weekNum = isTwoWeek && anchorDate
    ? getWeekNumber(currentDate, anchorDate)
    : null;

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

  const { startHour, endHour } = useMemo(
    () => getTimeRange(timetableData),
    [timetableData]
  );

  const gridStartMin = startHour * 60;
  const gridTotalMin = (endHour * 60) - gridStartMin;
  const gridHeight = gridTotalMin * PX_PER_MINUTE;

  const hourLabels = useMemo(() => {
    const labels = [];
    for (let h = startHour; h <= endHour; h++) labels.push(h);
    return labels;
  }, [startHour, endHour]);

  const activeDayIndex = viewMode === 'day' && selectedDayIndex !== null
    ? selectedDayIndex
    : weekDays.findIndex(day => isToday(day));

  const selectedDay = activeDayIndex !== -1 ? weekDays[activeDayIndex] : null;

  const totalLessons = viewMode === 'day' && selectedDay
    ? (lessonsByDay[selectedDay.getDay() === 0 ? 7 : selectedDay.getDay()] || []).length
    : Object.values(lessonsByDay).reduce((sum, l) => sum + l.length, 0);

  // Detect free periods
  const freePeriodsWithTasks = useMemo(() => {
    const periods = {};

    Object.keys(lessonsByDay).forEach(dayNum => {
      const lessons = lessonsByDay[dayNum] || [];
      const duties = dutiesByDay[dayNum] || [];
      const dayIndex = parseInt(dayNum) - 1;
      if (dayIndex < 0 || dayIndex >= weekDays.length) return;

      const date = weekDays[dayIndex];
      const occupied = [
        ...lessons.map(l => ({ start: timeToMinutes(l.startTime), end: timeToMinutes(l.endTime) })),
        ...duties.map(d => ({ start: timeToMinutes(d.startTime), end: timeToMinutes(d.endTime) }))
      ].sort((a, b) => a.start - b.start);

      let currentTime = startHour * 60;
      const dayPeriods = [];

      occupied.forEach(slot => {
        if (currentTime < slot.start && (slot.start - currentTime) >= 30) {
          dayPeriods.push({
            date,
            startMinutes: currentTime,
            endMinutes: slot.start,
            duration: slot.start - currentTime,
          });
        }
        currentTime = Math.max(currentTime, slot.end);
      });

      if (currentTime < endHour * 60 && ((endHour * 60) - currentTime) >= 30) {
        dayPeriods.push({
          date,
          startMinutes: currentTime,
          endMinutes: endHour * 60,
          duration: (endHour * 60) - currentTime,
        });
      }

      periods[dayNum] = dayPeriods;
    });

    return periods;
  }, [lessonsByDay, dutiesByDay, weekDays, startHour, endHour]);

  const goToPrevWeek = () => setCurrentDate((d) => shiftWeek(d, -1));
  const goToNextWeek = () => setCurrentDate((d) => shiftWeek(d, 1));
  const goToToday = () => setCurrentDate(new Date());

  const handleLessonClick = (lesson) => setSelectedLesson(lesson);
  const handleDayClick = (dayIndex) => {
    setSelectedDayIndex(dayIndex);
    setViewMode('day');
  };

  // Helper to find tasks in a given slot from a todos array
  const findTasksInSlot = (todosArray, slot) => {
    const slotDate = typeof slot.date === 'string' ? new Date(slot.date) : slot.date;
    return todosArray
      .filter(t => {
        if (!t.scheduledSlot) return false;
        const tDate = typeof t.scheduledSlot.date === 'string'
          ? new Date(t.scheduledSlot.date) : t.scheduledSlot.date;
        return tDate.toDateString() === slotDate.toDateString()
          && t.scheduledSlot.startMinutes === slot.startMinutes;
      })
      .sort((a, b) => {
        if (a.completed && !b.completed) return 1;
        if (!a.completed && b.completed) return -1;
        return (a.stackOrder || 0) - (b.stackOrder || 0);
      });
  };

  const handleScheduleTask = (taskId, slot) => {
    if (!todos || !onUpdateTodos) return;
    const serializedSlot = {
      ...slot,
      date: typeof slot.date === 'string' ? slot.date : slot.date.toISOString()
    };
    const tasksInSlot = todos.filter(t => {
      if (!t.scheduledSlot) return false;
      const tDate = typeof t.scheduledSlot.date === 'string'
        ? new Date(t.scheduledSlot.date) : t.scheduledSlot.date;
      return tDate.toDateString() === (typeof slot.date === 'string'
        ? new Date(slot.date) : slot.date).toDateString()
        && t.scheduledSlot.startMinutes === slot.startMinutes;
    });
    const maxOrder = tasksInSlot.reduce((max, t) => Math.max(max, t.stackOrder || 0), -1);
    const updatedTodos = todos.map(t =>
      t.id === taskId ? { ...t, scheduledSlot: serializedSlot, stackOrder: maxOrder + 1 } : t
    );
    onUpdateTodos(updatedTodos);

    // Refresh stack manager if open
    if (stackManagerData) {
      const refreshedTasks = findTasksInSlot(updatedTodos, stackManagerData.slot);
      setStackManagerData({ slot: stackManagerData.slot, tasks: refreshedTasks });
    }

    // Auto-close scheduler
    setShowTaskScheduler(false);
    if (!stackManagerData) setSelectedFreeSlot(null);
  };

  const handleScheduleMultipleTasks = (taskIds, slot) => {
    if (!todos || !onUpdateTodos) return;
    const serializedSlot = {
      ...slot,
      date: typeof slot.date === 'string' ? slot.date : slot.date.toISOString()
    };
    const tasksInSlot = todos.filter(t => {
      if (!t.scheduledSlot) return false;
      const tDate = typeof t.scheduledSlot.date === 'string'
        ? new Date(t.scheduledSlot.date) : t.scheduledSlot.date;
      return tDate.toDateString() === (typeof slot.date === 'string'
        ? new Date(slot.date) : slot.date).toDateString()
        && t.scheduledSlot.startMinutes === slot.startMinutes;
    });
    let currentOrder = tasksInSlot.reduce((max, t) => Math.max(max, t.stackOrder || 0), -1) + 1;
    const taskIdSet = new Set(taskIds);
    const updatedTodos = todos.map(t => {
      if (taskIdSet.has(t.id)) {
        return { ...t, scheduledSlot: serializedSlot, stackOrder: currentOrder++ };
      }
      return t;
    });
    onUpdateTodos(updatedTodos);

    // Refresh stack manager if open
    if (stackManagerData) {
      const refreshedTasks = findTasksInSlot(updatedTodos, stackManagerData.slot);
      setStackManagerData({ slot: stackManagerData.slot, tasks: refreshedTasks });
    }

    // Auto-close scheduler
    setShowTaskScheduler(false);
    if (!stackManagerData) setSelectedFreeSlot(null);
  };

  const handleToggleTaskComplete = (taskId) => {
    if (!todos || !onUpdateTodos) return;
    const updatedTodos = todos.map(t =>
      t.id === taskId ? { ...t, completed: !t.completed } : t
    );
    onUpdateTodos(updatedTodos);

    // Refresh stack manager if open so checkboxes update immediately
    if (stackManagerData) {
      const refreshedTasks = findTasksInSlot(updatedTodos, stackManagerData.slot);
      setStackManagerData({ slot: stackManagerData.slot, tasks: refreshedTasks });
    }
  };

  const handleDeleteTask = (taskId) => {
    if (!todos || !onUpdateTodos) return;
    const updatedTodos = todos.map(t =>
      t.id === taskId ? { ...t, scheduledSlot: null } : t
    );
    onUpdateTodos(updatedTodos);

    // Refresh stack manager if open
    if (stackManagerData) {
      const refreshedTasks = findTasksInSlot(updatedTodos, stackManagerData.slot);
      if (refreshedTasks.length === 0) {
        setStackManagerData(null);
      } else {
        setStackManagerData({ slot: stackManagerData.slot, tasks: refreshedTasks });
      }
    }
  };

  const handleOpenStackManager = (slotKey, tasks) => {
    const firstTask = tasks[0];
    setStackManagerData({ slot: firstTask.scheduledSlot, tasks });
  };

  const handleReorderStack = (reorderedTasks) => {
    if (!todos || !onUpdateTodos) return;
    const taskMap = new Map(reorderedTasks.map((task, index) => [task.id, index]));
    const updatedTodos = todos.map(t => {
      if (taskMap.has(t.id)) {
        return { ...t, stackOrder: taskMap.get(t.id) };
      }
      return t;
    });
    onUpdateTodos(updatedTodos);
  };

  // Check if a lesson has content in the sequence system
  const hasInstanceData = (lesson) => {
    const dateStr = formatDateISO(lesson.date);
    const occNum = getOccurrenceForDate(lesson.classId, dateStr, lesson.startTime, timetableData);
    if (occNum === null) return false;
    const content = getLessonForOccurrence(lesson.classId, occNum);
    return content && (content.title || content.notes || (content.links && content.links.length > 0));
  };

  // Get lesson content from the sequence system (with occurrence number)
  const getLessonInstanceData = (lesson) => {
    const dateStr = formatDateISO(lesson.date);
    const occNum = getOccurrenceForDate(lesson.classId, dateStr, lesson.startTime, timetableData);
    if (occNum === null) return null;
    const content = getLessonForOccurrence(lesson.classId, occNum);
    if (!content) return null;
    return { ...content, _occurrenceNum: occNum };
  };

  const daysToRender = viewMode === 'day' && selectedDay ? [selectedDay] : weekDays;

  return (
    <div className="flex-1 flex min-h-0">
      <div className="flex-1 flex flex-col min-h-0 min-w-0">
        {/* Header */}
        <header className="shrink-0 px-8 py-5 flex items-center justify-between border-b border-slate-100 bg-white/80 backdrop-blur-sm z-10">
          <div className="flex items-center gap-4">
            <div>
              <h2 className="font-serif text-2xl font-bold text-navy">
                {viewMode === 'day' && selectedDay
                  ? selectedDay.toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })
                  : formatWeekRange(monday)
                }
              </h2>
              <p className="text-sm text-navy/40 mt-0.5">
                {totalLessons} lesson{totalLessons !== 1 ? 's' : ''} {viewMode === 'day' ? 'this day' : 'this week'}
              </p>
            </div>
            {weekNum && (
              <span className={`inline-flex items-center gap-1.5 px-4 py-1.5 rounded-full text-sm font-bold
                ${weekNum === 1 ? 'bg-[#81B29A]/15 text-[#81B29A]' : 'bg-[#E07A5F]/15 text-[#E07A5F]'}`}>
                Week {weekNum}
              </span>
            )}
          </div>

          <div className="flex items-center gap-3">
            {/* View mode toggle */}
            <div className="flex items-center bg-sand rounded-full p-1">
              <button
                onClick={() => setViewMode('week')}
                className={`flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium transition-smooth ${
                  viewMode === 'week' ? 'bg-white text-navy shadow-sm' : 'text-navy/40 hover:text-navy/60'
                }`}>
                <CalendarRange size={16} />
                Week
              </button>
              <button
                onClick={() => {
                  setViewMode('day');
                  if (selectedDayIndex === null) {
                    const todayIdx = weekDays.findIndex(d => isToday(d));
                    setSelectedDayIndex(todayIdx !== -1 ? todayIdx : 0);
                  }
                }}
                className={`flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium transition-smooth ${
                  viewMode === 'day' ? 'bg-white text-navy shadow-sm' : 'text-navy/40 hover:text-navy/60'
                }`}>
                <Calendar size={16} />
                Day
              </button>
            </div>

            {/* Navigation */}
            <div className="flex items-center gap-1">
              <button onClick={goToPrevWeek}
                className="p-2.5 rounded-xl text-navy/30 hover:text-navy/60 hover:bg-sand transition-smooth">
                <ChevronLeft size={18} />
              </button>
              <button onClick={goToToday}
                className="px-4 py-2 rounded-xl text-sm font-medium text-navy/40 hover:text-navy/60 hover:bg-sand transition-smooth">
                Today
              </button>
              <button onClick={goToNextWeek}
                className="p-2.5 rounded-xl text-navy/30 hover:text-navy/60 hover:bg-sand transition-smooth">
                <ChevronRight size={18} />
              </button>
            </div>

            {/* Reset */}
            <button onClick={onClearData}
              className="p-2.5 rounded-xl text-navy/20 hover:text-terracotta hover:bg-[#E07A5F]/5 transition-smooth"
              title="Clear timetable data">
              <RotateCcw size={16} />
            </button>
          </div>
        </header>

        {/* Calendar grid */}
        <div className="flex-1 overflow-auto">
          <div className="px-4 pt-3 pb-2">
            {/* Day headers */}
            <div className="ml-16 mb-2">
              <div className={`grid gap-2 ${viewMode === 'day' ? 'grid-cols-1' : 'grid-cols-5'}`}>
                {(viewMode === 'day' ? (selectedDay ? [selectedDay] : []) : weekDays).map((day, i) => {
                  const today = isToday(day);
                  const actualIndex = viewMode === 'day' ? activeDayIndex : i;
                  const isActive = viewMode === 'day' && actualIndex === activeDayIndex;
                  return (
                    <button
                      key={i}
                      onClick={() => handleDayClick(viewMode === 'day' ? activeDayIndex : i)}
                      className={`flex flex-col items-center py-2 rounded-xl transition-smooth
                      ${isActive ? 'bg-[#81B29A]/20 ring-2 ring-[#81B29A]/30' : today ? 'bg-[#81B29A]/10' : ''
                      }`}>
                      <p className={`text-xs font-semibold uppercase tracking-wider ${
                        isActive ? 'text-sage' : today ? 'text-sage' : 'text-navy/30'
                      }`}>
                        {DAY_NAMES_SHORT[day.getDay()]}
                      </p>
                      <p className={`font-serif text-lg font-bold ${
                        isActive ? 'text-sage' : today ? 'text-sage' : 'text-navy/70'
                      }`}>
                        {day.getDate()}
                      </p>
                      {today && !isActive && <div className="w-1.5 h-1.5 mx-auto mt-1 bg-sage rounded-full" />}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          <div className="flex">
            {/* Time column */}
            <div className="w-16 shrink-0 relative" style={{ height: gridHeight }}>
              {hourLabels.map((h) => (
                <div key={h} className="absolute left-0 right-0 text-right pr-2 -translate-y-2"
                  style={{ top: (h - startHour) * 60 * PX_PER_MINUTE }}>
                  <span className="text-xs font-medium text-navy/30">{h}:00</span>
                </div>
              ))}
            </div>

            {/* Day columns */}
            <div className={`flex-1 grid gap-2 px-2 relative ${viewMode === 'day' ? 'grid-cols-1' : 'grid-cols-5'}`}>
              {/* Hour lines */}
              {hourLabels.map((h) => (
                <div key={h} className="absolute left-0 right-0 border-t border-slate-100 pointer-events-none"
                  style={{ top: (h - startHour) * 60 * PX_PER_MINUTE }} />
              ))}

              {daysToRender.map((day, i) => {
                const dayNum = day.getDay() === 0 ? 7 : day.getDay();
                const lessons = lessonsByDay[dayNum] || [];
                const duties = dutiesByDay[dayNum] || [];
                const freePeriods = freePeriodsWithTasks[dayNum] || [];

                const scheduledTasksForDay = (todos || [])
                  .filter(t => {
                    if (!t.scheduledSlot) return false;
                    const slotDate = typeof t.scheduledSlot.date === 'string'
                      ? new Date(t.scheduledSlot.date)
                      : t.scheduledSlot.date;
                    return slotDate.toDateString() === day.toDateString();
                  })
                  .sort((a, b) => {
                    if (a.completed && !b.completed) return 1;
                    if (!a.completed && b.completed) return -1;
                    return (a.stackOrder || 0) - (b.stackOrder || 0);
                  });

                return (
                  <DayColumn
                    key={i}
                    day={day}
                    dayNum={dayNum}
                    lessons={lessons}
                    duties={duties}
                    freePeriods={freePeriods}
                    scheduledTasks={scheduledTasksForDay}
                    timetableData={timetableData}
                    todos={todos}
                    gridStartMin={gridStartMin}
                    gridHeight={gridHeight}
                    viewMode={viewMode}
                    onLessonClick={handleLessonClick}
                    onSelectFreeSlot={setSelectedFreeSlot}
                    onToggleTaskComplete={handleToggleTaskComplete}
                    onOpenStackManager={handleOpenStackManager}
                    hasInstanceData={hasInstanceData}
                    getLessonInstanceData={getLessonInstanceData}
                  />
                );
              })}
            </div>
          </div>
        </div>
      </div>

      {/* Panels - only one should be visible at a time */}
      {selectedLesson ? (
        <LessonPanel
          lesson={selectedLesson}
          timetableData={timetableData}
          lessonSequences={lessonSequences}
          lessonSchedules={lessonSchedules}
          onUpdateLesson={onUpdateLesson}
          onAddLesson={onAddLesson}
          onClose={() => setSelectedLesson(null)}
        />
      ) : showTaskScheduler && selectedFreeSlot && todos && onUpdateTodos ? (
        <TaskSchedulePanel
          slot={selectedFreeSlot}
          todos={todos}
          onScheduleTask={handleScheduleTask}
          onScheduleMultipleTasks={handleScheduleMultipleTasks}
          onClose={() => {
            setShowTaskScheduler(false);
            // If we came from stack manager, keep the slot but let stack manager show
            if (!stackManagerData) {
              setSelectedFreeSlot(null);
            }
          }}
        />
      ) : selectedFreeSlot && !stackManagerData && todos && onUpdateTodos ? (
        <TaskSchedulePanel
          slot={selectedFreeSlot}
          todos={todos}
          onScheduleTask={handleScheduleTask}
          onScheduleMultipleTasks={handleScheduleMultipleTasks}
          onClose={() => setSelectedFreeSlot(null)}
        />
      ) : stackManagerData ? (
        <TaskStackManager
          slot={stackManagerData.slot}
          tasks={stackManagerData.tasks}
          allTodos={todos}
          onReorder={handleReorderStack}
          onToggleComplete={handleToggleTaskComplete}
          onRemoveTask={handleDeleteTask}
          onAddMore={() => {
            setSelectedFreeSlot(stackManagerData.slot);
            setShowTaskScheduler(true);
          }}
          onClose={() => {
            setStackManagerData(null);
            setSelectedFreeSlot(null);
          }}
        />
      ) : null}
    </div>
  );
}