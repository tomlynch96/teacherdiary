import React, { useState, useEffect } from 'react';
import Sidebar from './components/Sidebar';
import WeekView from './components/WeekView';
import ClassView from './components/ClassView';
import ToDoView from './components/ToDoView';
import SettingsView from './components/SettingsView';
import FileImport from './components/FileImport';
import {
  getTimetableData,
  setTimetableData,
  clearTimetableData,
  getLessonSequence,
  updateLessonInSequence,
  getTodos,
  setTodos,
  getSettings,
  setSettings,
} from './utils/storage';

// ===== App =====
// Root component. Manages:
// - Timetable data (imported JSON + class edits)
// - Lesson sequence (ordered list of lesson content per class)
// - To-do list (tasks with scheduling)
// - Settings (workday hours, holiday weeks)
// - Current navigation view

export default function App() {
  const [timetable, setTimetable] = useState(null);
  const [lessonSequence, setLessonSequenceState] = useState({});
  const [todos, setTodosState] = useState([]);
  const [settings, setSettingsState] = useState({
    workdayStart: '09:00',
    workdayEnd: '16:00',
    holidayWeeks: []
  });
  const [currentView, setCurrentView] = useState('week');
  const [loading, setLoading] = useState(true);

  // On mount, load persisted data
  useEffect(() => {
    const savedTimetable = getTimetableData();
    if (savedTimetable) setTimetable(savedTimetable);
    
    const savedSequence = getLessonSequence();
    if (savedSequence) setLessonSequenceState(savedSequence);
    
    const savedTodos = getTodos();
    if (savedTodos) setTodosState(savedTodos);
    
    const savedSettings = getSettings();
    if (savedSettings) setSettingsState(savedSettings);
    
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
      setLessonSequenceState({});
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

  // Update a lesson in the sequence
  const handleUpdateLesson = (classId, lessonId, updates) => {
    updateLessonInSequence(classId, lessonId, updates);
    const updated = getLessonSequence();
    setLessonSequenceState(updated);
  };

  // Update todos
  const handleUpdateTodos = (newTodos) => {
    setTodosState(newTodos);
    setTodos(newTodos);
  };

  // Update settings
  const handleUpdateSettings = (newSettings) => {
    setSettingsState(newSettings);
    setSettings(newSettings);
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
            lessonSequence={lessonSequence}
            onUpdateLesson={handleUpdateLesson}
            onClearData={handleClearData}
            todos={todos}
            onUpdateTodos={handleUpdateTodos}
            settings={settings}
          />
        ) : currentView === 'class' ? (
          <ClassView
            timetableData={timetable}
            lessonSequence={lessonSequence}
            onUpdateClass={handleUpdateClass}
            onUpdateLesson={handleUpdateLesson}
            settings={settings}
          />
        ) : currentView === 'todos' ? (
          <ToDoView
            timetableData={timetable}
            todos={todos}
            onUpdateTodos={handleUpdateTodos}
          />
        ) : currentView === 'settings' ? (
          <SettingsView
            settings={settings}
            onUpdateSettings={handleUpdateSettings}
          />
        ) : (
          <div className="flex-1 flex items-center justify-center">
            <p className="text-navy/40">Coming soon...</p>
          </div>
        )}
      </main>
    </div>
  );
}