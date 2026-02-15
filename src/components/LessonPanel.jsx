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
import { formatTime, formatDateLong } from '../utils/dateHelpers';
import { getClassColor } from '../utils/timetable';

export default function LessonPanel({
  lesson,
  timetableData,
  lessonContent,
  onUpdateLesson,
  onClose,
}) {
  const classes = timetableData?.classes || [];
  const classData = classes.find((c) => c.id === lesson.classId);
  const accent = getClassColor(lesson.classId, classes);

  const [title, setTitle] = useState(lessonContent?.title || '');
  const [notes, setNotes] = useState(lessonContent?.notes || '');
  const [links, setLinks] = useState(lessonContent?.links || []);
  const [newLinkUrl, setNewLinkUrl] = useState('');
  const [newLinkLabel, setNewLinkLabel] = useState('');
  const [showAddLink, setShowAddLink] = useState(false);

  useEffect(() => {
    setTitle(lessonContent?.title || '');
    setNotes(lessonContent?.notes || '');
    setLinks(lessonContent?.links || []);
    setShowAddLink(false);
    setNewLinkUrl('');
    setNewLinkLabel('');
  }, [lessonContent]);

  const saveField = (field, value) => {
    if (lessonContent?.id) {
      onUpdateLesson(lesson.classId, lessonContent.id, { [field]: value });
    }
  };

  const addLink = () => {
    if (!newLinkUrl.trim()) return;
    const updated = [...links, { url: newLinkUrl.trim(), label: newLinkLabel.trim() || newLinkUrl.trim() }];
    setLinks(updated);
    if (lessonContent?.id) {
      onUpdateLesson(lesson.classId, lessonContent.id, { links: updated });
    }
    setNewLinkUrl('');
    setNewLinkLabel('');
    setShowAddLink(false);
  };

  const removeLink = (index) => {
    const updated = links.filter((_, i) => i !== index);
    setLinks(updated);
    if (lessonContent?.id) {
      onUpdateLesson(lesson.classId, lessonContent.id, { links: updated });
    }
  };

  return (
    <div className="w-[420px] shrink-0 border-l border-slate-100 bg-white flex flex-col h-full overflow-hidden">
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
                {classData?.name || lesson.classId}
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
      </div>

      <div className="flex-1 overflow-auto p-5 space-y-5">
        <div>
          <label className="text-xs font-semibold text-navy/40 uppercase tracking-wider block mb-1.5">
            Lesson Title
          </label>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            onBlur={() => saveField('title', title)}
            placeholder="e.g. Newton's Laws"
            className="w-full px-3 py-2 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-sage/30 focus:border-sage text-navy placeholder:text-navy/30"
          />
        </div>

        <div>
          <label className="text-xs font-semibold text-navy/40 uppercase tracking-wider block mb-1.5">
            Notes
          </label>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            onBlur={() => saveField('notes', notes)}
            placeholder="Lesson plan, objectives, activities..."
            rows={6}
            className="w-full px-3 py-2 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-sage/30 focus:border-sage text-navy placeholder:text-navy/30 resize-none"
          />
        </div>

        <div>
          <div className="flex items-center justify-between mb-2">
            <label className="text-xs font-semibold text-navy/40 uppercase tracking-wider">
              Resources & Links
            </label>
            {!showAddLink && (
              <button
                onClick={() => setShowAddLink(true)}
                className="text-xs text-sage hover:text-[#6d9a80] font-medium flex items-center gap-1">
                <Plus size={14} />
                Add Link
              </button>
            )}
          </div>

          {showAddLink && (
            <div className="p-3 rounded-xl border border-sage/20 bg-[#81B29A]/5 mb-3 space-y-2">
              <input
                type="url"
                value={newLinkUrl}
                onChange={(e) => setNewLinkUrl(e.target.value)}
                placeholder="https://..."
                className="w-full px-3 py-1.5 rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-sage/30 text-sm"
              />
              <input
                type="text"
                value={newLinkLabel}
                onChange={(e) => setNewLinkLabel(e.target.value)}
                placeholder="Label (optional)"
                className="w-full px-3 py-1.5 rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-sage/30 text-sm"
              />
              <div className="flex gap-2">
                <button
                  onClick={addLink}
                  className="flex-1 px-3 py-1.5 bg-sage text-white rounded-lg hover:bg-[#6d9a80] transition-smooth text-sm font-medium">
                  Add
                </button>
                <button
                  onClick={() => {
                    setShowAddLink(false);
                    setNewLinkUrl('');
                    setNewLinkLabel('');
                  }}
                  className="px-3 py-1.5 text-navy/40 hover:text-navy/60 transition-smooth text-sm">
                  Cancel
                </button>
              </div>
            </div>
          )}

          {links.length > 0 ? (
            <div className="space-y-2">
              {links.map((link, i) => (
                <div
                  key={i}
                  className="group flex items-center gap-2 p-2 rounded-lg hover:bg-sand transition-smooth"
                >
                  <Link2 size={14} className="text-navy/30 shrink-0" />
                  <a
                    href={link.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex-1 text-sm text-sage hover:underline truncate"
                  >
                    {link.label || link.url}
                  </a>
                  <ExternalLink size={12} className="text-navy/20 shrink-0" />
                  <button
                    onClick={() => removeLink(i)}
                    className="opacity-0 group-hover:opacity-100 p-1 text-terracotta/60 hover:text-terracotta transition-smooth shrink-0"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              ))}
            </div>
          ) : (
            !showAddLink && (
              <p className="text-sm text-navy/30 italic">No resources added yet</p>
            )
          )}
        </div>

        {classData?.notes && (
          <div className="pt-4 border-t border-slate-100">
            <div className="flex items-center gap-2 mb-2">
              <StickyNote size={14} className="text-navy/30" />
              <label className="text-xs font-semibold text-navy/40 uppercase tracking-wider">
                Class Notes
              </label>
            </div>
            <p className="text-sm text-navy/60 bg-sand/50 p-3 rounded-xl">
              {classData.notes}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}