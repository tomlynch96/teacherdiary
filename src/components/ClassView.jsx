import React, { useState, useMemo } from 'react';
import { BookOpen, Users, StickyNote, Plus, GripVertical, Trash2, Calendar, ArrowRight } from 'lucide-react';
import { getClassColor, generateTimetableOccurrences } from '../utils/timetable';
import { formatDateLong } from '../utils/dateHelpers';
import {
  getClassLessonSequence,
  addLessonToSequence,
  deleteLessonFromSequence,
  reorderLessonSequence,
  getClassSchedule,
} from '../utils/storage';

export default function ClassView({ 
  timetableData, 
  lessonSequence, 
  onUpdateClass, 
  onUpdateLesson,
  settings 
}) {
  const [selectedClass, setSelectedClass] = useState(null);
  const [editingLesson, setEditingLesson] = useState(null);
  const [draggedLesson, setDraggedLesson] = useState(null);

  const classes = timetableData?.classes || [];
  const selectedClassData = selectedClass 
    ? classes.find(c => c.id === selectedClass)
    : null;

  const classSequence = useMemo(() => {
    if (!selectedClass) return [];
    return getClassLessonSequence(selectedClass).sort((a, b) => a.order - b.order);
  }, [selectedClass, lessonSequence]);

  const occurrences = useMemo(() => {
    if (!selectedClass) return [];
    return generateTimetableOccurrences(selectedClass, timetableData, 26, settings);
  }, [selectedClass, timetableData, settings]);

  const getScheduledDateForLesson = (lessonOrder) => {
    if (!selectedClass) return null;
    const schedule = getClassSchedule(selectedClass);
    const occNum = Object.keys(schedule.schedule).find(
      key => schedule.schedule[key] === lessonOrder
    );
    if (occNum !== undefined) {
      const occurrence = occurrences[parseInt(occNum)];
      return occurrence ? occurrence.dateISO : null;
    }
    return null;
  };

  const handleAddLesson = () => {
    if (!selectedClass) return;
    
    const newLesson = addLessonToSequence(selectedClass, {
      title: '',
      notes: '',
      links: [],
    });
    
    setEditingLesson(newLesson);
  };

  const handleDeleteLesson = (lessonId) => {
    if (!selectedClass) return;
    if (window.confirm('Delete this lesson? This cannot be undone.')) {
      deleteLessonFromSequence(selectedClass, lessonId);
      if (editingLesson?.id === lessonId) {
        setEditingLesson(null);
      }
    }
  };

  const handleDragStart = (e, lesson) => {
    setDraggedLesson(lesson);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  };

  const handleDrop = (e, targetLesson) => {
    e.preventDefault();
    if (!draggedLesson || !targetLesson || draggedLesson.id === targetLesson.id) {
      return;
    }

    reorderLessonSequence(selectedClass, draggedLesson.id, targetLesson.order);
    setDraggedLesson(null);
  };

  const handleUpdateLessonField = (lessonId, field, value) => {
    onUpdateLesson(selectedClass, lessonId, { [field]: value });
  };

  return (
    <div className="flex-1 flex min-h-0">
      {/* Class List */}
      <div className="w-80 shrink-0 bg-white border-r border-slate-200 flex flex-col">
        <div className="p-6 border-b border-slate-200">
          <h2 className="font-serif text-2xl font-bold text-navy">Classes</h2>
          <p className="text-sm text-navy/50 mt-1">{classes.length} classes</p>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-2">
          {classes.map((cls) => {
            const accent = getClassColor(cls.id, classes);
            const isSelected = selectedClass === cls.id;
            const lessonCount = (lessonSequence[cls.id] || []).length;

            return (
              <button
                key={cls.id}
                onClick={() => setSelectedClass(cls.id)}
                className={`
                  w-full text-left p-4 rounded-2xl transition-smooth
                  ${isSelected
                    ? 'bg-sand ring-2 ring-sage/30'
                    : 'bg-slate-50 hover:bg-sand'
                  }
                `}>
                <div className="flex items-start gap-3">
                  <div
                    className="w-1 h-12 rounded-full shrink-0"
                    style={{ backgroundColor: accent }}
                  />
                  <div className="flex-1 min-w-0">
                    <h3 className="font-serif font-bold text-navy truncate">
                      {cls.name}
                    </h3>
                    <p className="text-sm text-navy/50 truncate">{cls.subject}</p>
                    <div className="flex items-center gap-3 mt-2 text-xs text-navy/40">
                      <span className="flex items-center gap-1">
                        <Users size={12} />
                        {cls.classSize || 0}
                      </span>
                      <span className="flex items-center gap-1">
                        <BookOpen size={12} />
                        {lessonCount} lesson{lessonCount !== 1 ? 's' : ''}
                      </span>
                    </div>
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Class Detail / Lesson Sequence */}
      {selectedClassData ? (
        <div className="flex-1 flex flex-col min-h-0">
          <div className="shrink-0 bg-white border-b border-slate-200 px-8 py-6">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="font-serif text-3xl font-bold text-navy">
                  {selectedClassData.name}
                </h1>
                <p className="text-navy/50 mt-1">{selectedClassData.subject}</p>
              </div>
              
              <button
                onClick={handleAddLesson}
                className="flex items-center gap-2 px-4 py-2 bg-sage text-white rounded-xl hover:bg-[#6d9a80] transition-smooth font-medium">
                <Plus size={18} />
                Add Lesson
              </button>
            </div>

            <div className="flex items-center gap-6 mt-4 pt-4 border-t border-slate-100">
              <div>
                <label className="block text-xs font-semibold text-navy/40 uppercase tracking-wide mb-1">
                  Class Size
                </label>
                <input
                  type="number"
                  value={selectedClassData.classSize || ''}
                  onChange={(e) => onUpdateClass(selectedClass, { classSize: parseInt(e.target.value) || 0 })}
                  className="w-20 px-3 py-1.5 rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-sage/30 text-navy"
                />
              </div>

              <div className="flex-1">
                <label className="block text-xs font-semibold text-navy/40 uppercase tracking-wide mb-1">
                  Class Notes
                </label>
                <input
                  type="text"
                  value={selectedClassData.notes || ''}
                  onChange={(e) => onUpdateClass(selectedClass, { notes: e.target.value })}
                  placeholder="General notes about this class..."
                  className="w-full px-3 py-1.5 rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-sage/30 text-navy placeholder:text-navy/30"
                />
              </div>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto bg-cream p-8">
            {classSequence.length === 0 ? (
              <div className="h-full flex items-center justify-center">
                <div className="text-center">
                  <BookOpen size={48} className="mx-auto text-navy/20 mb-3" />
                  <p className="text-navy/40 font-medium">No lessons planned yet</p>
                  <p className="text-sm text-navy/30 mt-1">Click "Add Lesson" to get started</p>
                </div>
              </div>
            ) : (
              <div className="max-w-4xl mx-auto space-y-3">
                <p className="text-sm text-navy/40 mb-4">
                  Drag to reorder lessons. Lessons are taught in order from top to bottom.
                </p>

                {classSequence.map((lesson, index) => {
                  const isEditing = editingLesson?.id === lesson.id;
                  const scheduledDate = getScheduledDateForLesson(lesson.order);
                  const isNext = index === 0;

                  return (
                    <div
                      key={lesson.id}
                      draggable
                      onDragStart={(e) => handleDragStart(e, lesson)}
                      onDragOver={handleDragOver}
                      onDrop={(e) => handleDrop(e, lesson)}
                      className={`
                        bg-white rounded-2xl p-6 transition-smooth cursor-move
                        ${isEditing ? 'ring-2 ring-sage/30' : 'hover:shadow-md'}
                        ${draggedLesson?.id === lesson.id ? 'opacity-50' : ''}
                      `}>
                      <div className="flex items-start gap-4">
                        <div className="shrink-0 pt-1">
                          <GripVertical size={20} className="text-navy/20" />
                        </div>

                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-3 mb-3">
                            <span className={`
                              px-2 py-1 rounded-lg text-xs font-bold
                              ${isNext 
                                ? 'bg-sage/20 text-sage' 
                                : 'bg-slate-100 text-navy/40'
                              }
                            `}>
                              {isNext ? 'NEXT' : `#${index + 1}`}
                            </span>

                            {scheduledDate && (
                              <span className="flex items-center gap-1.5 text-xs text-navy/40">
                                <Calendar size={12} />
                                <ArrowRight size={12} />
                                {formatDateLong(new Date(scheduledDate))}
                              </span>
                            )}
                          </div>

                          <input
                            type="text"
                            value={lesson.title || ''}
                            onChange={(e) => handleUpdateLessonField(lesson.id, 'title', e.target.value)}
                            onFocus={() => setEditingLesson(lesson)}
                            placeholder="Lesson title..."
                            className="w-full font-serif text-xl font-bold text-navy placeholder:text-navy/30 bg-transparent border-none outline-none focus:outline-none mb-2"
                          />

                          <textarea
                            value={lesson.notes || ''}
                            onChange={(e) => handleUpdateLessonField(lesson.id, 'notes', e.target.value)}
                            onFocus={() => setEditingLesson(lesson)}
                            placeholder="Lesson notes..."
                            rows={3}
                            className="w-full text-sm text-navy/70 placeholder:text-navy/30 bg-transparent border-none outline-none focus:outline-none resize-none"
                          />

                          {lesson.links && lesson.links.length > 0 && (
                            <div className="mt-3 space-y-1">
                              {lesson.links.map((link, i) => (
                                <a
                                  key={i}
                                  href={link.url}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="text-sm text-sage hover:underline block truncate">
                                  {link.label || link.url}
                                </a>
                              ))}
                            </div>
                          )}
                        </div>

                        <button
                          onClick={() => handleDeleteLesson(lesson.id)}
                          className="shrink-0 p-2 text-terracotta/40 hover:text-terracotta hover:bg-terracotta/10 rounded-lg transition-smooth">
                          <Trash2 size={18} />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      ) : (
        <div className="flex-1 flex items-center justify-center bg-cream">
          <div className="text-center">
            <BookOpen size={64} className="mx-auto text-navy/20 mb-4" />
            <p className="text-navy/40 font-medium text-lg">Select a class to view lessons</p>
          </div>
        </div>
      )}
    </div>
  );
}