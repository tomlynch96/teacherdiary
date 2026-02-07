import React, { useState, useEffect } from 'react';
import Sidebar from './components/Sidebar';
import WeekView from './components/WeekView';
import ClassView from './components/ClassView';
import FileImport from './components/FileImport';
import {
  getTimetableData,
  setTimetableData,
  clearTimetableData,
  getLessonInstances,
  setLessonInstances,
} from './utils/storage';

// ===== App =====
// Root component. Manages:
// - Timetable data (imported JSON + class edits)
// - Lesson instances (per-lesson titles, notes, links keyed by "classId::date")
// - Current navigation view

export default function App() {
  const [timetable, setTimetable] = useState(null);
  const [lessonInstances, setLessonInstancesState] = useState({});
  const [currentView, setCurrentView] = useState('week');
  const [loading, setLoading] = useState(true);

  // On mount, load persisted data
  useEffect(() => {
    const savedTimetable = getTimetableData();
    if (savedTimetable) setTimetable(savedTimetable);
    const savedInstances = getLessonInstances();
    if (savedInstances) setLessonInstancesState(savedInstances);
    setLoading(false);
  }, []);

  const handleImport = (data) => {
    setTimetableData(data);
    setTimetable(data);
  };

  const handleClearData = () => {
    if (window.confirm('Clear your timetable data? You can re-import it anytime.')) {
      clearTimetableData();
      setTimetable(null);
      setLessonInstancesState({});
      setCurrentView('week');
    }
  };

  // Update a class's editable fields (classSize, notes, etc.)
  const handleUpdateClass = (classId, updates) => {
    setTimetable((prev) => {
      const updated = {
        ...prev,
        classes: prev.classes.map((cls) =>
          cls.id === classId ? { ...cls, ...updates } : cls
        ),
      };
      setTimetableData(updated);
      return updated;
    });
  };

  // Update a lesson instance (title, notes, links for a specific class+date)
  const handleUpdateInstance = (key, data) => {
    setLessonInstancesState((prev) => {
      const updated = { ...prev, [key]: data };
      setLessonInstances(updated);
      return updated;
    });
  };

  if (loading) {
    return (
      <div className="h-screen flex items-center justify-center bg-cream">
        <div className="w-8 h-8 border-3 border-sage/30 border-t-sage rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="h-screen flex overflow-hidden bg-cream">
      <Sidebar
        currentView={currentView}
        onNavigate={setCurrentView}
        teacherName={timetable?.teacher?.name}
      />

      <main className="flex-1 flex flex-col min-h-0 min-w-0">
        {!timetable ? (
          <FileImport onImport={handleImport} />
        ) : currentView === 'week' ? (
          <WeekView
            timetableData={timetable}
            lessonInstances={lessonInstances}
            onUpdateInstance={handleUpdateInstance}
            onClearData={handleClearData}
          />
        ) : currentView === 'class' ? (
          <ClassView
            timetableData={timetable}
            lessonInstances={lessonInstances}
            onUpdateClass={handleUpdateClass}
            onUpdateInstance={handleUpdateInstance}
          />
        ) : (
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