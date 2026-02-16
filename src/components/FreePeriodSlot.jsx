import React from 'react';
import { Plus } from 'lucide-react';

// ===== FreePeriodSlot =====
// Shows a + icon on hover over free periods, allowing task scheduling

export default function FreePeriodSlot({ slot, gridStartMin, pxPerMinute, onClick }) {
  if (!slot) return null;
  
  const top = (slot.startMinutes - gridStartMin) * pxPerMinute;
  const height = slot.duration * pxPerMinute;

  return (
    <button
      onClick={onClick}
      className="absolute left-0 right-0 group hover:bg-sage/5 transition-smooth rounded-lg"
      style={{ top: `${top}px`, height: `${height}px` }}
    >
      <div className="w-full h-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-smooth">
        <div className="w-8 h-8 rounded-full bg-sage/10 flex items-center justify-center group-hover:bg-sage/20">
          <Plus size={16} className="text-sage" />
        </div>
      </div>
    </button>
  );
}