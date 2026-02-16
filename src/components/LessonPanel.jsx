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

  // Reset local state when lesson changes
  useEffect(() => {
    const content = occurrenceNum !== null
      ? getLessonForOccurrence(lesson.classId, occurrenceNum)
      : null;
    setTitle(content?.title || '');
    setNotes(content?.notes || '');
    setLinks(content?.links || []);
    setCurrentLessonId(content?.id || null);
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
      const newData = { title, notes, links, [field]: value };
      const newLesson = onAddLesson(lesson.classId, newData);
      if (newLesson) {
        setCurrentLessonId(newLesson.id);
      }
    }
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
            className="p-2 rounded-xl text-navy/25 hover:text-navy/50 hover:bg-sand transition-smooth shrink-0"
          >
            <X size={18} />
          </button>
        </div>

        {/* Time & room info bar */}
        <div className="flex items-center gap-4 mt-3 text-navy/40">
          <span className="flex items-center gap-1.5 text-xs">
            <Clock size={13} />
            {formatTime(lesson.startTime)}–{formatTime(lesson.endTime)}
          </span>
          {lesson.room && (
            <span className="flex items-center gap-1.5 text-xs">
              <MapPin size={13} />
              {lesson.room}
            </span>
          )}
          <span className="text-xs">{lesson.subject}</span>
          {occurrenceNum !== null && (
            <span className="text-[10px] font-bold ml-auto px-2 py-0.5 rounded-full"
              style={{ backgroundColor: `${accent}18`, color: accent }}>
              #{occurrenceNum + 1} in sequence
            </span>
          )}
        </div>
      </div>

      {/* Scrollable content */}
      <div className="flex-1 overflow-auto p-5 space-y-5">
        {/* Lesson Title */}
        <div>
          <label className="text-xs font-semibold text-navy/40 uppercase tracking-wider block mb-1.5">
            Lesson Title
          </label>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            onBlur={() => saveField('title', title)}
            placeholder="e.g. Forces & Newton's Laws"
            className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-navy text-sm
                       placeholder:text-navy/20
                       focus:outline-none focus:border-sage focus:ring-2 focus:ring-sage/20
                       transition-smooth"
          />
        </div>

        {/* Lesson Notes */}
        <div>
          <label className="text-xs font-semibold text-navy/40 uppercase tracking-wider block mb-1.5">
            Lesson Notes
          </label>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            onBlur={() => saveField('notes', notes)}
            rows={4}
            placeholder="What to cover, things to remember…"
            className="w-full px-4 py-3 rounded-xl border border-slate-200 text-navy text-sm
                       leading-relaxed placeholder:text-navy/20 resize-none
                       focus:outline-none focus:border-sage focus:ring-2 focus:ring-sage/20
                       transition-smooth"
          />
        </div>

        {/* Links & Files */}
        <div>
          <label className="text-xs font-semibold text-navy/40 uppercase tracking-wider block mb-1.5">
            Links &amp; Resources
          </label>

          {links.length > 0 && (
            <div className="space-y-2 mb-3">
              {links.map((link, i) => (
                <div
                  key={i}
                  className="flex items-center gap-2 bg-sand/50 rounded-xl px-3 py-2 group"
                >
                  <Link2 size={14} className="text-navy/30 shrink-0" />
                  <a
                    href={link.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sm text-sage hover:underline truncate flex-1"
                  >
                    {link.label || link.url}
                  </a>
                  <ExternalLink size={12} className="text-navy/20 shrink-0" />
                  <button
                    onClick={() => removeLink(i)}
                    className="p-1 rounded-lg text-navy/15 hover:text-terracotta hover:bg-[#E07A5F]/10
                               opacity-0 group-hover:opacity-100 transition-smooth shrink-0"
                  >
                    <Trash2 size={13} />
                  </button>
                </div>
              ))}
            </div>
          )}

          {showAddLink ? (
            <div className="space-y-2 p-3 rounded-xl border border-slate-200 bg-white">
              <input
                type="url"
                value={newLinkUrl}
                onChange={(e) => setNewLinkUrl(e.target.value)}
                placeholder="https://..."
                autoFocus
                className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm text-navy
                           placeholder:text-navy/20
                           focus:outline-none focus:border-sage focus:ring-1 focus:ring-sage/20"
              />
              <input
                type="text"
                value={newLinkLabel}
                onChange={(e) => setNewLinkLabel(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') addLink(); }}
                placeholder="Label (optional)"
                className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm text-navy
                           placeholder:text-navy/20
                           focus:outline-none focus:border-sage focus:ring-1 focus:ring-sage/20"
              />
              <div className="flex gap-2">
                <button
                  onClick={addLink}
                  className="px-4 py-1.5 rounded-full text-xs font-bold bg-[#E07A5F] text-white
                             shadow-sm shadow-[#E07A5F]/20 hover:shadow-md transition-smooth"
                >
                  Add
                </button>
                <button
                  onClick={() => { setShowAddLink(false); setNewLinkUrl(''); setNewLinkLabel(''); }}
                  className="px-4 py-1.5 rounded-full text-xs font-medium text-navy/40
                             hover:text-navy/60 hover:bg-sand transition-smooth"
                >
                  Cancel
                </button>
              </div>
            </div>
          ) : (
            <button
              onClick={() => setShowAddLink(true)}
              className="flex items-center gap-2 px-3 py-2 rounded-xl border border-dashed border-slate-200
                         text-xs text-navy/30 hover:text-sage hover:border-sage/30 hover:bg-[#81B29A]/5
                         transition-smooth w-full"
            >
              <Plus size={14} />
              Add link or resource
            </button>
          )}
        </div>

        {/* Class Notes (read-only, from ClassView) */}
        {classData?.notes && (
          <div className="rounded-xl bg-sand/60 p-4">
            <div className="flex items-center gap-2 mb-2">
              <StickyNote size={14} className="text-navy/30" />
              <span className="text-xs font-semibold text-navy/40 uppercase tracking-wider">
                Class Notes — {classData.name}
              </span>
            </div>
            <p className="text-sm text-navy/50 leading-relaxed whitespace-pre-wrap">
              {classData.notes}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}