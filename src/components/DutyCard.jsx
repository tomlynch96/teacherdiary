import React from 'react';
import { Shield, Clock, AlertTriangle } from 'lucide-react';
import { formatTime, timeToMinutes } from '../utils/dateHelpers';

// ===== DutyCard =====
// Displays non-teaching duties like Break Duty, Line Manage, Detention.
// Styled differently from lessons so they're visually distinct.
// Adapts layout based on available height.

const DUTY_STYLES = {
  'Break Duty': {
    bg: 'bg-[#3D405B]/5',
    border: 'border-[#3D405B]/10',
    text: 'text-[#3D405B]/60',
    icon: Shield,
  },
  'Line Manage': {
    bg: 'bg-[#81B29A]/8',
    border: 'border-[#81B29A]/15',
    text: 'text-[#81B29A]',
    icon: Clock,
  },
  'Detention': {
    bg: 'bg-[#E07A5F]/8',
    border: 'border-[#E07A5F]/15',
    text: 'text-[#E07A5F]',
    icon: AlertTriangle,
  },
};

export default function DutyCard({ duty, gridStartMin, pxPerMinute }) {
  const style = DUTY_STYLES[duty.activity] || DUTY_STYLES['Break Duty'];
  const Icon = style.icon;

  // Calculate position from time
  const startMin = timeToMinutes(duty.startTime);
  const endMin = timeToMinutes(duty.endTime);
  const top = (startMin - gridStartMin) * pxPerMinute;
  const height = (endMin - startMin) * pxPerMinute;

  // Adaptive layout based on height
  const isVeryShort = height < 40;  // Less than ~22 minutes
  const isShort = height < 60;       // Less than ~33 minutes

  return (
    <div 
      className={`absolute left-0 right-0 rounded-xl border overflow-hidden ${style.bg} ${style.border}`}
      style={{ top: `${top}px`, height: `${height}px` }}
    >
      <div className={`h-full flex items-center ${isVeryShort ? 'px-2 py-1' : 'px-3 py-2'}`}>
        {isVeryShort ? (
          // Very short: Icon and abbreviated name only, horizontal layout
          <div className="flex items-center gap-1.5 min-w-0 flex-1">
            <Icon size={11} className={`${style.text} shrink-0`} />
            <span className={`text-[10px] font-semibold ${style.text} truncate`}>
              {duty.activity}
            </span>
          </div>
        ) : isShort ? (
          // Short: Icon and name, hide time
          <div className="flex items-center gap-2 min-w-0 flex-1">
            <Icon size={12} className={`${style.text} shrink-0`} />
            <span className={`text-xs font-semibold ${style.text} truncate`}>
              {duty.activity}
            </span>
          </div>
        ) : (
          // Normal height: Full layout with time
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-0.5">
              <Icon size={13} className={style.text} />
              <span className={`text-xs font-semibold ${style.text} truncate`}>
                {duty.activity}
              </span>
            </div>
            <p className="text-[11px] text-navy/30 truncate">
              {formatTime(duty.startTime)} – {formatTime(duty.endTime)}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}