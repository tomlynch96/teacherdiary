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
  List,
} from 'lucide-react';
import { formatTime, formatDateLong, formatDateISO } from '../utils/dateHelpers';
import { getClassColor } from '../utils/timetable';
import { getLessonForDate, getSequenceIndexForDate } from '../utils/lessonSequence';
import {
  getClassSequence,
  updateLessonInSequence,
  scheduleLesson,
  unscheduleLesson,
} from '../utils/storage';

// ===== LessonPanel =====
// Slide-out panel for editing lesson content and scheduling
// Now uses the lesson sequence system instead of lessonInstances

export default function LessonPanel({
  lesson,
  timetableData,
  lessonSequences,
  lessonSchedules,
  onUpdateSequences,
  onUpdateSchedules,
  onClose,
}) {
  const classes = timetableData?.classes || [];
  const classData = classes.find((c) => c.id === lesson.classId);
  const accent = getClassColor(lesson.classId, classes);
  const dateStr = formatDateISO(lesson.date);
  
  // Get the lesson from the sequence if scheduled
  const scheduledLesson = getLessonForDate(lesson.classId, dateStr);
  const sequenceIndex = getSequenceIndexForDate(lesson.classId, dateStr);
  
  // Local editing state
  const [title, setTitle] = useState(scheduledLesson?.title || '');
  const [notes, setNotes] = useState(scheduledLesson?.notes || '');
  const [links, setLinks] = useState(scheduledLesson?.links || []);
  const [newLinkUrl, setNewLinkUrl] = useState('');
  const [newLinkLabel, setNewLinkLabel] = useState('');
  const [showAddLink, setShowAddLink] = useState(false);

  // Reset local state when lesson changes
  useEffect(() => {
    const currentLesson = getLessonForDate(lesson.classId, dateStr);
    setTitle(currentLesson?.title || '');
    setNotes(currentLesson?.notes || '');
    setLinks(currentLesson?.links || []);
    setShowAddLink(false);
    setNewLinkUrl('');
    setNewLinkLabel('');
  }, [lesson.classId, dateStr]);

  // Save changes to the lesson in the sequence
  const saveToSequence = (updates) => {
    if (scheduledLesson && scheduledLesson.id) {
      const updatedSequences = updateLessonInSequence(
        lesson.classId,
        scheduledLesson.id,
        updates
      );
      onUpdateSequences(updatedSequences);
    }
  };

  const handleTitleBlur = () => {
    if (title !== (scheduledLesson?.title || '')) {
      saveToSequence({ title });
    }
  };

  const handleNotesBlur = () => {
    if (notes !== (scheduledLesson?.notes || '')) {
      saveToSequence({ notes });
    }
  };

  const addLink = () => {
    if (!newLinkUrl.trim()) return;
    const updated = [...links, { 
      url: newLinkUrl.trim(), 
      label: newLinkLabel.trim() || newLinkUrl.trim() 
    }];
    setLinks(updated);
    saveToSequence({ links: updated });
    setNewLinkUrl('');
    setNewLinkLabel('');
    setShowAddLink(false);
  };

  const removeLink = (index) => {
    const updated = links.filter((_, i) => i !== index);
    setLinks(updated);
    saveToSequence({ links: updated });
  };

  const sequenceInfo = scheduledLesson ? (
    <div className="flex items-center gap-2 text-xs text-navy/40">
      <List size={13} />
      <span>Lesson {(sequenceIndex ?? 0) + 1} in sequence</span>
    </div>
  ) : null;

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
        </div>

        {sequenceInfo && (
          <div className="mt-3 pt-3 border-t border-slate-100">
            {sequenceInfo}
          </div>
        )}
      </div>

      {/* Scrollable content */}
      <div className="flex-1 overflow-auto p-5 space-y-5">
        {!scheduledLesson ? (
          <div className="p-4 rounded-xl bg-navy/5 text-center">
            <p className="text-sm text-navy/60">
              No lesson content scheduled for this date yet.
            </p>
            <p className="text-xs text-navy/40 mt-1">
              Add lessons to this class's sequence in Class View.
            </p>
          </div>
        ) : (
          <>
            {/* Lesson Title */}
            <div>
              <label className="text-xs font-semibold text-navy/40 uppercase tracking-wider block mb-1.5">
                Lesson Title
              </label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                onBlur={handleTitleBlur}
                placeholder="e.g. Forces & Newton's Laws"
                className="w-full px-4 py-2.5 rounded-xl border border-slate-100 focus:border-sage focus:ring-2 focus:ring-sage/20 outline-none transition-smooth text-navy"
              />
            </div>

            {/* Lesson Notes */}
            <div>
              <label className="text-xs font-semibold text-navy/40 uppercase tracking-wider block mb-1.5">
                Notes
              </label>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                onBlur={handleNotesBlur}
                placeholder="Add any teaching notes, reminders, or preparation details..."
                rows={5}
                className="w-full px-4 py-2.5 rounded-xl border border-slate-100 focus:border-sage focus:ring-2 focus:ring-sage/20 outline-none transition-smooth text-navy resize-none"
              />
            </div>

            {/* Links */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="text-xs font-semibold text-navy/40 uppercase tracking-wider">
                  Resources & Links
                </label>
                {!showAddLink && (
                  <button
                    onClick={() => setShowAddLink(true)}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium text-sage hover:bg-sage/10 transition-smooth"
                  >
                    <Plus size={13} /> Add Link
                  </button>
                )}
              </div>

              {/* Link list */}
              {links.length > 0 && (
                <div className="space-y-2 mb-3">
                  {links.map((link, i) => (
                    <div key={i} className="flex items-center gap-2 p-3 rounded-xl bg-sand/50 group hover:bg-sand transition-smooth">
                      <Link2 size={14} className="text-navy/30 shrink-0" />
                      <div className="flex-1 min-w-0">
                        <a
                          href={link.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-sm text-sage hover:underline flex items-center gap-1.5 truncate"
                        >
                          <span className="truncate">{link.label}</span>
                          <ExternalLink size={12} className="shrink-0" />
                        </a>
                      </div>
                      <button
                        onClick={() => removeLink(i)}
                        className="p-1.5 rounded-lg text-navy/25 opacity-0 group-hover:opacity-100 hover:text-terracotta hover:bg-terracotta/10 transition-smooth shrink-0"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  ))}
                </div>
              )}

              {/* Add link form */}
              {showAddLink && (
                <div className="p-4 rounded-xl bg-sand/30 space-y-3">
                  <input
                    type="url"
                    value={newLinkUrl}
                    onChange={(e) => setNewLinkUrl(e.target.value)}
                    placeholder="https://example.com/worksheet.pdf"
                    className="w-full px-3 py-2 rounded-lg border border-slate-100 focus:border-sage focus:ring-2 focus:ring-sage/20 outline-none transition-smooth text-sm"
                  />
                  <input
                    type="text"
                    value={newLinkLabel}
                    onChange={(e) => setNewLinkLabel(e.target.value)}
                    placeholder="Link label (optional)"
                    className="w-full px-3 py-2 rounded-lg border border-slate-100 focus:border-sage focus:ring-2 focus:ring-sage/20 outline-none transition-smooth text-sm"
                  />
                  <div className="flex gap-2">
                    <button
                      onClick={addLink}
                      className="flex-1 px-4 py-2 rounded-lg bg-sage text-white font-medium text-sm hover:bg-sage/90 transition-smooth"
                    >
                      Add Link
                    </button>
                    <button
                      onClick={() => {
                        setShowAddLink(false);
                        setNewLinkUrl('');
                        setNewLinkLabel('');
                      }}
                      className="px-4 py-2 rounded-lg border border-slate-100 text-navy/60 font-medium text-sm hover:bg-sand/50 transition-smooth"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              )}
            </div>
          </>
        )}

        {/* Class Notes (read-only) */}
        {classData?.notes && (
          <div className="pt-5 border-t border-slate-100">
            <div className="flex items-center gap-2 mb-2">
              <StickyNote size={14} className="text-navy/30" />
              <label className="text-xs font-semibold text-navy/40 uppercase tracking-wider">
                Class Notes
              </label>
            </div>
            <p className="text-sm text-navy/60 leading-relaxed whitespace-pre-wrap">
              {classData.notes}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}