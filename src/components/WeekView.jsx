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
} from '../utils/timetable';
import { getLessonForDate } from '../utils/lessonSequence';

const PX_PER_MINUTE = 1.8;

export default function WeekView({ 
  timetableData, 
  lessonSequences,
  lessonSchedules,
  onUpdateSequences,
  onUpdateSchedules,
  onClearData, 
  todos, 
  onUpdateTodos 
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

  const handleScheduleTask = (taskId, slot) => {
    if (!todos || !onUpdateTodos) return;
    const serializedSlot = {
      ...slot,
      date: typeof slot.date === 'string' ? slot.date : slot.date.toISOString()
    };
    const tasksInSlot = todos.filter(t => {
      if (!t.scheduledSlot) return false;
      const tDate = typeof t.scheduledSlot.date === 'string' 
        ? t.scheduledSlot.date 
        : t.scheduledSlot.date.toISOString();
      const slotDate = typeof serializedSlot.date === 'string'
        ? serializedSlot.date
        : serializedSlot.date.toISOString();
      return tDate.split('T')[0] === slotDate.split('T')[0] &&
             t.scheduledSlot.startMinutes === serializedSlot.startMinutes;
    });
    const maxOrder = tasksInSlot.reduce((max, t) => Math.max(max, t.stackOrder || 0), -1);
    const updatedTodos = todos.map(t => 
      t.id === taskId 
        ? { ...t, scheduledSlot: serializedSlot, stackOrder: maxOrder + 1 }
        : t
    );
    onUpdateTodos(updatedTodos);
    setSelectedFreeSlot(null);
  };

  const handleScheduleMultipleTasks = (taskIds, slot) => {
    if (!todos || !onUpdateTodos || taskIds.length === 0) return;
    const serializedSlot = {
      ...slot,
      date: typeof slot.date === 'string' ? slot.date : slot.date.toISOString()
    };
    const tasksInSlot = todos.filter(t => {
      if (!t.scheduledSlot) return false;
      const tDate = typeof t.scheduledSlot.date === 'string' 
        ? t.scheduledSlot.date 
        : t.scheduledSlot.date.toISOString();
      const slotDate = typeof serializedSlot.date === 'string'
        ? serializedSlot.date
        : serializedSlot.date.toISOString();
      return tDate.split('T')[0] === slotDate.split('T')[0] &&
             t.scheduledSlot.startMinutes === serializedSlot.startMinutes;
    });
    const maxOrder = tasksInSlot.reduce((max, t) => Math.max(max, t.stackOrder || 0), -1);
    const taskIdSet = new Set(taskIds);
    let currentOrder = maxOrder + 1;
    const updatedTodos = todos.map(t => {
      if (taskIdSet.has(t.id)) {
        return { ...t, scheduledSlot: serializedSlot, stackOrder: currentOrder++ };
      }
      return t;
    });
    onUpdateTodos(updatedTodos);
    setSelectedFreeSlot(null);
    setShowTaskScheduler(false);
    if (stackManagerData) {
      const refreshedTasks = updatedTodos.filter(t => {
        if (!t.scheduledSlot) return false;
        const tDate = typeof t.scheduledSlot.date === 'string' 
          ? t.scheduledSlot.date 
          : t.scheduledSlot.date.toISOString();
        const slotDate = typeof serializedSlot.date === 'string'
          ? serializedSlot.date
          : serializedSlot.date.toISOString();
        return tDate.split('T')[0] === slotDate.split('T')[0] &&
               t.scheduledSlot.startMinutes === serializedSlot.startMinutes;
      }).sort((a, b) => (a.stackOrder || 0) - (b.stackOrder || 0));
      setStackManagerData({ slot: serializedSlot, tasks: refreshedTasks });
    }
  };

  const handleDeleteTask = (taskId) => {
    if (!todos || !onUpdateTodos) return;
    onUpdateTodos(todos.map(t => 
      t.id === taskId ? { ...t, scheduledSlot: null } : t
    ));
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

  // FIXED: Handle both Date objects and ISO strings
  const hasLessonData = (lesson) => {
    // lesson.date can be either a Date object or an ISO string
    const dateStr = typeof lesson.date === 'string' 
      ? lesson.date 
      : formatDateISO(lesson.date);
    
    const lessonContent = getLessonForDate(lesson.classId, dateStr);
    return lessonContent && (
      lessonContent.title || 
      lessonContent.notes || 
      (lessonContent.links && lessonContent.links.length > 0)
    );
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
                  viewMode === 'week' ? 'bg-white shadow-sm text-navy' : 'text-navy/50 hover:text-navy'
                }`}>
                <CalendarRange size={16} />
                Week
              </button>
              <button 
                onClick={() => setViewMode('day')}
                className={`flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium transition-smooth ${
                  viewMode === 'day' ? 'bg-white shadow-sm text-navy' : 'text-navy/50 hover:text-navy'
                }`}>
                <Calendar size={16} />
                Day
              </button>
            </div>

            <button onClick={goToToday}
              className="flex items-center gap-2 px-4 py-2.5 rounded-full text-sm font-medium text-navy/60 bg-sand hover:bg-[#81B29A]/10 hover:text-sage transition-smooth">
              <CalendarDays size={16} /> Today
            </button>
            
            {viewMode === 'week' && (
              <div className="flex items-center bg-sand rounded-full p-1">
                <button onClick={goToPrevWeek} className="p-2 rounded-full hover:bg-white hover:shadow-sm transition-smooth text-navy/50 hover:text-navy">
                  <ChevronLeft size={18} />
                </button>
                <button onClick={goToNextWeek} className="p-2 rounded-full hover:bg-white hover:shadow-sm transition-smooth text-navy/50 hover:text-navy">
                  <ChevronRight size={18} />
                </button>
              </div>
            )}

            <button onClick={onClearData}
              className="flex items-center gap-2 px-4 py-2.5 rounded-full text-sm font-medium text-navy/40 hover:text-terracotta hover:bg-[#E07A5F]/5 transition-smooth">
              <RotateCcw size={15} /> Reset
            </button>
          </div>
        </header>

        {/* Time Grid */}
        <div className="flex-1 overflow-auto">
          <div className="sticky top-0 z-10 bg-cream/95 backdrop-blur-sm border-b border-slate-100">
            <div className="flex">
              <div className="w-16 shrink-0" />
              <div className={`flex-1 grid gap-2 px-2 py-3 ${viewMode === 'day' ? 'grid-cols-1' : 'grid-cols-5'}`}>
                {daysToRender.map((day, i) => {
                  const today = isToday(day);
                  const isActive = viewMode === 'day' && i === selectedDayIndex;
                  return (
                    <button
                      key={i}
                      onClick={() => handleDayClick(i)}
                      className={`text-center py-2 px-2 rounded-xl transition-smooth cursor-pointer hover:bg-[#81B29A]/20 ${
                        isActive ? 'bg-[#81B29A]/20 ring-2 ring-[#81B29A]/30' : today ? 'bg-[#81B29A]/10' : ''
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
                      ? t.scheduledSlot.date 
                      : t.scheduledSlot.date.toISOString();
                    return slotDate.split('T')[0] === formatDateISO(day);
                  });

                return (
                  <DayColumn
                    key={i}
                    day={day}
                    lessons={lessons}
                    duties={duties}
                    freePeriods={freePeriods}
                    tasks={scheduledTasksForDay}
                    gridStartMin={gridStartMin}
                    pxPerMinute={PX_PER_MINUTE}
                    onLessonClick={handleLessonClick}
                    onFreePeriodClick={(slot) => setSelectedFreeSlot(slot)}
                    onTaskStackClick={handleOpenStackManager}
                    onTaskComplete={(taskId) => {
                      const updatedTodos = todos.map(t =>
                        t.id === taskId ? { ...t, completed: !t.completed } : t
                      );
                      onUpdateTodos(updatedTodos);
                    }}
                    hasLessonData={hasLessonData}
                    classes={timetableData?.classes || []}
                  />
                );
              })}
            </div>
          </div>
        </div>
      </div>

      {/* Panels - Only one visible at a time */}
      {selectedLesson && !selectedFreeSlot && !stackManagerData && (
        <LessonPanel
          lesson={selectedLesson}
          timetableData={timetableData}
          lessonSequences={lessonSequences}
          lessonSchedules={lessonSchedules}
          onUpdateSequences={onUpdateSequences}
          onUpdateSchedules={onUpdateSchedules}
          onClose={() => setSelectedLesson(null)}
        />
      )}

      {selectedFreeSlot && !selectedLesson && !stackManagerData && (
        <TaskSchedulePanel
          slot={selectedFreeSlot}
          todos={todos}
          onSchedule={handleScheduleMultipleTasks}
          onClose={() => setSelectedFreeSlot(null)}
        />
      )}

      {stackManagerData && !selectedLesson && !selectedFreeSlot && (
        <TaskStackManager
          slot={stackManagerData.slot}
          tasks={stackManagerData.tasks}
          onReorder={handleReorderStack}
          onDelete={handleDeleteTask}
          onComplete={(taskId) => {
            const updatedTodos = todos.map(t =>
              t.id === taskId ? { ...t, completed: !t.completed } : t
            );
            onUpdateTodos(updatedTodos);
          }}
          onAddMore={() => setShowTaskScheduler(true)}
          onClose={() => setStackManagerData(null)}
        />
      )}

      {showTaskScheduler && stackManagerData && (
        <TaskSchedulePanel
          slot={stackManagerData.slot}
          todos={todos}
          onSchedule={handleScheduleMultipleTasks}
          onClose={() => setShowTaskScheduler(false)}
        />
      )}
    </div>
  );
}