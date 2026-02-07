import React, { useState, useEffect } from 'react';
import Sidebar from './components/Sidebar';
import WeekView from './components/WeekView';
import FileImport from './components/FileImport';
import {
  getTimetableData,
  setTimetableData,
  clearTimetableData,
  hasData,
} from './utils/storage';

// ===== App =====
// Root component. Manages:
// - Whether timetable data is loaded (shows import vs. main view)
// - Current navigation view
// - Top-level state that children share

export default function App() {
  const [timetable, setTimetable] = useState(null);
  const [currentView, setCurrentView] = useState('week');
  const [loading, setLoading] = useState(true);

  // On mount, check if we already have data in localStorage
  useEffect(() => {
    const saved = getTimetableData();
    if (saved) {
      setTimetable(saved);
    }
    setLoading(false);
  }, []);

  // Handle successful JSON import
  const handleImport = (data) => {
    setTimetableData(data);
    setTimetable(data);
  };

  // Handle data reset (back to import screen)
  const handleClearData = () => {
    if (window.confirm('Clear your timetable data? You can re-import it anytime.')) {
      clearTimetableData();
      setTimetable(null);
      setCurrentView('week');
    }
  };

  // Don't flash content while checking localStorage
  if (loading) {
    return (
      <div className="h-screen flex items-center justify-center bg-cream">
        <div className="w-8 h-8 border-3 border-sage/30 border-t-sage rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="h-screen flex overflow-hidden bg-cream">
      {/* Sidebar is always visible */}
      <Sidebar
        currentView={currentView}
        onNavigate={setCurrentView}
        teacherName={timetable?.teacher?.name}
      />

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col min-h-0 min-w-0">
        {!timetable ? (
          // No data yet → show the import screen
          <FileImport onImport={handleImport} />
        ) : currentView === 'week' ? (
          // Week view (Phase 1 primary view)
          <WeekView
            timetableData={timetable}
            onClearData={handleClearData}
          />
        ) : (
          // Placeholder for future views
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center">
              <p className="font-serif text-2xl font-bold text-navy/20 mb-2">
                {currentView.charAt(0).toUpperCase() + currentView.slice(1)} View
              </p>
              <p className="text-navy/30 text-sm">Coming in a future update</p>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
