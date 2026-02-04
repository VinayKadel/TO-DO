'use client';

// Main habit tracker grid component with drag-and-drop sorting
import { useState, useMemo, useCallback, useRef, useEffect } from 'react';
import { Plus, ChevronLeft, ChevronRight, Calendar, GripVertical, CheckCircle2 } from 'lucide-react';
import { format, addDays, subDays, isAfter, startOfDay } from 'date-fns';
import { Button } from '@/components/ui';
import { DateRangeSelector } from '@/components/ui/date-range-selector';
import { HabitCheckbox } from './habit-checkbox';
import { AddTaskModal } from './add-task-modal';
import { EditTaskModal } from './edit-task-modal';
import { generateDateColumns, isTaskCompletedOnDate, formatDateForStorage } from '@/lib/date-utils';
import { Task, TaskWithCompletions, CreateTaskInput, UpdateTaskInput } from '@/types';
import { cn } from '@/lib/utils';

interface HabitGridProps {
  initialTasks: TaskWithCompletions[];
}

export function HabitGrid({ initialTasks }: HabitGridProps) {
  const [tasks, setTasks] = useState<TaskWithCompletions[]>(initialTasks);
  const [centerDate, setCenterDate] = useState(new Date());
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [daysToShow, setDaysToShow] = useState(14);

  // Load saved days preference
  useEffect(() => {
    const saved = localStorage.getItem('habittrack-days');
    if (saved) {
      setDaysToShow(parseInt(saved, 10));
    }
  }, []);

  // Save days preference
  const handleDaysChange = (days: number) => {
    setDaysToShow(days);
    localStorage.setItem('habittrack-days', days.toString());
  };

  // Drag and drop state
  const [draggedTaskId, setDraggedTaskId] = useState<string | null>(null);
  const [dragOverTaskId, setDragOverTaskId] = useState<string | null>(null);
  const dragCounter = useRef(0);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const todayColumnRef = useRef<HTMLDivElement>(null);

  // Generate date columns
  const dateColumns = useMemo(
    () => generateDateColumns(centerDate, daysToShow),
    [centerDate, daysToShow]
  );

  // Navigate dates
  const goToPrevious = () => setCenterDate(subDays(centerDate, 7));
  const goToNext = () => setCenterDate(addDays(centerDate, 7));
  const goToToday = () => {
    setCenterDate(new Date());
    // Scroll to today column after state update
    setTimeout(() => {
      scrollToToday();
    }, 100);
  };

  // Scroll today column to center
  const scrollToToday = useCallback(() => {
    if (todayColumnRef.current && scrollContainerRef.current) {
      const container = scrollContainerRef.current;
      const todayEl = todayColumnRef.current;
      const containerWidth = container.clientWidth;
      const todayLeft = todayEl.offsetLeft;
      const todayWidth = todayEl.offsetWidth;
      // Scroll so today is in the center
      const scrollTo = todayLeft - (containerWidth / 2) + (todayWidth / 2);
      container.scrollTo({ left: Math.max(0, scrollTo), behavior: 'smooth' });
    }
  }, []);

  // Scroll to today on initial load
  useEffect(() => {
    const timer = setTimeout(() => {
      scrollToToday();
    }, 200);
    return () => clearTimeout(timer);
  }, [scrollToToday]);

  // Toggle completion
  const handleToggleCompletion = useCallback(async (taskId: string, date: string, completed: boolean) => {
    try {
      const response = await fetch('/api/completions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          taskId,
          date: formatDateForStorage(new Date(date)),
          completed,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to toggle completion');
      }

      // Update local state
      setTasks((prevTasks) =>
        prevTasks.map((task) => {
          if (task.id !== taskId) return task;

          const existingCompletionIndex = task.completions.findIndex(
            (c) => format(new Date(c.date), 'yyyy-MM-dd') === date
          );

          let newCompletions = [...task.completions];

          if (completed) {
            if (existingCompletionIndex >= 0) {
              newCompletions[existingCompletionIndex] = {
                ...newCompletions[existingCompletionIndex],
                completed: true,
              };
            } else {
              newCompletions.push({
                id: `temp-${Date.now()}`,
                taskId,
                date: new Date(date),
                completed: true,
              });
            }
          } else {
            newCompletions = newCompletions.filter(
              (_, index) => index !== existingCompletionIndex
            );
          }

          return { ...task, completions: newCompletions };
        })
      );
    } catch (error) {
      console.error('Error toggling completion:', error);
      throw error;
    }
  }, []);

  // Add task
  const handleAddTask = async (data: CreateTaskInput) => {
    console.log('[HabitGrid] Adding task with data:', data);
    
    try {
      const response = await fetch('/api/tasks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });

      console.log('[HabitGrid] Response status:', response.status);
      const responseText = await response.text();
      console.log('[HabitGrid] Response body:', responseText);

      if (!response.ok) {
        let errorMessage = 'Failed to create task';
        try {
          const errorData = JSON.parse(responseText);
          errorMessage = errorData.error || errorMessage;
          console.error('[HabitGrid] API Error:', errorData);
        } catch (parseError) {
          console.error('[HabitGrid] Failed to parse error response:', responseText);
        }
        throw new Error(errorMessage);
      }

      const result = JSON.parse(responseText);
      console.log('[HabitGrid] Task created successfully:', result.data);
      setTasks((prev) => [...prev, result.data]);
    } catch (error) {
      console.error('[HabitGrid] Error adding task:', error);
      throw error;
    }
  };

  // Update task
  const handleUpdateTask = async (taskId: string, data: UpdateTaskInput) => {
    const response = await fetch(`/api/tasks/${taskId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to update task');
    }

    const result = await response.json();
    setTasks((prev) =>
      prev.map((task) => (task.id === taskId ? { ...task, ...result.data } : task))
    );
  };

  // Delete task
  const handleDeleteTask = async (taskId: string) => {
    const response = await fetch(`/api/tasks/${taskId}`, {
      method: 'DELETE',
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to delete task');
    }

    setTasks((prev) => prev.filter((task) => task.id !== taskId));
  };

  // Drag handlers
  const handleDragStart = (e: React.DragEvent, taskId: string) => {
    setDraggedTaskId(taskId);
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', taskId);
    const element = e.currentTarget as HTMLElement;
    element.style.opacity = '0.5';
  };

  const handleDragEnd = (e: React.DragEvent) => {
    const element = e.currentTarget as HTMLElement;
    element.style.opacity = '1';
    setDraggedTaskId(null);
    setDragOverTaskId(null);
    dragCounter.current = 0;
  };

  const handleDragEnter = (e: React.DragEvent, taskId: string) => {
    e.preventDefault();
    dragCounter.current++;
    if (taskId !== draggedTaskId) {
      setDragOverTaskId(taskId);
    }
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    dragCounter.current--;
    if (dragCounter.current === 0) {
      setDragOverTaskId(null);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  };

  const handleDrop = async (e: React.DragEvent, targetTaskId: string) => {
    e.preventDefault();
    dragCounter.current = 0;
    
    if (!draggedTaskId || draggedTaskId === targetTaskId) {
      setDraggedTaskId(null);
      setDragOverTaskId(null);
      return;
    }

    const draggedIndex = tasks.findIndex(t => t.id === draggedTaskId);
    const targetIndex = tasks.findIndex(t => t.id === targetTaskId);

    if (draggedIndex === -1 || targetIndex === -1) return;

    // Reorder tasks locally
    const newTasks = [...tasks];
    const [draggedTask] = newTasks.splice(draggedIndex, 1);
    newTasks.splice(targetIndex, 0, draggedTask);

    // Update sort orders
    const updatedTasks = newTasks.map((task, index) => ({
      ...task,
      sortOrder: index,
    }));

    setTasks(updatedTasks);
    setDraggedTaskId(null);
    setDragOverTaskId(null);

    // Save to server
    try {
      await fetch('/api/tasks/reorder', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          taskIds: updatedTasks.map(t => t.id),
        }),
      });
    } catch (error) {
      console.error('Failed to save task order:', error);
      setTasks(tasks); // Revert on error
    }
  };

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Habit Tracker</h1>
          <p className="text-gray-500 dark:text-gray-400 mt-1">Track your daily habits and build consistency</p>
        </div>
        <div className="flex items-center gap-3">
          <DateRangeSelector value={daysToShow} onChange={handleDaysChange} />
          <Button onClick={() => setIsAddModalOpen(true)}>
            <Plus className="w-5 h-5 mr-2" />
            Add Task
          </Button>
        </div>
      </div>

      {/* Date navigation */}
      <div className="flex items-center justify-between mb-4 bg-white dark:bg-gray-800 rounded-xl p-3 shadow-sm border border-gray-100 dark:border-gray-700">
        <Button variant="ghost" size="sm" onClick={goToPrevious}>
          <ChevronLeft className="w-5 h-5" />
        </Button>
        
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
            {format(dateColumns[0]?.date || new Date(), 'MMM d')} - {format(dateColumns[dateColumns.length - 1]?.date || new Date(), 'MMM d, yyyy')}
          </span>
          <Button variant="ghost" size="sm" onClick={goToToday}>
            <Calendar className="w-4 h-4 mr-1" />
            Today
          </Button>
        </div>
        
        <Button variant="ghost" size="sm" onClick={goToNext}>
          <ChevronRight className="w-5 h-5" />
        </Button>
      </div>

      {/* Grid */}
      <div className="flex-1 bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 overflow-hidden">
        <div ref={scrollContainerRef} className="overflow-x-auto">
          <div 
            className="min-w-max"
            style={{ '--days-count': daysToShow } as React.CSSProperties}
          >
            {/* Header row with dates */}
            <div className="habit-grid border-b border-gray-100 dark:border-gray-700 bg-gray-50 dark:bg-gray-900">
              {/* Empty corner cell */}
              <div className="p-3 font-medium text-gray-500 dark:text-gray-400 text-sm sticky left-0 bg-gray-50 dark:bg-gray-900 z-10 border-r border-gray-100 dark:border-gray-700">
                Tasks
              </div>
              
              {/* Date headers */}
              {dateColumns.map((col) => (
                <div
                  key={col.dateString}
                  ref={col.isToday ? todayColumnRef : undefined}
                  className={cn(
                    'p-2 text-center border-r border-gray-100 dark:border-gray-700 last:border-r-0',
                    col.isToday && 'bg-primary-50 dark:bg-primary-900/30'
                  )}
                >
                  <div className={cn(
                    'text-xs font-medium',
                    col.isToday ? 'text-primary-600 dark:text-primary-400' : 'text-gray-400 dark:text-gray-500'
                  )}>
                    {col.dayName}
                  </div>
                  <div className={cn(
                    'text-sm font-semibold mt-0.5',
                    col.isToday ? 'text-primary-700 dark:text-primary-300' : 'text-gray-700 dark:text-gray-300'
                  )}>
                    {col.dayNumber}
                  </div>
                  <div className={cn(
                    'text-xs',
                    col.isToday ? 'text-primary-500 dark:text-primary-400' : 'text-gray-400 dark:text-gray-500'
                  )}>
                    {col.monthName}
                  </div>
                </div>
              ))}
            </div>

            {/* Task rows */}
            {tasks.length === 0 ? (
              <div className="p-12 text-center flex flex-col items-center justify-center">
                <p className="font-medium text-gray-700 dark:text-gray-300">No tasks yet</p>
                <p className="text-sm mt-1 text-gray-500 dark:text-gray-400">Add your first task to start tracking</p>
              </div>
            ) : (
              tasks.map((task) => {
                // Get the last completion date to determine after which dates to show strikethrough
                const lastCompletionDate = task.completions.length > 0
                  ? task.completions.reduce((latest, c) => {
                      const cDate = new Date(c.date);
                      return cDate > latest ? cDate : latest;
                    }, new Date(0))
                  : null;
                
                return (
                <div 
                  key={task.id} 
                  draggable
                  onDragStart={(e) => handleDragStart(e, task.id)}
                  onDragEnd={handleDragEnd}
                  onDragEnter={(e) => handleDragEnter(e, task.id)}
                  onDragLeave={handleDragLeave}
                  onDragOver={handleDragOver}
                  onDrop={(e) => handleDrop(e, task.id)}
                  className={cn(
                    'habit-grid border-b border-gray-100 dark:border-gray-700 last:border-b-0 hover:bg-gray-50/50 dark:hover:bg-gray-700/50 transition-colors',
                    dragOverTaskId === task.id && 'bg-primary-50 dark:bg-primary-900/30 border-primary-300 dark:border-primary-600',
                    draggedTaskId === task.id && 'opacity-50',
                    task.isCompleted && 'bg-green-50/30 dark:bg-green-900/10'
                  )}
                >
                  {/* Task name cell */}
                  <div
                    onClick={() => setEditingTask(task)}
                    className="p-3 flex items-center gap-2 sticky left-0 bg-white dark:bg-gray-800 z-10 border-r border-gray-100 dark:border-gray-700 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors group"
                  >
                    <GripVertical className="w-4 h-4 text-gray-400 dark:text-gray-500 cursor-grab active:cursor-grabbing flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity" />
                    {task.emoji ? (
                      <span className="text-base flex-shrink-0">{task.emoji}</span>
                    ) : (
                      <div
                        className="w-3 h-3 rounded-full flex-shrink-0"
                        style={{ backgroundColor: task.color }}
                      />
                    )}
                    <span className={cn(
                      "text-sm font-medium truncate group-hover:text-primary-600 dark:group-hover:text-primary-400 transition-colors",
                      task.isCompleted 
                        ? "text-green-700 dark:text-green-400" 
                        : "text-gray-800 dark:text-gray-200"
                    )}>
                      {task.name}
                    </span>
                    {task.isCompleted && (
                      <CheckCircle2 className="w-4 h-4 text-green-500 dark:text-green-400 flex-shrink-0" />
                    )}
                  </div>

                  {/* Completion checkboxes */}
                  {dateColumns.map((col) => {
                    const isCompleted = isTaskCompletedOnDate(task.completions, col.date);
                    // For completed habits, show strikethrough for dates after the last completion
                    const isAfterCompletedDate = !!(task.isCompleted && lastCompletionDate && 
                      isAfter(startOfDay(col.date), startOfDay(lastCompletionDate)));
                    
                    return (
                      <div
                        key={`${task.id}-${col.dateString}`}
                        className={cn(
                          'p-2 flex items-center justify-center border-r border-gray-100 dark:border-gray-700 last:border-r-0',
                          col.isToday && 'bg-primary-50/30 dark:bg-primary-900/20'
                        )}
                      >
                        <HabitCheckbox
                          taskId={task.id}
                          date={col.dateString}
                          checked={isCompleted}
                          color={task.color}
                          isHabitCompleted={task.isCompleted}
                          isAfterCompletedDate={isAfterCompletedDate}
                          onToggle={handleToggleCompletion}
                        />
                      </div>
                    );
                  })}
                </div>
              )})
            )}
          </div>
        </div>
      </div>

      {/* Modals */}
      <AddTaskModal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        onAdd={handleAddTask}
      />
      
      <EditTaskModal
        task={editingTask}
        isOpen={!!editingTask}
        onClose={() => setEditingTask(null)}
        onUpdate={handleUpdateTask}
        onDelete={handleDeleteTask}
      />
    </div>
  );
}
