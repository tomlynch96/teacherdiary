import React, { useState, useRef } from 'react';
import { Upload, FileJson, CheckCircle2, AlertCircle, Sparkles } from 'lucide-react';
import { validateTimetableJSON } from '../utils/timetable';

// ===== FileImport =====
// Shown when no timetable is loaded. Handles JSON file upload + validation.
// Also provides a "Load Demo" option using a condensed version of the real timetable.

// Condensed demo — a subset of the real two-week timetable so you can test quickly.
const DEMO_DATA = {
  teacher: { name: 'Mr Tom Lynch', exportDate: '2026-01-21' },
  twoWeekTimetable: true,
  classes: [
    { id: '12G2', name: '12G2', subject: 'Physics', classSize: null, timetableCode: '12G2/Ph' },
    { id: '10TS1', name: '10TS1', subject: 'Physics', classSize: null, timetableCode: '10TS1/Ph' },
    { id: '10TS2', name: '10TS2', subject: 'Physics', classSize: null, timetableCode: '10TS2/Ph' },
    { id: '13G2', name: '13G2', subject: 'Physics', classSize: null, timetableCode: '13G2/Ph' },
    { id: '9p', name: '9p', subject: 'Science', classSize: null, timetableCode: '9p/Sc3' },
    { id: '8A3', name: '8A3', subject: 'Science', classSize: null, timetableCode: '8A3/Sc' },
    { id: '7UP1', name: '7UP1', subject: 'Science', classSize: null, timetableCode: '7UP1/Sc' },
    { id: '11ab', name: '11ab', subject: 'Science', classSize: null, timetableCode: '11ab/Sc1' },
  ],
  recurringLessons: [
    // Week 1 Monday
    { id: 'w1-mon-3a-12G2', weekNumber: 1, dayOfWeek: 1, startTime: '11:30', endTime: '12:00', classId: '12G2', subject: 'Physics', room: 'C304 Classroom', period: '3a' },
    { id: 'w1-mon-3b-12G2', weekNumber: 1, dayOfWeek: 1, startTime: '12:00', endTime: '12:30', classId: '12G2', subject: 'Physics', room: 'C304 Classroom', period: '3b' },
    { id: 'w1-mon-4b-9p', weekNumber: 1, dayOfWeek: 1, startTime: '13:10', endTime: '13:30', classId: '9p', subject: 'Science', room: 'B206 Science Lab', period: '4b' },
    { id: 'w1-mon-4c-9p', weekNumber: 1, dayOfWeek: 1, startTime: '13:30', endTime: '14:10', classId: '9p', subject: 'Science', room: 'B206 Science Lab', period: '4c' },
    { id: 'w1-mon-5a-10TS2', weekNumber: 1, dayOfWeek: 1, startTime: '14:10', endTime: '14:40', classId: '10TS2', subject: 'Physics', room: 'B106 Science Lab', period: '5a' },
    { id: 'w1-mon-5b-10TS2', weekNumber: 1, dayOfWeek: 1, startTime: '14:40', endTime: '15:10', classId: '10TS2', subject: 'Physics', room: 'B106 Science Lab', period: '5b' },
    // Week 1 Tuesday
    { id: 'w1-tue-1a-10TS1', weekNumber: 1, dayOfWeek: 2, startTime: '09:10', endTime: '09:40', classId: '10TS1', subject: 'Physics', room: 'B206 Science Lab', period: '1a' },
    { id: 'w1-tue-1b-10TS1', weekNumber: 1, dayOfWeek: 2, startTime: '09:40', endTime: '10:10', classId: '10TS1', subject: 'Physics', room: 'B206 Science Lab', period: '1b' },
    { id: 'w1-tue-2a-8A3', weekNumber: 1, dayOfWeek: 2, startTime: '10:10', endTime: '10:30', classId: '8A3', subject: 'Science', room: 'B206 Science Lab', period: '2a' },
    { id: 'w1-tue-2b-8A3', weekNumber: 1, dayOfWeek: 2, startTime: '10:30', endTime: '11:10', classId: '8A3', subject: 'Science', room: 'B206 Science Lab', period: '2b' },
    { id: 'w1-tue-3a-7UP1', weekNumber: 1, dayOfWeek: 2, startTime: '11:30', endTime: '12:00', classId: '7UP1', subject: 'Science', room: 'B206 Science Lab', period: '3a' },
    { id: 'w1-tue-3b-7UP1', weekNumber: 1, dayOfWeek: 2, startTime: '12:00', endTime: '12:30', classId: '7UP1', subject: 'Science', room: 'B206 Science Lab', period: '3b' },
    { id: 'w1-tue-4b-11ab', weekNumber: 1, dayOfWeek: 2, startTime: '13:10', endTime: '13:30', classId: '11ab', subject: 'Science', room: 'B206 Science Lab', period: '4b' },
    { id: 'w1-tue-4c-11ab', weekNumber: 1, dayOfWeek: 2, startTime: '13:30', endTime: '14:10', classId: '11ab', subject: 'Science', room: 'B206 Science Lab', period: '4c' },
    { id: 'w1-tue-5a-12G2', weekNumber: 1, dayOfWeek: 2, startTime: '14:10', endTime: '14:40', classId: '12G2', subject: 'Physics', room: 'B206 Science Lab', period: '5a' },
    { id: 'w1-tue-5b-12G2', weekNumber: 1, dayOfWeek: 2, startTime: '14:40', endTime: '15:10', classId: '12G2', subject: 'Physics', room: 'B206 Science Lab', period: '5b' },
    // Week 1 Wednesday
    { id: 'w1-wed-3a-10TS1', weekNumber: 1, dayOfWeek: 3, startTime: '11:30', endTime: '12:00', classId: '10TS1', subject: 'Physics', room: 'B206 Science Lab', period: '3a' },
    { id: 'w1-wed-3b-10TS1', weekNumber: 1, dayOfWeek: 3, startTime: '12:00', endTime: '12:30', classId: '10TS1', subject: 'Physics', room: 'B206 Science Lab', period: '3b' },
    { id: 'w1-wed-4a-13G2', weekNumber: 1, dayOfWeek: 3, startTime: '12:30', endTime: '13:10', classId: '13G2', subject: 'Physics', room: 'B206 Science Lab', period: '4a' },
    { id: 'w1-wed-4b-13G2', weekNumber: 1, dayOfWeek: 3, startTime: '13:10', endTime: '13:30', classId: '13G2', subject: 'Physics', room: 'B206 Science Lab', period: '4b' },
    { id: 'w1-wed-5a-11ab', weekNumber: 1, dayOfWeek: 3, startTime: '14:10', endTime: '14:40', classId: '11ab', subject: 'Science', room: 'B206 Science Lab', period: '5a' },
    { id: 'w1-wed-5b-11ab', weekNumber: 1, dayOfWeek: 3, startTime: '14:40', endTime: '15:10', classId: '11ab', subject: 'Science', room: 'B206 Science Lab', period: '5b' },
    // Week 1 Thursday
    { id: 'w1-thu-3a-8A3', weekNumber: 1, dayOfWeek: 4, startTime: '11:30', endTime: '12:00', classId: '8A3', subject: 'Science', room: 'B206 Science Lab', period: '3a' },
    { id: 'w1-thu-3b-8A3', weekNumber: 1, dayOfWeek: 4, startTime: '12:00', endTime: '12:30', classId: '8A3', subject: 'Science', room: 'B206 Science Lab', period: '3b' },
    { id: 'w1-thu-4a-13G2', weekNumber: 1, dayOfWeek: 4, startTime: '12:30', endTime: '13:10', classId: '13G2', subject: 'Physics', room: 'B206 Science Lab', period: '4a' },
    { id: 'w1-thu-4b-13G2', weekNumber: 1, dayOfWeek: 4, startTime: '13:10', endTime: '13:30', classId: '13G2', subject: 'Physics', room: 'B206 Science Lab', period: '4b' },
    { id: 'w1-thu-5a-10TS2', weekNumber: 1, dayOfWeek: 4, startTime: '14:10', endTime: '14:40', classId: '10TS2', subject: 'Physics', room: 'B206 Science Lab', period: '5a' },
    { id: 'w1-thu-5b-10TS2', weekNumber: 1, dayOfWeek: 4, startTime: '14:40', endTime: '15:10', classId: '10TS2', subject: 'Physics', room: 'B206 Science Lab', period: '5b' },
    // Week 1 Friday
    { id: 'w1-fri-3a-11ab', weekNumber: 1, dayOfWeek: 5, startTime: '11:30', endTime: '12:00', classId: '11ab', subject: 'Science', room: 'B206 Science Lab', period: '3a' },
    { id: 'w1-fri-3b-11ab', weekNumber: 1, dayOfWeek: 5, startTime: '12:00', endTime: '12:30', classId: '11ab', subject: 'Science', room: 'B206 Science Lab', period: '3b' },
    { id: 'w1-fri-4a-13G2', weekNumber: 1, dayOfWeek: 5, startTime: '12:30', endTime: '13:10', classId: '13G2', subject: 'Physics', room: 'B206 Science Lab', period: '4a' },
    { id: 'w1-fri-4b-13G2', weekNumber: 1, dayOfWeek: 5, startTime: '13:10', endTime: '13:30', classId: '13G2', subject: 'Physics', room: 'B206 Science Lab', period: '4b' },
    { id: 'w1-fri-5a-10TS1', weekNumber: 1, dayOfWeek: 5, startTime: '14:10', endTime: '14:40', classId: '10TS1', subject: 'Physics', room: 'E101 Classroom', period: '5a' },
    { id: 'w1-fri-5b-10TS1', weekNumber: 1, dayOfWeek: 5, startTime: '14:40', endTime: '15:10', classId: '10TS1', subject: 'Physics', room: 'E101 Classroom', period: '5b' },
    // Week 2 Monday
    { id: 'w2-mon-3a-12G2', weekNumber: 2, dayOfWeek: 1, startTime: '11:30', endTime: '12:00', classId: '12G2', subject: 'Physics', room: 'B206 Science Lab', period: '3a' },
    { id: 'w2-mon-3b-12G2', weekNumber: 2, dayOfWeek: 1, startTime: '12:00', endTime: '12:30', classId: '12G2', subject: 'Physics', room: 'B206 Science Lab', period: '3b' },
    { id: 'w2-mon-4b-9p', weekNumber: 2, dayOfWeek: 1, startTime: '13:10', endTime: '13:30', classId: '9p', subject: 'Science', room: 'B206 Science Lab', period: '4b' },
    { id: 'w2-mon-4c-9p', weekNumber: 2, dayOfWeek: 1, startTime: '13:30', endTime: '14:10', classId: '9p', subject: 'Science', room: 'B206 Science Lab', period: '4c' },
    // Week 2 Tuesday
    { id: 'w2-tue-1a-10TS2', weekNumber: 2, dayOfWeek: 2, startTime: '09:10', endTime: '09:40', classId: '10TS2', subject: 'Physics', room: 'A04 Art Studio 2', period: '1a' },
    { id: 'w2-tue-1b-10TS2', weekNumber: 2, dayOfWeek: 2, startTime: '09:40', endTime: '10:10', classId: '10TS2', subject: 'Physics', room: 'A04 Art Studio 2', period: '1b' },
    { id: 'w2-tue-2b-9p', weekNumber: 2, dayOfWeek: 2, startTime: '10:30', endTime: '11:10', classId: '9p', subject: 'Science', room: 'B206 Science Lab', period: '2b' },
    { id: 'w2-tue-2c-9p', weekNumber: 2, dayOfWeek: 2, startTime: '11:10', endTime: '11:30', classId: '9p', subject: 'Science', room: 'B206 Science Lab', period: '2c' },
    { id: 'w2-tue-4b-11ab', weekNumber: 2, dayOfWeek: 2, startTime: '13:10', endTime: '13:30', classId: '11ab', subject: 'Science', room: 'B206 Science Lab', period: '4b' },
    { id: 'w2-tue-4c-11ab', weekNumber: 2, dayOfWeek: 2, startTime: '13:30', endTime: '14:10', classId: '11ab', subject: 'Science', room: 'B206 Science Lab', period: '4c' },
    { id: 'w2-tue-5a-8A3', weekNumber: 2, dayOfWeek: 2, startTime: '14:10', endTime: '14:40', classId: '8A3', subject: 'Science', room: 'B206 Science Lab', period: '5a' },
    { id: 'w2-tue-5b-8A3', weekNumber: 2, dayOfWeek: 2, startTime: '14:40', endTime: '15:10', classId: '8A3', subject: 'Science', room: 'B206 Science Lab', period: '5b' },
    // Week 2 Wednesday
    { id: 'w2-wed-1a-10TS2', weekNumber: 2, dayOfWeek: 3, startTime: '09:10', endTime: '09:40', classId: '10TS2', subject: 'Physics', room: 'B106 Science Lab', period: '1a' },
    { id: 'w2-wed-1b-10TS2', weekNumber: 2, dayOfWeek: 3, startTime: '09:40', endTime: '10:10', classId: '10TS2', subject: 'Physics', room: 'B106 Science Lab', period: '1b' },
    { id: 'w2-wed-3a-10TS1', weekNumber: 2, dayOfWeek: 3, startTime: '11:30', endTime: '12:00', classId: '10TS1', subject: 'Physics', room: 'B206 Science Lab', period: '3a' },
    { id: 'w2-wed-3b-10TS1', weekNumber: 2, dayOfWeek: 3, startTime: '12:00', endTime: '12:30', classId: '10TS1', subject: 'Physics', room: 'B206 Science Lab', period: '3b' },
    { id: 'w2-wed-4a-13G2', weekNumber: 2, dayOfWeek: 3, startTime: '12:30', endTime: '13:10', classId: '13G2', subject: 'Physics', room: 'B206 Science Lab', period: '4a' },
    { id: 'w2-wed-4b-13G2', weekNumber: 2, dayOfWeek: 3, startTime: '13:10', endTime: '13:30', classId: '13G2', subject: 'Physics', room: 'B206 Science Lab', period: '4b' },
    { id: 'w2-wed-5a-11ab', weekNumber: 2, dayOfWeek: 3, startTime: '14:10', endTime: '14:40', classId: '11ab', subject: 'Science', room: 'B206 Science Lab', period: '5a' },
    { id: 'w2-wed-5b-11ab', weekNumber: 2, dayOfWeek: 3, startTime: '14:40', endTime: '15:10', classId: '11ab', subject: 'Science', room: 'B206 Science Lab', period: '5b' },
    { id: 'w2-wed-6a-13G2', weekNumber: 2, dayOfWeek: 3, startTime: '15:10', endTime: '15:40', classId: '13G2', subject: 'Physics', room: 'B206 Science Lab', period: '6a' },
    { id: 'w2-wed-6b-13G2', weekNumber: 2, dayOfWeek: 3, startTime: '15:40', endTime: '16:10', classId: '13G2', subject: 'Physics', room: 'B206 Science Lab', period: '6b' },
    // Week 2 Thursday
    { id: 'w2-thu-1a-12G2', weekNumber: 2, dayOfWeek: 4, startTime: '09:10', endTime: '09:40', classId: '12G2', subject: 'Physics', room: 'B206 Science Lab', period: '1a' },
    { id: 'w2-thu-1b-12G2', weekNumber: 2, dayOfWeek: 4, startTime: '09:40', endTime: '10:10', classId: '12G2', subject: 'Physics', room: 'B206 Science Lab', period: '1b' },
    { id: 'w2-thu-3a-8A3', weekNumber: 2, dayOfWeek: 4, startTime: '11:30', endTime: '12:00', classId: '8A3', subject: 'Science', room: 'B206 Science Lab', period: '3a' },
    { id: 'w2-thu-3b-8A3', weekNumber: 2, dayOfWeek: 4, startTime: '12:00', endTime: '12:30', classId: '8A3', subject: 'Science', room: 'B206 Science Lab', period: '3b' },
    { id: 'w2-thu-4b-7UP1', weekNumber: 2, dayOfWeek: 4, startTime: '13:10', endTime: '13:30', classId: '7UP1', subject: 'Science', room: 'B206 Science Lab', period: '4b' },
    { id: 'w2-thu-4c-7UP1', weekNumber: 2, dayOfWeek: 4, startTime: '13:30', endTime: '14:10', classId: '7UP1', subject: 'Science', room: 'B206 Science Lab', period: '4c' },
    { id: 'w2-thu-5a-10TS2', weekNumber: 2, dayOfWeek: 4, startTime: '14:10', endTime: '14:40', classId: '10TS2', subject: 'Physics', room: 'B102 Science Lab', period: '5a' },
    { id: 'w2-thu-5b-10TS2', weekNumber: 2, dayOfWeek: 4, startTime: '14:40', endTime: '15:10', classId: '10TS2', subject: 'Physics', room: 'B102 Science Lab', period: '5b' },
    // Week 2 Friday
    { id: 'w2-fri-1a-7UP1', weekNumber: 2, dayOfWeek: 5, startTime: '09:10', endTime: '09:40', classId: '7UP1', subject: 'Science', room: 'B206 Science Lab', period: '1a' },
    { id: 'w2-fri-1b-7UP1', weekNumber: 2, dayOfWeek: 5, startTime: '09:40', endTime: '10:10', classId: '7UP1', subject: 'Science', room: 'B206 Science Lab', period: '1b' },
    { id: 'w2-fri-3a-12G2', weekNumber: 2, dayOfWeek: 5, startTime: '11:30', endTime: '12:00', classId: '12G2', subject: 'Physics', room: 'B206 Science Lab', period: '3a' },
    { id: 'w2-fri-3b-12G2', weekNumber: 2, dayOfWeek: 5, startTime: '12:00', endTime: '12:30', classId: '12G2', subject: 'Physics', room: 'B206 Science Lab', period: '3b' },
    { id: 'w2-fri-5a-10TS1', weekNumber: 2, dayOfWeek: 5, startTime: '14:10', endTime: '14:40', classId: '10TS1', subject: 'Physics', room: 'B206 Science Lab', period: '5a' },
    { id: 'w2-fri-5b-10TS1', weekNumber: 2, dayOfWeek: 5, startTime: '14:40', endTime: '15:10', classId: '10TS1', subject: 'Physics', room: 'B206 Science Lab', period: '5b' },
  ],
  duties: [
    { week: 1, day: 1, period: '1a', activity: 'Line Manage', startTime: '09:10', endTime: '09:40' },
    { week: 1, day: 1, period: '1b', activity: 'Line Manage', startTime: '09:40', endTime: '10:10' },
    { week: 1, day: 1, period: '2a', activity: 'Break Duty', startTime: '10:10', endTime: '10:30' },
    { week: 1, day: 1, period: '2c', activity: 'Break Duty', startTime: '11:10', endTime: '11:30' },
    { week: 2, day: 1, period: '2a', activity: 'Break Duty', startTime: '10:10', endTime: '10:30' },
    { week: 2, day: 1, period: '2c', activity: 'Break Duty', startTime: '11:10', endTime: '11:30' },
    { week: 2, day: 4, period: '6a', activity: 'Detention', startTime: '15:10', endTime: '15:40' },
    { week: 2, day: 4, period: '6b', activity: 'Detention', startTime: '15:40', endTime: '16:10' },
  ],
};

export default function FileImport({ onImport }) {
  const [dragActive, setDragActive] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(false);
  const fileInputRef = useRef(null);

  const processFile = async (file) => {
    setError(null);
    setSuccess(false);

    if (!file.name.endsWith('.json')) {
      setError('Please upload a .json file');
      return;
    }

    try {
      const text = await file.text();
      const data = JSON.parse(text);
      const validation = validateTimetableJSON(data);

      if (!validation.valid) {
        setError(`Invalid timetable format:\n${validation.errors.join('\n')}`);
        return;
      }

      setSuccess(true);
      setTimeout(() => onImport(data), 600);
    } catch (err) {
      setError('Could not parse JSON file. Check the format and try again.');
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setDragActive(false);
    if (e.dataTransfer.files?.[0]) {
      processFile(e.dataTransfer.files[0]);
    }
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    setDragActive(true);
  };

  const handleDragLeave = () => setDragActive(false);

  const handleFileSelect = (e) => {
    if (e.target.files?.[0]) {
      processFile(e.target.files[0]);
    }
  };

  const loadDemo = () => {
    setError(null);
    setSuccess(true);
    setTimeout(() => onImport(DEMO_DATA), 400);
  };

  return (
    <div className="flex-1 flex items-center justify-center p-8">
      <div className="max-w-lg w-full">
        <div className="text-center mb-8">
          <h2 className="font-serif text-3xl font-bold text-navy mb-2">
            Welcome to Teacher Planner
          </h2>
          <p className="text-navy/50 text-lg">
            Import your timetable to get started
          </p>
        </div>

        {/* Drop Zone */}
        <div
          onDrop={handleDrop}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onClick={() => fileInputRef.current?.click()}
          className={`
            relative cursor-pointer rounded-[2rem] border-2 border-dashed p-12
            flex flex-col items-center gap-4 transition-smooth
            ${dragActive
              ? 'border-sage bg-[#81B29A]/10 scale-[1.02]'
              : success
                ? 'border-sage bg-[#81B29A]/5'
                : error
                  ? 'border-terracotta/40 bg-[#E07A5F]/5'
                  : 'border-slate-200 bg-white hover:border-sage/40 hover:bg-sand/50'
            }
          `}
        >
          <input
            ref={fileInputRef}
            type="file"
            accept=".json"
            onChange={handleFileSelect}
            className="hidden"
          />

          {success ? (
            <>
              <CheckCircle2 size={48} className="text-sage" />
              <p className="text-sage font-semibold text-lg">Timetable loaded!</p>
            </>
          ) : (
            <>
              <div className={`
                p-4 rounded-full transition-smooth
                ${dragActive ? 'bg-[#81B29A]/20' : 'bg-sand'}
              `}>
                <FileJson size={32} className={dragActive ? 'text-sage' : 'text-navy/40'} />
              </div>
              <div className="text-center">
                <p className="text-navy font-medium mb-1">
                  Drop your timetable JSON here
                </p>
                <p className="text-navy/40 text-sm">
                  or click to browse files
                </p>
              </div>
            </>
          )}
        </div>

        {error && (
          <div className="mt-4 p-4 rounded-2xl bg-[#E07A5F]/10 border border-[#E07A5F]/20 flex gap-3">
            <AlertCircle size={20} className="text-terracotta shrink-0 mt-0.5" />
            <p className="text-sm text-navy/70 whitespace-pre-line">{error}</p>
          </div>
        )}

        <div className="flex items-center gap-4 my-8">
          <div className="flex-1 h-px bg-slate-200" />
          <span className="text-navy/30 text-sm font-medium">or</span>
          <div className="flex-1 h-px bg-slate-200" />
        </div>

        <button
          onClick={loadDemo}
          className="w-full flex items-center justify-center gap-2 px-6 py-4
                     rounded-full font-bold text-white
                     bg-[#E07A5F] shadow-lg shadow-[#E07A5F]/20
                     hover:shadow-xl hover:shadow-[#E07A5F]/30 hover:scale-[1.02]
                     active:scale-100 transition-smooth"
        >
          <Sparkles size={18} />
          Load Demo Timetable
        </button>

        <p className="text-center text-navy/30 text-xs mt-4">
          The demo loads a two-week Physics &amp; Science timetable so you can explore the app.
        </p>
      </div>
    </div>
  );
}
