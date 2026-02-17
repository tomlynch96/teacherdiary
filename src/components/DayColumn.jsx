import React from 'react';
import { isToday, timeToMinutes } from '../utils/dateHelpers';
import LessonCard from './LessonCard';
import DutyCard from './DutyCard';
import FreePeriodSlot from './FreePeriodSlot';
import TaskStack from './TaskStack';
import { getClassColor } from '../utils/timetable';
import { formatDateISO } from '../utils/dateHelpers';

const PX_PER_MINUTE = 1.8;

export default function DayColumn({
  day,
  dayNum,
  lessons,
  duties,
  freePeriods,
  scheduledTasks,
  timetableData,
  todos,
  gridStartMin,
  gridHeight,
  viewMode,
  onLessonClick,
  onSelectFreeSlot,
  onToggleTaskComplete,
  onOpenStackManager,
  hasInstanceData,
  getLessonInstanceData,
}) {
  const today = isToday(day);

  const timeToTop = (timeStr) => (timeToMinutes(timeStr) - gridStartMin) * PX_PER_MINUTE;
  const durationToHeight = (s, e) => (timeToMinutes(e) - timeToMinutes(s)) * PX_PER_MINUTE;

  // Group scheduled tasks by their time slot
  const taskStacks = {};
  scheduledTasks.forEach(task => {
    const slot = task.scheduledSlot;
    const slotKey = `${formatDateISO(typeof slot.date === 'string' ? new Date(slot.date) : slot.date)}-${slot.startMinutes}-${slot.endMinutes}`;
    if (!taskStacks[slotKey]) {
      taskStacks[slotKey] = [];
    }
    taskStacks[slotKey].push(task);
  });

  return (
    <div className={`relative ${today ? 'bg-[#81B29A]/[0.03] rounded-2xl' : ''}`} style={{ height: gridHeight }}>
      {/* Free periods */}
      {freePeriods.map((period, pi) => (
        <FreePeriodSlot
          key={`free-${pi}`}
          period={period}
          gridStartMin={gridStartMin}
          pxPerMinute={PX_PER_MINUTE}
          onSelect={onSelectFreeSlot}
        />
      ))}

      {/* Task stacks */}
      {Object.entries(taskStacks).map(([slotKey, tasks]) => (
        <TaskStack
          key={slotKey}
          tasks={tasks}
          gridStartMin={gridStartMin}
          pxPerMinute={PX_PER_MINUTE}
          onToggleComplete={onToggleTaskComplete}
          onOpenManager={onOpenStackManager}
          slotKey={slotKey}
        />
      ))}

      {/* Duties */}
      {duties.map((duty, di) => {
        const top = timeToTop(duty.startTime);
        const height = durationToHeight(duty.startTime, duty.endTime);
        return (
          <div key={`duty-${di}`} className="absolute left-1 right-1 z-[2]" style={{ top, height, minHeight: 24 }}>
            <DutyCard duty={duty} height={height} />
          </div>
        );
      })}

      {/* Lessons */}
      {lessons.map((lesson) => {
        const top = timeToTop(lesson.startTime);
        const height = durationToHeight(lesson.startTime, lesson.endTime);
        const accent = getClassColor(lesson.classId, timetableData.classes);
        const hasData = hasInstanceData(lesson);
        const instanceData = getLessonInstanceData(lesson);

        return (
          <div
            key={lesson.id}
            className="absolute left-1 right-1 z-[3]"
            style={{ top, height }}
          >
            <LessonCard
              lesson={lesson}
              height={height}
              accent={accent}
              hasData={hasData}
              onClick={onLessonClick}
              showTitle={viewMode === 'day'}
              instanceData={instanceData}
            />
          </div>
        );
      })}
    </div>
  );
}