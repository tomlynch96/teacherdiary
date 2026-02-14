import React from 'react';
import { Plus } from 'lucide-react';

export default function FreePeriodSlot({ period, gridStartMin, pxPerMinute, onSelect }) {
  const top = (period.startMinutes - gridStartMin) * pxPerMinute;
  const height = (period.endMinutes - period.startMinutes) * pxPerMinute;

  return (
    <button
      onClick={() => onSelect(period)}
      className="absolute left-1 right-1 z-[1] rounded-lg hover:bg-sage/5 transition-smooth flex items-center justify-center group"
      style={{ top, height }}
    >
      <Plus size={20} className="text-sage opacity-0 group-hover:opacity-100 transition-smooth" />
    </button>
  );
}
