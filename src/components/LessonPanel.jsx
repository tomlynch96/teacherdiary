import React, { useState, useEffect } from 'react';
import {
  X,
  Clock,
  MapPin,
  BookOpen,
  FileText,
  Link2,
  Plus,
  Trash2,
  ExternalLink,
  StickyNote,
  ClipboardCheck,
  Printer,
} from 'lucide-react';
import { formatTime, formatDateLong, formatDateISO } from '../utils/dateHelpers';
import { getClassColor, getOccurrenceForDate } from '../utils/timetable';
import { getLessonForOccurrence } from '../utils/storage';

// ===== LessonPanel =====
// Slide-out panel that opens when you click a lesson on the week view.
// Now works with the lesson sequence system:
// - Looks up which occurrence number this date/time maps to
// - Gets the lesson content from the sequence via that occurrence
// - Creates a new lesson in the sequence if none exists yet

export default function LessonPanel({
  lesson,
  timetableData,
  lessonSequences,
  lessonSchedules,
  onUpdateLesson,
  onAddLesson,
  onClose,
}) {
  const classes = timetableData?.classes || [];
  const classData = classes.find((c) => c.id === lesson.classId);
  const accent = getClassColor(lesson.classId, classes);
  const dateStr = formatDateISO(lesson.date);

  // Find the occurrence number for this lesson slot
  const occurrenceNum = getOccurrenceForDate(
    lesson.classId,
    dateStr,
    lesson.startTime,
    timetableData
  );

  // Get the lesson content from the sequence
  const lessonContent = occurrenceNum !== null
    ? getLessonForOccurrence(lesson.classId, occurrenceNum)
    : null;

  // Local editing state
  const [title, setTitle] = useState(lessonContent?.title || '');
  const [notes, setNotes] = useState(lessonContent?.notes || '');
  const [links, setLinks] = useState(lessonContent?.links || []);
  const [newLinkUrl, setNewLinkUrl] = useState('');
  const [newLinkLabel, setNewLinkLabel] = useState('');
  const [showAddLink, setShowAddLink] = useState(false);
  const [currentLessonId, setCurrentLessonId] = useState(lessonContent?.id || null);
  const [fullyPlanned, setFullyPlanned] = useState(lessonContent?.fullyPlanned || false);
  const [allPrinted, setAllPrinted] = useState(lessonContent?.allPrinted || false);

  // Reset local state when lesson changes
  useEffect(() => {
    const content = occurrenceNum !== null
      ? getLessonForOccurrence(lesson.classId, occurrenceNum)
      : null;
    setTitle(content?.title || '');
    setNotes(content?.notes || '');
    setLinks(content?.links || []);
    setCurrentLessonId(content?.id || null);
    setFullyPlanned(content?.fullyPlanned || false);
    setAllPrinted(content?.allPrinted || false);
    setShowAddLink(false);
    setNewLinkUrl('');
    setNewLinkLabel('');
  }, [lesson.classId, dateStr, occurrenceNum, lessonSequences, lessonSchedules]);

  // Save a field — creates a new lesson in the sequence if needed
  const saveField = (field, value) => {
    if (currentLessonId) {
      // Update existing lesson
      onUpdateLesson(lesson.classId, currentLessonId, { [field]: value });
    } else {
      // Create new lesson in sequence
      const newData = { title, notes, links, fullyPlanned, allPrinted, [field]: value };
      const newLesson = onAddLesson(lesson.classId, newData);
      if (newLesson) {
        setCurrentLessonId(newLesson.id);
      }
    }
  };

  const toggleFullyPlanned = () => {
    const newVal = !fullyPlanned;
    setFullyPlanned(newVal);
    saveField('fullyPlanned', newVal);
  };

  const toggleAllPrinted = () => {
    const newVal = !allPrinted;
    setAllPrinted(newVal);
    saveField('allPrinted', newVal);
  };

  const addLink = () => {
    if (!newLinkUrl.trim()) return;
    const updated = [...links, { url: newLinkUrl.trim(), label: newLinkLabel.trim() || newLinkUrl.trim() }];
    setLinks(updated);
    saveField('links', updated);
    setNewLinkUrl('');
    setNewLinkLabel('');
    setShowAddLink(false);
  };

  const removeLink = (index) => {
    const updated = links.filter((_, i) => i !== index);
    setLinks(updated);
    saveField('links', updated);
  };

  return (
    <div className="w-[420px] shrink-0 border-l border-slate-100 bg-white flex flex-col h-full overflow-hidden">
      {/* Header */}
      <div className="shrink-0 p-5 border-b border-slate-100">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <div
              className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
              style={{ backgroundColor: `${accent}18` }}
            >
              <BookOpen size={18} style={{ color: accent }} />
            </div>
            <div className="min-w-0">
              <h3 className="font-serif font-bold text-navy text-lg leading-tight truncate">
                {lesson.className}
              </h3>
              <p className="text-xs text-navy/40">
                {formatDateLong(lesson.date)} · P{lesson.period}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl text-navy/30 hover:text-navy/60 hover:bg-sand transition-all"
          >
            <X size={18} />
          </button>
        </div>

        {/* Status toggles */}
        <div className="flex items-center gap-2 mt-3">
          <button
            onClick={toggleFullyPlanned}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold transition-all ${
              fullyPlanned
                ? 'bg-sage/15 text-sage border border-sage/30'
                : 'bg-slate-50 text-navy/30 border border-slate-200 hover:border-sage/30 hover:text-navy/50'
            }`}
          >
            <ClipboardCheck size={13} strokeWidth={fullyPlanned ? 2.5 : 1.5} />
            {fullyPlanned ? 'Fully Planned' : 'Mark Planned'}
          </button>
          <button
            onClick={toggleAllPrinted}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold transition-all ${
              allPrinted
                ? 'bg-sage/15 text-sage border border-sage/30'
                : 'bg-slate-50 text-navy/30 border border-slate-200 hover:border-sage/30 hover:text-navy/50'
            }`}
          >
            <Printer size={13} strokeWidth={allPrinted ? 2.5 : 1.5} />
            {allPrinted ? 'All Printed' : 'Mark Printed'}
          </button>
        </div>
      </div>

      {/* Body — scrollable */}
      <div className="flex-1 overflow-y-auto p-5 space-y-5">
        {/* Lesson info */}
        <div className="flex items-center gap-3 text-xs text-navy/40">
          <div className="flex items-center gap-1.5">
            <Clock size={13} />
            <span>{lesson.startTime} – {lesson.endTime}</span>
          </div>
          {lesson.room && (
            <div className="flex items-center gap-1.5">
              <MapPin size={13} />
              <span>{lesson.room}</span>
            </div>
          )}
        </div>

        {/* Title */}
        <div>
          <label className="flex items-center gap-1.5 text-[11px] font-semibold text-navy/40 uppercase tracking-wide mb-2">
            <FileText size={12} /> Lesson Title
          </label>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            onBlur={() => saveField('title', title)}
            placeholder="e.g. Forces & Newton's Laws"
            className="w-full px-3 py-2 rounded-xl border border-slate-200 text-sm text-navy
                       placeholder:text-navy/20 focus:outline-none focus:border-sage transition-colors"
          />
        </div>

        {/* Notes */}
        <div>
          <label className="flex items-center gap-1.5 text-[11px] font-semibold text-navy/40 uppercase tracking-wide mb-2">
            <StickyNote size={12} /> Notes
          </label>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            onBlur={() => saveField('notes', notes)}
            placeholder="Lesson notes, reminders, key points..."
            rows={4}
            className="w-full px-3 py-2 rounded-xl border border-slate-200 text-sm text-navy
                       placeholder:text-navy/20 focus:outline-none focus:border-sage transition-colors resize-none"
          />
        </div>

        {/* Links */}
        <div>
          <label className="flex items-center gap-1.5 text-[11px] font-semibold text-navy/40 uppercase tracking-wide mb-2">
            <Link2 size={12} /> Resources & Links
          </label>

          {links.length > 0 && (
            <div className="space-y-1.5 mb-3">
              {links.map((link, i) => (
                <div key={i} className="flex items-center gap-2 group">
                  <a
                    href={link.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex-1 flex items-center gap-2 px-3 py-2 rounded-lg bg-sand/50 hover:bg-sand
                               text-xs text-navy/60 hover:text-sage transition-all truncate"
                  >
                    <ExternalLink size={12} className="shrink-0" />
                    <span className="truncate">{link.label || link.url}</span>
                  </a>
                  <button
                    onClick={() => removeLink(i)}
                    className="p-1.5 rounded-lg text-navy/20 hover:text-terracotta hover:bg-terracotta/5
                               opacity-0 group-hover:opacity-100 transition-all"
                  >
                    <Trash2 size={12} />
                  </button>
                </div>
              ))}
            </div>
          )}

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
                  className="px-3 py-1 rounded-full text-[10px] font-bold bg-terracotta text-white"
                >
                  Add
                </button>
                <button
                  onClick={() => { setShowAddLink(false); setNewLinkUrl(''); setNewLinkLabel(''); }}
                  className="px-3 py-1 rounded-full text-[10px] text-navy/40 hover:bg-sand"
                >
                  Cancel
                </button>
              </div>
            </div>
          ) : (
            <button
              onClick={() => setShowAddLink(true)}
              className="flex items-center gap-1.5 text-[11px] text-navy/25 hover:text-sage transition-all"
            >
              <Plus size={12} /> Add link
            </button>
          )}
        </div>

        {/* Class notes (read-only) */}
        {classData?.notes && (
          <div className="pt-3 border-t border-slate-100">
            <label className="flex items-center gap-1.5 text-[11px] font-semibold text-navy/40 uppercase tracking-wide mb-2">
              <BookOpen size={12} /> Class Notes
            </label>
            <p className="text-xs text-navy/40 leading-relaxed">{classData.notes}</p>
          </div>
        )}
      </div>
    </div>
  );
}