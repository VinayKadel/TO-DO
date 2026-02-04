'use client';

// Date range selector component
import { useState } from 'react';
import { Calendar, ChevronDown } from 'lucide-react';
import { cn } from '@/lib/utils';

interface DateRangeSelectorProps {
  value: number;
  onChange: (days: number) => void;
}

const RANGE_OPTIONS = [
  { label: '7 days', value: 7 },
  { label: '14 days', value: 14 },
  { label: '30 days', value: 30 },
  { label: '60 days', value: 60 },
  { label: '90 days', value: 90 },
];

export function DateRangeSelector({ value, onChange }: DateRangeSelectorProps) {
  const [isOpen, setIsOpen] = useState(false);
  
  const currentOption = RANGE_OPTIONS.find(opt => opt.value === value) || RANGE_OPTIONS[1];

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={cn(
          'flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors',
          'bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700',
          'hover:bg-gray-50 dark:hover:bg-gray-700',
          'text-gray-700 dark:text-gray-200'
        )}
      >
        <Calendar className="w-4 h-4" />
        <span>{currentOption.label}</span>
        <ChevronDown className={cn(
          'w-4 h-4 transition-transform',
          isOpen && 'rotate-180'
        )} />
      </button>

      {isOpen && (
        <>
          <div
            className="fixed inset-0 z-10"
            onClick={() => setIsOpen(false)}
          />
          <div className={cn(
            'absolute right-0 mt-2 w-32 py-1 z-20',
            'bg-white dark:bg-gray-800 rounded-xl shadow-lg',
            'border border-gray-100 dark:border-gray-700',
            'animate-scale-in origin-top-right'
          )}>
            {RANGE_OPTIONS.map((option) => (
              <button
                key={option.value}
                onClick={() => {
                  onChange(option.value);
                  setIsOpen(false);
                }}
                className={cn(
                  'w-full px-3 py-2 text-left text-sm transition-colors',
                  value === option.value
                    ? 'bg-primary-50 dark:bg-primary-900/30 text-primary-700 dark:text-primary-300'
                    : 'text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700'
                )}
              >
                {option.label}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
