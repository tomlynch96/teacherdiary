import React from 'react';
import { X, CheckSquare, Circle } from 'lucide-react';

const PRIORITIES = {
  high: { label: 'High', color: '#E07A5F', bgColor: '#E07A5F15' },
  medium: { label: 'Medium', color: '#F4845F', bgColor: '#F4845F15' },
  low: { label: 'Low', color: '#81B29A', bgColor: '#81B29A15' },
};

export default function TaskSchedulePanel({ slot, todos, onScheduleTask, onClose }) {
  // Get unscheduled tasks
  const unscheduledTasks = todos.filter(t => !t.scheduledSlot && !t.completed);

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

  return (
    <div className="w-80 h-full border-l border-slate-200 bg-white flex flex-col">
      {/* Header */}
      <div className="shrink-0 px-4 py-4 border-b border-slate-100 flex items-start justify-between">
        <div className="flex-1">
          <h3 className="font-serif text-lg font-bold text-navy">Schedule Task</h3>
          <p className="text-xs text-navy/50 mt-1">
            {slot.date.toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long' })}
          </p>
          <p className="text-xs text-navy/40 mt-0.5">
            {formatMinutesToTime(slot.startMinutes)} – {formatMinutesToTime(slot.endMinutes)} ({formatDuration(slot.duration)})
          </p>
        </div>
        <button
          onClick={onClose}
          className="p-1.5 rounded-lg hover:bg-slate-100 text-navy/40 hover:text-navy transition-smooth"
        >
          <X size={18} />
        </button>
      </div>

      {/* Task list */}
      <div className="flex-1 overflow-y-auto p-4">
        {unscheduledTasks.length === 0 ? (
          <div className="text-center py-12">
            <Circle size={40} className="mx-auto text-navy/20 mb-3" />
            <p className="text-sm text-navy/40">No unscheduled tasks</p>
            <p className="text-xs text-navy/30 mt-1">Add tasks in the To-Do List</p>
          </div>
        ) : (
          <div className="space-y-2">
            <p className="text-xs font-semibold text-navy/50 uppercase tracking-wide mb-3">
              Choose a task to schedule:
            </p>
            {unscheduledTasks.map(task => {
              const priority = PRIORITIES[task.priority];
              return (
                <button
                  key={task.id}
                  onClick={() => onScheduleTask(task.id, slot)}
                  className="w-full p-3 rounded-xl border border-slate-200 hover:border-sage hover:bg-sage/5 transition-smooth text-left group"
                >
                  <div className="flex items-start gap-3">
                    <CheckSquare size={16} className="mt-0.5 text-navy/30 group-hover:text-sage transition-smooth" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-navy group-hover:text-sage transition-smooth">
                        {task.text}
                      </p>
                      <span
                        className="inline-block mt-1.5 px-2 py-0.5 rounded-md font-semibold text-xs"
                        style={{ backgroundColor: priority.bgColor, color: priority.color }}
                      >
                        {priority.label}
                      </span>
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
