import React, { useState } from 'react';
import { Clock, Users, MapPin } from 'lucide-react';

// Height breakpoints for adaptive layout
const TALL_THRESHOLD = 120;
const COMPACT_THRESHOLD = 70;

export default function LessonCard({ lesson, height, accent, hasData, onClick, showTitle = false, instanceData = null }) {
  const [showTooltip, setShowTooltip] = useState(false);
  
  const isTall = height >= TALL_THRESHOLD;
  const isCompact = height >= COMPACT_THRESHOLD && height < TALL_THRESHOLD;
  const isTiny = height < COMPACT_THRESHOLD;

  // Get the class object to access className and subject
  const classObj = lesson.class || {};
  const className = classObj.className || lesson.className || 'Unknown Class';
  const subject = classObj.subject || lesson.subject || '';

  const handleClick = (e) => {
    e.stopPropagation();
    onClick(lesson);
  };

  const handleMouseEnter = () => {
    if (showTitle) {
      setShowTooltip(true);
    }
  };

  const handleMouseLeave = () => {
    setShowTooltip(false);
  };

  // Format periods display
  const periodsDisplay = lesson.periods?.join('–') || lesson.period || '';

  return (
    <div 
      className="relative h-full"
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      <button
        onClick={handleClick}
        className="w-full h-full bg-white hover:bg-sand/50 border border-slate-200/60 rounded-lg shadow-sm hover:shadow-md transition-all duration-200 overflow-hidden text-left relative group"
      >
        {/* Left accent bar */}
        <div 
          className="absolute left-0 top-0 bottom-0 w-1 transition-all group-hover:w-1.5"
          style={{ backgroundColor: accent }}
        />

        {/* Content padding */}
        <div className={`pl-3 pr-2 h-full flex flex-col ${isTiny ? 'py-1 justify-center' : 'py-2 justify-between'}`}>
          
          {/* TALL LAYOUT - Full details */}
          {isTall && (
            <>
              <div className="space-y-1.5">
                <div className="flex items-start justify-between gap-2">
                  <h3 className="font-serif font-bold text-navy text-sm leading-tight flex-1" style={{ color: accent }}>
                    {className}
                  </h3>
                  {hasData && (
                    <div className="w-1.5 h-1.5 rounded-full bg-sage shrink-0 mt-1" title="Has lesson content" />
                  )}
                </div>
                
                {subject && (
                  <p className="text-xs text-navy/50 font-medium">{subject}</p>
                )}

                {instanceData?.title && (
                  <p className="text-xs font-medium text-navy/70 italic line-clamp-2 mt-1">
                    "{instanceData.title}"
                  </p>
                )}

                {periodsDisplay && (
                  <span className="inline-block px-2 py-0.5 rounded-md text-xs font-bold bg-slate-100 text-navy/60">
                    P{periodsDisplay}
                  </span>
                )}
              </div>

              <div className="space-y-1 text-xs text-navy/40">
                <div className="flex items-center gap-1.5">
                  <Clock size={12} className="shrink-0" />
                  <span className="font-medium">{lesson.startTime} – {lesson.endTime}</span>
                </div>
                {lesson.room && (
                  <div className="flex items-center gap-1.5">
                    <MapPin size={12} className="shrink-0" />
                    <span>{lesson.room}</span>
                  </div>
                )}
                {lesson.classSize && (
                  <div className="flex items-center gap-1.5">
                    <Users size={12} className="shrink-0" />
                    <span>{lesson.classSize} students</span>
                  </div>
                )}
              </div>
            </>
          )}

          {/* COMPACT LAYOUT - Medium height */}
          {isCompact && (
            <>
              <div className="flex items-start justify-between gap-2">
                <h3 className="font-serif font-bold text-navy text-sm leading-tight" style={{ color: accent }}>
                  {className}
                </h3>
                {hasData && (
                  <div className="w-1.5 h-1.5 rounded-full bg-sage shrink-0 mt-1" />
                )}
              </div>

              {instanceData?.title && (
                <p className="text-xs font-medium text-navy/70 italic line-clamp-1 mb-1">
                  "{instanceData.title}"
                </p>
              )}

              <div className="flex items-center justify-between gap-2 text-xs">
                {periodsDisplay && (
                  <span className="px-1.5 py-0.5 rounded text-xs font-bold bg-slate-100 text-navy/60">
                    P{periodsDisplay}
                  </span>
                )}
                <div className="flex items-center gap-1 text-navy/40">
                  <Clock size={11} />
                  <span className="font-medium">{lesson.startTime}</span>
                </div>
                {lesson.room && (
                  <span className="text-navy/40">{lesson.room}</span>
                )}
              </div>
            </>
          )}

          {/* TINY LAYOUT - Minimal single row */}
          {isTiny && (
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2 min-w-0">
                <h3 className="font-serif font-bold text-xs text-navy truncate" style={{ color: accent }}>
                  {className}
                </h3>
                {hasData && (
                  <div className="w-1.5 h-1.5 rounded-full bg-sage shrink-0" />
                )}
              </div>
              <div className="flex items-center gap-1 text-xs text-navy/40 shrink-0">
                <Clock size={10} />
                <span className="font-medium">{lesson.startTime}</span>
              </div>
            </div>
          )}
        </div>
      </button>

      {/* Hover tooltip for day view */}
      {showTitle && showTooltip && (
        <div className="absolute left-full ml-2 top-0 z-50 w-72 bg-white border border-slate-200 rounded-xl shadow-xl p-4 pointer-events-none">
          <div className="space-y-3">
            <div>
              <h4 className="font-serif font-bold text-navy text-base mb-1" style={{ color: accent }}>
                {className}
              </h4>
              {subject && (
                <p className="text-sm text-navy/50 font-medium">{subject}</p>
              )}
            </div>

            {instanceData?.title && (
              <div>
                <p className="text-xs font-semibold text-navy/40 uppercase tracking-wide mb-1">Lesson Title</p>
                <p className="text-sm font-medium text-navy/80 italic">"{instanceData.title}"</p>
              </div>
            )}

            <div className="grid grid-cols-2 gap-3 text-sm">
              <div className="flex items-center gap-2 text-navy/60">
                <Clock size={14} className="text-navy/40" />
                <span>{lesson.startTime} – {lesson.endTime}</span>
              </div>
              {lesson.room && (
                <div className="flex items-center gap-2 text-navy/60">
                  <MapPin size={14} className="text-navy/40" />
                  <span>{lesson.room}</span>
                </div>
              )}
              {periodsDisplay && (
                <div className="flex items-center gap-2">
                  <span className="px-2 py-0.5 rounded-md text-xs font-bold bg-slate-100 text-navy/60">
                    Period {periodsDisplay}
                  </span>
                </div>
              )}
              {lesson.classSize && (
                <div className="flex items-center gap-2 text-navy/60">
                  <Users size={14} className="text-navy/40" />
                  <span>{lesson.classSize} students</span>
                </div>
              )}
            </div>

            {instanceData?.notes && (
              <div>
                <p className="text-xs font-semibold text-navy/40 uppercase tracking-wide mb-1">Notes</p>
                <p className="text-sm text-navy/70 line-clamp-3">{instanceData.notes}</p>
              </div>
            )}

            {instanceData?.links && instanceData.links.length > 0 && (
              <div>
                <p className="text-xs font-semibold text-navy/40 uppercase tracking-wide mb-1">Resources</p>
                <div className="space-y-1">
                  {instanceData.links.slice(0, 3).map((link, idx) => (
                    <div key={idx} className="text-xs text-sage hover:text-sage/80 truncate">
                      🔗 {link.label || link.url}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {!instanceData && (
              <p className="text-xs text-navy/40 italic">Click to add lesson details</p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}