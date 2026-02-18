import React, { useState } from 'react';
import { X, CheckSquare, Circle, Plus } from 'lucide-react';

const PRIORITIES = {
  high: { label: 'High', color: '#E07A5F', bgColor: '#E07A5F15' },
  medium: { label: 'Medium', color: '#F4845F', bgColor: '#F4845F15' },
  low: { label: 'Low', color: '#81B29A', bgColor: '#81B29A15' },
};

export default function TaskSchedulePanel({ slot, todos, onScheduleTask, onScheduleMultipleTasks, onCreateTask, onClose }) {
  const [selectedTaskIds, setSelectedTaskIds] = useState([]);
  const [newTaskText, setNewTaskText] = useState('');
  const [newTaskPriority, setNewTaskPriority] = useState('medium');
  
  // Get unscheduled tasks - they can be added to any slot
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

  const toggleTaskSelection = (taskId) => {
    setSelectedTaskIds(prev => 
      prev.includes(taskId) 
        ? prev.filter(id => id !== taskId)
        : [...prev, taskId]
    );
  };

  const handleScheduleSelected = () => {
    if (selectedTaskIds.length === 0) return;
    
    // Use the batch scheduling function
    onScheduleMultipleTasks(selectedTaskIds, slot);
    setSelectedTaskIds([]);
  };

  const handleCreateTask = () => {
    if (!newTaskText.trim() || !onCreateTask) return;

    const newTask = {
      id: Date.now().toString(),
      text: newTaskText.trim(),
      priority: newTaskPriority,
      completed: false,
      createdAt: new Date().toISOString(),
      scheduledSlot: null,
    };

    onCreateTask(newTask);
    setNewTaskText('');
    // Auto-select the newly created task so it's ready to schedule
    setSelectedTaskIds(prev => [...prev, newTask.id]);
  };

  // Handle both Date objects and ISO strings
  const slotDate = typeof slot.date === 'string' ? new Date(slot.date) : slot.date;

  return (
    <div className="w-80 h-full border-l border-slate-200 bg-white flex flex-col">
      {/* Header */}
      <div className="shrink-0 px-4 py-4 border-b border-slate-100 flex items-start justify-between">
        <div className="flex-1">
          <h3 className="font-serif text-lg font-bold text-navy">Schedule Tasks</h3>
          <p className="text-xs text-navy/50 mt-1">
            {slotDate.toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long' })}
          </p>
          <p className="text-xs text-navy/40 mt-0.5">
            {formatMinutesToTime(slot.startMinutes)} – {formatMinutesToTime(slot.endMinutes)} ({formatDuration(slot.duration)})
          </p>
          {selectedTaskIds.length > 0 && (
            <p className="text-xs font-semibold text-sage mt-2">
              {selectedTaskIds.length} task{selectedTaskIds.length !== 1 ? 's' : ''} selected
            </p>
          )}
        </div>
        <button
          onClick={onClose}
          className="p-1.5 rounded-lg hover:bg-slate-100 text-navy/40 hover:text-navy transition-smooth"
        >
          <X size={18} />
        </button>
      </div>

      {/* Quick create */}
      {onCreateTask && (
        <div className="shrink-0 px-4 py-3 border-b border-slate-100 bg-sand/30">
          <p className="text-[11px] font-semibold text-navy/40 uppercase tracking-wide mb-2">Quick add</p>
          <div className="flex gap-2">
            <input
              type="text"
              value={newTaskText}
              onChange={(e) => setNewTaskText(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleCreateTask()}
              placeholder="New task..."
              className="flex-1 min-w-0 px-3 py-2 rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-sage/20 focus:border-sage text-sm bg-white"
            />
            <button
              onClick={handleCreateTask}
              disabled={!newTaskText.trim()}
              className="shrink-0 px-2.5 py-2 bg-sage hover:bg-sage/90 disabled:bg-slate-200 disabled:text-slate-400 text-white rounded-lg transition-smooth"
            >
              <Plus size={16} />
            </button>
          </div>
          <div className="flex gap-1.5 mt-2">
            {Object.entries(PRIORITIES).map(([key, val]) => (
              <button
                key={key}
                onClick={() => setNewTaskPriority(key)}
                className={'px-2.5 py-1 rounded-md text-[11px] font-semibold transition-smooth border ' + (
                  newTaskPriority === key
                    ? 'border-current'
                    : 'border-transparent opacity-50 hover:opacity-80'
                )}
                style={{ backgroundColor: val.bgColor, color: val.color }}
              >
                {val.label}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Task list */}
      <div className="flex-1 overflow-y-auto p-4">
        {unscheduledTasks.length === 0 ? (
          <div className="text-center py-12">
            <Circle size={40} className="mx-auto text-navy/20 mb-3" />
            <p className="text-sm text-navy/40">No unscheduled tasks</p>
            <p className="text-xs text-navy/30 mt-1">Create one above or add tasks in the To-Do List</p>
          </div>
        ) : (
          <div className="space-y-2">
            <p className="text-xs font-semibold text-navy/50 uppercase tracking-wide mb-3">
              Click to select tasks:
            </p>
            {unscheduledTasks.map(task => {
              const priority = PRIORITIES[task.priority];
              const isSelected = selectedTaskIds.includes(task.id);
              return (
                <button
                  key={task.id}
                  onClick={() => toggleTaskSelection(task.id)}
                  className={`w-full p-3 rounded-xl border-2 transition-smooth text-left group ${
                    isSelected 
                      ? 'border-sage bg-sage/5' 
                      : 'border-slate-200 hover:border-sage/50 hover:bg-sage/5'
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <div className={`mt-0.5 shrink-0 w-5 h-5 rounded border-2 transition-smooth flex items-center justify-center ${
                      isSelected 
                        ? 'bg-sage border-sage' 
                        : 'border-slate-300 group-hover:border-sage'
                    }`}>
                      {isSelected && (
                        <CheckSquare size={14} className="text-white" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className={`text-sm font-medium transition-smooth ${
                        isSelected ? 'text-sage' : 'text-navy group-hover:text-sage'
                      }`}>
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

      {/* Footer with Schedule button */}
      {selectedTaskIds.length > 0 && (
        <div className="shrink-0 px-4 py-3 border-t border-slate-100 bg-white">
          <button
            onClick={handleScheduleSelected}
            className="w-full py-3 bg-sage hover:bg-sage/90 text-white rounded-xl font-semibold transition-smooth"
          >
            Schedule {selectedTaskIds.length} Task{selectedTaskIds.length !== 1 ? 's' : ''}
          </button>
        </div>
      )}
    </div>
  );
}