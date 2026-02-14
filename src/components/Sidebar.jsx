import React from 'react';
import {
  Calendar,
  BookOpen,
  Printer,
  CheckSquare,
  Users,
  FolderKanban,
  Sparkles,
  Settings,
  LogOut,
} from 'lucide-react';

// ===== Sidebar =====
// Navigation sidebar with the warm professional design.

const NAV_ITEMS = [
  { id: 'week', label: 'Week View', icon: Calendar, active: true },
  { id: 'class', label: 'Class View', icon: BookOpen, active: true },
  { id: 'todos', label: 'To-Do List', icon: CheckSquare, active: true },
  { id: 'print', label: 'Printing', icon: Printer, active: false },
  { id: 'meetings', label: 'Meetings', icon: Users, active: false },
  { id: 'projects', label: 'Projects', icon: FolderKanban, active: false },
  { id: 'ai', label: 'AI Import', icon: Sparkles, active: false },
];

export default function Sidebar({ currentView, onNavigate, teacherName }) {
  return (
    <aside className="w-64 h-screen bg-white border-r border-slate-100 flex flex-col shrink-0">
      {/* ---- Logo / Brand Area ---- */}
      <div className="p-6 pb-4">
        <h1 className="font-serif text-xl font-bold text-navy tracking-tight">
          Teacher Planner
        </h1>
        {teacherName && (
          <p className="text-sm text-navy/50 mt-1 truncate">{teacherName}</p>
        )}
      </div>

      {/* ---- Navigation Items ---- */}
      <nav className="flex-1 px-3 space-y-1">
        {NAV_ITEMS.map((item) => {
          const Icon = item.icon;
          const isActive = currentView === item.id;
          const isDisabled = !item.active;

          return (
            <button
              key={item.id}
              onClick={() => item.active && onNavigate(item.id)}
              disabled={isDisabled}
              className={`
                w-full flex items-center gap-3 px-4 py-3 rounded-2xl text-sm font-medium
                transition-smooth group relative
                ${isActive
                  ? 'bg-[#81B29A]/10 text-sage'
                  : isDisabled
                    ? 'text-navy/25 cursor-not-allowed'
                    : 'text-navy/60 hover:bg-sand hover:text-navy'
                }
              `}
            >
              <Icon size={18} strokeWidth={isActive ? 2.5 : 2} />
              <span>{item.label}</span>
              {!item.active && (
                <span className="ml-auto text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-100 text-navy/30">
                  Soon
                </span>
              )}
            </button>
          );
        })}
      </nav>

      {/* ---- Footer / Settings (placeholder) ---- */}
      <div className="p-3 border-t border-slate-100">
        <button
          disabled
          className="w-full flex items-center gap-3 px-4 py-3 rounded-2xl text-sm font-medium text-navy/25 cursor-not-allowed"
        >
          <Settings size={18} />
          <span>Settings</span>
        </button>
      </div>
    </aside>
  );
}