'use client';

// Habit checkbox component for the grid
import { useState } from 'react';
import { Check } from 'lucide-react';
import { cn } from '@/lib/utils';

interface HabitCheckboxProps {
  taskId: string;
  date: string;
  checked: boolean;
  color?: string;
  onToggle: (taskId: string, date: string, checked: boolean) => Promise<void>;
}

export function HabitCheckbox({ taskId, date, checked, color = '#0ea5e9', onToggle }: HabitCheckboxProps) {
  const [isChecked, setIsChecked] = useState(checked);
  const [isLoading, setIsLoading] = useState(false);

  const handleToggle = async () => {
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
          : 'border-gray-300 bg-white hover:border-gray-400'
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
