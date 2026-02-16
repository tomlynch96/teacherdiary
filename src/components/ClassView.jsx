import React, { useState, useMemo } from 'react';
import {
  Users,
  Clock,
  MapPin,
  ChevronRight,
  Save,
  X,
  Pencil,
  BookOpen,
  CalendarRange,
  Link2,
  Plus,
  Trash2,
  ExternalLink,
  StickyNote,
  ChevronDown,
  List,
  GripVertical,
} from 'lucide-react';
import { getClassColor, generateFutureLessons } from '../utils/timetable';
import { formatTime, formatDateISO, MONTH_NAMES_SHORT, DAY_NAMES_SHORT } from '../utils/dateHelpers';
import {
  getClassSequence,
  updateClassSequence,
  addLessonToSequence,
  updateLessonInSequence,
  deleteLessonFromSequence,
  reorderLessonSequence,
  scheduleLesson,
  unscheduleLesson,
  getScheduledLessonForDate,
} from '../utils/storage';
import { 
  getScheduledLessons, 
  getUnscheduledLessons,
  autoScheduleNext,
  getSequenceProgress,
} from '../utils/lessonSequence';

// ===== ClassView =====
// Left panel: class list. Right panel: class info + lesson sequence management.
// Now uses the new lesson sequence architecture

// --- Helpers ---

function countLessonsPerFortnight(classId, timetableData) {
  if (!timetableData?.recurringLessons) return 0;
  return timetableData.recurringLessons.filter((rl) => rl.classId === classId).length;
}

function getClassRooms(classId, timetableData) {
  if (!timetableData?.recurringLessons) return [];
  const rooms = new Set();
  timetableData.recurringLessons
    .filter((rl) => rl.classId === classId && rl.room)
    .forEach((rl) => rooms.add(rl.room));
  return [...rooms];
}

function getClassSchedule(classId, timetableData) {
  if (!timetableData?.recurringLessons) return [];
  const dayNames = ['', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];
  const lessons = timetableData.recurringLessons
    .filter((rl) => rl.classId === classId)
    .sort((a, b) => {
      if (a.weekNumber !== b.weekNumber) return a.weekNumber - b.weekNumber;
      if (a.dayOfWeek !== b.dayOfWeek) return a.dayOfWeek - b.dayOfWeek;
      return a.startTime.localeCompare(b.startTime);
    });
  const merged = [];
  let current = null;
  for (const lesson of lessons) {
    if (current && current.weekNumber === lesson.weekNumber && current.dayOfWeek === lesson.dayOfWeek && current.endTime === lesson.startTime) {
      current = { ...current, endTime: lesson.endTime, period: `${current.period.split('–')[0]}–${lesson.period}` };
    } else {
      if (current) merged.push(current);
      current = { ...lesson };
    }
  }
  if (current) merged.push(current);
  return merged.map((m) => ({ ...m, dayName: dayNames[m.dayOfWeek] || '' }));
}

/** Format date as "Mon 9 Feb" */
function formatShortDate(date) {
  return `${DAY_NAMES_SHORT[date.getDay()]} ${date.getDate()} ${MONTH_NAMES_SHORT[date.getMonth()]}`;
}

// --- Lesson Sequence Row ---
function LessonSequenceRow({ 
  lesson, 
  classId,
  index, 
  accent, 
  onUpdate, 
  onDelete,
  onMoveUp,
  onMoveDown,
  canMoveUp,
  canMoveDown,
  scheduledDate,
}) {
  const [isEditing, setIsEditing] = useState(false);
  const [title, setTitle] = useState(lesson.title || '');
  const [notes, setNotes] = useState(lesson.notes || '');
  const [links, setLinks] = useState(lesson.links || []);
  const [showAddLink, setShowAddLink] = useState(false);
  const [newLinkUrl, setNewLinkUrl] = useState('');
  const [newLinkLabel, setNewLinkLabel] = useState('');
  const [expanded, setExpanded] = useState(false);

  React.useEffect(() => {
    setTitle(lesson.title || '');
    setNotes(lesson.notes || '');
    setLinks(lesson.links || []);
  }, [lesson]);

  const save = (updates) => {
    onUpdate(lesson.id, { ...lesson, ...updates });
  };

  const addLink = () => {
    if (!newLinkUrl.trim()) return;
    const updated = [...links, { url: newLinkUrl.trim(), label: newLinkLabel.trim() || newLinkUrl.trim() }];
    setLinks(updated);
    save({ links: updated });
    setNewLinkUrl('');
    setNewLinkLabel('');
    setShowAddLink(false);
  };

  const removeLink = (linkIndex) => {
    const updated = links.filter((_, i) => i !== linkIndex);
    setLinks(updated);
    save({ links: updated });
  };

  const hasContent = title || notes || links.length > 0;

  return (
    <div className="border border-slate-100 rounded-2xl bg-white overflow-hidden transition-smooth hover:border-slate-200">
      {/* Collapsed row — always visible */}
      <div
        className="flex items-center gap-3 px-4 py-3 cursor-pointer select-none"
        onClick={() => setExpanded(!expanded)}
      >
        {/* Drag handle and sequence number */}
        <div className="flex items-center gap-2 shrink-0">
          <GripVertical size={16} className="text-navy/20" />
          <div className="w-8 h-8 rounded-lg flex items-center justify-center text-xs font-bold"
            style={{ backgroundColor: `${accent}18`, color: accent }}>
            {index + 1}
          </div>
        </div>

        {/* Title preview or placeholder */}
        <span className={`flex-1 text-sm truncate ${title ? 'text-navy font-medium' : 'text-navy/30 italic'}`}>
          {title || 'Untitled lesson'}
        </span>

        {/* Scheduled date badge */}
        {scheduledDate && (
          <span className="text-xs px-2 py-1 rounded-full bg-sage/10 text-sage shrink-0">
            {formatShortDate(new Date(scheduledDate))}
          </span>
        )}

        {/* Content indicator dot */}
        {hasContent && (
          <div className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: accent }} />
        )}

        {/* Expand chevron */}
        <ChevronDown 
          size={16} 
          className={`text-navy/30 transition-transform shrink-0 ${expanded ? 'rotate-180' : ''}`} 
        />
      </div>

      {/* Expanded content */}
      {expanded && (
        <div className="px-4 pb-4 space-y-3 border-t border-slate-100">
          {/* Title input */}
          <div>
            <label className="text-xs font-semibold text-navy/40 uppercase tracking-wider block mb-1.5">
              Lesson Title
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              onBlur={() => save({ title })}
              placeholder="e.g. Forces & Newton's Laws"
              className="w-full px-3 py-2 rounded-lg border border-slate-100 focus:border-sage focus:ring-2 focus:ring-sage/20 outline-none transition-smooth text-sm"
            />
          </div>

          {/* Notes */}
          <div>
            <label className="text-xs font-semibold text-navy/40 uppercase tracking-wider block mb-1.5">
              Notes
            </label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              onBlur={() => save({ notes })}
              placeholder="Add teaching notes..."
              rows={3}
              className="w-full px-3 py-2 rounded-lg border border-slate-100 focus:border-sage focus:ring-2 focus:ring-sage/20 outline-none transition-smooth text-sm resize-none"
            />
          </div>

          {/* Links */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs font-semibold text-navy/40 uppercase tracking-wider">
                Resources
              </label>
              {!showAddLink && (
                <button
                  onClick={() => setShowAddLink(true)}
                  className="flex items-center gap-1.5 px-2 py-1 rounded-full text-xs font-medium text-sage hover:bg-sage/10 transition-smooth"
                >
                  <Plus size={12} /> Add Link
                </button>
              )}
            </div>

            {links.length > 0 && (
              <div className="space-y-1.5 mb-2">
                {links.map((link, i) => (
                  <div key={i} className="flex items-center gap-2 p-2 rounded-lg bg-sand/50 group hover:bg-sand transition-smooth">
                    <Link2 size={12} className="text-navy/30 shrink-0" />
                    <a
                      href={link.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs text-sage hover:underline flex items-center gap-1 truncate flex-1"
                    >
                      <span className="truncate">{link.label}</span>
                      <ExternalLink size={10} className="shrink-0" />
                    </a>
                    <button
                      onClick={() => removeLink(i)}
                      className="p-1 rounded text-navy/25 opacity-0 group-hover:opacity-100 hover:text-terracotta transition-smooth shrink-0"
                    >
                      <Trash2 size={12} />
                    </button>
                  </div>
                ))}
              </div>
            )}

            {showAddLink && (
              <div className="p-3 rounded-lg bg-sand/30 space-y-2">
                <input
                  type="url"
                  value={newLinkUrl}
                  onChange={(e) => setNewLinkUrl(e.target.value)}
                  placeholder="https://..."
                  className="w-full px-2 py-1.5 rounded text-xs border border-slate-100 focus:border-sage outline-none"
                />
                <input
                  type="text"
                  value={newLinkLabel}
                  onChange={(e) => setNewLinkLabel(e.target.value)}
                  placeholder="Label (optional)"
                  className="w-full px-2 py-1.5 rounded text-xs border border-slate-100 focus:border-sage outline-none"
                />
                <div className="flex gap-2">
                  <button
                    onClick={addLink}
                    className="flex-1 px-3 py-1.5 rounded bg-sage text-white text-xs font-medium hover:bg-sage/90"
                  >
                    Add
                  </button>
                  <button
                    onClick={() => {
                      setShowAddLink(false);
                      setNewLinkUrl('');
                      setNewLinkLabel('');
                    }}
                    className="px-3 py-1.5 rounded border border-slate-100 text-navy/60 text-xs font-medium hover:bg-sand/50"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Actions */}
          <div className="flex items-center justify-between pt-2 border-t border-slate-100">
            <div className="flex gap-1">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onMoveUp();
                }}
                disabled={!canMoveUp}
                className="p-1.5 rounded text-navy/40 hover:text-sage hover:bg-sage/10 disabled:opacity-30 disabled:hover:bg-transparent disabled:hover:text-navy/40"
              >
                ↑
              </button>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onMoveDown();
                }}
                disabled={!canMoveDown}
                className="p-1.5 rounded text-navy/40 hover:text-sage hover:bg-sage/10 disabled:opacity-30 disabled:hover:bg-transparent disabled:hover:text-navy/40"
              >
                ↓
              </button>
            </div>
            <button
              onClick={(e) => {
                e.stopPropagation();
                if (confirm('Delete this lesson from the sequence?')) {
                  onDelete();
                }
              }}
              className="px-3 py-1.5 rounded text-xs font-medium text-terracotta hover:bg-terracotta/10"
            >
              Delete
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// --- Main Component ---

export default function ClassView({
  timetableData,
  lessonSequences,
  lessonSchedules,
  onUpdateClass,
  onUpdateSequences,
  onUpdateSchedules,
}) {
  const classes = timetableData?.classes || [];
  const [selectedClassId, setSelectedClassId] = useState(null);
  const [editingClassSize, setEditingClassSize] = useState(false);
  const [classSize, setClassSize] = useState('');
  const [editingNotes, setEditingNotes] = useState(false);
  const [classNotes, setClassNotes] = useState('');
  const [showAllLessons, setShowAllLessons] = useState(false);

  const selectedClass = classes.find((c) => c.id === selectedClassId);
  const accent = selectedClass ? getClassColor(selectedClass.id, classes) : '#81B29A';

  const lessonSequence = selectedClassId ? getClassSequence(selectedClassId) : [];
  const scheduledLessons = selectedClassId ? getScheduledLessons(selectedClassId) : [];
  const unscheduledLessons = selectedClassId ? getUnscheduledLessons(selectedClassId) : [];
  const progress = selectedClassId ? getSequenceProgress(selectedClassId) : null;

  const handleSelectClass = (classId) => {
    setSelectedClassId(classId);
    setShowAllLessons(false);
    const cls = classes.find((c) => c.id === classId);
    if (cls) {
      setClassSize(String(cls.classSize || ''));
      setClassNotes(cls.notes || '');
    }
  };

  const handleSaveClassSize = () => {
    const size = parseInt(classSize, 10);
    if (!isNaN(size) && size > 0) {
      onUpdateClass(selectedClassId, { classSize: size });
    }
    setEditingClassSize(false);
  };

  const handleSaveNotes = () => {
    onUpdateClass(selectedClassId, { notes: classNotes });
    setEditingNotes(false);
  };

  const handleAddLesson = () => {
    const newSequences = addLessonToSequence(selectedClassId, {
      title: '',
      notes: '',
      links: [],
    });
    onUpdateSequences(newSequences);
  };

  const handleUpdateLesson = (lessonId, updates) => {
    const newSequences = updateLessonInSequence(selectedClassId, lessonId, updates);
    onUpdateSequences(newSequences);
  };

  const handleDeleteLesson = (lessonId) => {
    const newSequences = deleteLessonFromSequence(selectedClassId, lessonId);
    onUpdateSequences(newSequences);
  };

  const handleMoveLesson = (fromIndex, toIndex) => {
    const newSequences = reorderLessonSequence(selectedClassId, fromIndex, toIndex);
    onUpdateSequences(newSequences);
  };

  const futureLessonSlots = useMemo(() => {
    if (!selectedClassId) return [];
    return generateFutureLessons(selectedClassId, timetableData, 26);
  }, [selectedClassId, timetableData]);

  const getScheduledDateForLesson = (lessonId) => {
    const scheduled = scheduledLessons.find(s => s.lesson?.id === lessonId);
    return scheduled ? scheduled.date : null;
  };

  if (!selectedClass) {
    return (
      <div className="flex-1 flex flex-col min-h-0 bg-cream">
        <header className="shrink-0 px-8 py-5 border-b border-slate-100 bg-white/80 backdrop-blur-sm">
          <h2 className="font-serif text-2xl font-bold text-navy">Classes</h2>
          <p className="text-sm text-navy/40 mt-0.5">
            {classes.length} class{classes.length !== 1 ? 'es' : ''}
          </p>
        </header>

        <div className="flex-1 overflow-auto p-8">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {classes.map((cls) => {
              const color = getClassColor(cls.id, classes);
              const lessonsPerFortnight = countLessonsPerFortnight(cls.id, timetableData);
              const rooms = getClassRooms(cls.id, timetableData);

              return (
                <button
                  key={cls.id}
                  onClick={() => handleSelectClass(cls.id)}
                  className="group p-5 rounded-2xl border border-slate-100 bg-white hover:border-slate-200 hover:shadow-md transition-smooth text-left"
                >
                  <div className="flex items-start gap-3">
                    <div
                      className="w-12 h-12 rounded-xl flex items-center justify-center shrink-0"
                      style={{ backgroundColor: `${color}18` }}
                    >
                      <Users size={20} style={{ color }} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="font-serif font-bold text-navy text-lg truncate">
                        {cls.name}
                      </h3>
                      <p className="text-sm text-navy/40 truncate">{cls.subject}</p>
                      <div className="flex items-center gap-3 mt-2 text-xs text-navy/30">
                        <span>{lessonsPerFortnight} lessons/fortnight</span>
                        {cls.classSize && <span>{cls.classSize} students</span>}
                      </div>
                    </div>
                    <ChevronRight
                      size={18}
                      className="text-navy/20 group-hover:text-sage shrink-0 transition-smooth"
                    />
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      </div>
    );
  }

  const lessonsPerFortnight = countLessonsPerFortnight(selectedClass.id, timetableData);
  const rooms = getClassRooms(selectedClass.id, timetableData);
  const schedule = getClassSchedule(selectedClass.id, timetableData);

  return (
    <div className="flex-1 flex min-h-0 bg-cream">
      {/* Collapsed class list sidebar */}
      <div className="w-64 shrink-0 border-r border-slate-100 bg-white flex flex-col">
        <div className="p-4 border-b border-slate-100">
          <h3 className="font-serif font-bold text-navy text-lg">Classes</h3>
        </div>
        <div className="flex-1 overflow-auto p-2 space-y-1">
          {classes.map((cls) => {
            const color = getClassColor(cls.id, classes);
            const isSelected = cls.id === selectedClassId;
            return (
              <button
                key={cls.id}
                onClick={() => handleSelectClass(cls.id)}
                className={`w-full p-3 rounded-xl text-left transition-smooth ${
                  isSelected ? 'bg-sage/10' : 'hover:bg-sand/50'
                }`}
              >
                <div className="flex items-center gap-2">
                  <div
                    className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0"
                    style={{ backgroundColor: `${color}18` }}
                  >
                    <Users size={14} style={{ color }} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className={`text-sm font-medium truncate ${isSelected ? 'text-sage' : 'text-navy'}`}>
                      {cls.name}
                    </p>
                    <p className="text-xs text-navy/40 truncate">{cls.subject}</p>
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Class detail panel */}
      <div className="flex-1 flex flex-col min-h-0 min-w-0">
        {/* Header */}
        <header className="shrink-0 px-8 py-5 border-b border-slate-100 bg-white/80 backdrop-blur-sm">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-4">
              <div
                className="w-14 h-14 rounded-2xl flex items-center justify-center shrink-0"
                style={{ backgroundColor: `${accent}18` }}
              >
                <BookOpen size={24} style={{ color: accent }} />
              </div>
              <div>
                <h2 className="font-serif text-2xl font-bold text-navy">{selectedClass.name}</h2>
                <p className="text-sm text-navy/40 mt-0.5">{selectedClass.subject}</p>
              </div>
            </div>

            {progress && (
              <div className="text-right">
                <p className="text-2xl font-bold text-navy">{progress.percentComplete}%</p>
                <p className="text-xs text-navy/40">
                  {progress.scheduled} of {progress.total} lessons scheduled
                </p>
              </div>
            )}
          </div>
        </header>

        {/* Scrollable content */}
        <div className="flex-1 overflow-auto p-8 space-y-6">
          {/* Class Info */}
          <div className="grid grid-cols-2 gap-4">
            {/* Class Size */}
            <div className="p-4 rounded-2xl bg-white border border-slate-100">
              <div className="flex items-center justify-between mb-2">
                <label className="text-xs font-semibold text-navy/40 uppercase tracking-wider">
                  Class Size
                </label>
                {!editingClassSize && (
                  <button
                    onClick={() => setEditingClassSize(true)}
                    className="p-1.5 rounded-lg text-navy/30 hover:text-sage hover:bg-sage/10"
                  >
                    <Pencil size={14} />
                  </button>
                )}
              </div>
              {editingClassSize ? (
                <div className="flex gap-2">
                  <input
                    type="number"
                    value={classSize}
                    onChange={(e) => setClassSize(e.target.value)}
                    className="flex-1 px-3 py-2 rounded-lg border border-slate-100 focus:border-sage outline-none"
                    min="1"
                  />
                  <button
                    onClick={handleSaveClassSize}
                    className="px-3 py-2 rounded-lg bg-sage text-white hover:bg-sage/90"
                  >
                    <Save size={16} />
                  </button>
                  <button
                    onClick={() => {
                      setEditingClassSize(false);
                      setClassSize(String(selectedClass.classSize || ''));
                    }}
                    className="px-3 py-2 rounded-lg border border-slate-100 hover:bg-sand/50"
                  >
                    <X size={16} />
                  </button>
                </div>
              ) : (
                <p className="text-2xl font-bold text-navy">
                  {selectedClass.classSize || '—'}
                </p>
              )}
            </div>

            {/* Lessons per fortnight */}
            <div className="p-4 rounded-2xl bg-white border border-slate-100">
              <label className="text-xs font-semibold text-navy/40 uppercase tracking-wider block mb-2">
                Lessons / Fortnight
              </label>
              <p className="text-2xl font-bold text-navy">{lessonsPerFortnight}</p>
            </div>
          </div>

          {/* Rooms */}
          {rooms.length > 0 && (
            <div className="p-4 rounded-2xl bg-white border border-slate-100">
              <label className="text-xs font-semibold text-navy/40 uppercase tracking-wider block mb-2">
                Rooms
              </label>
              <div className="flex flex-wrap gap-2">
                {rooms.map((room, i) => (
                  <span
                    key={i}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm bg-sand text-navy"
                  >
                    <MapPin size={14} />
                    {room}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Class Notes */}
          <div className="p-4 rounded-2xl bg-white border border-slate-100">
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs font-semibold text-navy/40 uppercase tracking-wider">
                Class Notes
              </label>
              {!editingNotes && (
                <button
                  onClick={() => setEditingNotes(true)}
                  className="p-1.5 rounded-lg text-navy/30 hover:text-sage hover:bg-sage/10"
                >
                  <Pencil size={14} />
                </button>
              )}
            </div>
            {editingNotes ? (
              <div className="space-y-2">
                <textarea
                  value={classNotes}
                  onChange={(e) => setClassNotes(e.target.value)}
                  rows={4}
                  className="w-full px-3 py-2 rounded-lg border border-slate-100 focus:border-sage outline-none resize-none"
                  placeholder="Add notes about this class..."
                />
                <div className="flex gap-2">
                  <button
                    onClick={handleSaveNotes}
                    className="px-4 py-2 rounded-lg bg-sage text-white font-medium hover:bg-sage/90"
                  >
                    Save
                  </button>
                  <button
                    onClick={() => {
                      setEditingNotes(false);
                      setClassNotes(selectedClass.notes || '');
                    }}
                    className="px-4 py-2 rounded-lg border border-slate-100 hover:bg-sand/50"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            ) : (
              <p className="text-sm text-navy/60 whitespace-pre-wrap">
                {selectedClass.notes || 'No notes yet'}
              </p>
            )}
          </div>

          {/* Fortnightly Schedule */}
          <div className="p-4 rounded-2xl bg-white border border-slate-100">
            <label className="text-xs font-semibold text-navy/40 uppercase tracking-wider block mb-3">
              Fortnightly Schedule
            </label>
            <div className="space-y-3">
              {[1, 2].map((week) => {
                const weekLessons = schedule.filter((s) => s.weekNumber === week);
                if (weekLessons.length === 0) return null;
                return (
                  <div key={week}>
                    <p className="text-xs font-bold text-navy/30 mb-2">Week {week}</p>
                    <div className="space-y-1.5">
                      {weekLessons.map((s, i) => (
                        <div
                          key={i}
                          className="flex items-center gap-3 p-2 rounded-lg bg-sand/30 text-sm"
                        >
                          <span className="text-navy/60 w-20">{s.dayName}</span>
                          <span className="text-navy/40 font-serif text-xs tabular-nums">
                            {formatTime(s.startTime)}–{formatTime(s.endTime)}
                          </span>
                          <span
                            className="text-xs font-bold px-2 py-0.5 rounded-full"
                            style={{ backgroundColor: `${accent}18`, color: accent }}
                          >
                            P{s.period}
                          </span>
                          <span className="text-navy/40 text-xs">{s.room}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Lesson Sequence */}
          <div className="p-4 rounded-2xl bg-white border border-slate-100">
            <div className="flex items-center justify-between mb-4">
              <label className="text-xs font-semibold text-navy/40 uppercase tracking-wider flex items-center gap-2">
                <List size={16} />
                Lesson Sequence
              </label>
              <button
                onClick={handleAddLesson}
                className="flex items-center gap-2 px-4 py-2 rounded-full bg-sage text-white text-sm font-medium hover:bg-sage/90"
              >
                <Plus size={16} /> Add Lesson
              </button>
            </div>

            {lessonSequence.length === 0 ? (
              <p className="text-sm text-navy/40 text-center py-8">
                No lessons in sequence yet. Click "Add Lesson" to start.
              </p>
            ) : (
              <div className="space-y-2">
                {lessonSequence.map((lesson, index) => (
                  <LessonSequenceRow
                    key={lesson.id}
                    lesson={lesson}
                    classId={selectedClassId}
                    index={index}
                    accent={accent}
                    onUpdate={handleUpdateLesson}
                    onDelete={() => handleDeleteLesson(lesson.id)}
                    onMoveUp={() => handleMoveLesson(index, index - 1)}
                    onMoveDown={() => handleMoveLesson(index, index + 1)}
                    canMoveUp={index > 0}
                    canMoveDown={index < lessonSequence.length - 1}
                    scheduledDate={getScheduledDateForLesson(lesson.id)}
                  />
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}