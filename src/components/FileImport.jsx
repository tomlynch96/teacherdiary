import React, { useState, useRef } from 'react';
import { Upload, FileJson, CheckCircle2, AlertCircle, Sparkles } from 'lucide-react';
import { validateTimetableJSON } from '../utils/timetable';

// ===== FileImport =====
// Shown when no timetable is loaded. Handles JSON file upload + validation.
// Also provides a "Load Demo" option for quick testing.

// Demo data so you can test without a real JSON file
const DEMO_DATA = {
  teacher: {
    name: 'Ms. Thompson',
    exportDate: '2026-01-21',
  },
  classes: [
    { id: '12G2', name: '12G2', subject: 'Physics', classSize: 24 },
    { id: '10X1', name: '10X1', subject: 'Physics', classSize: 30 },
    { id: '13A1', name: '13A1', subject: 'Physics', classSize: 18 },
    { id: '9B3', name: '9B3', subject: 'Physics', classSize: 32 },
    { id: '11T4', name: '11T4', subject: 'Physics', classSize: 28 },
  ],
  recurringLessons: [
    // Monday
    { id: 'mon-1-10X1', dayOfWeek: 1, startTime: '08:45', endTime: '09:45', classId: '10X1', subject: 'Physics', room: 'C304 Lab', period: '1' },
    { id: 'mon-3a-12G2', dayOfWeek: 1, startTime: '11:30', endTime: '12:00', classId: '12G2', subject: 'Physics', room: 'C304 Classroom', period: '3a' },
    { id: 'mon-4-9B3', dayOfWeek: 1, startTime: '13:30', endTime: '14:30', classId: '9B3', subject: 'Physics', room: 'C201 Lab', period: '4' },
    // Tuesday
    { id: 'tue-1-13A1', dayOfWeek: 2, startTime: '08:45', endTime: '09:45', classId: '13A1', subject: 'Physics', room: 'C304 Classroom', period: '1' },
    { id: 'tue-2-11T4', dayOfWeek: 2, startTime: '10:00', endTime: '11:00', classId: '11T4', subject: 'Physics', room: 'C201 Lab', period: '2' },
    { id: 'tue-4-12G2', dayOfWeek: 2, startTime: '13:30', endTime: '14:30', classId: '12G2', subject: 'Physics', room: 'C304 Lab', period: '4' },
    // Wednesday
    { id: 'wed-2-10X1', dayOfWeek: 3, startTime: '10:00', endTime: '11:00', classId: '10X1', subject: 'Physics', room: 'C304 Lab', period: '2' },
    { id: 'wed-3-9B3', dayOfWeek: 3, startTime: '11:30', endTime: '12:30', classId: '9B3', subject: 'Physics', room: 'C201 Lab', period: '3' },
    { id: 'wed-5-13A1', dayOfWeek: 3, startTime: '14:45', endTime: '15:45', classId: '13A1', subject: 'Physics', room: 'C304 Classroom', period: '5' },
    // Thursday
    { id: 'thu-1-11T4', dayOfWeek: 4, startTime: '08:45', endTime: '09:45', classId: '11T4', subject: 'Physics', room: 'C201 Lab', period: '1' },
    { id: 'thu-3-12G2', dayOfWeek: 4, startTime: '11:30', endTime: '12:30', classId: '12G2', subject: 'Physics', room: 'C304 Classroom', period: '3' },
    // Friday
    { id: 'fri-2-10X1', dayOfWeek: 5, startTime: '10:00', endTime: '11:00', classId: '10X1', subject: 'Physics', room: 'C304 Lab', period: '2' },
    { id: 'fri-3-9B3', dayOfWeek: 5, startTime: '11:30', endTime: '12:30', classId: '9B3', subject: 'Physics', room: 'C201 Lab', period: '3' },
    { id: 'fri-4-13A1', dayOfWeek: 5, startTime: '13:30', endTime: '14:30', classId: '13A1', subject: 'Physics', room: 'C304 Classroom', period: '4' },
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
      setTimeout(() => onImport(data), 600); // Brief delay so user sees the success state
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
        {/* Title */}
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

        {/* Error message */}
        {error && (
          <div className="mt-4 p-4 rounded-2xl bg-[#E07A5F]/10 border border-[#E07A5F]/20 flex gap-3">
            <AlertCircle size={20} className="text-terracotta shrink-0 mt-0.5" />
            <p className="text-sm text-navy/70 whitespace-pre-line">{error}</p>
          </div>
        )}

        {/* Divider */}
        <div className="flex items-center gap-4 my-8">
          <div className="flex-1 h-px bg-slate-200" />
          <span className="text-navy/30 text-sm font-medium">or</span>
          <div className="flex-1 h-px bg-slate-200" />
        </div>

        {/* Demo button */}
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
          The demo loads a sample Physics teacher timetable so you can explore the app.
        </p>
      </div>
    </div>
  );
}
