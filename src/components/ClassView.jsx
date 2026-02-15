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
      current = { ...lesson, dayName: dayNames[lesson.dayOfWeek] };
    }
  }
  if (current) merged.push(current);
  return merged;
}

// --- LessonRow Component ---
// Each row is a future lesson that can be expanded inline to edit title, notes, links.

function LessonRow({ slot, instance, accent, onUpdateInstance }) {
  const [expanded, setExpanded] = useState(false);
  const [title, setTitle] = useState(instance.title || '');
  const [notes, setNotes] = useState(instance.notes || '');
  const [links, setLinks] = useState(instance.links || []);
  const [showAddLink, setShowAddLink] = useState(false);
  const [newLinkUrl, setNewLinkUrl] = useState('');
  const [newLinkLabel, setNewLinkLabel] = useState('');

  const hasData = !!(instance.title || instance.notes || instance.links?.length);

  const saveTitle = () => onUpdateInstance(slot.key, { ...instance, title });
  const saveNotes = () => onUpdateInstance(slot.key, { ...instance, notes });

  const addLink = () => {
    if (!newLinkUrl.trim()) return;
    const updated = [...links, { url: newLinkUrl, label: newLinkLabel }];
    setLinks(updated);
    onUpdateInstance(slot.key, { ...instance, links: updated });
    setNewLinkUrl('');
    setNewLinkLabel('');
    setShowAddLink(false);
  };

  const removeLink = (idx) => {
    const updated = links.filter((_, i) => i !== idx);
    setLinks(updated);
    onUpdateInstance(slot.key, { ...instance, links: updated });
  };

  const dateObj = new Date(slot.date);
  const dayShort = DAY_NAMES_SHORT[dateObj.getDay()];
  const monthShort = MONTH_NAMES_SHORT[dateObj.getMonth()];

  return (
    <div className="bg-white rounded-xl border border-slate-100 overflow-hidden">
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center gap-3 px-4 py-3 hover:bg-sand/30 transition-smooth text-left"
      >
        <div className="w-1 h-10 rounded-full shrink-0" style={{ backgroundColor: accent }} />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium text-navy">
              {dayShort} {dateObj.getDate()} {monthShort}
            </span>
            <span className="text-xs text-navy/30 font-serif tabular-nums">
              {formatTime(slot.startTime)}–{formatTime(slot.endTime)}
            </span>
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full"
              style={{ backgroundColor: `${accent}18`, color: accent }}>
              P{slot.period}
            </span>
            {slot.room && <span className="text-xs text-navy/25 ml-auto truncate">{slot.room}</span>}
          </div>
          {instance.title && (
            <p className="text-xs text-navy/50 mt-1 truncate">{instance.title}</p>
          )}
        </div>
        {hasData && <div className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: accent }} />}
        <ChevronDown
          size={16}
          className={`text-navy/20 shrink-0 transition-smooth ${expanded ? 'rotate-180' : ''}`}
        />
      </button>

      {expanded && (
        <div className="px-4 pb-4 pt-1 space-y-3 border-t border-slate-50">
          {/* Title */}
          <div>
            <label className="flex items-center gap-2 text-[10px] font-semibold uppercase tracking-wider text-navy/30 mb-1.5">
              <BookOpen size={11} /> Lesson Title
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              onBlur={saveTitle}
              placeholder="e.g. Forces & Newton's Laws"
              className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm text-navy
                         placeholder:text-navy/20 focus:outline-none focus:border-sage focus:ring-2 focus:ring-sage/20"
            />
          </div>

          {/* Notes */}
          <div>
            <label className="flex items-center gap-2 text-[10px] font-semibold uppercase tracking-wider text-navy/30 mb-1.5">
              <StickyNote size={11} /> Notes
            </label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              onBlur={saveNotes}
              rows={3}
              placeholder="Add notes about this lesson…"
              className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm text-navy leading-relaxed
                         placeholder:text-navy/20 focus:outline-none focus:border-sage focus:ring-2 focus:ring-sage/20 resize-none"
            />
          </div>

          {/* Links */}
          <div>
            <label className="flex items-center gap-2 text-[10px] font-semibold uppercase tracking-wider text-navy/30 mb-1.5">
              <Link2 size={11} /> Resources
            </label>
            {links.length > 0 && (
              <div className="space-y-1.5 mb-2">
                {links.map((link, idx) => (
                  <div key={idx} className="flex items-center gap-2 bg-sand/40 rounded-lg px-2.5 py-1.5">
                    <a
                      href={link.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex-1 flex items-center gap-1.5 text-xs text-navy hover:text-sage transition-smooth truncate"
                    >
                      <ExternalLink size={11} className="shrink-0" />
                      <span className="truncate">{link.label || link.url}</span>
                    </a>
                    <button
                      onClick={() => removeLink(idx)}
                      className="p-1 rounded hover:bg-white hover:text-terracotta transition-smooth shrink-0"
                    >
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
        </div>
      )}
    </div>
  );
}


// --- Main Component ---

export default function ClassView({ timetableData, lessonInstances, onUpdateClass, onUpdateInstance, settings }) {
  const [selectedClassId, setSelectedClassId] = useState(null);
  const [editingField, setEditingField] = useState(null);
  const [editValue, setEditValue] = useState('');
  const [showAllLessons, setShowAllLessons] = useState(false);

  const classes = timetableData?.classes || [];
  const selectedClass = classes.find((c) => c.id === selectedClassId);

  // Generate future lessons for the selected class
  const futureLessons = useMemo(() => {
    console.log('🔍 ClassView generating lessons');
    console.log('  Settings:', settings);
    console.log('  Holiday weeks:', settings?.holidayWeeks);
    
    if (!selectedClass) return [];
    return generateFutureLessons(selectedClass.id, timetableData, 26, settings);
  }, [selectedClass, timetableData, settings]);

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
                style={{ backgroundColor: `${getClassColor(selectedClass.id, classes)}18` }}>
                <span className="font-serif font-bold text-lg" style={{ color: getClassColor(selectedClass.id, classes) }}>
                  {selectedClass.name.charAt(0)}
                </span>
              </div>
              <div>
                <h2 className="font-serif text-2xl font-bold text-navy">{selectedClass.name}</h2>
                <p className="text-sm text-navy/50 font-medium">{selectedClass.subject}</p>
              </div>
            </div>

            {/* Class info cards */}
            <div className="grid grid-cols-2 gap-4 mb-8">
              {/* Class Size */}
              <div className="bg-white rounded-2xl border border-slate-100 p-5">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <Users size={16} className="text-navy/30" />
                    <h3 className="text-xs font-semibold uppercase tracking-wider text-navy/30">Class Size</h3>
                  </div>
                  {editingField !== 'classSize' && (
                    <button onClick={() => startEdit('classSize', selectedClass.classSize)}
                      className="p-1.5 rounded-lg text-navy/20 hover:text-navy/50 hover:bg-sand transition-smooth">
                      <Pencil size={13} />
                    </button>
                  )}
                </div>
                {editingField === 'classSize' ? (
                  <div className="space-y-2">
                    <input
                      type="number"
                      value={editValue}
                      onChange={(e) => setEditValue(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') saveEdit(selectedClass.id, 'classSize');
                        if (e.key === 'Escape') cancelEdit();
                      }}
                      autoFocus
                      min="1"
                      placeholder="e.g. 24"
                      className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm text-navy
                                 focus:outline-none focus:border-sage focus:ring-2 focus:ring-sage/20"
                    />
                    <div className="flex items-center gap-2">
                      <button onClick={() => saveEdit(selectedClass.id, 'classSize')}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold
                                   bg-[#E07A5F] text-white shadow-sm shadow-[#E07A5F]/20">
                        <Save size={11} /> Save
                      </button>
                      <button onClick={cancelEdit}
                        className="px-3 py-1.5 rounded-full text-xs font-medium text-navy/40 hover:text-navy/60 hover:bg-sand transition-smooth">
                        Cancel
                      </button>
                    </div>
                  </div>
                ) : (
                  <p className="text-2xl font-serif font-bold text-navy">
                    {selectedClass.classSize || <span className="text-navy/20 text-lg">—</span>}
                  </p>
                )}
              </div>

              {/* Timetable Code */}
              <div className="bg-white rounded-2xl border border-slate-100 p-5">
                <div className="flex items-center gap-2 mb-3">
                  <BookOpen size={16} className="text-navy/30" />
                  <h3 className="text-xs font-semibold uppercase tracking-wider text-navy/30">Timetable Code</h3>
                </div>
                <p className="text-lg font-medium text-navy font-mono">
                  {selectedClass.timetableCode || <span className="text-navy/20">—</span>}
                </p>
              </div>
            </div>

            {/* Class Notes */}
            <div className="bg-white rounded-2xl border border-slate-100 p-5 mb-8">
              <div className="flex items-start gap-3">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-3">
                    <StickyNote size={16} className="text-navy/30" />
                    <h3 className="text-xs font-semibold uppercase tracking-wider text-navy/30">Class Notes</h3>
                    <span className="text-[10px] text-navy/20 italic">(shown on every lesson)</span>
                  </div>
                  <div>
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