'use client';

// Habit checkbox component for the grid
import { useState } from 'react';
import { Check, Minus } from 'lucide-react';
import { cn } from '@/lib/utils';

interface HabitCheckboxProps {
  taskId: string;
  date: string;
  checked: boolean;
  color?: string;
  isHabitCompleted?: boolean; // Whether the entire habit is marked as completed
  isAfterCompletedDate?: boolean; // Whether this date is after the habit completion date
  onToggle: (taskId: string, date: string, checked: boolean) => Promise<void>;
}

export function HabitCheckbox({ 
  taskId, 
  date, 
  checked, 
  color = '#0ea5e9', 
  isHabitCompleted = false,
  isAfterCompletedDate = false,
  onToggle 
}: HabitCheckboxProps) {
  const [isChecked, setIsChecked] = useState(checked);
  const [isLoading, setIsLoading] = useState(false);

  const handleToggle = async () => {
    // Don't allow toggling if this is after the completed date
    if (isAfterCompletedDate) return;
    
    const newValue = !isChecked;
    setIsChecked(newValue);
    setIsLoading(true);

    try {
      await onToggle(taskId, date, newValue);
    } catch {
      // Revert on error
      setIsChecked(!newValue);
    } finally {
      setIsLoading(false);
    }
  };

  // Show strikethrough style for dates after habit completion
  if (isAfterCompletedDate) {
    return (
      <div
        className={cn(
          'w-8 h-8 rounded-lg border-2 flex items-center justify-center',
          'bg-gray-100 dark:bg-gray-700 border-gray-300 dark:border-gray-600',
          'opacity-60'
        )}
        title="Habit completed - no tracking needed"
      >
        <Minus className="w-4 h-4 text-gray-400 dark:text-gray-500" strokeWidth={3} />
      </div>
    );
  }

  return (
    <button
      onClick={handleToggle}
      disabled={isLoading}
      className={cn(
        'w-8 h-8 rounded-lg border-2 cursor-pointer',
        'transition-all duration-200 flex items-center justify-center',
        'hover:scale-105 active:scale-95',
        'disabled:opacity-50 disabled:cursor-not-allowed',
        isChecked
          ? 'border-transparent text-white'
          : 'border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 hover:border-gray-400 dark:hover:border-gray-500'
      )}
      style={isChecked ? { backgroundColor: color } : undefined}
      aria-label={isChecked ? 'Mark as incomplete' : 'Mark as complete'}
    >
      {isChecked && (
        <Check className={cn('w-5 h-5', isLoading ? '' : 'animate-check')} strokeWidth={3} />
      )}
    </button>
  );
}
