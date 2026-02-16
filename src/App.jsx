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
  updateLessonInSequence,
  addLessonToSequence,
  deleteLessonFromSequence,
  reorderClassSequence,
  getClassSchedule,
  setClassSchedule,
  getLessonForOccurrence,
  migrateFromLessonInstances,
  getTodos,
  setTodos,
} from './utils/storage';

// ===== App =====
// Root component. Manages:
// - Timetable data (imported JSON + class edits)
// - Lesson sequences (ordered lesson content per class, independent of dates)
// - Lesson schedules (maps timetable occurrences to sequence positions)
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

    // Attempt migration from old lessonInstances format
    if (savedTimetable) {
      migrateFromLessonInstances(savedTimetable, null);
    }

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

  // Update a lesson within a class's sequence
  const handleUpdateLesson = (classId, lessonId, updates) => {
    updateLessonInSequence(classId, lessonId, updates);
    setLessonSequencesState(getLessonSequences());
  };

  // Add a new lesson to a class's sequence
  const handleAddLesson = (classId, data) => {
    const newLesson = addLessonToSequence(classId, data);
    setLessonSequencesState(getLessonSequences());
    return newLesson;
  };

  // Delete a lesson from a class's sequence
  const handleDeleteLesson = (classId, lessonId) => {
    deleteLessonFromSequence(classId, lessonId);
    setLessonSequencesState(getLessonSequences());
    setLessonSchedulesState(getLessonSchedules());
  };

  // Reorder lessons within a class's sequence
  const handleReorderSequence = (classId, orderedIds) => {
    reorderClassSequence(classId, orderedIds);
    setLessonSequencesState(getLessonSequences());
  };

  // Update the schedule mapping for a class (e.g. push back)
  const handleUpdateSchedule = (classId, schedule) => {
    setClassSchedule(classId, schedule);
    setLessonSchedulesState(getLessonSchedules());
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
            onUpdateLesson={handleUpdateLesson}
            onAddLesson={handleAddLesson}
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
            onUpdateLesson={handleUpdateLesson}
            onAddLesson={handleAddLesson}
            onDeleteLesson={handleDeleteLesson}
            onReorderSequence={handleReorderSequence}
            onUpdateSchedule={handleUpdateSchedule}
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