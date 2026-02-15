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
  generateTimetableOccurrences,
  getTimeRange,
  getClassColor,
} from '../utils/timetable';
import {
  getClassLessonSequence,
  getLessonForOccurrence,
} from '../utils/storage';

const PX_PER_MINUTE = 1.8;

export default function WeekView({ 
  timetableData, 
  lessonSequence, 
  onUpdateLesson, 
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
    ? getWeekNumber(currentDate, anchorDate)
    : null;

  const lessonsByDay = useMemo(
    () => getLessonsForWeek(monday, timetableData, settings),
    [monday, timetableData, settings]
  );

  const dutiesByDay = useMemo(
    () => getDutiesForWeek(monday, timetableData, settings),
    [monday, timetableData, settings]
  );

  const [earliestStart, latestEnd] = useMemo(() => {
    const allLessons = Object.values(lessonsByDay).flat();
    return getTimeRange(allLessons);
  }, [lessonsByDay]);

  const gridStartMin = timeToMinutes(settings?.workdayStart || earliestStart || '09:00');
  const gridEndMin = timeToMinutes(settings?.workdayEnd || latestEnd || '16:00');
  const gridTotalMin = gridEndMin - gridStartMin;
  const gridHeight = gridTotalMin * PX_PER_MINUTE;

  const hourLabels = useMemo(() => {
    const labels = [];
    const start = Math.floor(gridStartMin / 60);
    const end = Math.ceil(gridEndMin / 60);
    for (let h = start; h <= end; h++) labels.push(h);
    return labels;
  }, [gridStartMin, gridEndMin]);

  const getLessonContent = (classId, date) => {
    const occurrences = generateTimetableOccurrences(classId, timetableData, 26, settings);
    const dateISO = formatDateISO(date);
    const occurrence = occurrences.find(occ => occ.dateISO === dateISO);
    
    if (!occurrence) {
      return { id: null, title: '', notes: '', links: [] };
    }
    
    const sequenceIndex = getLessonForOccurrence(classId, occurrence.occurrenceNum);
    const classSequence = lessonSequence[classId] || [];
    const lessonData = classSequence.find(l => l.order === sequenceIndex);
    
    return lessonData || { id: null, title: '', notes: '', links: [] };
  };

  const freePeriodsWithTasks = useMemo(() => {
    const periods = {};
    
    for (let d = 1; d <= 5; d++) {
      const lessons = lessonsByDay[d] || [];
      const duties = dutiesByDay[d] || [];
      
      const occupied = [...lessons, ...duties]
        .map(item => ({
          start: timeToMinutes(item.startTime),
          end: timeToMinutes(item.endTime),
        }))
        .sort((a, b) => a.start - b.start);
      
      const freePeriods = [];
      
      for (let i = 0; i < occupied.length - 1; i++) {
        const gap = occupied[i + 1].start - occupied[i].end;
        if (gap >= 20) {
          freePeriods.push({
            start: occupied[i].end,
            end: occupied[i + 1].start,
          });
        }
      }
      
      periods[d] = freePeriods.map(fp => ({
        ...fp,
        date: weekDays[d - 1],
        tasks: (todos || []).filter(t => {
          if (!t.scheduledSlot) return false;
          const slotDate = typeof t.scheduledSlot.date === 'string'
            ? new Date(t.scheduledSlot.date)
            : t.scheduledSlot.date;
          return (
            formatDateISO(slotDate) === formatDateISO(weekDays[d - 1]) &&
            t.scheduledSlot.start === fp.start &&
            t.scheduledSlot.end === fp.end
          );
        }).sort((a, b) => (a.stackOrder || 0) - (b.stackOrder || 0)),
      }));
    }
    
    return periods;
  }, [lessonsByDay, dutiesByDay, weekDays, todos]);

  const handleLessonClick = (lesson) => {
    const content = getLessonContent(lesson.classId, lesson.date);
    
    setSelectedLesson({
      ...lesson,
      lessonContent: content,
    });
    setSelectedFreeSlot(null);
    setStackManagerData(null);
  };

  const handleScheduleTasks = (slot, taskIds) => {
    const slotInfo = {
      date: slot.date,
      start: slot.start,
      end: slot.end,
    };
    
    const existingTasks = (todos || []).filter(t =>
      t.scheduledSlot &&
      formatDateISO(typeof t.scheduledSlot.date === 'string' ? new Date(t.scheduledSlot.date) : t.scheduledSlot.date) === formatDateISO(slot.date) &&
      t.scheduledSlot.start === slot.start
    );
    
    const maxOrder = existingTasks.length > 0
      ? Math.max(...existingTasks.map(t => t.stackOrder || 0))
      : -1;
    
    const updated = todos.map(t => {
      if (taskIds.includes(t.id)) {
        return {
          ...t,
          scheduledSlot: slotInfo,
          stackOrder: maxOrder + 1 + taskIds.indexOf(t.id),
        };
      }
      return t;
    });
    
    onUpdateTodos(updated);
    setSelectedFreeSlot(null);
    setShowTaskScheduler(false);
  };

  const handleOpenStackManager = (slot, tasks) => {
    setStackManagerData({ slot, tasks });
    setSelectedLesson(null);
    setSelectedFreeSlot(null);
  };

  const handleReorderTasks = (slot, reorderedTasks) => {
    const updated = todos.map(t => {
      const taskInSlot = reorderedTasks.find(rt => rt.id === t.id);
      if (taskInSlot) {
        return { ...t, stackOrder: taskInSlot.stackOrder };
      }
      return t;
    });
    onUpdateTodos(updated);
    setStackManagerData({ slot, tasks: reorderedTasks });
  };

  const handleAddTasksToStack = () => {
    setShowTaskScheduler(true);
  };

  const hasInstanceData = (lesson) => {
    const content = getLessonContent(lesson.classId, lesson.date);
    return content.title || content.notes || (content.links && content.links.length > 0);
  };

  const activeDayIndex = viewMode === 'day' && selectedDayIndex !== null
    ? selectedDayIndex
    : weekDays.findIndex(day => isToday(day));
  
  const selectedDay = activeDayIndex !== -1 ? weekDays[activeDayIndex] : null;
  const daysToRender = viewMode === 'week' ? weekDays : selectedDay ? [selectedDay] : weekDays;

  const totalLessons = viewMode === 'day' && selectedDay
    ? (lessonsByDay[selectedDay.getDay() === 0 ? 7 : selectedDay.getDay()] || []).length
    : Object.values(lessonsByDay).reduce((sum, lessons) => sum + lessons.length, 0);

  return (
    <div className="flex-1 flex flex-col min-h-0">
      <header className="shrink-0 bg-white border-b border-slate-200 px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-6">
            <div>
              <h1 className="font-serif text-2xl font-bold text-navy">
                {formatWeekRange(monday)}
              </h1>
              <p className="text-sm text-navy/50 mt-0.5">
                {totalLessons} lesson{totalLessons === 1 ? '' : 's'} this {viewMode}
              </p>
            </div>
            
            {isTwoWeek && weekNum && (
              <div className={`
                px-3 py-1 rounded-full text-xs font-semibold uppercase tracking-wide
                ${weekNum === 1
                  ? 'bg-[#81B29A]/20 text-[#81B29A] ring-1 ring-[#81B29A]/30'
                  : 'bg-[#E07A5F]/20 text-[#E07A5F] ring-1 ring-[#E07A5F]/30'
                }
              `}>
                Week {weekNum}
              </div>
            )}
          </div>

          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1 bg-sand rounded-xl p-1">
              <button
                onClick={() => setViewMode('week')}
                className={`
                  px-3 py-1.5 rounded-lg text-sm font-medium transition-smooth flex items-center gap-1.5
                  ${viewMode === 'week'
                    ? 'bg-white text-sage shadow-sm'
                    : 'text-navy/40 hover:text-navy/60'
                  }
                `}>
                <CalendarRange size={16} />
                Week
              </button>
              <button
                onClick={() => {
                  setViewMode('day');
                  if (selectedDayIndex === null) {
                    const todayIdx = weekDays.findIndex(isToday);
                    setSelectedDayIndex(todayIdx !== -1 ? todayIdx : 0);
                  }
                }}
                className={`
                  px-3 py-1.5 rounded-lg text-sm font-medium transition-smooth flex items-center gap-1.5
                  ${viewMode === 'day'
                    ? 'bg-white text-sage shadow-sm'
                    : 'text-navy/40 hover:text-navy/60'
                  }
                `}>
                <Calendar size={16} />
                Day
              </button>
            </div>

            <div className="h-6 w-px bg-slate-200" />

            <div className="flex items-center gap-2">
              <button
                onClick={() => setCurrentDate(shiftWeek(currentDate, -1))}
                className="p-2 hover:bg-sand rounded-lg transition-smooth text-navy/40 hover:text-navy">
                <ChevronLeft size={20} />
              </button>
              <button
                onClick={() => setCurrentDate(new Date())}
                className="px-3 py-1.5 text-sm font-medium text-navy/60 hover:text-sage hover:bg-[#81B29A]/10 rounded-lg transition-smooth flex items-center gap-1.5">
                <RotateCcw size={14} />
                Today
              </button>
              <button
                onClick={() => setCurrentDate(shiftWeek(currentDate, 1))}
                className="p-2 hover:bg-sand rounded-lg transition-smooth text-navy/40 hover:text-navy">
                <ChevronRight size={20} />
              </button>
            </div>

            <div className="h-6 w-px bg-slate-200" />

            <button
              onClick={onClearData}
              className="px-3 py-1.5 text-sm font-medium text-terracotta/60 hover:text-terracotta hover:bg-[#E07A5F]/10 rounded-lg transition-smooth">
              Clear Data
            </button>
          </div>
        </div>

        {viewMode === 'day' && (
          <div className="flex gap-2 mt-4">
            {weekDays.map((day, i) => {
              const today = isToday(day);
              const isActive = i === selectedDayIndex;
              return (
                <button
                  key={i}
                  onClick={() => {
                    setSelectedDayIndex(i);
                    setViewMode('day');
                  }}
                  className={`
                    flex-1 py-2 px-3 rounded-xl transition-smooth text-center
                    ${isActive 
                      ? 'bg-[#81B29A]/20 ring-2 ring-[#81B29A]/30' 
                      : today ? 'bg-[#81B29A]/10' : ''
                    }
                  `}>
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
        )}
      </header>

      <div className="flex-1 overflow-auto bg-cream">
        <div className="min-w-[800px] p-6">
          <div className="flex">
            <div className="w-16 shrink-0 relative" style={{ height: gridHeight }}>
              {hourLabels.map((h) => (
                <div
                  key={h}
                  className="absolute left-0 right-0 text-right pr-2 -translate-y-2"
                  style={{ top: ((h * 60) - gridStartMin) * PX_PER_MINUTE }}>
                  <span className="text-xs font-medium text-navy/30">{h}:00</span>
                </div>
              ))}
            </div>

            <div className={`flex-1 grid gap-2 px-2 relative ${viewMode === 'day' ? 'grid-cols-1' : 'grid-cols-5'}`}>
              {hourLabels.map((h) => (
                <div
                  key={h}
                  className="absolute left-0 right-0 border-t border-slate-100 pointer-events-none"
                  style={{ top: ((h * 60) - gridStartMin) * PX_PER_MINUTE }}
                />
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
                    return formatDateISO(slotDate) === formatDateISO(day);
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
                    lessons={lessons.map(l => ({
                      ...l,
                      date: day,
                      lessonContent: getLessonContent(l.classId, day),
                    }))}
                    duties={duties}
                    freePeriods={freePeriods}
                    scheduledTasks={scheduledTasksForDay}
                    timetableData={timetableData}
                    todos={todos}
                    gridStartMin={gridStartMin}
                    gridHeight={gridHeight}
                    viewMode={viewMode}
                    onLessonClick={handleLessonClick}
                    onSelectFreeSlot={(slot) => {
                      setSelectedFreeSlot(slot);
                      setSelectedLesson(null);
                      setStackManagerData(null);
                    }}
                    onToggleTaskComplete={(taskId) => {
                      const updated = todos.map(t =>
                        t.id === taskId ? { ...t, completed: !t.completed } : t
                      );
                      onUpdateTodos(updated);
                    }}
                    onOpenStackManager={handleOpenStackManager}
                    hasInstanceData={hasInstanceData}
                    PX_PER_MINUTE={PX_PER_MINUTE}
                  />
                );
              })}
            </div>
          </div>
        </div>
      </div>

      {selectedLesson && (
        <LessonPanel
          lesson={selectedLesson}
          timetableData={timetableData}
          lessonContent={selectedLesson.lessonContent}
          onUpdateLesson={onUpdateLesson}
          onClose={() => setSelectedLesson(null)}
        />
      )}

      {selectedFreeSlot && !stackManagerData && !selectedLesson && todos && onUpdateTodos && (
        <TaskSchedulePanel
          slot={selectedFreeSlot}
          todos={todos}
          onScheduleTask={(slot, taskIds) => handleScheduleTasks(slot, taskIds)}
          onScheduleMultipleTasks={(slot, taskIds) => handleScheduleTasks(slot, taskIds)}
          onClose={() => setSelectedFreeSlot(null)}
        />
      )}

      {stackManagerData && (
        <TaskStackManager
          slot={stackManagerData.slot}
          tasks={stackManagerData.tasks}
          onReorder={handleReorderTasks}
          onAddTasks={handleAddTasksToStack}
          onToggleComplete={(taskId) => {
            const updated = todos.map(t =>
              t.id === taskId ? { ...t, completed: !t.completed } : t
            );
            onUpdateTodos(updated);
          }}
          onRemoveTask={(taskId) => {
            const updated = todos.map(t =>
              t.id === taskId ? { ...t, scheduledSlot: null, stackOrder: null } : t
            );
            onUpdateTodos(updated);
          }}
          onClose={() => setStackManagerData(null)}
        />
      )}

      {showTaskScheduler && stackManagerData && todos && onUpdateTodos && (
        <TaskSchedulePanel
          slot={stackManagerData.slot}
          todos={todos}
          onScheduleTask={(slot, taskIds) => {
            handleScheduleTasks(slot, taskIds);
            setShowTaskScheduler(false);
          }}
          onScheduleMultipleTasks={(slot, taskIds) => {
            handleScheduleTasks(slot, taskIds);
            setShowTaskScheduler(false);
          }}
          onClose={() => setShowTaskScheduler(false)}
        />
      )}
    </div>
  );
}