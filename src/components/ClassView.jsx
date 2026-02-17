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
  CalendarDays,
  Link2,
  Plus,
  Trash2,
  ExternalLink,
  StickyNote,
  ChevronDown,
  GripVertical,
  ArrowDownToLine,
  RotateCcw,
} from 'lucide-react';
import { getClassColor, generateTimetableOccurrences } from '../utils/timetable';
import { formatTime, formatDateISO, MONTH_NAMES_SHORT, DAY_NAMES_SHORT } from '../utils/dateHelpers';
import { getClassSchedule } from '../utils/storage';

// ===== ClassView =====
// Left panel: class list. Right panel: class info + lesson sequence management.
// "See All" now shows the lesson SEQUENCE with drag-drop reordering,
// and each lesson shows which date it's scheduled for via occurrence mapping.

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

function getClassRecurringSchedule(classId, timetableData) {
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

function formatShortDate(date) {
  return `${DAY_NAMES_SHORT[date.getDay()]} ${date.getDate()} ${MONTH_NAMES_SHORT[date.getMonth()]}`;
}


// --- Inline Lesson Row (for editing a lesson in the sequence) ---

function LessonSequenceRow({
  lesson,
  index,
  scheduledOccurrence,
  accent,
  onUpdate,
  onDelete,
  onSyncToDate,
  onDragStart,
  onDragOver,
  onDrop,
  isDragging,
}) {
  const [title, setTitle] = useState(lesson.title || '');
  const [notes, setNotes] = useState(lesson.notes || '');
  const [links, setLinks] = useState(lesson.links || []);
  const [showAddLink, setShowAddLink] = useState(false);
  const [newLinkUrl, setNewLinkUrl] = useState('');
  const [newLinkLabel, setNewLinkLabel] = useState('');
  const [expanded, setExpanded] = useState(false);
  const dateInputRef = React.useRef(null);

  React.useEffect(() => {
    setTitle(lesson.title || '');
    setNotes(lesson.notes || '');
    setLinks(lesson.links || []);
  }, [lesson]);

  const save = (updates) => {
    onUpdate(lesson.id, { ...updates });
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

  const removeLink = (i) => {
    const updated = links.filter((_, idx) => idx !== i);
    setLinks(updated);
    save({ links: updated });
  };

  const hasContent = title || notes || links.length > 0;

  return (
    <div
      draggable
      onDragStart={(e) => onDragStart(e, index)}
      onDragOver={(e) => onDragOver(e, index)}
      onDrop={(e) => onDrop(e, index)}
      className={`border border-slate-100 rounded-2xl bg-white overflow-hidden transition-smooth hover:border-slate-200
        ${isDragging ? 'opacity-40 scale-95' : ''}`}
    >
      {/* Collapsed row */}
      <div className="flex items-center gap-2 px-3 py-3 cursor-pointer select-none">
        {/* Drag handle */}
        <div className="shrink-0 cursor-grab active:cursor-grabbing text-navy/15 hover:text-navy/30">
          <GripVertical size={16} />
        </div>

        {/* Lesson number */}
        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full shrink-0"
          style={{ backgroundColor: `${accent}18`, color: accent }}>
          #{index + 1}
        </span>

        {/* Title or placeholder */}
        <span
          className={`flex-1 text-sm truncate ${title ? 'text-navy font-medium' : 'text-navy/25 italic'}`}
          onClick={() => setExpanded(!expanded)}
        >
          {title || 'Untitled lesson'}
        </span>

        {/* Scheduled date + time pill + sync button */}
        <div className="flex items-center gap-1.5 shrink-0">
          {scheduledOccurrence ? (
            <>
              <span className="text-[11px] font-medium text-navy/50 tabular-nums bg-sand/80 px-2 py-0.5 rounded-lg">
                {formatShortDate(scheduledOccurrence.date)}
              </span>
              <span className="text-[10px] text-navy/30 tabular-nums">
                {formatTime(scheduledOccurrence.startTime)} · P{scheduledOccurrence.period}
              </span>
            </>
          ) : (
            <span className="text-[10px] text-navy/15 italic">No date</span>
          )}
          {/* Sync to date button */}
          <button
            onClick={(e) => {
              e.stopPropagation();
              dateInputRef.current?.showPicker();
            }}
            className="p-1 rounded-lg text-navy/15 hover:text-sage hover:bg-sage/5 transition-smooth"
            title="Sync this lesson to a specific date"
          >
            <CalendarDays size={14} />
          </button>
          <input
            ref={dateInputRef}
            type="date"
            className="sr-only"
            onChange={(e) => {
              if (e.target.value) {
                onSyncToDate(lesson.order, e.target.value);
                e.target.value = '';
              }
            }}
          />
        </div>

        {/* Content indicator */}
        {hasContent && !expanded && (
          <div className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: accent }} />
        )}

        {/* Expand toggle */}
        <button onClick={() => setExpanded(!expanded)} className="shrink-0 p-1 text-navy/20 hover:text-navy/40">
          <ChevronDown size={16} className={`transition-transform ${expanded ? 'rotate-180' : ''}`} />
        </button>
      </div>

      {/* Expanded editor */}
      {expanded && (
        <div className="px-4 pb-4 pt-1 border-t border-slate-50 space-y-3">
          {/* Scheduled date banner */}
          {scheduledOccurrence && (
            <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-sand/60 text-xs text-navy/50">
              <CalendarRange size={13} className="shrink-0 text-navy/30" />
              <span>
                Scheduled for <span className="font-semibold text-navy/70">{formatShortDate(scheduledOccurrence.date)}</span>
                {' · '}{formatTime(scheduledOccurrence.startTime)}–{formatTime(scheduledOccurrence.endTime)}
                {' · '}P{scheduledOccurrence.period}
                {scheduledOccurrence.room && <> · {scheduledOccurrence.room}</>}
              </span>
            </div>
          )}
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            onBlur={() => save({ title })}
            placeholder="Lesson title…"
            className="w-full px-3 py-2 rounded-xl border border-slate-200 text-sm text-navy
                       placeholder:text-navy/20 focus:outline-none focus:border-sage focus:ring-1 focus:ring-sage/20"
          />
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            onBlur={() => save({ notes })}
            rows={3}
            placeholder="Notes…"
            className="w-full px-3 py-2 rounded-xl border border-slate-200 text-sm text-navy
                       leading-relaxed placeholder:text-navy/20 resize-none
                       focus:outline-none focus:border-sage focus:ring-1 focus:ring-sage/20"
          />

          {/* Links */}
          <div>
            {links.length > 0 && (
              <div className="space-y-1.5 mb-2">
                {links.map((link, i) => (
                  <div key={i} className="flex items-center gap-2 bg-sand/50 rounded-lg px-2.5 py-1.5 group">
                    <Link2 size={12} className="text-navy/30 shrink-0" />
                    <a href={link.url} target="_blank" rel="noopener noreferrer"
                      className="text-xs text-sage hover:underline truncate flex-1">
                      {link.label || link.url}
                    </a>
                    <ExternalLink size={10} className="text-navy/20 shrink-0" />
                    <button onClick={() => removeLink(i)}
                      className="p-0.5 rounded text-navy/15 hover:text-terracotta opacity-0 group-hover:opacity-100 transition-smooth shrink-0">
                      <Trash2 size={11} />
                    </button>
                  </div>
                ))}
              </div>
            )}

            {showAddLink ? (
              <div className="space-y-1.5 p-2.5 rounded-xl border border-slate-200">
                <input type="url" value={newLinkUrl} onChange={(e) => setNewLinkUrl(e.target.value)}
                  placeholder="https://..." autoFocus
                  className="w-full px-2.5 py-1.5 rounded-lg border border-slate-200 text-xs text-navy
                             placeholder:text-navy/20 focus:outline-none focus:border-sage" />
                <input type="text" value={newLinkLabel} onChange={(e) => setNewLinkLabel(e.target.value)}
                  onKeyDown={(e) => { if (e.key === 'Enter') addLink(); }}
                  placeholder="Label (optional)"
                  className="w-full px-2.5 py-1.5 rounded-lg border border-slate-200 text-xs text-navy
                             placeholder:text-navy/20 focus:outline-none focus:border-sage" />
                <div className="flex gap-2">
                  <button onClick={addLink}
                    className="px-3 py-1 rounded-full text-[10px] font-bold bg-[#E07A5F] text-white">
                    Add
                  </button>
                  <button onClick={() => { setShowAddLink(false); setNewLinkUrl(''); setNewLinkLabel(''); }}
                    className="px-3 py-1 rounded-full text-[10px] text-navy/40 hover:bg-sand">
                    Cancel
                  </button>
                </div>
              </div>
            ) : (
              <button onClick={() => setShowAddLink(true)}
                className="flex items-center gap-1.5 text-[11px] text-navy/25 hover:text-sage transition-smooth">
                <Plus size={12} /> Add link
              </button>
            )}
          </div>

          {/* Delete button */}
          <div className="flex justify-end pt-1">
            <button
              onClick={() => onDelete(lesson.id)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[11px] font-medium
                         text-terracotta/50 hover:text-terracotta hover:bg-terracotta/5 transition-smooth"
            >
              <Trash2 size={12} /> Remove lesson
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
  onUpdateLesson,
  onAddLesson,
  onDeleteLesson,
  onReorderSequence,
  onUpdateSchedule,
}) {
  const [selectedClassId, setSelectedClassId] = useState(null);
  const [editingField, setEditingField] = useState(null);
  const [editValue, setEditValue] = useState('');
  const [showAllLessons, setShowAllLessons] = useState(false);
  const [dragIndex, setDragIndex] = useState(null);

  const classes = timetableData?.classes || [];
  const selectedClass = classes.find((c) => c.id === selectedClassId);

  // Get the lesson sequence for the selected class
  const classSequence = useMemo(() => {
    if (!selectedClass) return [];
    const seq = lessonSequences[selectedClass.id] || [];
    return [...seq].sort((a, b) => a.order - b.order);
  }, [selectedClass, lessonSequences]);

  // Get timetable occurrences for mapping sequences to dates
  const occurrences = useMemo(() => {
    if (!selectedClass) return [];
    return generateTimetableOccurrences(selectedClass.id, timetableData, 26);
  }, [selectedClass, timetableData]);

  // Get the schedule (startIndex) for the selected class
  const classScheduleData = useMemo(() => {
    if (!selectedClass) return { startIndex: 0 };
    return getClassSchedule(selectedClass.id);
  }, [selectedClass, lessonSchedules]);

  // Map each lesson in the sequence to its scheduled occurrence (date + time + period)
  // startIndex = how many timetable slots to skip (push back shifts lessons to later dates)
  const getScheduledOccurrence = (lessonOrder) => {
    const occurrenceNum = lessonOrder + classScheduleData.startIndex;
    if (occurrenceNum < 0 || occurrenceNum >= occurrences.length) return null;
    return occurrences[occurrenceNum] || null;
  };

  const startEdit = (field, currentValue) => {
    setEditingField(field);
    setEditValue(currentValue ?? '');
  };

  const saveEdit = (classId, field) => {
    let value = editValue;
    if (field === 'classSize') {
      value = editValue === '' ? null : parseInt(editValue, 10);
      if (value !== null && isNaN(value)) { setEditingField(null); return; }
    }
    onUpdateClass(classId, { [field]: value });
    setEditingField(null);
  };

  const cancelEdit = () => { setEditingField(null); setEditValue(''); };

  const selectClass = (id) => {
    if (selectedClassId === id) {
      setSelectedClassId(null);
    } else {
      setSelectedClassId(id);
      setShowAllLessons(false);
      setEditingField(null);
    }
  };

  // Handle lesson update within the sequence
  const handleUpdateLesson = (lessonId, updates) => {
    if (!selectedClass) return;
    onUpdateLesson(selectedClass.id, lessonId, updates);
  };

  // Handle adding a new lesson to the sequence
  const handleAddLesson = () => {
    if (!selectedClass) return;
    onAddLesson(selectedClass.id, {});
  };

  // Handle deleting a lesson from the sequence
  const handleDeleteLesson = (lessonId) => {
    if (!selectedClass) return;
    onDeleteLesson(selectedClass.id, lessonId);
  };

  // Drag and drop reordering
  const handleDragStart = (e, index) => {
    setDragIndex(index);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e, index) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  };

  const handleDrop = (e, dropIndex) => {
    e.preventDefault();
    if (dragIndex === null || dragIndex === dropIndex || !selectedClass) {
      setDragIndex(null);
      return;
    }
    // Reorder the sequence
    const ids = classSequence.map(l => l.id);
    const [movedId] = ids.splice(dragIndex, 1);
    ids.splice(dropIndex, 0, movedId);
    onReorderSequence(selectedClass.id, ids);
    setDragIndex(null);
  };

  // Push back: increment startIndex so all lessons shift one occurrence later
  const handlePushBack = () => {
    if (!selectedClass) return;
    const current = getClassSchedule(selectedClass.id);
    onUpdateSchedule(selectedClass.id, { startIndex: current.startIndex + 1 });
  };

  // Sync a lesson to a specific date: adjusts startIndex so that
  // the given lesson (by order) maps to the timetable occurrence on that date.
  // Everything below it in the sequence shifts accordingly.
  const handleSyncToDate = (lessonOrder, dateISO) => {
    if (!selectedClass) return;
    // Find the occurrence that falls on or after the chosen date
    const targetOcc = occurrences.find(occ => occ.dateISO >= dateISO);
    if (!targetOcc) return; // no future occurrence found for that date
    // startIndex = occurrenceNum - lessonOrder
    // so that: lessonOrder + startIndex = occurrenceNum
    const newStartIndex = targetOcc.occurrenceNum - lessonOrder;
    onUpdateSchedule(selectedClass.id, { startIndex: Math.max(0, newStartIndex) });
  };

  return (
    <div className="flex-1 flex min-h-0">
      {/* ===== Class List (left panel) ===== */}
      <div className={`
        ${selectedClass ? 'w-80' : 'flex-1 max-w-4xl mx-auto'}
        shrink-0 flex flex-col min-h-0 border-r border-slate-100
      `}>
        <header className="shrink-0 px-8 py-5 border-b border-slate-100 bg-white/80 backdrop-blur-sm">
          <h2 className="font-serif text-2xl font-bold text-navy">Classes</h2>
          <p className="text-sm text-navy/40 mt-0.5">
            {classes.length} class{classes.length !== 1 ? 'es' : ''} on your timetable
          </p>
        </header>

        <div className="flex-1 overflow-auto p-4">
          <div className={selectedClass ? 'space-y-2' : 'grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4'}>
            {classes.map((cls) => {
              const color = getClassColor(cls.id, classes);
              const lessonCount = countLessonsPerFortnight(cls.id, timetableData);
              const rooms = getClassRooms(cls.id, timetableData);
              const isSelected = selectedClassId === cls.id;

              return (
                <button key={cls.id} onClick={() => selectClass(cls.id)}
                  className={`w-full text-left rounded-2xl border transition-smooth group
                    ${isSelected ? 'border-slate-200 shadow-md bg-white' : 'border-slate-100 shadow-sm bg-white hover:shadow-md hover:border-slate-200 hover:scale-[1.01]'}`}>
                  <div className={selectedClass ? 'p-3' : 'p-5'}>
                    <div className="flex items-start gap-3">
                      <div className={`${selectedClass ? 'w-3 h-3 mt-1.5' : 'w-4 h-4 mt-1'} rounded-full shrink-0`}
                        style={{ backgroundColor: color }} />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-2">
                          <h3 className={`font-serif font-bold text-navy ${selectedClass ? 'text-sm' : 'text-lg'}`}>
                            {cls.name}
                          </h3>
                          <ChevronRight size={16}
                            className={`text-navy/20 transition-smooth shrink-0
                              ${isSelected ? 'rotate-90 text-sage' : 'group-hover:text-navy/40'}`} />
                        </div>
                        {!selectedClass && (
                          <>
                            <p className="text-sm text-navy/50 font-medium mt-0.5">
                              {cls.subject}
                              {cls.timetableCode && <span className="text-navy/25 ml-1.5">({cls.timetableCode})</span>}
                            </p>
                            <div className="flex items-center gap-4 mt-3 text-navy/35">
                              <span className="flex items-center gap-1.5 text-xs">
                                <Clock size={13} /> {lessonCount} periods/fortnight
                              </span>
                              {cls.classSize && (
                                <span className="flex items-center gap-1.5 text-xs">
                                  <Users size={13} /> {cls.classSize}
                                </span>
                              )}
                            </div>
                            {rooms.length > 0 && (
                              <div className="flex items-center gap-1.5 mt-2 text-navy/25 text-xs">
                                <MapPin size={12} /> <span className="truncate">{rooms.join(', ')}</span>
                              </div>
                            )}
                          </>
                        )}
                        {selectedClass && <p className="text-xs text-navy/40 mt-0.5">{cls.subject}</p>}
                      </div>
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* ===== Class Detail (right panel) ===== */}
      {selectedClass ? (
        <div className="flex-1 flex flex-col min-h-0 overflow-auto">
          <div className="max-w-2xl w-full mx-auto p-8">
            {/* Class header */}
            <div className="flex items-center gap-4 mb-8">
              <div className="w-12 h-12 rounded-2xl flex items-center justify-center shrink-0"
                style={{ backgroundColor: `${getClassColor(selectedClass.id, classes)}18` }}>
                <BookOpen size={24} style={{ color: getClassColor(selectedClass.id, classes) }} />
              </div>
              <div>
                <h2 className="font-serif text-2xl font-bold text-navy">{selectedClass.name}</h2>
                <p className="text-sm text-navy/40">
                  {selectedClass.subject}
                  {selectedClass.timetableCode && ` · ${selectedClass.timetableCode}`}
                </p>
              </div>
            </div>

            {/* Class Size & Notes */}
            <div className="space-y-6 mb-8">
              {/* Class Size */}
              <div className="flex items-center justify-between bg-white rounded-2xl border border-slate-100 px-5 py-4">
                <div className="flex items-center gap-3">
                  <Users size={18} className="text-navy/30" />
                  <span className="text-sm font-medium text-navy">Class Size</span>
                </div>
                {editingField === 'classSize' ? (
                  <div className="flex items-center gap-2">
                    <input type="number" value={editValue} onChange={(e) => setEditValue(e.target.value)}
                      onKeyDown={(e) => { if (e.key === 'Enter') saveEdit(selectedClass.id, 'classSize'); if (e.key === 'Escape') cancelEdit(); }}
                      autoFocus min={0} max={40}
                      className="w-20 px-3 py-1.5 rounded-lg border border-slate-200 text-sm text-navy text-center
                                 focus:outline-none focus:border-sage" />
                    <button onClick={() => saveEdit(selectedClass.id, 'classSize')}
                      className="p-1.5 rounded-lg text-sage hover:bg-sage/10"><Save size={14} /></button>
                    <button onClick={cancelEdit}
                      className="p-1.5 rounded-lg text-navy/30 hover:bg-sand"><X size={14} /></button>
                  </div>
                ) : (
                  <button onClick={() => startEdit('classSize', selectedClass.classSize)}
                    className="flex items-center gap-2 text-sm text-navy/60 hover:text-navy transition-smooth">
                    {selectedClass.classSize || <span className="text-navy/20 italic">Not set</span>}
                    <Pencil size={13} className="text-navy/20" />
                  </button>
                )}
              </div>

              {/* Class Notes */}
              <div className="bg-white rounded-2xl border border-slate-100 p-5">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <StickyNote size={16} className="text-navy/30" />
                      <span className="text-sm font-medium text-navy">Class Notes</span>
                    </div>
                    {editingField === 'notes' ? (
                      <div>
                        <textarea value={editValue} onChange={(e) => setEditValue(e.target.value)}
                          onKeyDown={(e) => { if (e.key === 'Escape') cancelEdit(); }}
                          autoFocus rows={4} placeholder="Add notes about this class…"
                          className="w-full px-4 py-3 rounded-xl border border-slate-200 text-navy text-sm leading-relaxed
                                     focus:outline-none focus:border-sage focus:ring-2 focus:ring-sage/20 resize-none" />
                        <div className="flex items-center gap-2 mt-2">
                          <button onClick={() => saveEdit(selectedClass.id, 'notes')}
                            className="flex items-center gap-1.5 px-4 py-2 rounded-full text-xs font-bold
                                       bg-[#E07A5F] text-white shadow-sm shadow-[#E07A5F]/20
                                       hover:shadow-md hover:shadow-[#E07A5F]/30 transition-smooth">
                            <Save size={12} /> Save
                          </button>
                          <button onClick={cancelEdit}
                            className="px-4 py-2 rounded-full text-xs font-medium text-navy/40 hover:text-navy/60 hover:bg-sand transition-smooth">
                            Cancel
                          </button>
                        </div>
                      </div>
                    ) : (
                      <p className="text-sm text-navy/60 leading-relaxed whitespace-pre-wrap">
                        {selectedClass.notes || <span className="text-navy/20 italic">No notes yet — these will appear on every lesson for this class</span>}
                      </p>
                    )}
                  </div>
                  {editingField !== 'notes' && (
                    <button onClick={() => startEdit('notes', selectedClass.notes)}
                      className="p-2 rounded-xl text-navy/20 hover:text-navy/50 hover:bg-sand transition-smooth shrink-0">
                      <Pencil size={15} />
                    </button>
                  )}
                </div>
              </div>
            </div>

            {/* Fortnightly Schedule + Lesson Sequence toggle */}
            <div>
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-serif font-bold text-navy text-lg">
                  {showAllLessons ? 'Lesson Sequence' : 'Fortnightly Schedule'}
                </h3>
                <div className="flex items-center gap-2">
                  {showAllLessons && classSequence.length > 0 && (
                    <>
                      {classScheduleData.startIndex > 0 && (
                        <button
                          onClick={() => onUpdateSchedule(selectedClass.id, { startIndex: 0 })}
                          className="flex items-center gap-1.5 px-3 py-2 rounded-full text-xs font-medium
                                     text-navy/40 hover:text-navy/60 hover:bg-sand transition-smooth"
                          title="Reset alignment — lesson #1 starts at the next available slot"
                        >
                          <RotateCcw size={13} />
                          Reset
                        </button>
                      )}
                      <button
                        onClick={handlePushBack}
                        className="flex items-center gap-1.5 px-3 py-2 rounded-full text-xs font-medium
                                   text-navy/40 hover:text-navy/60 hover:bg-sand transition-smooth"
                        title="Push all lessons back by one timetable slot"
                      >
                        <ArrowDownToLine size={14} />
                        Push Back
                      </button>
                    </>
                  )}
                  <button
                    onClick={() => setShowAllLessons(!showAllLessons)}
                    className="flex items-center gap-1.5 px-4 py-2 rounded-full text-xs font-bold
                               bg-[#E07A5F] text-white shadow-sm shadow-[#E07A5F]/20
                               hover:shadow-md hover:shadow-[#E07A5F]/30 transition-smooth"
                  >
                    <CalendarRange size={14} />
                    {showAllLessons ? 'Show Schedule' : 'Lesson Sequence'}
                  </button>
                </div>
              </div>

              {showAllLessons ? (
                /* ===== Lesson Sequence — drag-drop reorderable ===== */
                <div className="space-y-2">
                  {classSequence.length === 0 ? (
                    <p className="text-sm text-navy/30 italic py-4 text-center">
                      No lessons planned yet. Add your first lesson below.
                    </p>
                  ) : (
                    classSequence.map((lesson, i) => (
                      <LessonSequenceRow
                        key={lesson.id}
                        lesson={lesson}
                        index={i}
                        scheduledOccurrence={getScheduledOccurrence(lesson.order)}
                        accent={getClassColor(selectedClass.id, classes)}
                        onUpdate={handleUpdateLesson}
                        onDelete={handleDeleteLesson}
                        onSyncToDate={handleSyncToDate}
                        onDragStart={handleDragStart}
                        onDragOver={handleDragOver}
                        onDrop={handleDrop}
                        isDragging={dragIndex === i}
                      />
                    ))
                  )}

                  {/* Add lesson button */}
                  <button
                    onClick={handleAddLesson}
                    className="w-full flex items-center justify-center gap-2 py-3 rounded-2xl
                               border-2 border-dashed border-slate-200
                               text-sm font-medium text-navy/30
                               hover:text-sage hover:border-sage/30 hover:bg-[#81B29A]/5
                               transition-smooth"
                  >
                    <Plus size={16} />
                    Add Lesson
                  </button>
                </div>
              ) : (
                /* ===== Fortnightly pattern ===== */
                <>
                  {[1, 2].map((weekNum) => {
                    const schedule = getClassRecurringSchedule(selectedClass.id, timetableData)
                      .filter((s) => s.weekNumber === weekNum);
                    if (schedule.length === 0) return null;
                    return (
                      <div key={weekNum} className="mb-6">
                        <p className="text-xs font-semibold text-navy/30 uppercase tracking-wider mb-2">
                          Week {weekNum}
                        </p>
                        <div className="space-y-2">
                          {schedule.map((slot, i) => (
                            <div key={i} className="flex items-center gap-4 bg-white rounded-xl border border-slate-100 px-4 py-3">
                              <span className="text-sm font-medium text-navy w-24 shrink-0">{slot.dayName}</span>
                              <span className="text-sm text-navy/50 font-serif tabular-nums">
                                {formatTime(slot.startTime)}–{formatTime(slot.endTime)}
                              </span>
                              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full"
                                style={{
                                  backgroundColor: `${getClassColor(selectedClass.id, classes)}18`,
                                  color: getClassColor(selectedClass.id, classes),
                                }}>
                                P{slot.period}
                              </span>
                              {slot.room && <span className="text-xs text-navy/30 ml-auto truncate">{slot.room}</span>}
                            </div>
                          ))}
                        </div>
                      </div>
                    );
                  })}
                </>
              )}
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}