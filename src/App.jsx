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
  getLessonSequences,
  setLessonSequences,
  getLessonSchedules,
  setLessonSchedules,
  getTodos,
  setTodos,
} from './utils/storage';

// ===== App =====
// Root component. Manages:
// - Timetable data (imported JSON + class edits)
// - Lesson sequences (what lessons exist, in order, per class)
// - Lesson schedules (which lesson is on which date)
// - To-do list (tasks with scheduling)
// - Current navigation view

export default function App() {
  const [timetable, setTimetable] = useState(null);
  const [lessonSequences, setLessonSequencesState] = useState({});
  const [lessonSchedules, setLessonSchedulesState] = useState({});
  const [todos, setTodosState] = useState([]);
  const [currentView, setCurrentView] = useState('week');
  const [loading, setLoading] = useState(true);

  // On mount, load persisted data
  useEffect(() => {
    const savedTimetable = getTimetableData();
    if (savedTimetable) setTimetable(savedTimetable);
    
    const savedSequences = getLessonSequences();
    if (savedSequences) setLessonSequencesState(savedSequences);
    
    const savedSchedules = getLessonSchedules();
    if (savedSchedules) setLessonSchedulesState(savedSchedules);
    
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
      setLessonSequencesState({});
      setLessonSchedulesState({});
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

  // Update lesson sequences
  const handleUpdateSequences = (newSequences) => {
    setLessonSequencesState(newSequences);
    setLessonSequences(newSequences);
  };

  // Update lesson schedules
  const handleUpdateSchedules = (newSchedules) => {
    setLessonSchedulesState(newSchedules);
    setLessonSchedules(newSchedules);
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
            lessonSequences={lessonSequences}
            lessonSchedules={lessonSchedules}
            onUpdateSequences={handleUpdateSequences}
            onUpdateSchedules={handleUpdateSchedules}
            onClearData={handleClearData}
            todos={todos}
            onUpdateTodos={handleUpdateTodos}
          />
        ) : currentView === 'class' ? (
          <ClassView
            timetableData={timetable}
            lessonSequences={lessonSequences}
            lessonSchedules={lessonSchedules}
            onUpdateClass={handleUpdateClass}
            onUpdateSequences={handleUpdateSequences}
            onUpdateSchedules={handleUpdateSchedules}
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