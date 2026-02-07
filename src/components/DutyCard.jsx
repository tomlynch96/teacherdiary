import React from 'react';
import { Shield, Clock, AlertTriangle } from 'lucide-react';
import { formatTime } from '../utils/dateHelpers';

// ===== DutyCard =====
// Displays non-teaching duties like Break Duty, Line Manage, Detention.
// Styled differently from lessons so they're visually distinct.

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

export default function DutyCard({ duty }) {
  const style = DUTY_STYLES[duty.activity] || DUTY_STYLES['Break Duty'];
  const Icon = style.icon;

  return (
    <div className={`
      w-full rounded-xl border px-3 py-2
      ${style.bg} ${style.border}
    `}>
      <div className="flex items-center gap-2">
        <Icon size={13} className={style.text} />
        <span className={`text-xs font-semibold ${style.text}`}>
          {duty.activity}
        </span>
      </div>
      <p className="text-[11px] text-navy/30 mt-0.5">
        {formatTime(duty.startTime)} – {formatTime(duty.endTime)}
      </p>
    </div>
  );
}
