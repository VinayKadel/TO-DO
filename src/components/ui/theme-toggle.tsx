'use client';

// Theme toggle component
import { Moon, Sun, Monitor } from 'lucide-react';
import { useTheme } from '@/components/providers/theme-provider';
import { cn } from '@/lib/utils';
import { useState } from 'react';

export function ThemeToggle() {
  const { theme, setTheme } = useTheme();
  const [isOpen, setIsOpen] = useState(false);

  const themes = [
    { value: 'light' as const, label: 'Light', icon: Sun },
    { value: 'dark' as const, label: 'Dark', icon: Moon },
    { value: 'system' as const, label: 'System', icon: Monitor },
  ];

  const currentTheme = themes.find((t) => t.value === theme) || themes[0];
  const Icon = currentTheme.icon;

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={cn(
          'p-2 rounded-lg transition-colors',
          'hover:bg-gray-100 dark:hover:bg-gray-800',
          'text-gray-600 dark:text-gray-300'
        )}
        title="Change theme"
      >
        <Icon className="w-5 h-5" />
      </button>

      {isOpen && (
        <>
          <div
            className="fixed inset-0 z-10"
            onClick={() => setIsOpen(false)}
          />
          <div className={cn(
            'absolute right-0 mt-2 w-36 py-1 z-20',
            'bg-white dark:bg-gray-800 rounded-xl shadow-lg',
            'border border-gray-100 dark:border-gray-700',
            'animate-scale-in origin-top-right'
          )}>
            {themes.map((t) => {
              const ThemeIcon = t.icon;
              return (
                <button
                  key={t.value}
                  onClick={() => {
                    setTheme(t.value);
                    setIsOpen(false);
                  }}
                  className={cn(
                    'w-full flex items-center gap-2 px-3 py-2 text-sm',
                    'transition-colors',
                    theme === t.value
                      ? 'bg-primary-50 dark:bg-primary-900/30 text-primary-700 dark:text-primary-300'
                      : 'text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700'
                  )}
                >
                  <ThemeIcon className="w-4 h-4" />
                  {t.label}
                </button>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}
