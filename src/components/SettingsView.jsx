import React, { useState, useMemo } from 'react';
import {
  Clock,
  CalendarOff,
  Plus,
  Trash2,
  Save,
  X,
  ChevronDown,
  ChevronUp,
  AlertTriangle,
} from 'lucide-react';
import { getMonday, formatDateISO, MONTH_NAMES_SHORT, DAY_NAMES_SHORT } from '../utils/dateHelpers';

// ===== SettingsView =====
// Manages work hours and holiday weeks.
// Holiday weeks cause lesson sequences to skip those dates automatically.

const DEFAULT_START = '09:00';
const DEFAULT_END = '16:00';

// Pre-defined UK school holiday names for quick-add
const HOLIDAY_PRESETS = [
  'October Half Term',
  'Christmas Holiday',
  'February Half Term',
  'Easter Holiday',
  'May Half Term',
  'Summer Holiday',
];

function getMondayISO(dateStr) {
  const d = new Date(dateStr + 'T00:00:00');
  const monday = getMonday(d);
  return formatDateISO(monday);
}

function getWeekDatesFromMonday(mondayISO) {
  const mon = new Date(mondayISO + 'T00:00:00');
  return Array.from({ length: 5 }, (_, i) => {
    const d = new Date(mon);
    d.setDate(mon.getDate() + i);
    return d;
  });
}

function formatWeekLabel(mondayISO) {
  const days = getWeekDatesFromMonday(mondayISO);
  const mon = days[0];
  const fri = days[4];
  const monStr = `${mon.getDate()} ${MONTH_NAMES_SHORT[mon.getMonth()]}`;
  const friStr = `${fri.getDate()} ${MONTH_NAMES_SHORT[fri.getMonth()]}`;
  if (mon.getMonth() === fri.getMonth()) {
    return `${mon.getDate()} – ${fri.getDate()} ${MONTH_NAMES_SHORT[mon.getMonth()]} ${fri.getFullYear()}`;
  }
  return `${monStr} – ${friStr} ${fri.getFullYear()}`;
}

export default function SettingsView({ settings, onUpdateSettings, timetableData }) {
  const [startTime, setStartTime] = useState(settings.workHoursStart || DEFAULT_START);
  const [endTime, setEndTime] = useState(settings.workHoursEnd || DEFAULT_END);
  const [hasUnsavedHours, setHasUnsavedHours] = useState(false);

  // Holiday management
  const [holidayName, setHolidayName] = useState('');
  const [holidayStartDate, setHolidayStartDate] = useState('');
  const [holidayEndDate, setHolidayEndDate] = useState('');
  const [showAddHoliday, setShowAddHoliday] = useState(false);
  const [showPresets, setShowPresets] = useState(false);

  const holidays = useMemo(() => {
    return [...(settings.holidays || [])].sort((a, b) => a.startDate.localeCompare(b.startDate));
  }, [settings.holidays]);

  // Calculate all holiday week mondays for display
  const getHolidayWeeks = (holiday) => {
    const weeks = [];
    const start = getMonday(new Date(holiday.startDate + 'T00:00:00'));
    const end = new Date(holiday.endDate + 'T00:00:00');
    const current = new Date(start);
    while (current <= end) {
      weeks.push(formatDateISO(current));
      current.setDate(current.getDate() + 7);
    }
    return weeks;
  };

  // Save work hours
  const saveWorkHours = () => {
    onUpdateSettings({
      ...settings,
      workHoursStart: startTime,
      workHoursEnd: endTime,
    });
    setHasUnsavedHours(false);
  };

  // Add a holiday
  const addHoliday = () => {
    if (!holidayName.trim() || !holidayStartDate || !holidayEndDate) return;
    if (holidayEndDate < holidayStartDate) return;

    const startD = new Date(holidayStartDate + 'T00:00:00');
    const endD = new Date(holidayEndDate + 'T00:00:00');

    // Collect all individual holiday dates
    const allDates = [];
    const cur = new Date(startD);
    while (cur <= endD) {
      const dow = cur.getDay();
      // Only count weekdays (Mon=1 to Fri=5)
      if (dow >= 1 && dow <= 5) {
        allDates.push(formatDateISO(cur));
      }
      cur.setDate(cur.getDate() + 1);
    }

    // Group dates by their week Monday, then only mark weeks where all 5 days are covered
    const datesByWeek = {};
    allDates.forEach(dateISO => {
      const d = new Date(dateISO + 'T00:00:00');
      const mon = getMonday(d);
      const monISO = formatDateISO(mon);
      if (!datesByWeek[monISO]) datesByWeek[monISO] = [];
      datesByWeek[monISO].push(dateISO);
    });

    const holidayWeekMondays = [];
    Object.entries(datesByWeek).forEach(([monISO, dates]) => {
      if (dates.length >= 5) {
        // Full week — all 5 weekdays covered
        holidayWeekMondays.push(monISO);
      }
    });

    const newHoliday = {
      id: Date.now().toString(),
      name: holidayName.trim(),
      startDate: holidayStartDate,
      endDate: holidayEndDate,
      weekMondays: holidayWeekMondays,
      holidayDates: allDates, // individual dates for partial-week display
    };

    onUpdateSettings({
      ...settings,
      holidays: [...(settings.holidays || []), newHoliday],
    });

    setHolidayName('');
    setHolidayStartDate('');
    setHolidayEndDate('');
    setShowAddHoliday(false);
  };

  // Remove a holiday
  const removeHoliday = (holidayId) => {
    onUpdateSettings({
      ...settings,
      holidays: (settings.holidays || []).filter(h => h.id !== holidayId),
    });
  };

  // Count total holiday weeks
  const totalHolidayWeeks = holidays.reduce((sum, h) => sum + (h.weekMondays?.length || 0), 0);

  return (
    <div className="flex-1 flex flex-col min-h-0 bg-cream">
      {/* Header */}
      <header className="shrink-0 px-8 py-5 border-b border-slate-100 bg-white/80 backdrop-blur-sm">
        <h2 className="font-serif text-2xl font-bold text-navy">Settings</h2>
        <p className="text-sm text-navy/40 mt-0.5">Work hours and holiday management</p>
      </header>

      {/* Content */}
      <div className="flex-1 overflow-auto px-8 py-6">
        <div className="max-w-2xl space-y-8">

          {/* ===== Work Hours ===== */}
          <section className="bg-white rounded-2xl border border-slate-100 p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-xl bg-sage/10 flex items-center justify-center">
                <Clock size={20} className="text-sage" />
              </div>
              <div>
                <h3 className="font-serif text-lg font-bold text-navy">Work Hours</h3>
                <p className="text-xs text-navy/40">Set your school day start and end times. This controls the calendar grid range.</p>
              </div>
            </div>

            <div className="flex items-end gap-4">
              <div className="flex-1">
                <label className="text-xs font-semibold text-navy/40 uppercase tracking-wider block mb-1.5">
                  Day starts
                </label>
                <input
                  type="time"
                  value={startTime}
                  onChange={(e) => { setStartTime(e.target.value); setHasUnsavedHours(true); }}
                  className="w-full px-3 py-2.5 rounded-xl border border-slate-200 text-sm text-navy
                           focus:outline-none focus:border-sage focus:ring-1 focus:ring-sage/20"
                />
              </div>
              <div className="flex-1">
                <label className="text-xs font-semibold text-navy/40 uppercase tracking-wider block mb-1.5">
                  Day ends
                </label>
                <input
                  type="time"
                  value={endTime}
                  onChange={(e) => { setEndTime(e.target.value); setHasUnsavedHours(true); }}
                  className="w-full px-3 py-2.5 rounded-xl border border-slate-200 text-sm text-navy
                           focus:outline-none focus:border-sage focus:ring-1 focus:ring-sage/20"
                />
              </div>
              <button
                onClick={saveWorkHours}
                disabled={!hasUnsavedHours}
                className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-medium transition-smooth
                  ${hasUnsavedHours
                    ? 'bg-sage text-white hover:bg-sage/90'
                    : 'bg-slate-100 text-navy/30 cursor-not-allowed'
                  }`}
              >
                <Save size={14} />
                Save
              </button>
            </div>
          </section>

          {/* ===== Holiday Weeks ===== */}
          <section className="bg-white rounded-2xl border border-slate-100 p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-terracotta/10 flex items-center justify-center">
                  <CalendarOff size={20} className="text-terracotta" />
                </div>
                <div>
                  <h3 className="font-serif text-lg font-bold text-navy">Holiday Weeks</h3>
                  <p className="text-xs text-navy/40">
                    Lessons are automatically pushed around holidays.
                    {totalHolidayWeeks > 0 && (
                      <span className="ml-1 font-medium text-terracotta">
                        {totalHolidayWeeks} week{totalHolidayWeeks !== 1 ? 's' : ''} scheduled
                      </span>
                    )}
                  </p>
                </div>
              </div>
              {!showAddHoliday && (
                <button
                  onClick={() => setShowAddHoliday(true)}
                  className="flex items-center gap-2 px-4 py-2 rounded-xl bg-terracotta text-white text-sm font-medium
                           hover:bg-terracotta/90 transition-smooth"
                >
                  <Plus size={14} />
                  Add Holiday
                </button>
              )}
            </div>

            {/* Add holiday form */}
            {showAddHoliday && (
              <div className="mb-4 p-4 rounded-xl bg-sand/50 border border-slate-200 space-y-3">
                <div>
                  <label className="text-xs font-semibold text-navy/40 uppercase tracking-wider block mb-1.5">
                    Holiday name
                  </label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={holidayName}
                      onChange={(e) => setHolidayName(e.target.value)}
                      placeholder="e.g. October Half Term"
                      className="flex-1 px-3 py-2 rounded-lg border border-slate-200 text-sm text-navy
                               placeholder:text-navy/20 focus:outline-none focus:border-sage"
                    />
                    <button
                      onClick={() => setShowPresets(!showPresets)}
                      className="px-3 py-2 rounded-lg border border-slate-200 text-xs font-medium text-navy/40
                               hover:bg-white hover:text-navy/60 transition-smooth"
                    >
                      Presets
                      {showPresets ? <ChevronUp size={12} className="inline ml-1" /> : <ChevronDown size={12} className="inline ml-1" />}
                    </button>
                  </div>
                  {showPresets && (
                    <div className="flex flex-wrap gap-1.5 mt-2">
                      {HOLIDAY_PRESETS.map(preset => (
                        <button
                          key={preset}
                          onClick={() => { setHolidayName(preset); setShowPresets(false); }}
                          className="px-2.5 py-1 rounded-full text-[11px] font-medium bg-white border border-slate-200
                                   text-navy/60 hover:border-sage hover:text-sage transition-smooth"
                        >
                          {preset}
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs font-semibold text-navy/40 uppercase tracking-wider block mb-1.5">
                      Start date
                    </label>
                    <input
                      type="date"
                      value={holidayStartDate}
                      onChange={(e) => setHolidayStartDate(e.target.value)}
                      className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm text-navy
                               focus:outline-none focus:border-sage"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-navy/40 uppercase tracking-wider block mb-1.5">
                      End date
                    </label>
                    <input
                      type="date"
                      value={holidayEndDate}
                      onChange={(e) => setHolidayEndDate(e.target.value)}
                      min={holidayStartDate || undefined}
                      className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm text-navy
                               focus:outline-none focus:border-sage"
                    />
                  </div>
                </div>

                {holidayStartDate && holidayEndDate && holidayEndDate >= holidayStartDate && (
                  <div className="text-xs text-navy/40 bg-white rounded-lg px-3 py-2 border border-slate-100">
                    {(() => {
                      const startD = new Date(holidayStartDate + 'T00:00:00');
                      const endD = new Date(holidayEndDate + 'T00:00:00');
                      // Count weekdays
                      let weekdays = 0;
                      const datesByWeek = {};
                      const cur = new Date(startD);
                      while (cur <= endD) {
                        const dow = cur.getDay();
                        if (dow >= 1 && dow <= 5) {
                          weekdays++;
                          const mon = getMonday(cur);
                          const monISO = formatDateISO(mon);
                          datesByWeek[monISO] = (datesByWeek[monISO] || 0) + 1;
                        }
                        cur.setDate(cur.getDate() + 1);
                      }
                      const fullWeeks = Object.values(datesByWeek).filter(c => c >= 5).length;
                      const partialDays = weekdays - (fullWeeks * 5);

                      if (fullWeeks > 0 && partialDays > 0) {
                        return (
                          <>
                            <span className="font-medium text-terracotta">{fullWeeks} full week{fullWeeks !== 1 ? 's' : ''}</span>
                            {' '}of lessons will be pushed forward, plus{' '}
                            <span className="font-medium text-terracotta">{partialDays} day{partialDays !== 1 ? 's' : ''}</span> off.
                          </>
                        );
                      } else if (fullWeeks > 0) {
                        return (
                          <>
                            <span className="font-medium text-terracotta">{fullWeeks} full week{fullWeeks !== 1 ? 's' : ''}</span>
                            {' '}of lessons will be pushed forward.
                          </>
                        );
                      } else {
                        return (
                          <>
                            <span className="font-medium text-terracotta">{partialDays} day{partialDays !== 1 ? 's' : ''}</span>
                            {' '}off (partial week — timetable rotation unaffected).
                          </>
                        );
                      }
                    })()}
                  </div>
                )}

                <div className="flex gap-2 pt-1">
                  <button
                    onClick={addHoliday}
                    disabled={!holidayName.trim() || !holidayStartDate || !holidayEndDate || holidayEndDate < holidayStartDate}
                    className="flex items-center gap-2 px-4 py-2 rounded-lg bg-terracotta text-white text-sm font-medium
                             hover:bg-terracotta/90 transition-smooth disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    <Plus size={14} />
                    Add Holiday
                  </button>
                  <button
                    onClick={() => { setShowAddHoliday(false); setHolidayName(''); setHolidayStartDate(''); setHolidayEndDate(''); }}
                    className="px-4 py-2 rounded-lg text-sm text-navy/40 hover:bg-sand transition-smooth"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}

            {/* Holiday list */}
            {holidays.length === 0 && !showAddHoliday ? (
              <div className="text-center py-8">
                <CalendarOff size={32} className="mx-auto mb-3 text-navy/15" />
                <p className="text-sm text-navy/30">No holidays scheduled</p>
                <p className="text-xs text-navy/20 mt-1">Add school holidays so lessons automatically shift around them.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {holidays.map((holiday) => {
                  const fullWeeks = (holiday.weekMondays || []).length;
                  const totalDays = (holiday.holidayDates || []).length;
                  const partialDays = totalDays - (fullWeeks * 5);
                  return (
                    <div key={holiday.id} className="border border-slate-100 rounded-xl overflow-hidden">
                      <div className="flex items-center justify-between px-4 py-3 bg-white">
                        <div className="flex items-center gap-3">
                          <div className="w-2 h-2 rounded-full bg-terracotta shrink-0" />
                          <div>
                            <p className="text-sm font-semibold text-navy">{holiday.name}</p>
                            <p className="text-xs text-navy/40">
                              {new Date(holiday.startDate + 'T00:00:00').toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
                              {' – '}
                              {new Date(holiday.endDate + 'T00:00:00').toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
                              <span className="ml-2 text-terracotta font-medium">
                                ({fullWeeks > 0
                                  ? `${fullWeeks} full week${fullWeeks !== 1 ? 's' : ''}${partialDays > 0 ? ` + ${partialDays} day${partialDays !== 1 ? 's' : ''}` : ''}`
                                  : `${totalDays} day${totalDays !== 1 ? 's' : ''}`
                                })
                              </span>
                            </p>
                          </div>
                        </div>
                        <button
                          onClick={() => removeHoliday(holiday.id)}
                          className="p-2 rounded-lg hover:bg-terracotta/10 text-navy/30 hover:text-terracotta transition-smooth"
                          title="Remove holiday"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </section>

          {/* Info note */}
          <div className="flex items-start gap-3 p-4 rounded-xl bg-sage/5 border border-sage/10">
            <AlertTriangle size={16} className="text-sage shrink-0 mt-0.5" />
            <p className="text-xs text-navy/50 leading-relaxed">
              When you add or remove holidays, lesson sequences automatically adjust.
              Lessons scheduled during holiday weeks are pushed to the next available teaching week.
              This works alongside the Push Back feature in Class View.
            </p>
          </div>

        </div>
      </div>
    </div>
  );
}