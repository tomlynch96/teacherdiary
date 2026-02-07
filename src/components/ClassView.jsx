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
} from 'lucide-react';
import { getClassColor, generateFutureLessons, lessonInstanceKey } from '../utils/timetable';
import { formatTime, formatDateISO, MONTH_NAMES_SHORT, DAY_NAMES_SHORT } from '../utils/dateHelpers';

// ===== ClassView =====
// Left panel: class list. Right panel: class info + "See All" future lessons.
// "See All" shows an inline scrollable list of every upcoming lesson with
// inline-editable title, notes, and links — no modals needed.

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


// --- Inline Lesson Row (for the "See All" list) ---

function LessonRow({ slot, instance, accent, onUpdateInstance }) {
  const [title, setTitle] = useState(instance.title || '');
  const [notes, setNotes] = useState(instance.notes || '');
  const [links, setLinks] = useState(instance.links || []);
  const [showAddLink, setShowAddLink] = useState(false);
  const [newLinkUrl, setNewLinkUrl] = useState('');
  const [newLinkLabel, setNewLinkLabel] = useState('');
  const [expanded, setExpanded] = useState(false);

  // Sync from parent when instance changes externally
  React.useEffect(() => {
    setTitle(instance.title || '');
    setNotes(instance.notes || '');
    setLinks(instance.links || []);
  }, [instance]);

  const save = (updates) => {
    onUpdateInstance(slot.key, { ...instance, ...updates });
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
      {/* Collapsed row — always visible */}
      <div
        className="flex items-center gap-3 px-4 py-3 cursor-pointer select-none"
        onClick={() => setExpanded(!expanded)}
      >
        {/* Date pill */}
        <div className="shrink-0 w-24">
          <p className="text-sm font-medium text-navy">{formatShortDate(slot.date)}</p>
        </div>

        {/* Time */}
        <span className="text-xs text-navy/40 font-serif tabular-nums shrink-0 w-24">
          {formatTime(slot.startTime)}–{formatTime(slot.endTime)}
        </span>

        {/* Period badge */}
        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full shrink-0"
          style={{ backgroundColor: `${accent}18`, color: accent }}>
          P{slot.period}
        </span>

        {/* Title preview or placeholder */}
        <span className={`flex-1 text-sm truncate ${title ? 'text-navy' : 'text-navy/20 italic'}`}>
          {title || 'No title'}
        </span>

        {/* Indicators */}
        {hasContent && !expanded && (
          <div className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: accent }} />
        )}

        <ChevronDown size={16}
          className={`text-navy/20 transition-smooth shrink-0 ${expanded ? 'rotate-180' : ''}`} />
      </div>

      {/* Expanded editing area */}
      {expanded && (
        <div className="px-4 pb-4 pt-1 space-y-3 border-t border-slate-50">
          {/* Room info */}
          {slot.room && (
            <div className="flex items-center gap-1.5 text-xs text-navy/30">
              <MapPin size={12} /> {slot.room}
            </div>
          )}

          {/* Title */}
          <div>
            <label className="text-[10px] font-semibold text-navy/30 uppercase tracking-wider block mb-1">
              Lesson Title
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              onBlur={() => save({ title })}
              placeholder="e.g. Forces & Newton's Laws"
              className="w-full px-3 py-2 rounded-xl border border-slate-200 text-navy text-sm
                         placeholder:text-navy/20 focus:outline-none focus:border-sage
                         focus:ring-2 focus:ring-sage/20 transition-smooth"
            />
          </div>

          {/* Notes */}
          <div>
            <label className="text-[10px] font-semibold text-navy/30 uppercase tracking-wider block mb-1">
              Notes
            </label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              onBlur={() => save({ notes })}
              rows={2}
              placeholder="What to cover…"
              className="w-full px-3 py-2 rounded-xl border border-slate-200 text-navy text-sm
                         leading-relaxed placeholder:text-navy/20 resize-none
                         focus:outline-none focus:border-sage focus:ring-2 focus:ring-sage/20 transition-smooth"
            />
          </div>

          {/* Links */}
          <div>
            <label className="text-[10px] font-semibold text-navy/30 uppercase tracking-wider block mb-1">
              Links &amp; Resources
            </label>
            {links.length > 0 && (
              <div className="space-y-1.5 mb-2">
                {links.map((link, i) => (
                  <div key={i} className="flex items-center gap-2 bg-sand/50 rounded-lg px-2.5 py-1.5 group">
                    <Link2 size={12} className="text-navy/25 shrink-0" />
                    <a href={link.url} target="_blank" rel="noopener noreferrer"
                      className="text-xs text-sage hover:underline truncate flex-1">
                      {link.label || link.url}
                    </a>
                    <ExternalLink size={10} className="text-navy/15 shrink-0" />
                    <button onClick={() => removeLink(i)}
                      className="p-0.5 rounded text-navy/10 hover:text-terracotta
                                 opacity-0 group-hover:opacity-100 transition-smooth shrink-0">
                      <Trash2 size={12} />
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
        </div>
      )}
    </div>
  );
}


// --- Main Component ---

export default function ClassView({ timetableData, lessonInstances, onUpdateClass, onUpdateInstance }) {
  const [selectedClassId, setSelectedClassId] = useState(null);
  const [editingField, setEditingField] = useState(null);
  const [editValue, setEditValue] = useState('');
  const [showAllLessons, setShowAllLessons] = useState(false);

  const classes = timetableData?.classes || [];
  const selectedClass = classes.find((c) => c.id === selectedClassId);

  // Generate future lessons for the selected class
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
      if (value !== null && isNaN(value)) { setEditingField(null); return; }
    }
    onUpdateClass(classId, { [field]: value });
    setEditingField(null);
  };

  const cancelEdit = () => { setEditingField(null); setEditValue(''); };

  // Reset view state when selecting a different class
  const selectClass = (id) => {
    if (selectedClassId === id) {
      setSelectedClassId(null);
    } else {
      setSelectedClassId(id);
      setShowAllLessons(false);
      setEditingField(null);
    }
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
      {selectedClass && (
        <div className="flex-1 flex flex-col min-h-0 overflow-auto">
          <div className="max-w-2xl w-full mx-auto p-8">
            {/* Class header */}
            <div className="flex items-center gap-4 mb-8">
              <div className="w-12 h-12 rounded-2xl flex items-center justify-center shrink-0"
                style={{ backgroundColor: `${getClassColor(selectedClass.id, classes)}20` }}>
                <BookOpen size={22} style={{ color: getClassColor(selectedClass.id, classes) }} />
              </div>
              <div>
                <h2 className="font-serif text-2xl font-bold text-navy">{selectedClass.name}</h2>
                <p className="text-sm text-navy/40">
                  {selectedClass.subject}
                  {selectedClass.timetableCode && ` · ${selectedClass.timetableCode}`}
                </p>
              </div>
            </div>

            {/* Editable fields */}
            <div className="space-y-4 mb-10">
              {/* Class Size */}
              <div className="bg-white rounded-2xl border border-slate-100 p-5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Users size={18} className="text-navy/30" />
                    <div>
                      <p className="text-xs font-semibold text-navy/40 uppercase tracking-wider">Class Size</p>
                      {editingField === 'classSize' ? (
                        <div className="flex items-center gap-2 mt-1">
                          <input type="number" min="0" max="99" value={editValue}
                            onChange={(e) => setEditValue(e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') saveEdit(selectedClass.id, 'classSize');
                              if (e.key === 'Escape') cancelEdit();
                            }}
                            autoFocus
                            className="w-20 px-3 py-1.5 rounded-xl border border-slate-200 text-navy font-serif font-bold text-lg
                                       focus:outline-none focus:border-sage focus:ring-2 focus:ring-sage/20" />
                          <button onClick={() => saveEdit(selectedClass.id, 'classSize')}
                            className="p-1.5 rounded-full bg-sage/10 text-sage hover:bg-sage/20 transition-smooth">
                            <Save size={14} />
                          </button>
                          <button onClick={cancelEdit}
                            className="p-1.5 rounded-full bg-slate-100 text-navy/30 hover:bg-slate-200 transition-smooth">
                            <X size={14} />
                          </button>
                        </div>
                      ) : (
                        <p className="font-serif font-bold text-navy text-lg mt-0.5">
                          {selectedClass.classSize ?? <span className="text-navy/20 text-sm font-sans font-normal italic">Not set</span>}
                          {selectedClass.classSize && <span className="text-navy/30 text-sm font-sans font-normal ml-1">students</span>}
                        </p>
                      )}
                    </div>
                  </div>
                  {editingField !== 'classSize' && (
                    <button onClick={() => startEdit('classSize', selectedClass.classSize)}
                      className="p-2 rounded-xl text-navy/20 hover:text-navy/50 hover:bg-sand transition-smooth">
                      <Pencil size={15} />
                    </button>
                  )}
                </div>
              </div>

              {/* Class Notes */}
              <div className="bg-white rounded-2xl border border-slate-100 p-5">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <StickyNote size={15} className="text-navy/30" />
                      <p className="text-xs font-semibold text-navy/40 uppercase tracking-wider">Class Notes</p>
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

            {/* Fortnightly Schedule + See All toggle */}
            <div>
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-serif font-bold text-navy text-lg">
                  {showAllLessons ? 'All Upcoming Lessons' : 'Fortnightly Schedule'}
                </h3>
                <button
                  onClick={() => setShowAllLessons(!showAllLessons)}
                  className="flex items-center gap-1.5 px-4 py-2 rounded-full text-xs font-bold
                             bg-[#E07A5F] text-white shadow-sm shadow-[#E07A5F]/20
                             hover:shadow-md hover:shadow-[#E07A5F]/30 transition-smooth"
                >
                  <CalendarRange size={14} />
                  {showAllLessons ? 'Show Schedule' : 'See All'}
                </button>
              </div>

              {showAllLessons ? (
                /* ===== All Future Lessons — inline editable ===== */
                <div className="space-y-2">
                  {futureLessons.length === 0 ? (
                    <p className="text-sm text-navy/30 italic py-4 text-center">No upcoming lessons found</p>
                  ) : (
                    futureLessons.map((slot) => {
                      const inst = lessonInstances[slot.key] || { title: '', notes: '', links: [] };
                      return (
                        <LessonRow
                          key={slot.key}
                          slot={slot}
                          instance={inst}
                          accent={getClassColor(selectedClass.id, classes)}
                          onUpdateInstance={onUpdateInstance}
                        />
                      );
                    })
                  )}
                </div>
              ) : (
                /* ===== Fortnightly pattern ===== */
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