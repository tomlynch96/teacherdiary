import React, { useState, useEffect } from 'react';
import Sidebar from './components/Sidebar';
import WeekView from './components/WeekView';
import ClassView from './components/ClassView';
import ToDoView from './components/ToDoView';
import FileImport from './components/FileImport';
import {
  getTimetableData,
  setTimetableData,
  clearTimetableData,
  getLessonInstances,
  setLessonInstances,
  getTodos,
  setTodos,
} from './utils/storage';

// ===== App =====
// Root component. Manages:
// - Timetable data (imported JSON + class edits)
// - Lesson instances (per-lesson titles, notes, links keyed by "classId::date")
// - To-do list (tasks with scheduling)
// - Current navigation view

export default function App() {
  const [timetable, setTimetable] = useState(null);
  const [lessonInstances, setLessonInstancesState] = useState({});
  const [todos, setTodosState] = useState([]);
  const [currentView, setCurrentView] = useState('week');
  const [loading, setLoading] = useState(true);

  // On mount, load persisted data
  useEffect(() => {
    const savedTimetable = getTimetableData();
    if (savedTimetable) setTimetable(savedTimetable);
    
    const savedInstances = getLessonInstances();
    if (savedInstances) setLessonInstancesState(savedInstances);
    
    const savedTodos = getTodos();
    if (savedTodos) setTodosState(savedTodos);
    
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

  // Update todos
  const handleUpdateTodos = (newTodos) => {
    setTodosState(newTodos);
    setTodos(newTodos);
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
        ) : currentView === 'todos' ? (
          <ToDoView
            timetableData={timetable}
            todos={todos}
            onUpdateTodos={handleUpdateTodos}
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