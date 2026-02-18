import React, { useState } from 'react';
import {
  Home,
  Calendar,
  BookOpen,
  Printer,
  CheckSquare,
  Users,
  FolderKanban,
  Sparkles,
  Settings,
} from 'lucide-react';

// ===== Sidebar =====
// Collapsed by default (icons only, 64px).
// Expands on hover to 256px, overlaying content rather than pushing it.

const NAV_ITEMS = [
  { id: 'home', label: 'Home', icon: Home, active: true },
  { id: 'week', label: 'Week View', icon: Calendar, active: true },
  { id: 'class', label: 'Class View', icon: BookOpen, active: true },
  { id: 'todos', label: 'To-Do List', icon: CheckSquare, active: true },
  { id: 'print', label: 'Printing', icon: Printer, active: false },
  { id: 'meetings', label: 'Meetings', icon: Users, active: false },
  { id: 'projects', label: 'Projects', icon: FolderKanban, active: false },
  { id: 'ai', label: 'AI Import', icon: Sparkles, active: false },
];

export default function Sidebar({ currentView, onNavigate, teacherName }) {
  const [expanded, setExpanded] = useState(false);

  return (
    <>
      {/* Spacer: always 64px wide so main content has a fixed left margin */}
      <div className="w-16 shrink-0" />

      {/* The actual sidebar — positioned fixed, overlays on expand */}
      <aside
        onMouseEnter={() => setExpanded(true)}
        onMouseLeave={() => setExpanded(false)}
        className="fixed top-0 left-0 h-screen bg-white border-r border-slate-100 flex flex-col z-40 transition-all duration-300 ease-out overflow-hidden"
        style={{
          width: expanded ? 256 : 64,
          boxShadow: expanded ? '4px 0 24px rgba(0,0,0,0.06)' : 'none',
        }}
      >
        {/* ---- Logo / Brand Area ---- */}
        <div className="px-4 pt-5 pb-3 flex items-center gap-3 min-h-[60px]">
          <div className="w-8 h-8 rounded-xl bg-sage/10 flex items-center justify-center shrink-0">
            <span className="font-serif text-sm font-bold text-sage">T</span>
          </div>
          <div
            className="min-w-0 transition-opacity duration-200"
            style={{ opacity: expanded ? 1 : 0 }}
          >
            <h1 className="font-serif text-base font-bold text-navy tracking-tight whitespace-nowrap">
              Teacher Planner
            </h1>
            {teacherName && (
              <p className="text-xs text-navy/40 truncate whitespace-nowrap">{teacherName}</p>
            )}
          </div>
        </div>

        {/* ---- Navigation Items ---- */}
        <nav className="flex-1 px-2 mt-2 space-y-1">
          {NAV_ITEMS.map((item) => {
            const Icon = item.icon;
            const isActive = currentView === item.id;
            const isDisabled = !item.active;

            return (
              <button
                key={item.id}
                onClick={() => item.active && onNavigate(item.id)}
                disabled={isDisabled}
                title={expanded ? undefined : item.label}
                className={
                  'w-full flex items-center gap-3 rounded-xl text-sm font-medium transition-smooth relative ' +
                  (expanded ? 'px-3 py-2.5 ' : 'px-0 py-2.5 justify-center ') +
                  (isActive
                    ? 'bg-[#81B29A]/10 text-sage'
                    : isDisabled
                      ? 'text-navy/25 cursor-not-allowed'
                      : 'text-navy/60 hover:bg-sand hover:text-navy')
                }
              >
                <Icon size={18} strokeWidth={isActive ? 2.5 : 2} className="shrink-0" />
                <span
                  className="whitespace-nowrap transition-opacity duration-200 truncate"
                  style={{ opacity: expanded ? 1 : 0, width: expanded ? 'auto' : 0, overflow: 'hidden' }}
                >
                  {item.label}
                </span>
                {!item.active && expanded && (
                  <span className="ml-auto text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-100 text-navy/30 shrink-0">
                    Soon
                  </span>
                )}
              </button>
            );
          })}
        </nav>

        {/* ---- Footer / Settings ---- */}
        <div className="px-2 pb-3 border-t border-slate-100 pt-2">
          <button
            onClick={() => onNavigate('settings')}
            title={expanded ? undefined : 'Settings'}
            className={
              'w-full flex items-center gap-3 rounded-xl text-sm font-medium transition-smooth ' +
              (expanded ? 'px-3 py-2.5 ' : 'px-0 py-2.5 justify-center ') +
              (currentView === 'settings'
                ? 'bg-[#81B29A]/10 text-sage'
                : 'text-navy/60 hover:bg-sand hover:text-navy')
            }
          >
            <Settings size={18} strokeWidth={currentView === 'settings' ? 2.5 : 2} className="shrink-0" />
            <span
              className="whitespace-nowrap transition-opacity duration-200"
              style={{ opacity: expanded ? 1 : 0, width: expanded ? 'auto' : 0, overflow: 'hidden' }}
            >
              Settings
            </span>
          </button>
        </div>
      </aside>
    </>
  );
}