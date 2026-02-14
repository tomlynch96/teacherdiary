import React, { useState, useMemo } from 'react';
import {
  Plus,
  Check,
  Circle,
  Clock,
  Calendar,
  ChevronRight,
  Trash2,
  GripVertical,
  AlertCircle,
} from 'lucide-react';
import { formatDateISO, getWeekDays, isToday, timeToMinutes } from '../utils/dateHelpers';
import { getLessonsForWeek, getTimeRange } from '../utils/timetable';

// Priority levels with colors
const PRIORITIES = {
  high: { label: 'High', color: '#E07A5F', bgColor: '#E07A5F15' },
  medium: { label: 'Medium', color: '#F4845F', bgColor: '#F4845F15' },
  low: { label: 'Low', color: '#81B29A', bgColor: '#81B29A15' },
};

export default function ToDoView({ timetableData, todos, onUpdateTodos }) {
  const [newTaskText, setNewTaskText] = useState('');
  const [newTaskPriority, setNewTaskPriority] = useState('medium');
  const [showScheduler, setShowScheduler] = useState(null);
  const [currentDate] = useState(new Date());

  const weekDays = useMemo(() => getWeekDays(currentDate), [currentDate]);
  const lessonsByDay = useMemo(
    () => getLessonsForWeek(timetableData, weekDays),
    [timetableData, weekDays]
  );

  // Get free periods for scheduling
  const freePeriods = useMemo(() => {
    if (!timetableData || !timetableData.recurringLessons) return [];
    
    const { startHour, endHour } = getTimeRange(timetableData);
    const periods = [];

    weekDays.forEach((date, dayIndex) => {
      const dayNum = date.getDay() === 0 ? 7 : date.getDay();
      const lessons = lessonsByDay[dayNum] || [];
      
      // Build time slots for the day
      const dayStart = startHour * 60;
      const dayEnd = endHour * 60;
      const occupied = lessons.map(l => ({
        start: timeToMinutes(l.startTime),
        end: timeToMinutes(l.endTime),
      }));

      // Find gaps
      let currentTime = dayStart;
      occupied.sort((a, b) => a.start - b.start);

      occupied.forEach(slot => {
        if (currentTime < slot.start) {
          // Free period found
          const duration = slot.start - currentTime;
          if (duration >= 30) { // Only show gaps 30+ minutes
            periods.push({
              date,
              dayIndex,
              startMinutes: currentTime,
              endMinutes: slot.start,
              duration,
            });
          }
        }
        currentTime = Math.max(currentTime, slot.end);
      });

      // Check end of day
      if (currentTime < dayEnd) {
        const duration = dayEnd - currentTime;
        if (duration >= 30) {
          periods.push({
            date,
            dayIndex,
            startMinutes: currentTime,
            endMinutes: dayEnd,
            duration,
          });
        }
      }
    });

    return periods;
  }, [timetableData, weekDays, lessonsByDay]);

  const handleAddTask = () => {
    if (!newTaskText.trim()) return;

    const newTask = {
      id: Date.now().toString(),
      text: newTaskText.trim(),
      priority: newTaskPriority,
      completed: false,
      createdAt: new Date().toISOString(),
      scheduledSlot: null,
    };

    onUpdateTodos([...todos, newTask]);
    setNewTaskText('');
  };

  const handleToggleComplete = (taskId) => {
    onUpdateTodos(
      todos.map(t =>
        t.id === taskId ? { ...t, completed: !t.completed } : t
      )
    );
  };

  const handleDeleteTask = (taskId) => {
    onUpdateTodos(todos.filter(t => t.id !== taskId));
  };

  const handleScheduleTask = (taskId, slot) => {
    onUpdateTodos(
      todos.map(t =>
        t.id === taskId
          ? { ...t, scheduledSlot: slot }
          : t
      )
    );
    setShowScheduler(null);
  };

  const handleUnschedule = (taskId) => {
    onUpdateTodos(
      todos.map(t =>
        t.id === taskId ? { ...t, scheduledSlot: null } : t
      )
    );
  };

  const formatMinutesToTime = (minutes) => {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return `${hours}:${String(mins).padStart(2, '0')}`;
  };

  const formatDuration = (minutes) => {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    if (hours > 0 && mins > 0) return `${hours}h ${mins}m`;
    if (hours > 0) return `${hours}h`;
    return `${mins}m`;
  };

  // Categorize tasks
  const scheduledTasks = todos.filter(t => t.scheduledSlot && !t.completed);
  const unscheduledTasks = todos.filter(t => !t.scheduledSlot && !t.completed);
  const completedTasks = todos.filter(t => t.completed);

  return (
    <div className="flex-1 flex flex-col min-h-0 bg-cream">
      {/* Header */}
      <header className="shrink-0 px-8 py-5 border-b border-slate-100 bg-white/80 backdrop-blur-sm">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="font-serif text-2xl font-bold text-navy">To-Do List</h2>
            <p className="text-sm text-navy/40 mt-0.5">
              {todos.length} task{todos.length !== 1 ? 's' : ''} · {completedTasks.length} completed
            </p>
          </div>
        </div>
      </header>

      <div className="flex-1 overflow-auto">
        <div className="max-w-5xl mx-auto p-8 space-y-6">
          
          {/* Add new task */}
          <div className="bg-white rounded-2xl shadow-sm border border-slate-200/60 p-4">
            <div className="flex gap-3">
              <input
                type="text"
                value={newTaskText}
                onChange={(e) => setNewTaskText(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleAddTask()}
                placeholder="Add a new task..."
                className="flex-1 px-4 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-sage/20 focus:border-sage text-sm"
              />
              <select
                value={newTaskPriority}
                onChange={(e) => setNewTaskPriority(e.target.value)}
                className="px-4 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-sage/20 focus:border-sage text-sm font-medium"
              >
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
              </select>
              <button
                onClick={handleAddTask}
                className="px-6 py-2.5 bg-sage hover:bg-sage/90 text-white rounded-xl font-medium text-sm transition-smooth flex items-center gap-2"
              >
                <Plus size={16} />
                Add
              </button>
            </div>
          </div>

          {/* Scheduled Tasks */}
          {scheduledTasks.length > 0 && (
            <div className="space-y-3">
              <h3 className="font-serif text-lg font-bold text-navy flex items-center gap-2">
                <Calendar size={18} className="text-sage" />
                Scheduled ({scheduledTasks.length})
              </h3>
              <div className="space-y-2">
                {scheduledTasks.map(task => {
                  const priority = PRIORITIES[task.priority];
                  const slot = task.scheduledSlot;
                  return (
                    <div key={task.id} className="bg-white rounded-xl shadow-sm border border-slate-200/60 p-4">
                      <div className="flex items-start gap-3">
                        <button
                          onClick={() => handleToggleComplete(task.id)}
                          className="mt-0.5 shrink-0 w-5 h-5 rounded-md border-2 border-slate-300 hover:border-sage hover:bg-sage/10 transition-smooth flex items-center justify-center"
                        >
                          {task.completed && <Check size={14} className="text-sage" />}
                        </button>

                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-navy">{task.text}</p>
                          <div className="flex items-center gap-3 mt-2 text-xs text-navy/50">
                            <span
                              className="px-2 py-0.5 rounded-md font-semibold"
                              style={{ backgroundColor: priority.bgColor, color: priority.color }}
                            >
                              {priority.label}
                            </span>
                            {slot && (
                              <div className="flex items-center gap-1">
                                <Clock size={12} />
                                <span>
                                  {slot.date.toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' })} · {formatMinutesToTime(slot.startMinutes)} - {formatMinutesToTime(slot.endMinutes)} ({formatDuration(slot.duration)})
                                </span>
                              </div>
                            )}
                          </div>
                        </div>

                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => handleUnschedule(task.id)}
                            className="p-2 rounded-lg hover:bg-sand text-navy/40 hover:text-navy transition-smooth"
                            title="Unschedule"
                          >
                            <AlertCircle size={16} />
                          </button>
                          <button
                            onClick={() => handleDeleteTask(task.id)}
                            className="p-2 rounded-lg hover:bg-terracotta/10 text-navy/40 hover:text-terracotta transition-smooth"
                            title="Delete"
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Unscheduled Tasks */}
          {unscheduledTasks.length > 0 && (
            <div className="space-y-3">
              <h3 className="font-serif text-lg font-bold text-navy flex items-center gap-2">
                <Circle size={18} className="text-navy/40" />
                Unscheduled ({unscheduledTasks.length})
              </h3>
              <div className="space-y-2">
                {unscheduledTasks.map(task => {
                  const priority = PRIORITIES[task.priority];
                  return (
                    <div key={task.id} className="bg-white rounded-xl shadow-sm border border-slate-200/60 p-4">
                      <div className="flex items-start gap-3">
                        <button
                          onClick={() => handleToggleComplete(task.id)}
                          className="mt-0.5 shrink-0 w-5 h-5 rounded-md border-2 border-slate-300 hover:border-sage hover:bg-sage/10 transition-smooth flex items-center justify-center"
                        >
                          {task.completed && <Check size={14} className="text-sage" />}
                        </button>

                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-navy">{task.text}</p>
                          <div className="flex items-center gap-3 mt-2">
                            <span
                              className="px-2 py-0.5 rounded-md font-semibold text-xs"
                              style={{ backgroundColor: priority.bgColor, color: priority.color }}
                            >
                              {priority.label}
                            </span>
                          </div>
                        </div>

                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => setShowScheduler(task.id)}
                            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg hover:bg-sage/10 text-sage text-xs font-medium transition-smooth"
                          >
                            <Calendar size={14} />
                            Schedule
                          </button>
                          <button
                            onClick={() => handleDeleteTask(task.id)}
                            className="p-2 rounded-lg hover:bg-terracotta/10 text-navy/40 hover:text-terracotta transition-smooth"
                            title="Delete"
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                      </div>

                      {/* Scheduler panel */}
                      {showScheduler === task.id && (
                        <div className="mt-4 pt-4 border-t border-slate-100">
                          <p className="text-xs font-semibold text-navy/60 mb-3">Choose a free period:</p>
                          <div className="grid grid-cols-2 gap-2 max-h-64 overflow-y-auto">
                            {freePeriods.map((period, idx) => {
                              const isPast = period.date < new Date().setHours(0, 0, 0, 0);
                              return (
                                <button
                                  key={idx}
                                  onClick={() => !isPast && handleScheduleTask(task.id, period)}
                                  disabled={isPast}
                                  className={`p-3 rounded-lg border text-left transition-smooth ${
                                    isPast
                                      ? 'border-slate-100 bg-slate-50 text-navy/30 cursor-not-allowed'
                                      : 'border-slate-200 hover:border-sage hover:bg-sage/5'
                                  }`}
                                >
                                  <p className={`text-xs font-semibold ${isPast ? 'text-navy/30' : 'text-navy/70'}`}>
                                    {period.date.toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' })}
                                  </p>
                                  <p className={`text-xs mt-1 ${isPast ? 'text-navy/20' : 'text-navy/50'}`}>
                                    {formatMinutesToTime(period.startMinutes)} - {formatMinutesToTime(period.endMinutes)}
                                  </p>
                                  <p className={`text-xs font-medium mt-1 ${isPast ? 'text-navy/20' : 'text-sage'}`}>
                                    {formatDuration(period.duration)} free
                                  </p>
                                </button>
                              );
                            })}
                          </div>
                          <button
                            onClick={() => setShowScheduler(null)}
                            className="mt-3 text-xs text-navy/50 hover:text-navy"
                          >
                            Cancel
                          </button>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Completed Tasks */}
          {completedTasks.length > 0 && (
            <div className="space-y-3">
              <h3 className="font-serif text-lg font-bold text-navy/50 flex items-center gap-2">
                <Check size={18} />
                Completed ({completedTasks.length})
              </h3>
              <div className="space-y-2">
                {completedTasks.map(task => {
                  const priority = PRIORITIES[task.priority];
                  return (
                    <div key={task.id} className="bg-slate-50 rounded-xl border border-slate-100 p-4 opacity-60">
                      <div className="flex items-start gap-3">
                        <button
                          onClick={() => handleToggleComplete(task.id)}
                          className="mt-0.5 shrink-0 w-5 h-5 rounded-md bg-sage border-2 border-sage transition-smooth flex items-center justify-center"
                        >
                          <Check size={14} className="text-white" />
                        </button>

                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-navy/60 line-through">{task.text}</p>
                        </div>

                        <button
                          onClick={() => handleDeleteTask(task.id)}
                          className="p-2 rounded-lg hover:bg-terracotta/10 text-navy/40 hover:text-terracotta transition-smooth"
                          title="Delete"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Empty state */}
          {todos.length === 0 && (
            <div className="text-center py-16">
              <Circle size={48} className="mx-auto text-navy/20 mb-4" />
              <p className="text-navy/40 font-medium">No tasks yet</p>
              <p className="text-sm text-navy/30 mt-1">Add a task to get started</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}