import React from 'react';
import { X } from 'lucide-react';

const PRIORITY_COLORS = {
  high: '#E07A5F',
  medium: '#F4845F',
  low: '#81B29A',
};

export default function ScheduledTaskCard({ 
  task, 
  gridStartMin, 
  pxPerMinute, 
  onToggleComplete, 
  onRemoveSchedule 
}) {
  const slot = task.scheduledSlot;
  const top = (slot.startMinutes - gridStartMin) * pxPerMinute;
  const height = (slot.endMinutes - slot.startMinutes) * pxPerMinute;
  const color = PRIORITY_COLORS[task.priority] || '#81B29A';

  return (
    <div
      className="absolute left-1 right-1 z-[2] bg-white border-l-4 rounded-lg shadow-sm p-2 group hover:shadow-md transition-smooth"
      style={{ top, height, borderLeftColor: color, minHeight: 40 }}
    >
      <div className="flex items-start gap-2 h-full">
        <button
          onClick={() => onToggleComplete(task.id)}
          className="mt-0.5 shrink-0 w-4 h-4 rounded border-2 border-slate-300 hover:border-sage hover:bg-sage/10 transition-smooth flex items-center justify-center"
          style={{ 
            borderColor: task.completed ? color : undefined, 
            backgroundColor: task.completed ? color : undefined 
          }}
        >
          {task.completed && (
            <svg width="10" height="10" viewBox="0 0 10 10" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M2 5L4 7L8 3" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          )}
        </button>
        <div className="flex-1 min-w-0">
          <p className={`text-xs font-semibold truncate ${task.completed ? 'text-navy/50 line-through' : 'text-navy'}`}>
            {task.text}
          </p>
          <p className="text-[10px] text-navy/40 mt-0.5">
            {task.priority} priority
          </p>
        </div>
        <button
          onClick={() => onRemoveSchedule(task.id)}
          className="opacity-0 group-hover:opacity-100 p-1 rounded hover:bg-terracotta/10 text-navy/40 hover:text-terracotta transition-smooth"
          title="Remove from schedule"
        >
          <X size={14} />
        </button>
      </div>
    </div>
  );
}
