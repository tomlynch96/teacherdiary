import React, { useState, useMemo } from 'react';
import {
  ChevronLeft,
  ChevronRight,
  CalendarDays,
  RotateCcw,
  Calendar,
  CalendarRange,
} from 'lucide-react';
import LessonCard from './LessonCard';
import DutyCard from './DutyCard';
import LessonPanel from './LessonPanel';
import TaskSchedulePanel from './TaskSchedulePanel';
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
  getClassColor,
  lessonInstanceKey,
} from '../utils/timetable';

const PX_PER_MINUTE = 1.8;

export default function WeekView({ timetableData, lessonInstances, onUpdateInstance, onClearData, todos, onUpdateTodos }) {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedLesson, setSelectedLesson] = useState(null);
  const [viewMode, setViewMode] = useState('week'); // 'week' or 'day'
  const [selectedDayIndex, setSelectedDayIndex] = useState(null); // 0-4 for Mon-Fri
  const [selectedFreeSlot, setSelectedFreeSlot] = useState(null); // For task scheduling

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

  const timeToTop = (timeStr) => (timeToMinutes(timeStr) - gridStartMin) * PX_PER_MINUTE;
  const durationToHeight = (s, e) => (timeToMinutes(e) - timeToMinutes(s)) * PX_PER_MINUTE;

  // For day view, use selected day or default to today
  const activeDayIndex = viewMode === 'day' && selectedDayIndex !== null 
    ? selectedDayIndex 
    : weekDays.findIndex(day => isToday(day));
  
  const selectedDay = activeDayIndex !== -1 ? weekDays[activeDayIndex] : null;
  const selectedDayNum = selectedDay ? (selectedDay.getDay() === 0 ? 7 : selectedDay.getDay()) : null;
  
  const dayViewLessons = selectedDayNum !== null ? (lessonsByDay[selectedDayNum] || []) : [];
  const dayViewDuties = selectedDayNum !== null ? (dutiesByDay[selectedDayNum] || []) : [];

  const totalLessons = viewMode === 'day' 
    ? dayViewLessons.length 
    : Object.values(lessonsByDay).reduce((sum, l) => sum + l.length, 0);

  const goToPrevWeek = () => setCurrentDate((d) => shiftWeek(d, -1));
  const goToNextWeek = () => setCurrentDate((d) => shiftWeek(d, 1));
  const goToToday = () => setCurrentDate(new Date());

  const handleLessonClick = (lesson) => {
    setSelectedLesson(lesson);
  };

  const handleDayClick = (dayIndex) => {
    setSelectedDayIndex(dayIndex);
    setViewMode('day');
  };

  // Detect free periods
  const freePeriodsWithTasks = useMemo(() => {
    const periods = {};
    
    Object.keys(lessonsByDay).forEach(dayNum => {
      const lessons = lessonsByDay[dayNum] || [];
      const dayIndex = parseInt(dayNum) - 1;
      if (dayIndex < 0 || dayIndex >= weekDays.length) return;
      
      const date = weekDays[dayIndex];
      const occupied = lessons.map(l => ({
        start: timeToMinutes(l.startTime),
        end: timeToMinutes(l.endTime),
      })).sort((a, b) => a.start - b.start);

      let currentTime = startHour * 60;
      const dayPeriods = [];

      occupied.forEach(slot => {
        if (currentTime < slot.start) {
          const duration = slot.start - currentTime;
          if (duration >= 30) {
            dayPeriods.push({
              date,
              startMinutes: currentTime,
              endMinutes: slot.start,
              duration,
            });
          }
        }
        currentTime = Math.max(currentTime, slot.end);
      });

      // End of day
      if (currentTime < endHour * 60) {
        const duration = (endHour * 60) - currentTime;
        if (duration >= 30) {
          dayPeriods.push({
            date,
            startMinutes: currentTime,
            endMinutes: endHour * 60,
            duration,
          });
        }
      }

      periods[dayNum] = dayPeriods;
    });

    return periods;
  }, [lessonsByDay, weekDays, startHour, endHour]);

  const handleScheduleTask = (taskId, slot) => {
    if (!todos || !onUpdateTodos) return;
    // Store slot with date as ISO string for proper serialization
    const serializedSlot = {
      ...slot,
      date: slot.date.toISOString(),
    };
    onUpdateTodos(
      todos.map(t =>
        t.id === taskId ? { ...t, scheduledSlot: serializedSlot } : t
      )
    );
    setSelectedFreeSlot(null);
  };

  // Check if a lesson instance has any data saved
  const hasInstanceData = (lesson) => {
    const key = lessonInstanceKey(lesson.classId, formatDateISO(lesson.date));
    const inst = lessonInstances[key];
    return inst && (inst.title || inst.notes || (inst.links && inst.links.length > 0));
  };

  // Get lesson instance data
  const getLessonInstanceData = (lesson) => {
    const key = lessonInstanceKey(lesson.classId, formatDateISO(lesson.date));
    return lessonInstances[key];
  };

  return (
    <div className="flex-1 flex min-h-0">
      {/* Main grid area */}
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
              <span className={`
                inline-flex items-center gap-1.5 px-4 py-1.5 rounded-full text-sm font-bold
                ${weekNum === 1 ? 'bg-[#81B29A]/15 text-[#81B29A]' : 'bg-[#E07A5F]/15 text-[#E07A5F]'}
              `}>
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
                  viewMode === 'week' 
                    ? 'bg-white shadow-sm text-navy' 
                    : 'text-navy/50 hover:text-navy'
                }`}
              >
                <CalendarRange size={16} />
                Week
              </button>
              <button 
                onClick={() => setViewMode('day')}
                className={`flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium transition-smooth ${
                  viewMode === 'day' 
                    ? 'bg-white shadow-sm text-navy' 
                    : 'text-navy/50 hover:text-navy'
                }`}
              >
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
              <div className={`flex-1 grid gap-2 px-2 py-3 ${viewMode === 'day' ? 'grid-cols-5' : 'grid-cols-5'}`}>
                {weekDays.map((day, i) => {
                  const today = isToday(day);
                  const isActive = viewMode === 'day' && i === selectedDayIndex;
                  return (
                    <button
                      key={i}
                      onClick={() => handleDayClick(i)}
                      className={`text-center py-2 px-2 rounded-xl transition-smooth cursor-pointer hover:bg-[#81B29A]/20 ${
                        isActive ? 'bg-[#81B29A]/20 ring-2 ring-[#81B29A]/30' : today ? 'bg-[#81B29A]/10' : ''
                      }`}
                    >
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

            {/* Day columns with lessons */}
            <div className={`flex-1 grid gap-2 px-2 relative ${viewMode === 'day' ? 'grid-cols-1' : 'grid-cols-5'}`}>
              {/* Hour lines */}
              {hourLabels.map((h) => (
                <div key={h} className="absolute left-0 right-0 border-t border-slate-100 pointer-events-none"
                  style={{ top: (h - startHour) * 60 * PX_PER_MINUTE }} />
              ))}

              {(viewMode === 'day' && selectedDay ? [selectedDay] : weekDays).map((day, i) => {
                const dayNum = day.getDay() === 0 ? 7 : day.getDay();
                const lessons = lessonsByDay[dayNum] || [];
                const duties = dutiesByDay[dayNum] || [];
                const freePeriods = freePeriodsWithTasks[dayNum] || [];
                const today = isToday(day);

                // Get scheduled tasks for this day
                const scheduledTasksForDay = (todos || []).filter(t => {
                  if (!t.scheduledSlot || t.completed) return false;
                  // Handle both Date objects and ISO strings
                  const slotDate = typeof t.scheduledSlot.date === 'string' 
                    ? new Date(t.scheduledSlot.date) 
                    : t.scheduledSlot.date;
                  return slotDate.toDateString() === day.toDateString();
                });

                return (
                  <div key={i} className={`relative ${today ? 'bg-[#81B29A]/[0.03] rounded-2xl' : ''}`} style={{ height: gridHeight }}>
                    {/* Free periods as clickable areas */}
                    {freePeriods.map((period, pi) => {
                      const top = (period.startMinutes - gridStartMin) * PX_PER_MINUTE;
                      const height = (period.endMinutes - period.startMinutes) * PX_PER_MINUTE;
                      return (
                        <button
                          key={`free-${pi}`}
                          onClick={() => setSelectedFreeSlot(period)}
                          className="absolute left-1 right-1 z-[1] rounded-lg border-2 border-dashed border-slate-200 hover:border-sage hover:bg-sage/5 transition-smooth flex items-center justify-center group"
                          style={{ top, height }}
                        >
                          <span className="text-xs font-medium text-navy/30 group-hover:text-sage transition-smooth">
                            Click to schedule task
                          </span>
                        </button>
                      );
                    })}

                    {/* Scheduled tasks */}
                    {scheduledTasksForDay.map((task) => {
                      const slot = task.scheduledSlot;
                      const top = (slot.startMinutes - gridStartMin) * PX_PER_MINUTE;
                      const height = (slot.endMinutes - slot.startMinutes) * PX_PER_MINUTE;
                      const priorityColors = {
                        high: '#E07A5F',
                        medium: '#F4845F',
                        low: '#81B29A',
                      };
                      const color = priorityColors[task.priority] || '#81B29A';
                      
                      return (
                        <div
                          key={`task-${task.id}`}
                          className="absolute left-1 right-1 z-[2] bg-white border-l-4 rounded-lg shadow-sm p-2 cursor-pointer hover:shadow-md transition-smooth"
                          style={{ top, height, borderLeftColor: color, minHeight: 40 }}
                          onClick={() => {
                            if (window.confirm('Remove this task from schedule?')) {
                              onUpdateTodos(todos.map(t => 
                                t.id === task.id ? { ...t, scheduledSlot: null } : t
                              ));
                            }
                          }}
                        >
                          <div className="flex items-start gap-2 h-full">
                            <div className="flex-1 min-w-0">
                              <p className="text-xs font-semibold text-navy truncate">
                                ✓ {task.text}
                              </p>
                              <p className="text-[10px] text-navy/40 mt-0.5">
                                {task.priority} priority
                              </p>
                            </div>
                          </div>
                        </div>
                      );
                    })}

                    {duties.map((duty, di) => {
                      const top = timeToTop(duty.startTime);
                      const height = durationToHeight(duty.startTime, duty.endTime);
                      return (
                        <div key={`duty-${di}`} className="absolute left-1 right-1 z-[2]" style={{ top, height, minHeight: 28 }}>
                          <DutyCard duty={duty} />
                        </div>
                      );
                    })}

                    {lessons.map((lesson) => {
                      const top = timeToTop(lesson.startTime);
                      const height = durationToHeight(lesson.startTime, lesson.endTime);
                      const accent = getClassColor(lesson.classId, timetableData.classes);
                      const hasData = hasInstanceData(lesson);
                      const instanceData = getLessonInstanceData(lesson);
                      const isSelected = selectedLesson &&
                        selectedLesson.classId === lesson.classId &&
                        formatDateISO(selectedLesson.date) === formatDateISO(lesson.date);
                      
                      return (
                        <div key={lesson.id}
                          className={`absolute left-1 right-1 z-[3] ${isSelected ? 'ring-2 ring-offset-1 rounded-xl' : ''}`}
                          style={{ top, height, ...(isSelected ? { ringColor: accent } : {}) }}>
                          <LessonCard
                            lesson={lesson}
                            height={height}
                            accent={accent}
                            hasData={hasData}
                            onClick={handleLessonClick}
                            showTitle={viewMode === 'day'}
                            instanceData={instanceData}
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

      {/* Lesson detail panel */}
      {selectedLesson && (
        <LessonPanel
          lesson={selectedLesson}
          timetableData={timetableData}
          lessonInstances={lessonInstances}
          onUpdateInstance={onUpdateInstance}
          onClose={() => setSelectedLesson(null)}
        />
      )}

      {/* Task scheduling panel */}
      {selectedFreeSlot && todos && onUpdateTodos && (
        <TaskSchedulePanel
          slot={selectedFreeSlot}
          todos={todos}
          onScheduleTask={handleScheduleTask}
          onClose={() => setSelectedFreeSlot(null)}
        />
      )}
    </div>
  );
}