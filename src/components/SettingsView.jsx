import React, { useState } from 'react';
import { Clock, Calendar, Save, RotateCcw } from 'lucide-react';

export default function SettingsView({ settings, onUpdateSettings }) {
  const [localSettings, setLocalSettings] = useState(settings);
  const [hasChanges, setHasChanges] = useState(false);

  const handleChange = (key, value) => {
    setLocalSettings(prev => ({ ...prev, [key]: value }));
    setHasChanges(true);
  };

  const handleSave = () => {
    onUpdateSettings(localSettings);
    setHasChanges(false);
  };

  const handleReset = () => {
    const defaults = {
      workdayStart: '09:00',
      workdayEnd: '16:00',
      holidayWeeks: []
    };
    setLocalSettings(defaults);
    setHasChanges(true);
  };

  const toggleHolidayWeek = (weekStart) => {
    const current = localSettings.holidayWeeks || [];
    const updated = current.includes(weekStart)
      ? current.filter(w => w !== weekStart)
      : [...current, weekStart];
    handleChange('holidayWeeks', updated);
  };

  // Generate next 12 weeks for holiday selection
  const generateWeekOptions = () => {
    const weeks = [];
    const today = new Date();
    const currentMonday = new Date(today);
    currentMonday.setDate(today.getDate() - today.getDay() + 1);

    for (let i = 0; i < 52; i++) {
      const weekDate = new Date(currentMonday);
      weekDate.setDate(currentMonday.getDate() + (i * 7));
      weeks.push({
        start: weekDate.toISOString().split('T')[0],
        label: formatWeekLabel(weekDate)
      });
    }
    return weeks;
  };

  const formatWeekLabel = (date) => {
    const endDate = new Date(date);
    endDate.setDate(date.getDate() + 4); // Friday
    const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    return `${date.getDate()} ${monthNames[date.getMonth()]} - ${endDate.getDate()} ${monthNames[endDate.getMonth()]} ${date.getFullYear()}`;
  };

  const weekOptions = generateWeekOptions();
  const holidayWeeks = localSettings.holidayWeeks || [];

  return (
    <div className="flex-1 bg-cream overflow-auto">
      <div className="max-w-4xl mx-auto p-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="font-serif text-3xl font-bold text-navy mb-2">Settings</h1>
          <p className="text-navy/50">Customize your planner preferences</p>
        </div>

        {/* Working Hours Section */}
        <div className="bg-white rounded-2xl p-6 mb-6 border border-slate-100">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 rounded-xl bg-sage/10 flex items-center justify-center">
              <Clock size={20} className="text-sage" />
            </div>
            <div>
              <h2 className="font-serif text-xl font-bold text-navy">Working Hours</h2>
              <p className="text-sm text-navy/40">Set the visible time range on your calendar</p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-semibold text-navy/40 uppercase tracking-wider block mb-2">
                Start Time
              </label>
              <input
                type="time"
                value={localSettings.workdayStart || '09:00'}
                onChange={(e) => handleChange('workdayStart', e.target.value)}
                className="w-full px-4 py-3 rounded-xl border border-slate-200 text-navy
                           focus:outline-none focus:border-sage focus:ring-2 focus:ring-sage/20
                           transition-smooth"
              />
            </div>
            <div>
              <label className="text-xs font-semibold text-navy/40 uppercase tracking-wider block mb-2">
                End Time
              </label>
              <input
                type="time"
                value={localSettings.workdayEnd || '16:00'}
                onChange={(e) => handleChange('workdayEnd', e.target.value)}
                className="w-full px-4 py-3 rounded-xl border border-slate-200 text-navy
                           focus:outline-none focus:border-sage focus:ring-2 focus:ring-sage/20
                           transition-smooth"
              />
            </div>
          </div>

          <p className="text-xs text-navy/30 mt-3">
            These times define the visible range on your weekly calendar view
          </p>
        </div>

        {/* Holiday Weeks Section */}
        <div className="bg-white rounded-2xl p-6 mb-6 border border-slate-100">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 rounded-xl bg-terracotta/10 flex items-center justify-center">
              <Calendar size={20} className="text-terracotta" />
            </div>
            <div>
              <h2 className="font-serif text-xl font-bold text-navy">Holiday Weeks</h2>
              <p className="text-sm text-navy/40">Mark weeks when school is closed</p>
            </div>
          </div>

          <div className="space-y-2 max-h-96 overflow-y-auto">
            {weekOptions.map((week) => {
              const isSelected = holidayWeeks.includes(week.start);
              return (
                <button
                  key={week.start}
                  onClick={() => toggleHolidayWeek(week.start)}
                  className={`
                    w-full flex items-center gap-3 px-4 py-3 rounded-xl text-left
                    transition-smooth border
                    ${isSelected
                      ? 'bg-terracotta/5 border-terracotta/30 text-navy'
                      : 'bg-white border-slate-100 text-navy/60 hover:bg-sand'
                    }
                  `}
                >
                  <div className={`
                    w-5 h-5 rounded border-2 flex items-center justify-center shrink-0
                    ${isSelected ? 'bg-terracotta border-terracotta' : 'border-slate-300'}
                  `}>
                    {isSelected && (
                      <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                      </svg>
                    )}
                  </div>
                  <span className="text-sm font-medium">{week.label}</span>
                </button>
              );
            })}
          </div>

          {holidayWeeks.length > 0 && (
            <p className="text-xs text-navy/30 mt-4">
              {holidayWeeks.length} week{holidayWeeks.length !== 1 ? 's' : ''} marked as holiday
            </p>
          )}
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-3">
          <button
            onClick={handleSave}
            disabled={!hasChanges}
            className={`
              flex items-center gap-2 px-6 py-3 rounded-full font-medium
              transition-smooth
              ${hasChanges
                ? 'bg-sage text-white hover:bg-sage/90'
                : 'bg-slate-100 text-navy/25 cursor-not-allowed'
              }
            `}
          >
            <Save size={16} />
            Save Changes
          </button>

          <button
            onClick={handleReset}
            className="flex items-center gap-2 px-6 py-3 rounded-full font-medium
                       text-navy/60 hover:bg-sand transition-smooth"
          >
            <RotateCcw size={16} />
            Reset to Defaults
          </button>
        </div>

        {hasChanges && (
          <p className="text-sm text-terracotta mt-4">
            You have unsaved changes
          </p>
        )}
      </div>
    </div>
  );
}