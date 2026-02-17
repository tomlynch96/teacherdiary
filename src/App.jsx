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
  getSettings,
  setSettings,
  copyTopicToClass,
  renameTopic,
  removeTopic,
  unlinkLesson,
} from './utils/storage';

// ===== App =====
// Root component. Manages:
// - Timetable data (imported JSON + class edits)
// - Lesson sequences (ordered lesson content per class, independent of dates)
// - Lesson schedules (maps timetable occurrences to sequence positions)
// - To-do list (tasks with scheduling)
// - Settings (work hours, holidays)
// - Current navigation view

export default function App() {
  const [timetable, setTimetable] = useState(null);
  const [lessonSequences, setLessonSequencesState] = useState({});
  const [lessonSchedules, setLessonSchedulesState] = useState({});
  const [todos, setTodosState] = useState([]);
  const [settings, setSettingsState] = useState(getSettings());
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

    setSettingsState(getSettings());

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

  // Update settings
  const handleUpdateSettings = (newSettings) => {
    setSettingsState(newSettings);
    setSettings(newSettings);
  };

  // Copy a topic from one class to another (linked or independent)
  const handleCopyTopic = (sourceClassId, topicId, targetClassId, linked) => {
    copyTopicToClass(sourceClassId, topicId, targetClassId, linked);
    setLessonSequencesState(getLessonSequences());
  };

  // Rename a topic across all lessons in a class
  const handleRenameTopic = (classId, topicId, newName) => {
    renameTopic(classId, topicId, newName);
    setLessonSequencesState(getLessonSequences());
  };

  // Remove topic grouping (lessons remain, just ungrouped)
  const handleRemoveTopic = (classId, topicId) => {
    removeTopic(classId, topicId);
    setLessonSequencesState(getLessonSequences());
  };

  // Unlink a lesson from its source
  const handleUnlinkLesson = (classId, lessonId) => {
    unlinkLesson(classId, lessonId);
    setLessonSequencesState(getLessonSequences());
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
            settings={settings}
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
            onCopyTopic={handleCopyTopic}
            onRenameTopic={handleRenameTopic}
            onRemoveTopic={handleRemoveTopic}
            onUnlinkLesson={handleUnlinkLesson}
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
            timetableData={timetable}
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