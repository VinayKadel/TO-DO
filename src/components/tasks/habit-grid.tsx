'use client';

// Main habit tracker grid component
import { useState, useMemo, useCallback } from 'react';
import { Plus, ChevronLeft, ChevronRight, Calendar } from 'lucide-react';
import { format, addDays, subDays, isToday } from 'date-fns';
import { Button } from '@/components/ui';
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
  const [daysToShow] = useState(14);

  // Generate date columns
  const dateColumns = useMemo(
    () => generateDateColumns(centerDate, daysToShow),
    [centerDate, daysToShow]
  );

  // Navigate dates
  const goToPrevious = () => setCenterDate(subDays(centerDate, 7));
  const goToNext = () => setCenterDate(addDays(centerDate, 7));
  const goToToday = () => setCenterDate(new Date());

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
    const response = await fetch('/api/tasks', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to create task');
    }

    const result = await response.json();
    setTasks((prev) => [...prev, result.data]);
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

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Habit Tracker</h1>
          <p className="text-gray-500 mt-1">Track your daily habits and build consistency</p>
        </div>
        <Button onClick={() => setIsAddModalOpen(true)}>
          <Plus className="w-5 h-5 mr-2" />
          Add Task
        </Button>
      </div>

      {/* Date navigation */}
      <div className="flex items-center justify-between mb-4 bg-white rounded-xl p-3 shadow-sm border border-gray-100">
        <Button variant="ghost" size="sm" onClick={goToPrevious}>
          <ChevronLeft className="w-5 h-5" />
        </Button>
        
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-gray-700">
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
      <div className="flex-1 bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="overflow-x-auto">
          <div 
            className="min-w-max"
            style={{ '--days-count': daysToShow } as React.CSSProperties}
          >
            {/* Header row with dates */}
            <div className="habit-grid border-b border-gray-100 bg-gray-50">
              {/* Empty corner cell */}
              <div className="p-3 font-medium text-gray-500 text-sm sticky left-0 bg-gray-50 z-10 border-r border-gray-100">
                Tasks
              </div>
              
              {/* Date headers */}
              {dateColumns.map((col) => (
                <div
                  key={col.dateString}
                  className={cn(
                    'p-2 text-center border-r border-gray-100 last:border-r-0',
                    col.isToday && 'bg-primary-50'
                  )}
                >
                  <div className={cn(
                    'text-xs font-medium',
                    col.isToday ? 'text-primary-600' : 'text-gray-400'
                  )}>
                    {col.dayName}
                  </div>
                  <div className={cn(
                    'text-sm font-semibold mt-0.5',
                    col.isToday ? 'text-primary-700' : 'text-gray-700'
                  )}>
                    {col.dayNumber}
                  </div>
                  <div className={cn(
                    'text-xs',
                    col.isToday ? 'text-primary-500' : 'text-gray-400'
                  )}>
                    {col.monthName}
                  </div>
                </div>
              ))}
            </div>

            {/* Task rows */}
            {tasks.length === 0 ? (
              <div className="p-12 text-center text-gray-500">
                <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Plus className="w-8 h-8 text-gray-400" />
                </div>
                <p className="font-medium text-gray-700">No tasks yet</p>
                <p className="text-sm mt-1">Add your first task to start tracking</p>
              </div>
            ) : (
              tasks.map((task) => (
                <div key={task.id} className="habit-grid border-b border-gray-100 last:border-b-0 hover:bg-gray-50/50 transition-colors">
                  {/* Task name cell */}
                  <div
                    onClick={() => setEditingTask(task)}
                    className="p-3 flex items-center gap-2 sticky left-0 bg-white z-10 border-r border-gray-100 cursor-pointer hover:bg-gray-50 transition-colors group"
                  >
                    <div
                      className="w-3 h-3 rounded-full flex-shrink-0"
                      style={{ backgroundColor: task.color }}
                    />
                    <span className="text-sm font-medium text-gray-800 truncate group-hover:text-primary-600 transition-colors">
                      {task.name}
                    </span>
                  </div>

                  {/* Completion checkboxes */}
                  {dateColumns.map((col) => {
                    const isCompleted = isTaskCompletedOnDate(task.completions, col.date);
                    
                    return (
                      <div
                        key={`${task.id}-${col.dateString}`}
                        className={cn(
                          'p-2 flex items-center justify-center border-r border-gray-100 last:border-r-0',
                          col.isToday && 'bg-primary-50/30'
                        )}
                      >
                        <HabitCheckbox
                          taskId={task.id}
                          date={col.dateString}
                          checked={isCompleted}
                          color={task.color}
                          onToggle={handleToggleCompletion}
                        />
                      </div>
                    );
                  })}
                </div>
              ))
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
