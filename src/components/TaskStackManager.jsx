import React, { useState } from 'react';
import { X, GripVertical, Trash2, Check, Plus } from 'lucide-react';

const PRIORITY_COLORS = {
  high: '#E07A5F',
  medium: '#F4845F',
  low: '#81B29A',
};

export default function TaskStackManager({ slot, tasks, onReorder, onRemoveTask, onToggleComplete, onAddMore, onClose }) {
  const [orderedTasks, setOrderedTasks] = useState([...tasks]);
  const [draggedIndex, setDraggedIndex] = useState(null);

  // Update local state when tasks prop changes (e.g., after completion toggle)
  React.useEffect(() => {
    setOrderedTasks([...tasks]);
  }, [tasks]);

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

  const handleDragStart = (index) => {
    setDraggedIndex(index);
  };

  const handleDragOver = (e, index) => {
    e.preventDefault();
    if (draggedIndex === null || draggedIndex === index) return;

    const newTasks = [...orderedTasks];
    const draggedTask = newTasks[draggedIndex];
    newTasks.splice(draggedIndex, 1);
    newTasks.splice(index, 0, draggedTask);

    setOrderedTasks(newTasks);
    setDraggedIndex(index);
  };

  const handleDragEnd = () => {
    setDraggedIndex(null);
    onReorder(orderedTasks);
  };

  const slotDate = typeof slot.date === 'string' ? new Date(slot.date) : slot.date;

  return (
    <div className="w-96 h-full border-l border-slate-200 bg-white flex flex-col">
      {/* Header */}
      <div className="shrink-0 px-4 py-4 border-b border-slate-100 flex items-start justify-between">
        <div className="flex-1">
          <h3 className="font-serif text-lg font-bold text-navy">Manage Task Stack</h3>
          <p className="text-xs text-navy/50 mt-1">
            {slotDate.toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long' })}
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

      {/* Instructions */}
      <div className="shrink-0 px-4 py-3 bg-sage/5 border-b border-sage/10">
        <p className="text-xs text-navy/60 mb-2">
          <strong>Drag to reorder.</strong> Tasks are completed in order from top to bottom.
        </p>
        <button
          onClick={() => onAddMore(slot)}
          className="w-full flex items-center justify-center gap-2 px-3 py-2 bg-sage hover:bg-sage/90 text-white rounded-lg text-sm font-medium transition-smooth"
        >
          <Plus size={16} />
          Add More Tasks
        </button>
      </div>

      {/* Task list */}
      <div className="flex-1 overflow-y-auto p-4">
        <div className="space-y-2">
          {orderedTasks.map((task, index) => {
            const color = PRIORITY_COLORS[task.priority] || '#81B29A';
            const isFirst = index === 0;
            const isDragging = draggedIndex === index;

            return (
              <div
                key={task.id}
                draggable
                onDragStart={() => handleDragStart(index)}
                onDragOver={(e) => handleDragOver(e, index)}
                onDragEnd={handleDragEnd}
                className={`relative group border-2 rounded-xl transition-all cursor-move ${
                  isDragging 
                    ? 'opacity-50 scale-95' 
                    : 'opacity-100 scale-100 hover:border-sage/30'
                } ${
                  isFirst 
                    ? 'border-sage/20 bg-sage/5' 
                    : 'border-slate-100 bg-white'
                }`}
              >
                {isFirst && (
                  <div className="absolute -top-2 left-3 bg-sage text-white text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wide">
                    Next
                  </div>
                )}

                <div className="flex items-start gap-3 p-3">
                  <GripVertical size={16} className="shrink-0 mt-1 text-navy/20 group-hover:text-navy/40 transition-smooth" />

                  <button
                    onClick={() => onToggleComplete(task.id)}
                    className="mt-0.5 shrink-0 w-5 h-5 rounded border-2 border-slate-300 hover:border-sage hover:bg-sage/10 transition-smooth flex items-center justify-center"
                    style={{ 
                      borderColor: task.completed ? color : undefined, 
                      backgroundColor: task.completed ? color : undefined 
                    }}
                  >
                    {task.completed && (
                      <Check size={14} className="text-white" strokeWidth={3} />
                    )}
                  </button>

                  <div className="flex-1 min-w-0">
                    <p className={`text-sm font-medium ${task.completed ? 'text-navy/50 line-through' : 'text-navy'}`}>
                      {task.text}
                    </p>
                    <div className="flex items-center gap-2 mt-1.5">
                      <span
                        className="px-2 py-0.5 rounded-md text-xs font-semibold"
                        style={{ backgroundColor: `${color}15`, color }}
                      >
                        {task.priority}
                      </span>
                      {isFirst && (
                        <span className="text-xs text-sage font-medium">
                          • Current
                        </span>
                      )}
                    </div>
                  </div>

                  <button
                    onClick={() => onRemoveTask(task.id)}
                    className="p-2 rounded-lg hover:bg-terracotta/10 text-navy/30 hover:text-terracotta transition-smooth opacity-0 group-hover:opacity-100"
                    title="Remove from this period"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Footer stats */}
      <div className="shrink-0 px-4 py-3 border-t border-slate-100 bg-slate-50">
        <div className="flex items-center justify-between text-xs">
          <span className="text-navy/50">
            {orderedTasks.filter(t => !t.completed).length} remaining
          </span>
          <span className="text-navy/50">
            {orderedTasks.filter(t => t.completed).length} completed
          </span>
        </div>
      </div>
    </div>
  );
}