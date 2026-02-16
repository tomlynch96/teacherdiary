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
  ChevronDown,
} from 'lucide-react';
import { getClassColor, generateFutureLessons } from '../utils/timetable';
import { formatTime, formatDateISO, MONTH_NAMES_SHORT, DAY_NAMES_SHORT } from '../utils/dateHelpers';
import { getLessonForDate } from '../utils/lessonSequence';

// ===== ClassView =====
// Phase 1 UI (show all future timetabled lessons) + Phase 3 architecture (lesson sequences)

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

function formatShortDate(date) {
  return `${DAY_NAMES_SHORT[date.getDay()]} ${date.getDate()} ${MONTH_NAMES_SHORT[date.getMonth()]}`;
}

// --- Inline Lesson Row ---

function LessonRow({ slot, content, accent, onUpdateContent }) {
  const [title, setTitle] = useState(content?.title || '');
  const [notes, setNotes] = useState(content?.notes || '');
  const [links, setLinks] = useState(content?.links || []);
  const [showAddLink, setShowAddLink] = useState(false);
  const [newLinkUrl, setNewLinkUrl] = useState('');
  const [newLinkLabel, setNewLinkLabel] = useState('');
  const [expanded, setExpanded] = useState(false);

  // Sync from parent when content changes externally
  React.useEffect(() => {
    setTitle(content?.title || '');
    setNotes(content?.notes || '');
    setLinks(content?.links || []);
  }, [content]);

  const save = (updates) => {
    onUpdateContent(slot.dateISO, { title, notes, links, ...updates });
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

  const removeLink = (index) => {
    const updated = links.filter((_, i) => i !== index);
    setLinks(updated);
    save({ links: updated });
  };

  const hasContent = title || notes || links.length > 0;

  return (
    <div className="border border-slate-100 rounded-2xl bg-white overflow-hidden transition-smooth hover:border-slate-200">
      {/* Collapsed row */}
      <div
        className="flex items-center gap-3 px-4 py-3 cursor-pointer select-none"
        onClick={() => setExpanded(!expanded)}
      >
        <div className="shrink-0 w-24">
          <p className="text-sm font-medium text-navy">{formatShortDate(slot.date)}</p>
        </div>

        <span className="text-xs text-navy/40 font-serif tabular-nums shrink-0 w-24">
          {formatTime(slot.startTime)}–{formatTime(slot.endTime)}
        </span>

        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full shrink-0"
          style={{ backgroundColor: `${accent}18`, color: accent }}>
          P{slot.period}
        </span>

        <span className={`flex-1 text-sm truncate ${title ? 'text-navy font-medium' : 'text-navy/20 italic'}`}>
          {title || 'No title yet'}
        </span>

        {hasContent && (
          <div className="w-1.5 h-1.5 rounded-full shrink-0" style={{ backgroundColor: accent }} />
        )}

        {slot.room && (
          <span className="text-xs text-navy/30 shrink-0 truncate w-20">{slot.room}</span>
        )}

        <ChevronDown
          size={16}
          className={`shrink-0 text-navy/20 transition-transform ${expanded ? 'rotate-180' : ''}`}
        />
      </div>

      {/* Expanded content */}
      {expanded && (
        <div className="border-t border-slate-100 p-4 space-y-4 bg-sand/20">
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
              className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm text-navy
                         placeholder:text-navy/20 focus:outline-none focus:border-sage transition-smooth"
            />
          </div>

          <div>
            <label className="text-xs font-semibold text-navy/40 uppercase tracking-wider block mb-1.5">
              Lesson Notes
            </label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              onBlur={() => save({ notes })}
              placeholder="Notes, objectives, homework..."
              rows={3}
              className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm text-navy
                         placeholder:text-navy/20 focus:outline-none focus:border-sage resize-none transition-smooth"
            />
          </div>

          <div>
            <label className="text-xs font-semibold text-navy/40 uppercase tracking-wider block mb-1.5">
              Links & Resources
            </label>
            <div className="space-y-2">
              {links.map((link, i) => (
                <div key={i} className="flex items-center gap-2 group">
                  <Link2 size={12} className="text-navy/20 shrink-0" />
                  <a
                    href={link.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex-1 text-sm text-sage hover:underline truncate"
                  >
                    {link.label || link.url}
                  </a>
                  <button
                    onClick={() => removeLink(i)}
                    className="opacity-0 group-hover:opacity-100 p-1 rounded hover:bg-slate-100 text-navy/30 hover:text-terracotta transition-smooth"
                  >
                    <Trash2 size={12} />
                  </button>
                  <a
                    href={link.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="opacity-0 group-hover:opacity-100 p-1 rounded hover:bg-slate-100 text-navy/30 hover:text-sage transition-smooth"
                  >
                    <ExternalLink size={12} />
                  </a>
                </div>
              ))}

              {showAddLink ? (
                <div className="space-y-1.5 p-2.5 rounded-xl border border-slate-200">
                  <input
                    type="url"
                    value={newLinkUrl}
                    onChange={(e) => setNewLinkUrl(e.target.value)}
                    placeholder="https://..."
                    autoFocus
                    className="w-full px-2.5 py-1.5 rounded-lg border border-slate-200 text-xs text-navy
                               placeholder:text-navy/20 focus:outline-none focus:border-sage"
                  />
                  <input
                    type="text"
                    value={newLinkLabel}
                    onChange={(e) => setNewLinkLabel(e.target.value)}
                    onKeyDown={(e) => { if (e.key === 'Enter') addLink(); }}
                    placeholder="Label (optional)"
                    className="w-full px-2.5 py-1.5 rounded-lg border border-slate-200 text-xs text-navy
                               placeholder:text-navy/20 focus:outline-none focus:border-sage"
                  />
                  <div className="flex gap-2">
                    <button
                      onClick={addLink}
                      className="px-3 py-1 rounded-full text-[10px] font-bold bg-sage text-white hover:bg-sage/90 transition-smooth"
                    >
                      Add
                    </button>
                    <button
                      onClick={() => { setShowAddLink(false); setNewLinkUrl(''); setNewLinkLabel(''); }}
                      className="px-3 py-1 rounded-full text-[10px] text-navy/40 hover:bg-sand transition-smooth"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              ) : (
                <button
                  onClick={() => setShowAddLink(true)}
                  className="flex items-center gap-1.5 text-[11px] text-navy/25 hover:text-sage transition-smooth"
                >
                  <Plus size={12} /> Add link
                </button>
              )}
            </div>
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
  onUpdateSchedules
}) {
  const [selectedClassId, setSelectedClassId] = useState(null);
  const [editingField, setEditingField] = useState(null);
  const [editValue, setEditValue] = useState('');
  const [showAllLessons, setShowAllLessons] = useState(false);

  const classes = timetableData?.classes || [];
  const selectedClass = classes.find((c) => c.id === selectedClassId);

  // Generate all future timetabled lesson dates
  const futureLessons = useMemo(() => {
    if (!selectedClass) return [];
    return generateFutureLessons(selectedClass.id, timetableData, 26);
  }, [selectedClass, timetableData]);

  const startEdit = (field, currentValue) => {
    setEditingField(field);
    setEditValue(currentValue ?? '');
  };

  const saveEdit = (classId, field) => {
    let value = editValue;
    if (field === 'classSize') {
      value = editValue === '' ? null : parseInt(editValue, 10);
      if (isNaN(value)) value = null;
    }
    onUpdateClass(classId, { [field]: value });
    setEditingField(null);
  };

  const cancelEdit = () => {
    setEditingField(null);
    setEditValue('');
  };

  // Handle updating lesson content
  const handleUpdateContent = (dateISO, content) => {
    if (!selectedClass) return;
    
    const classId = selectedClass.id;
    
    // Get current sequences for this class
    const currentSequences = lessonSequences?.[classId] || [];
    const currentSchedule = lessonSchedules?.[classId] || {};
    
    // Check if this date already has a sequence assigned
    const existingSequenceIndex = currentSchedule[dateISO];
    
    if (existingSequenceIndex !== undefined) {
      // Update existing sequence
      const updatedSequences = {
        ...lessonSequences,
        [classId]: currentSequences.map((seq, idx) =>
          idx === existingSequenceIndex ? { ...seq, ...content } : seq
        )
      };
      onUpdateSequences(updatedSequences);
    } else {
      // Create new sequence
      const newSequenceIndex = currentSequences.length;
      const updatedSequences = {
        ...lessonSequences,
        [classId]: [...currentSequences, { sequenceIndex: newSequenceIndex, ...content }]
      };
      const updatedSchedule = {
        ...lessonSchedules,
        [classId]: { ...currentSchedule, [dateISO]: newSequenceIndex }
      };
      onUpdateSequences(updatedSequences);
      onUpdateSchedules(updatedSchedule);
    }
  };

  if (!timetableData || classes.length === 0) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <p className="text-navy/40">No timetable data loaded</p>
      </div>
    );
  }

  return (
    <div className="flex-1 flex overflow-hidden bg-cream">
      {/* Class list sidebar */}
      <div className={`shrink-0 border-r border-slate-100 bg-white overflow-y-auto transition-all ${
        selectedClass ? 'w-64' : 'w-96'
      }`}>
        <div className="p-6 border-b border-slate-100">
          <h2 className="font-serif text-2xl font-bold text-navy">Classes</h2>
          <p className="text-sm text-navy/40 mt-1">{classes.length} classes</p>
        </div>

        <div className="p-4 space-y-2">
          {classes.map((cls) => {
            const isSelected = cls.id === selectedClassId;
            const accent = getClassColor(cls.id, classes);
            const lessonsCount = countLessonsPerFortnight(cls.id, timetableData);

            return (
              <button
                key={cls.id}
                onClick={() => {
                  setSelectedClassId(cls.id);
                  setShowAllLessons(false);
                }}
                className={`w-full text-left p-4 rounded-xl border-2 transition-smooth ${
                  isSelected
                    ? 'border-slate-200 bg-sand/30'
                    : 'border-transparent bg-white hover:border-slate-100'
                }`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <h3 className="font-serif font-bold text-navy text-lg truncate">
                      {cls.name}
                    </h3>
                    <p className="text-sm text-navy/50 truncate">{cls.subject}</p>
                    <div className="flex items-center gap-3 mt-2 text-xs text-navy/30">
                      <span className="flex items-center gap-1">
                        <CalendarRange size={12} />
                        {lessonsCount} / fortnight
                      </span>
                      {cls.classSize && (
                        <span className="flex items-center gap-1">
                          <Users size={12} />
                          {cls.classSize}
                        </span>
                      )}
                    </div>
                  </div>
                  <div
                    className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
                    style={{ backgroundColor: `${accent}18` }}
                  >
                    <BookOpen size={18} style={{ color: accent }} />
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Class detail panel */}
      {selectedClass && (
        <div className="flex-1 overflow-y-auto">
          <div className="max-w-4xl mx-auto p-8">
            {/* Header */}
            <div className="flex items-start justify-between mb-8">
              <div>
                <h2 className="font-serif text-3xl font-bold text-navy">
                  {selectedClass.name}
                </h2>
                <p className="text-lg text-navy/50 mt-1">{selectedClass.subject}</p>
                {selectedClass.timetableCode && (
                  <p className="text-sm text-navy/30 mt-1">{selectedClass.timetableCode}</p>
                )}
              </div>
              <div
                className="w-16 h-16 rounded-2xl flex items-center justify-center"
                style={{ backgroundColor: `${getClassColor(selectedClass.id, classes)}18` }}
              >
                <BookOpen size={28} style={{ color: getClassColor(selectedClass.id, classes) }} />
              </div>
            </div>

            {/* Class Info */}
            <div className="grid grid-cols-2 gap-4 mb-8">
              {/* Class Size */}
              <div className="bg-white rounded-2xl border border-slate-100 p-5">
                <div className="flex items-center justify-between mb-3">
                  <label className="text-xs font-semibold text-navy/40 uppercase tracking-wider">
                    Class Size
                  </label>
                  {editingField !== 'classSize' && (
                    <button
                      onClick={() => startEdit('classSize', selectedClass.classSize)}
                      className="p-1 rounded hover:bg-sand text-navy/20 hover:text-sage transition-smooth"
                    >
                      <Pencil size={12} />
                    </button>
                  )}
                </div>
                {editingField === 'classSize' ? (
                  <div className="flex items-center gap-2">
                    <input
                      type="number"
                      value={editValue}
                      onChange={(e) => setEditValue(e.target.value)}
                      autoFocus
                      className="flex-1 px-3 py-2 rounded-lg border border-slate-200 text-sm text-navy focus:outline-none focus:border-sage"
                    />
                    <button
                      onClick={() => saveEdit(selectedClass.id, 'classSize')}
                      className="p-2 rounded-lg bg-sage text-white hover:bg-sage/90 transition-smooth"
                    >
                      <Save size={14} />
                    </button>
                    <button
                      onClick={cancelEdit}
                      className="p-2 rounded-lg text-navy/30 hover:bg-sand transition-smooth"
                    >
                      <X size={14} />
                    </button>
                  </div>
                ) : (
                  <p className="text-2xl font-bold text-navy">
                    {selectedClass.classSize || '—'}
                  </p>
                )}
              </div>

              {/* Rooms */}
              <div className="bg-white rounded-2xl border border-slate-100 p-5">
                <label className="text-xs font-semibold text-navy/40 uppercase tracking-wider block mb-3">
                  Rooms
                </label>
                <p className="text-sm text-navy">
                  {getClassRooms(selectedClass.id, timetableData).join(', ') || '—'}
                </p>
              </div>
            </div>

            {/* Class Notes */}
            <div className="bg-white rounded-2xl border border-slate-100 p-5 mb-8">
              <div className="flex items-center justify-between mb-3">
                <label className="text-xs font-semibold text-navy/40 uppercase tracking-wider">
                  Class Notes
                </label>
                {editingField !== 'notes' && (
                  <button
                    onClick={() => startEdit('notes', selectedClass.notes)}
                    className="p-1 rounded hover:bg-sand text-navy/20 hover:text-sage transition-smooth"
                  >
                    <Pencil size={12} />
                  </button>
                )}
              </div>
              {editingField === 'notes' ? (
                <div className="space-y-2">
                  <textarea
                    value={editValue}
                    onChange={(e) => setEditValue(e.target.value)}
                    autoFocus
                    rows={4}
                    className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm text-navy focus:outline-none focus:border-sage resize-none"
                  />
                  <div className="flex gap-2">
                    <button
                      onClick={() => saveEdit(selectedClass.id, 'notes')}
                      className="px-4 py-2 rounded-lg bg-sage text-white text-sm font-medium hover:bg-sage/90 transition-smooth"
                    >
                      Save
                    </button>
                    <button
                      onClick={cancelEdit}
                      className="px-4 py-2 rounded-lg text-navy/40 text-sm hover:bg-sand transition-smooth"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              ) : (
                <p className="text-sm text-navy/70 whitespace-pre-wrap">
                  {selectedClass.notes || 'No notes yet'}
                </p>
              )}
            </div>

            {/* Fortnightly Schedule */}
            <div className="mb-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-serif text-xl font-bold text-navy">Fortnightly Schedule</h3>
                <button
                  onClick={() => setShowAllLessons(!showAllLessons)}
                  className="flex items-center gap-2 px-4 py-2 rounded-full bg-sage text-white text-sm font-medium hover:bg-sage/90 transition-smooth"
                >
                  {showAllLessons ? 'Show Schedule' : 'See All Lessons'}
                  <ChevronRight size={14} className={showAllLessons ? 'rotate-90' : ''} />
                </button>
              </div>

              {showAllLessons ? (
                /* All Future Lessons */
                <div className="space-y-2">
                  {futureLessons.length === 0 ? (
                    <p className="text-sm text-navy/30 italic py-4 text-center">No upcoming lessons found</p>
                  ) : (
                    futureLessons.map((slot) => {
                      const content = getLessonForDate(
                        selectedClass.id,
                        slot.dateISO,
                        lessonSequences,
                        lessonSchedules
                      );
                      return (
                        <LessonRow
                          key={slot.key}
                          slot={slot}
                          content={content}
                          accent={getClassColor(selectedClass.id, classes)}
                          onUpdateContent={handleUpdateContent}
                        />
                      );
                    })
                  )}
                </div>
              ) : (
                /* Fortnightly pattern */
                <>
                  {[1, 2].map((weekNum) => {
                    const schedule = getClassSchedule(selectedClass.id, timetableData)
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
      )}
    </div>
  );
}