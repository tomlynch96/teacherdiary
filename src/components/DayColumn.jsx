import React from 'react';
import LessonCard from './LessonCard';
import DutyCard from './DutyCard';
import FreePeriodSlot from './FreePeriodSlot';
import TaskStack from './TaskStack';

// ===== DayColumn =====
// Renders a single day column in the week view with lessons, duties, and tasks

export default function DayColumn({
  day,
  lessons = [], // Default to empty array
  duties = [], // Default to empty array
  freePeriods = [], // Default to empty array
  tasks = [], // Default to empty array
  gridStartMin,
  pxPerMinute,
  onLessonClick,
  onFreePeriodClick,
  onTaskStackClick,
  onTaskComplete,
  hasLessonData,
  classes,
}) {
  // Group tasks by their time slot
  const tasksBySlot = {};
  
  if (tasks && Array.isArray(tasks)) {
    tasks.forEach(task => {
      if (!task.scheduledSlot) return;
      const key = `${task.scheduledSlot.startMinutes}-${task.scheduledSlot.endMinutes}`;
      if (!tasksBySlot[key]) {
        tasksBySlot[key] = [];
      }
      tasksBySlot[key].push(task);
    });
  }

  // Sort tasks in each slot by stackOrder
  Object.keys(tasksBySlot).forEach(key => {
    tasksBySlot[key].sort((a, b) => (a.stackOrder || 0) - (b.stackOrder || 0));
  });

  return (
    <div className="relative">
      {/* Lessons */}
      {lessons && lessons.length > 0 && lessons.map((lesson, i) => (
        <LessonCard
          key={i}
          lesson={lesson}
          gridStartMin={gridStartMin}
          pxPerMinute={pxPerMinute}
          onClick={() => onLessonClick(lesson)}
          hasData={hasLessonData ? hasLessonData(lesson) : false}
          classes={classes}
        />
      ))}

      {/* Duties */}
      {duties && duties.length > 0 && duties.map((duty, i) => (
        <DutyCard
          key={i}
          duty={duty}
          gridStartMin={gridStartMin}
          pxPerMinute={pxPerMinute}
        />
      ))}

      {/* Free Periods with hover-to-show + icon */}
      {freePeriods && freePeriods.length > 0 && freePeriods.map((slot, i) => {
        const slotKey = `${slot.startMinutes}-${slot.endMinutes}`;
        const slotTasks = tasksBySlot[slotKey] || [];
        
        // Only show free period slot if there are no tasks scheduled
        if (slotTasks.length === 0) {
          return (
            <FreePeriodSlot
              key={i}
              slot={slot}
              gridStartMin={gridStartMin}
              pxPerMinute={pxPerMinute}
              onClick={() => onFreePeriodClick(slot)}
            />
          );
        }
        return null;
      })}

      {/* Task Stacks */}
      {Object.entries(tasksBySlot).map(([slotKey, slotTasks]) => {
        if (slotTasks.length === 0) return null;
        
        return (
          <TaskStack
            key={slotKey}
            tasks={slotTasks}
            gridStartMin={gridStartMin}
            pxPerMinute={pxPerMinute}
            onOpenManager={() => onTaskStackClick(slotKey, slotTasks)}
            onToggleComplete={onTaskComplete}
            slotKey={slotKey}
          />
        );
      })}
    </div>
  );
}