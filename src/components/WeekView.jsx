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
  getWeekNumberWithHolidays,
  timeToMinutes,
  formatDateISO,
  DAY_NAMES_SHORT,
  parseTime,
} from '../utils/dateHelpers';
import {
  getLessonsForWeek,
  getDutiesForWeek,
  mergeConsecutiveLessons,
  getTimeRange,
  lessonInstanceKey,
} from '../utils/timetable';

const PX_PER_MINUTE = 1.8;

export default function WeekView({ 
  timetableData, 
  lessonInstances, 
  onUpdateInstance, 
  onClearData, 
  todos, 
  onUpdateTodos,
  settings
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
    ? getWeekNumberWithHolidays(currentDate, anchorDate, settings?.holidayWeeks || [])
    : null;

  const rawLessonsByDay = useMemo(
    () => getLessonsForWeek(timetableData, weekDays, settings),
    [timetableData, weekDays, settings]
  );

  const lessonsByDay = useMemo(() => {
    const merged = {};
    for (const [day, lessons] of Object.entries(rawLessonsByDay)) {
      merged[day] = mergeConsecutiveLessons(lessons);
    }
    return merged;
  }, [rawLessonsByDay]);

  const dutiesByDay = useMemo(
    () => getDutiesForWeek(timetableData, weekDays, settings),
    [timetableData, weekDays, settings]
  );

  // Use settings for workday hours if available, otherwise calculate from timetable
  const { startHour, endHour } = useMemo(() => {
    if (settings?.workdayStart && settings?.workdayEnd) {
      const start = parseTime(settings.workdayStart);
      const end = parseTime(settings.workdayEnd);
      return {
        startHour: start.hours,
        endHour: end.hours
      };
    }
    
    // Fallback to calculating from timetable data
    return getTimeRange(timetableData);
  }, [timetableData, settings]);

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

  const freePeriodsWithTasks = useMemo(() => {
    const result = {};
    
    if (!todos) return result;

    weekDays.forEach((day, idx) => {
      const dayNum = day.getDay() === 0 ? 7 : day.getDay();
      const lessons = lessonsByDay[dayNum] || [];
      const duties = dutiesByDay[dayNum] || [];
      
      const slots = [];
      lessons.forEach(lesson => {
        slots.push({
          type: 'lesson',
          start: timeToMinutes(lesson.startTime),
          end: timeToMinutes(lesson.endTime)
        });
      });
      
      duties.forEach(duty => {
        slots.push({
          type: 'duty',
          start: timeToMinutes(duty.startTime),
          end: timeToMinutes(duty.endTime)
        });
      });
      
      slots.sort((a, b) => a.start - b.start);
      
      const freePeriods = [];
      const dayStart = startHour * 60;
      const dayEnd = endHour * 60;
      
      if (slots.length === 0) {
        freePeriods.push({
          date: day,
          startMinutes: dayStart,
          endMinutes: dayEnd,
          duration: dayEnd - dayStart
        });
      } else {
        if (slots[0].start > dayStart && (slots[0].start - dayStart) >= 30) {
          freePeriods.push({
            date: day,
            startMinutes: dayStart,
            endMinutes: slots[0].start,
            duration: slots[0].start - dayStart
          });
        }
        
        for (let i = 0; i < slots.length - 1; i++) {
          const gap = slots[i + 1].start - slots[i].end;
          if (gap >= 30) {
            freePeriods.push({
              date: day,
              startMinutes: slots[i].end,
              endMinutes: slots[i + 1].start,
              duration: gap
            });
          }
        }
        
        const lastEnd = slots[slots.length - 1].end;
        if (dayEnd > lastEnd && (dayEnd - lastEnd) >= 30) {
          freePeriods.push({
            date: day,
            startMinutes: lastEnd,
            endMinutes: dayEnd,
            duration: dayEnd - lastEnd
          });
        }
      }
      
      result[dayNum] = freePeriods.map(period => {
        const tasksInPeriod = todos.filter(t => {
          if (!t.scheduledSlot) return false;
          const slotDate = typeof t.scheduledSlot.date === 'string' 
            ? t.scheduledSlot.date 
            : t.scheduledSlot.date.toISOString();
          const periodDate = formatDateISO(period.date);
          return slotDate.startsWith(periodDate) && 
                 t.scheduledSlot.startMinutes === period.startMinutes;
        }).sort((a, b) => (a.stackOrder || 0) - (b.stackOrder || 0));
        
        return {
          ...period,
          tasks: tasksInPeriod
        };
      });
    });
    
    return result;
  }, [weekDays, lessonsByDay, dutiesByDay, todos, startHour, endHour]);

  const goToPrevWeek = () => setCurrentDate((d) => shiftWeek(d, -1));
  const goToNextWeek = () => setCurrentDate((d) => shiftWeek(d, 1));
  const goToToday = () => setCurrentDate(new Date());

  const handleDayClick = (dayIndex) => {
    if (viewMode === 'day') {
      setSelectedDayIndex(dayIndex);
    }
  };

  const handleLessonClick = (lesson) => {
    setSelectedLesson(lesson);
    setSelectedFreeSlot(null);
    setStackManagerData(null);
  };

  const handleScheduleTask = (taskIds, slot) => {
    if (!todos || !onUpdateTodos) return;
    
    const serializedSlot = {
      date: typeof slot.date === 'string' ? slot.date : slot.date.toISOString(),
      startMinutes: slot.startMinutes,
      endMinutes: slot.endMinutes,
      duration: slot.duration
    };
    
    const taskIdSet = new Set(taskIds);
    const existingTasksInSlot = todos.filter(t => {
      if (!t.scheduledSlot) return false;
      const slotDate = typeof t.scheduledSlot.date === 'string' ? t.scheduledSlot.date : t.scheduledSlot.date.toISOString();
      const targetDate = typeof slot.date === 'string' ? slot.date : slot.date.toISOString();
      return slotDate === targetDate && 
             t.scheduledSlot.startMinutes === slot.startMinutes;
    });
    
    let currentOrder = existingTasksInSlot.length;
    
    const updatedTodos = todos.map(t => {
      if (taskIdSet.has(t.id)) {
        return { ...t, scheduledSlot: serializedSlot, stackOrder: currentOrder++ };
      }
      return t;
    });
    
    onUpdateTodos(updatedTodos);
    setSelectedFreeSlot(null);
    setShowTaskScheduler(false);
  };

  const handleToggleTaskComplete = (taskId) => {
    if (!todos || !onUpdateTodos) return;
    const updatedTodos = todos.map(t => 
      t.id === taskId ? { ...t, completed: !t.completed } : t
    );
    onUpdateTodos(updatedTodos);
  };

  const handleUnscheduleTask = (taskId) => {
    if (!todos || !onUpdateTodos) return;
    const updatedTodos = todos.map(t => 
      t.id === taskId ? { ...t, scheduledSlot: null } : t
    );
    onUpdateTodos(updatedTodos);
  };

  const handleDeleteTask = (taskId) => {
    if (!todos || !onUpdateTodos) return;
    const updatedTodos = todos.filter(t => t.id !== taskId);
    onUpdateTodos(updatedTodos);
    
    if (stackManagerData) {
      const updatedStackTasks = stackManagerData.tasks.filter(t => t.id !== taskId);
      if (updatedStackTasks.length === 0) {
        setStackManagerData(null);
      } else {
        setStackManagerData({ ...stackManagerData, tasks: updatedStackTasks });
      }
    }
  };

  const handleOpenScheduler = (slot) => {
    setSelectedFreeSlot(slot);
    setSelectedLesson(null);
    setStackManagerData(null);
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

  const hasInstanceData = (lesson) => {
    const key = lessonInstanceKey(lesson.classId, formatDateISO(lesson.date));
    const inst = lessonInstances[key];
    return inst && (inst.title || inst.notes || (inst.links && inst.links.length > 0));
  };

  const getLessonInstanceData = (lesson) => {
    const key = lessonInstanceKey(lesson.classId, formatDateISO(lesson.date));
    return lessonInstances[key];
  };

  const daysToRender = viewMode === 'day' && selectedDay ? [selectedDay] : weekDays;

  return (
    <div className="flex-1 flex min-h-0">
      <div className="flex-1 flex flex-col min-h-0 min-w-0">
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

        <div className="flex-1 overflow-auto">
          <div className="sticky top-0 z-10 bg-cream/95 backdrop-blur-sm border-b border-slate-100">
            <div className="flex">
              <div className="w-16 shrink-0" />
              <div className={`flex-1 grid gap-2 px-2 py-3 grid-cols-5`}>
                {weekDays.map((day, i) => {
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
            <div className="w-16 shrink-0 relative" style={{ height: gridHeight }}>
              {hourLabels.map((h) => (
                <div key={h} className="absolute left-0 right-0 text-right pr-2 -translate-y-2"
                  style={{ top: (h - startHour) * 60 * PX_PER_MINUTE }}>
                  <span className="text-xs font-medium text-navy/30">{h}:00</span>
                </div>
              ))}
            </div>

            <div className={`flex-1 grid gap-2 px-2 relative ${viewMode === 'day' ? 'grid-cols-1' : 'grid-cols-5'}`}>
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
                    const dayDate = formatDateISO(day);
                    return slotDate.startsWith(dayDate);
                  });

                return (
                  <DayColumn
                    key={i}
                    day={day}
                    lessons={lessons}
                    duties={duties}
                    freePeriods={freePeriods}
                    scheduledTasks={scheduledTasksForDay}
                    gridStartMin={gridStartMin}
                    PX_PER_MINUTE={PX_PER_MINUTE}
                    timetableData={timetableData}
                    lessonInstances={lessonInstances}
                    hasInstanceData={hasInstanceData}
                    getLessonInstanceData={getLessonInstanceData}
                    onLessonClick={handleLessonClick}
                    onScheduleTask={handleOpenScheduler}
                    onOpenStackManager={handleOpenStackManager}
                    onToggleTaskComplete={handleToggleTaskComplete}
                    selectedLesson={selectedLesson}
                  />
                );
              })}
            </div>
          </div>
        </div>
      </div>

      {selectedLesson && !selectedFreeSlot && !stackManagerData && (
        <LessonPanel
          lesson={selectedLesson}
          timetableData={timetableData}
          lessonInstances={lessonInstances}
          onUpdateInstance={onUpdateInstance}
          onClose={() => setSelectedLesson(null)}
        />
      )}

      {selectedFreeSlot && !stackManagerData && (
        <TaskSchedulePanel
          todos={todos}
          slot={selectedFreeSlot}
          onSchedule={handleScheduleTask}
          onClose={() => setSelectedFreeSlot(null)}
        />
      )}

      {stackManagerData && (
        <TaskStackManager
          slot={stackManagerData.slot}
          tasks={stackManagerData.tasks}
          onReorder={handleReorderStack}
          onToggleComplete={handleToggleTaskComplete}
          onDelete={handleDeleteTask}
          onAddMore={() => {
            setShowTaskScheduler(true);
            setSelectedFreeSlot(stackManagerData.slot);
          }}
          onClose={() => setStackManagerData(null)}
        />
      )}
    </div>
  );
}