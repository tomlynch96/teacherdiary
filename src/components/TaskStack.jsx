import React from 'react';
import { Check } from 'lucide-react';

const PRIORITY_COLORS = {
  high: '#E07A5F',
  medium: '#F4845F',
  low: '#81B29A',
};

export default function TaskStack({ 
  tasks, 
  gridStartMin, 
  pxPerMinute, 
  onToggleComplete,
  onOpenManager,
  slotKey
}) {
  if (tasks.length === 0) return null;

  const firstTask = tasks[0];
  const slot = firstTask.scheduledSlot;
  const top = (slot.startMinutes - gridStartMin) * pxPerMinute;
  const height = (slot.endMinutes - slot.startMinutes) * pxPerMinute;
  
  // Make card smaller than the slot - 40% of slot height, max 60px, min 32px
  const cardHeight = Math.min(Math.max(height * 0.4, 32), 60);
  const topOffset = 4; // Small offset from top of slot

  return (
    <div
      className="absolute left-2 right-2 z-[2]"
      style={{ top: top + topOffset, height: cardHeight }}
    >
      <div className="relative w-full h-full">
        {/* Background stacked cards - subtle grey */}
        {tasks.slice(1, 4).map((task, index) => {
          const offset = (index + 1) * 2;
          return (
            <div
              key={task.id}
              className="absolute bg-slate-200/40 backdrop-blur-sm border border-slate-300/30 rounded-lg"
              style={{
                left: `${offset}px`,
                right: `-${offset}px`,
                top: `${offset}px`,
                bottom: `-${offset}px`,
                zIndex: 10 - index,
              }}
            />
          );
        })}

        {/* Front card - clickable to open manager */}
        <button
          onClick={() => onOpenManager(slotKey, tasks)}
          className="absolute left-0 right-0 top-0 bottom-0 bg-slate-100/60 backdrop-blur-sm border border-slate-300/40 rounded-lg hover:bg-slate-200/70 hover:border-slate-400/50 transition-smooth group w-full text-left"
          style={{ zIndex: 20 }}
        >
          <div className="flex items-center gap-2 h-full px-2 py-1.5">
            <button
              onClick={(e) => {
                e.stopPropagation(); // Prevent opening manager when clicking checkbox
                onToggleComplete(firstTask.id);
              }}
              className="shrink-0 w-3.5 h-3.5 rounded border border-slate-400/60 hover:border-sage hover:bg-sage/20 transition-smooth flex items-center justify-center"
              style={{ 
                borderColor: firstTask.completed ? '#81B29A' : undefined, 
                backgroundColor: firstTask.completed ? '#81B29A' : undefined 
              }}
            >
              {firstTask.completed && (
                <Check size={10} className="text-white" strokeWidth={3} />
              )}
            </button>

            <div className="flex-1 min-w-0">
              <p className={`text-xs font-medium truncate ${firstTask.completed ? 'text-slate-500 line-through' : 'text-slate-700'}`}>
                {firstTask.text}
              </p>
            </div>

            {tasks.length > 1 && (
              <div className="bg-slate-400/40 text-slate-700 text-[10px] font-bold px-1.5 py-0.5 rounded-full shrink-0">
                +{tasks.length - 1}
              </div>
            )}
          </div>
        </button>
      </div>
    </div>
  );
}