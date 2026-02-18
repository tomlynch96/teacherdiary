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
  FolderOpen,
  Tag,
  Copy,
  Unlink,
  Link as LinkIcon,
  Check,
} from 'lucide-react';
import { getClassColor, generateTimetableOccurrences } from '../utils/timetable';
import { formatTime, formatDateISO, MONTH_NAMES_SHORT, DAY_NAMES_SHORT } from '../utils/dateHelpers';
import { getClassSchedule } from '../utils/storage';

// ===== ClassView =====
// Left panel: class list. Right panel: class info + lesson sequence management.
// Lessons can be grouped into topics. Topics can be copied between classes
// as linked (edits propagate) or independent copies.

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

/**
 * Group a flat lesson sequence into sections: topic headers and ungrouped lessons.
 * Returns array of { type: 'topic', topicId, topicName, lessons: [...] } or { type: 'lesson', lesson }.
 * Maintains the original order — contiguous lessons with the same topicId are grouped together.
 */
function groupLessonsIntoTopics(classSequence) {
  const groups = [];
  let currentTopic = null;

  for (const lesson of classSequence) {
    if (lesson.topicId) {
      if (currentTopic && currentTopic.topicId === lesson.topicId) {
        currentTopic.lessons.push(lesson);
      } else {
        currentTopic = { type: 'topic', topicId: lesson.topicId, topicName: lesson.topicName, lessons: [lesson] };
        groups.push(currentTopic);
      }
    } else {
      currentTopic = null;
      groups.push({ type: 'lesson', lesson });
    }
  }
  return groups;
}


// --- Topic Header Row ---

function TopicHeaderRow({ topicId, topicName, lessonCount, accent, collapsed, onToggle, onRename, onRemoveTopic, onCopyTopic }) {
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(topicName || '');

  const handleSave = () => {
    if (name.trim()) {
      onRename(topicId, name.trim());
    }
    setEditing(false);
  };

  return (
    <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-sand/60 border border-sand">
      {/* Collapse toggle */}
      <button onClick={onToggle} className="shrink-0 p-0.5 text-navy/30 hover:text-navy/50">
        <ChevronDown size={16} className={`transition-transform ${collapsed ? '-rotate-90' : ''}`} />
      </button>

      {/* Topic icon */}
      <div className="shrink-0 p-1 rounded-lg" style={{ backgroundColor: `${accent}15` }}>
        <FolderOpen size={14} style={{ color: accent }} />
      </div>

      {/* Topic name */}
      {editing ? (
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          onBlur={handleSave}
          onKeyDown={(e) => { if (e.key === 'Enter') handleSave(); if (e.key === 'Escape') setEditing(false); }}
          autoFocus
          className="flex-1 text-sm font-semibold text-navy bg-white px-2 py-0.5 rounded-lg border border-slate-200
                     focus:outline-none focus:border-sage"
        />
      ) : (
        <span className="flex-1 text-sm font-semibold text-navy truncate cursor-pointer"
          onClick={() => setEditing(true)} title="Click to rename topic">
          {topicName || 'Unnamed topic'}
        </span>
      )}

      {/* Lesson count */}
      <span className="text-[10px] font-medium text-navy/30 tabular-nums shrink-0">
        {lessonCount} lesson{lessonCount !== 1 ? 's' : ''}
      </span>

      {/* Copy topic button */}
      <button
        onClick={() => onCopyTopic(topicId, topicName)}
        className="p-1.5 rounded-lg text-navy/20 hover:text-sage hover:bg-sage/5 transition-smooth"
        title="Copy topic to another class"
      >
        <Copy size={13} />
      </button>

      {/* Remove topic grouping */}
      <button
        onClick={() => onRemoveTopic(topicId)}
        className="p-1.5 rounded-lg text-navy/20 hover:text-terracotta hover:bg-terracotta/5 transition-smooth"
        title="Remove topic grouping (lessons remain)"
      >
        <X size={13} />
      </button>
    </div>
  );
}


// --- Copy Topic Modal ---

function CopyTopicModal({ topicName, topicId, sourceClassId, classes, onCopy, onClose }) {
  const [targetClassId, setTargetClassId] = useState('');
  const [linked, setLinked] = useState(false);

  const otherClasses = classes.filter(c => c.id !== sourceClassId);

  const handleCopy = () => {
    if (!targetClassId) return;
    onCopy(sourceClassId, topicId, targetClassId, linked);
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/30 backdrop-blur-sm z-50 flex items-center justify-center p-4"
      onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden"
        onClick={(e) => e.stopPropagation()}>

        {/* Header */}
        <div className="px-6 py-5 border-b border-slate-100">
          <div className="flex items-center justify-between">
            <h3 className="font-serif font-bold text-navy text-lg">Copy Topic</h3>
            <button onClick={onClose} className="p-1.5 rounded-lg text-navy/30 hover:text-navy/60 hover:bg-sand">
              <X size={18} />
            </button>
          </div>
          <p className="text-sm text-navy/50 mt-1">
            Copy <strong className="text-navy/70">"{topicName}"</strong> to another class
          </p>
        </div>

        {/* Body */}
        <div className="px-6 py-5 space-y-5">

          {/* Target class picker */}
          <div>
            <label className="block text-xs font-semibold text-navy/40 uppercase tracking-wider mb-2">
              Copy to class
            </label>
            <div className="space-y-1.5">
              {otherClasses.map(cls => {
                const color = getClassColor(cls.id, classes);
                const isSelected = targetClassId === cls.id;
                return (
                  <button key={cls.id}
                    onClick={() => setTargetClassId(cls.id)}
                    className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl border text-left transition-smooth
                      ${isSelected
                        ? 'border-sage bg-sage/5 ring-2 ring-sage/20'
                        : 'border-slate-100 hover:border-slate-200 hover:bg-slate-50'}`}>
                    <div className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: color }} />
                    <span className="font-serif font-bold text-navy text-sm">{cls.name}</span>
                    <span className="text-xs text-navy/30 ml-auto">{cls.subject}</span>
                    {isSelected && <Check size={16} className="text-sage shrink-0" />}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Link mode toggle */}
          <div>
            <label className="block text-xs font-semibold text-navy/40 uppercase tracking-wider mb-2">
              Copy mode
            </label>
            <div className="space-y-2">
              <button
                onClick={() => setLinked(false)}
                className={`w-full flex items-start gap-3 px-4 py-3 rounded-xl border text-left transition-smooth
                  ${!linked
                    ? 'border-sage bg-sage/5 ring-2 ring-sage/20'
                    : 'border-slate-100 hover:border-slate-200'}`}>
                <Copy size={16} className={`mt-0.5 shrink-0 ${!linked ? 'text-sage' : 'text-navy/25'}`} />
                <div>
                  <p className={`text-sm font-semibold ${!linked ? 'text-navy' : 'text-navy/60'}`}>Independent copy</p>
                  <p className="text-xs text-navy/40 mt-0.5">
                    Lessons are copied as separate entities. Editing one won't affect the other.
                  </p>
                </div>
              </button>

              <button
                onClick={() => setLinked(true)}
                className={`w-full flex items-start gap-3 px-4 py-3 rounded-xl border text-left transition-smooth
                  ${linked
                    ? 'border-sage bg-sage/5 ring-2 ring-sage/20'
                    : 'border-slate-100 hover:border-slate-200'}`}>
                <LinkIcon size={16} className={`mt-0.5 shrink-0 ${linked ? 'text-sage' : 'text-navy/25'}`} />
                <div>
                  <p className={`text-sm font-semibold ${linked ? 'text-navy' : 'text-navy/60'}`}>Linked copy</p>
                  <p className="text-xs text-navy/40 mt-0.5">
                    Lessons stay connected. Editing the title, notes, or links in one class updates all linked copies.
                  </p>
                </div>
              </button>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-slate-100 flex items-center justify-end gap-3">
          <button onClick={onClose}
            className="px-4 py-2 rounded-full text-xs font-medium text-navy/40 hover:text-navy/60 hover:bg-sand transition-smooth">
            Cancel
          </button>
          <button onClick={handleCopy} disabled={!targetClassId}
            className={`flex items-center gap-2 px-5 py-2.5 rounded-full text-xs font-bold shadow-sm transition-smooth
              ${targetClassId
                ? 'bg-[#E07A5F] text-white shadow-[#E07A5F]/20 hover:shadow-md hover:shadow-[#E07A5F]/30'
                : 'bg-slate-100 text-navy/25 cursor-not-allowed'}`}>
            <Copy size={13} />
            Copy {linked ? '& Link' : 'Topic'}
          </button>
        </div>
      </div>
    </div>
  );
}


// --- Topic Assignment Popover ---

function TopicAssignPopover({ lesson, classSequence, accent, onAssign, onClose, triggerRef }) {
  const [newTopicName, setNewTopicName] = useState('');
  const popoverRef = React.useRef(null);
  const [position, setPosition] = useState({ top: 0, left: 0 });

  // Position the popover near the trigger button
  React.useEffect(() => {
    if (triggerRef?.current) {
      const rect = triggerRef.current.getBoundingClientRect();
      setPosition({
        top: rect.bottom + 4,
        left: Math.min(rect.right - 256, window.innerWidth - 272), // 256 = popover width, keep on screen
      });
    }
  }, [triggerRef]);

  // Get existing topics from the class sequence
  const existingTopics = useMemo(() => {
    const topicMap = new Map();
    for (const l of classSequence) {
      if (l.topicId && !topicMap.has(l.topicId)) {
        topicMap.set(l.topicId, l.topicName);
      }
    }
    return Array.from(topicMap.entries()).map(([id, name]) => ({ id, name }));
  }, [classSequence]);

  const handleCreateNew = () => {
    if (!newTopicName.trim()) return;
    const topicId = `topic-${Date.now()}`;
    onAssign(lesson.id, topicId, newTopicName.trim());
    onClose();
  };

  const handleAssignExisting = (topicId, topicName) => {
    onAssign(lesson.id, topicId, topicName);
    onClose();
  };

  const handleRemove = () => {
    onAssign(lesson.id, null, null);
    onClose();
  };

  return (
    <>
      {/* Invisible backdrop to close on outside click */}
      <div className="fixed inset-0 z-40" onClick={onClose} />

      {/* Popover */}
      <div ref={popoverRef}
        className="fixed z-50 w-64 bg-white rounded-xl border border-slate-200 shadow-xl p-3 space-y-2"
        style={{ top: position.top, left: position.left }}
        onClick={(e) => e.stopPropagation()}>
        <p className="text-[10px] font-semibold text-navy/30 uppercase tracking-wider">Assign to topic</p>

        {/* Existing topics */}
        {existingTopics.length > 0 && (
          <div className="space-y-1">
            {existingTopics.map(t => (
              <button key={t.id} onClick={() => handleAssignExisting(t.id, t.name)}
                className={`w-full flex items-center gap-2 px-3 py-2 rounded-lg text-left text-xs transition-smooth
                  ${lesson.topicId === t.id ? 'bg-sage/10 text-sage font-semibold' : 'text-navy/60 hover:bg-sand'}`}>
                <FolderOpen size={12} />
                {t.name}
                {lesson.topicId === t.id && <Check size={12} className="ml-auto" />}
              </button>
            ))}
          </div>
        )}

        {/* Create new */}
        <div className="border-t border-slate-100 pt-2">
          <div className="flex gap-1.5">
            <input value={newTopicName} onChange={(e) => setNewTopicName(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') handleCreateNew(); }}
              placeholder="New topic name..."
              autoFocus
              className="flex-1 px-2.5 py-1.5 rounded-lg border border-slate-200 text-xs text-navy
                         placeholder:text-navy/20 focus:outline-none focus:border-sage" />
            <button onClick={handleCreateNew}
              className="px-2.5 py-1.5 rounded-lg text-[10px] font-bold bg-sage text-white hover:bg-sage/90">
              Add
            </button>
          </div>
        </div>

        {/* Remove from topic */}
        {lesson.topicId && (
          <button onClick={handleRemove}
            className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-xs text-terracotta/60 hover:text-terracotta hover:bg-terracotta/5 transition-smooth">
            <X size={12} /> Remove from topic
          </button>
        )}
      </div>
    </>
  );
}


// --- Inline Lesson Row (for editing a lesson in the sequence) ---

function LessonSequenceRow({
  lesson,
  index,
  scheduledOccurrence,
  accent,
  classSequence,
  onUpdate,
  onDelete,
  onSyncToDate,
  onAssignTopic,
  onUnlink,
  onDragStart,
  onDragOver,
  onDrop,
  isDragging,
  insideTopic,
}) {
  const [title, setTitle] = useState(lesson.title || '');
  const [notes, setNotes] = useState(lesson.notes || '');
  const [links, setLinks] = useState(lesson.links || []);
  const [showAddLink, setShowAddLink] = useState(false);
  const [newLinkUrl, setNewLinkUrl] = useState('');
  const [newLinkLabel, setNewLinkLabel] = useState('');
  const [expanded, setExpanded] = useState(false);
  const [showTopicPopover, setShowTopicPopover] = useState(false);
  const dateInputRef = React.useRef(null);
  const tagButtonRef = React.useRef(null);

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
  const isLinked = !!lesson.linkedSourceId;

  return (
    <div
      draggable
      onDragStart={(e) => onDragStart(e, index)}
      onDragOver={(e) => onDragOver(e, index)}
      onDrop={(e) => onDrop(e, index)}
      className={`border border-slate-100 rounded-2xl bg-white transition-smooth hover:border-slate-200
        ${isDragging ? 'opacity-40 scale-95' : ''}
        ${insideTopic ? 'ml-6' : ''}`}
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

        {/* Linked indicator */}
        {isLinked && (
          <span className="shrink-0" title="Linked — edits sync across classes">
            <LinkIcon size={12} className="text-sage/60" />
          </span>
        )}

        {/* Title or placeholder */}
        <span
          className={`flex-1 text-sm truncate ${title ? 'text-navy font-medium' : 'text-navy/25 italic'}`}
          onClick={() => setExpanded(!expanded)}
        >
          {title || 'Untitled lesson'}
        </span>

        {/* Topic badge (when not inside a topic group) */}
        {!insideTopic && lesson.topicName && (
          <span className="text-[9px] font-semibold px-2 py-0.5 rounded-full bg-sand text-navy/40 shrink-0 truncate max-w-[100px]">
            {lesson.topicName}
          </span>
        )}

        {/* Topic assign button — always visible */}
        <div className="shrink-0">
          <button
            ref={tagButtonRef}
            onClick={(e) => { e.stopPropagation(); setShowTopicPopover(!showTopicPopover); }}
            className={`p-1.5 rounded-lg transition-smooth ${lesson.topicId
              ? 'text-sage/50 hover:text-sage hover:bg-sage/5'
              : 'text-navy/15 hover:text-navy/30 hover:bg-sand'}`}
            title="Assign to topic"
          >
            <Tag size={14} />
          </button>
          {showTopicPopover && (
            <TopicAssignPopover
              lesson={lesson}
              classSequence={classSequence}
              accent={accent}
              onAssign={onAssignTopic}
              onClose={() => setShowTopicPopover(false)}
              triggerRef={tagButtonRef}
            />
          )}
        </div>

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
          {/* Linked lesson banner */}
          {isLinked && (
            <div className="flex items-center justify-between bg-sage/5 border border-sage/10 rounded-xl px-3 py-2">
              <div className="flex items-center gap-2">
                <LinkIcon size={13} className="text-sage/60" />
                <span className="text-[11px] text-sage/70 font-medium">Linked — edits sync to other classes</span>
              </div>
              <button
                onClick={() => onUnlink(lesson.id)}
                className="flex items-center gap-1 px-2 py-1 rounded-full text-[10px] font-medium text-navy/30 hover:text-terracotta hover:bg-terracotta/5 transition-smooth"
              >
                <Unlink size={11} /> Unlink
              </button>
            </div>
          )}

          {/* Scheduled for banner */}
          {scheduledOccurrence && (
            <div className="flex items-center gap-2 bg-sand/60 rounded-xl px-3 py-2">
              <CalendarRange size={13} className="text-navy/25 shrink-0" />
              <span className="text-xs text-navy/40">
                Scheduled for{' '}
                <strong className="text-navy/60">
                  {formatShortDate(scheduledOccurrence.date)} · {formatTime(scheduledOccurrence.startTime)} · P{scheduledOccurrence.period}
                </strong>
                {scheduledOccurrence.room && (
                  <span className="text-navy/30"> · {scheduledOccurrence.room}</span>
                )}
              </span>
            </div>
          )}

          {/* Title */}
          <div>
            <label className="text-[10px] font-semibold text-navy/25 uppercase tracking-wider mb-1 block">Title</label>
            <input type="text" value={title} onChange={(e) => setTitle(e.target.value)}
              onBlur={() => save({ title })}
              placeholder="Lesson title…"
              className="w-full px-3 py-2 rounded-xl border border-slate-200 text-sm text-navy
                         placeholder:text-navy/20 focus:outline-none focus:border-sage focus:ring-2 focus:ring-sage/20" />
          </div>

          {/* Notes */}
          <div>
            <label className="text-[10px] font-semibold text-navy/25 uppercase tracking-wider mb-1 block">Notes</label>
            <textarea value={notes} onChange={(e) => setNotes(e.target.value)}
              onBlur={() => save({ notes })}
              placeholder="Lesson notes…" rows={3}
              className="w-full px-3 py-2 rounded-xl border border-slate-200 text-sm text-navy leading-relaxed
                         placeholder:text-navy/20 focus:outline-none focus:border-sage focus:ring-2 focus:ring-sage/20 resize-none" />
          </div>

          {/* Links */}
          <div>
            <label className="text-[10px] font-semibold text-navy/25 uppercase tracking-wider mb-1 block">Links & Resources</label>
            {links.length > 0 && (
              <div className="space-y-1.5 mb-2">
                {links.map((link, i) => (
                  <div key={i} className="flex items-center gap-2 bg-sand/40 rounded-lg px-3 py-2">
                    <Link2 size={12} className="text-navy/20 shrink-0" />
                    <a href={link.url} target="_blank" rel="noopener noreferrer"
                      className="flex-1 text-xs text-sage hover:underline truncate">
                      {link.label || link.url}
                    </a>
                    <button onClick={() => removeLink(i)} className="p-1 text-navy/15 hover:text-terracotta">
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
  onCopyTopic,
  onRenameTopic,
  onRemoveTopic,
  onUnlinkLesson,
  onAddLessonToTopic,
}) {
  const [selectedClassId, setSelectedClassId] = useState(null);
  const [editingField, setEditingField] = useState(null);
  const [editValue, setEditValue] = useState('');
  const [showAllLessons, setShowAllLessons] = useState(false);
  const [dragIndex, setDragIndex] = useState(null);
  const [collapsedTopics, setCollapsedTopics] = useState(new Set());
  const [copyModalData, setCopyModalData] = useState(null); // { topicId, topicName }

  const classes = timetableData?.classes || [];
  const selectedClass = classes.find((c) => c.id === selectedClassId);

  // Get the lesson sequence for the selected class
  const classSequence = useMemo(() => {
    if (!selectedClass) return [];
    const seq = lessonSequences[selectedClass.id] || [];
    return [...seq].sort((a, b) => a.order - b.order);
  }, [selectedClass, lessonSequences]);

  // Group lessons into topics
  const groupedSequence = useMemo(() => {
    return groupLessonsIntoTopics(classSequence);
  }, [classSequence]);

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
      setCollapsedTopics(new Set());
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

  // Handle assigning a topic to a lesson
  const handleAssignTopic = (lessonId, topicId, topicName) => {
    if (!selectedClass) return;
    onUpdateLesson(selectedClass.id, lessonId, { topicId, topicName });
  };

  // Handle adding a new lesson inside a topic (auto-assigns topic, propagates to linked classes)
  const handleAddLessonToTopic = (topicId, topicName) => {
    if (!selectedClass) return;
    onAddLessonToTopic(selectedClass.id, topicId, topicName, {});
  };

  // Handle unlinking a lesson
  const handleUnlink = (lessonId) => {
    if (!selectedClass) return;
    onUnlinkLesson(selectedClass.id, lessonId);
  };

  // Topic collapse/expand
  const toggleTopicCollapse = (topicId) => {
    setCollapsedTopics(prev => {
      const next = new Set(prev);
      if (next.has(topicId)) next.delete(topicId);
      else next.add(topicId);
      return next;
    });
  };

  // Handle rename topic
  const handleRenameTopic = (topicId, newName) => {
    if (!selectedClass) return;
    onRenameTopic(selectedClass.id, topicId, newName);
  };

  // Handle remove topic grouping
  const handleRemoveTopic = (topicId) => {
    if (!selectedClass) return;
    onRemoveTopic(selectedClass.id, topicId);
  };

  // Open copy topic modal
  const handleOpenCopyModal = (topicId, topicName) => {
    setCopyModalData({ topicId, topicName });
  };

  // Handle the actual copy
  const handleCopyTopic = (sourceClassId, topicId, targetClassId, linked) => {
    onCopyTopic(sourceClassId, topicId, targetClassId, linked);
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

  // Sync a lesson to a specific date
  const handleSyncToDate = (lessonOrder, dateISO) => {
    if (!selectedClass) return;
    const targetOcc = occurrences.find(occ => occ.dateISO >= dateISO);
    if (!targetOcc) return;
    const newStartIndex = targetOcc.occurrenceNum - lessonOrder;
    onUpdateSchedule(selectedClass.id, { startIndex: Math.max(0, newStartIndex) });
  };

  // Build a flat index for drag-drop that accounts for topic grouping
  // (We use the flat classSequence index for drag-drop regardless of grouping)

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
                              ${isSelected ? 'rotate-90 text-navy/40' : 'group-hover:text-navy/40'}`} />
                        </div>
                        {!selectedClass && (
                          <>
                            <p className="text-sm text-navy/40 mt-0.5">{cls.subject}</p>
                            <div className="flex items-center gap-4 mt-3 text-xs text-navy/30">
                              <span className="flex items-center gap-1.5">
                                <Clock size={13} /> {lessonCount} per fortnight
                              </span>
                              {cls.classSize && (
                                <span className="flex items-center gap-1.5">
                                  <Users size={13} /> {cls.classSize}
                                </span>
                              )}
                            </div>
                            {rooms.length > 0 && (
                              <div className="flex items-center gap-1.5 mt-1.5 text-xs text-navy/25">
                                <MapPin size={12} /> {rooms.join(', ')}
                              </div>
                            )}
                          </>
                        )}
                        {selectedClass && (
                          <p className="text-xs text-navy/30 mt-0.5">{cls.subject} · {lessonCount}/fn</p>
                        )}
                      </div>
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* ===== Detail Panel ===== */}
      {selectedClass && (
        <div className="flex-1 flex flex-col min-h-0 min-w-0 bg-cream">
          <header className="shrink-0 px-8 py-5 border-b border-slate-100 bg-white/80 backdrop-blur-sm">
            <div className="flex items-center gap-3">
              <div className="w-4 h-4 rounded-full" style={{ backgroundColor: getClassColor(selectedClass.id, classes) }} />
              <div>
                <h2 className="font-serif text-2xl font-bold text-navy">{selectedClass.name}</h2>
                <p className="text-sm text-navy/40">{selectedClass.subject} · {selectedClass.timetableCode || selectedClass.id}</p>
              </div>
            </div>
          </header>

          <div className="flex-1 overflow-auto px-8 py-6">
            {/* Class Info Section */}
            <div className="space-y-6 mb-8">
              {/* Class Size */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-navy/40">
                  <Users size={16} />
                  <span className="text-sm font-medium">Class size</span>
                </div>
                {editingField === 'classSize' ? (
                  <div className="flex items-center gap-2">
                    <input type="number" value={editValue} onChange={(e) => setEditValue(e.target.value)}
                      onKeyDown={(e) => { if (e.key === 'Enter') saveEdit(selectedClass.id, 'classSize'); if (e.key === 'Escape') cancelEdit(); }}
                      autoFocus
                      className="w-20 px-3 py-1.5 rounded-xl border border-slate-200 text-sm text-navy text-right
                                 focus:outline-none focus:border-sage" />
                    <button onClick={() => saveEdit(selectedClass.id, 'classSize')}
                      className="p-1.5 rounded-lg text-sage hover:bg-sage/10"><Save size={14} /></button>
                    <button onClick={cancelEdit}
                      className="p-1.5 rounded-lg text-navy/30 hover:bg-sand"><X size={14} /></button>
                  </div>
                ) : (
                  <button onClick={() => startEdit('classSize', selectedClass.classSize)}
                    className="flex items-center gap-2 text-sm text-navy hover:text-sage transition-smooth group">
                    <span>{selectedClass.classSize || '—'}</span>
                    <Pencil size={13} className="text-navy/15 group-hover:text-sage" />
                  </button>
                )}
              </div>

              {/* Class Notes */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2 text-navy/40">
                    <StickyNote size={16} />
                    <span className="text-sm font-medium">Class notes</span>
                  </div>
                  {editingField !== 'notes' && (
                    <button onClick={() => startEdit('notes', selectedClass.notes)}
                      className="p-2 rounded-xl text-navy/20 hover:text-navy/50 hover:bg-sand transition-smooth shrink-0">
                      <Pencil size={15} />
                    </button>
                  )}
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
                /* ===== Lesson Sequence — grouped by topics, drag-drop reorderable ===== */
                <div className="space-y-2">
                  {classSequence.length === 0 ? (
                    <p className="text-sm text-navy/30 italic py-4 text-center">
                      No lessons planned yet. Add your first lesson below.
                    </p>
                  ) : (
                    groupedSequence.map((group, gi) => {
                      if (group.type === 'topic') {
                        const isCollapsed = collapsedTopics.has(group.topicId);
                        return (
                          <div key={group.topicId} className="space-y-1.5">
                            <TopicHeaderRow
                              topicId={group.topicId}
                              topicName={group.topicName}
                              lessonCount={group.lessons.length}
                              accent={getClassColor(selectedClass.id, classes)}
                              collapsed={isCollapsed}
                              onToggle={() => toggleTopicCollapse(group.topicId)}
                              onRename={handleRenameTopic}
                              onRemoveTopic={handleRemoveTopic}
                              onCopyTopic={handleOpenCopyModal}
                            />
                            {!isCollapsed && group.lessons.map((lesson) => {
                              const flatIndex = classSequence.findIndex(l => l.id === lesson.id);
                              return (
                                <LessonSequenceRow
                                  key={lesson.id}
                                  lesson={lesson}
                                  index={flatIndex}
                                  scheduledOccurrence={getScheduledOccurrence(lesson.order)}
                                  accent={getClassColor(selectedClass.id, classes)}
                                  classSequence={classSequence}
                                  onUpdate={handleUpdateLesson}
                                  onDelete={handleDeleteLesson}
                                  onSyncToDate={handleSyncToDate}
                                  onAssignTopic={handleAssignTopic}
                                  onUnlink={handleUnlink}
                                  onDragStart={handleDragStart}
                                  onDragOver={handleDragOver}
                                  onDrop={handleDrop}
                                  isDragging={dragIndex === flatIndex}
                                  insideTopic={true}
                                />
                              );
                            })}
                            {/* Add lesson to this topic */}
                            {!isCollapsed && (
                              <button
                                onClick={() => handleAddLessonToTopic(group.topicId, group.topicName)}
                                className="ml-6 w-[calc(100%-1.5rem)] flex items-center justify-center gap-2 py-2 rounded-xl
                                           border border-dashed border-slate-200
                                           text-xs font-medium text-navy/25
                                           hover:text-sage hover:border-sage/30 hover:bg-[#81B29A]/5
                                           transition-smooth"
                              >
                                <Plus size={14} />
                                Add lesson to {group.topicName}
                              </button>
                            )}
                          </div>
                        );
                      } else {
                        const lesson = group.lesson;
                        const flatIndex = classSequence.findIndex(l => l.id === lesson.id);
                        return (
                          <LessonSequenceRow
                            key={lesson.id}
                            lesson={lesson}
                            index={flatIndex}
                            scheduledOccurrence={getScheduledOccurrence(lesson.order)}
                            accent={getClassColor(selectedClass.id, classes)}
                            classSequence={classSequence}
                            onUpdate={handleUpdateLesson}
                            onDelete={handleDeleteLesson}
                            onSyncToDate={handleSyncToDate}
                            onAssignTopic={handleAssignTopic}
                            onUnlink={handleUnlink}
                            onDragStart={handleDragStart}
                            onDragOver={handleDragOver}
                            onDrop={handleDrop}
                            isDragging={dragIndex === flatIndex}
                            insideTopic={false}
                          />
                        );
                      }
                    })
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
                              <div className="flex items-center gap-2">
                                <span className="text-xs font-semibold text-navy/50 w-20">{slot.dayName}</span>
                                <span className="text-xs text-navy/30 tabular-nums">
                                  {formatTime(slot.startTime)}–{formatTime(slot.endTime)}
                                </span>
                              </div>
                              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-sand text-navy/40">
                                P{slot.period}
                              </span>
                              {slot.room && (
                                <span className="text-xs text-navy/25 flex items-center gap-1">
                                  <MapPin size={11} /> {slot.room}
                                </span>
                              )}
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

      {/* Copy Topic Modal */}
      {copyModalData && selectedClass && (
        <CopyTopicModal
          topicName={copyModalData.topicName}
          topicId={copyModalData.topicId}
          sourceClassId={selectedClass.id}
          classes={classes}
          onCopy={handleCopyTopic}
          onClose={() => setCopyModalData(null)}
        />
      )}
    </div>
  );
}