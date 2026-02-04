'use client';

// Simple emoji picker component
import { useState } from 'react';
import { cn } from '@/lib/utils';

// Common emojis for habits/tasks organized by category
const EMOJI_CATEGORIES = {
  'Fitness': ['💪', '🏃', '🚴', '🏋️', '🧘', '🤸', '⛹️', '🏊'],
  'Health': ['💊', '🍎', '🥗', '💧', '😴', '🧘‍♀️', '🩺', '🦷'],
  'Learning': ['📚', '📖', '✏️', '🎓', '💡', '🧠', '📝', '🔬'],
  'Work': ['💼', '💻', '📊', '📈', '✅', '📋', '🎯', '⏰'],
  'Creative': ['🎨', '🎵', '🎸', '📸', '✍️', '🎬', '🎹', '🎤'],
  'Social': ['👋', '💬', '📞', '🤝', '❤️', '👨‍👩‍👧', '🎉', '🎁'],
  'Self-care': ['🧘', '🛁', '💆', '🧴', '💅', '🌸', '☕', '🍵'],
  'Nature': ['🌱', '🌿', '🌳', '🌺', '🌊', '⛰️', '🌞', '🌙'],
};

interface EmojiPickerProps {
  value?: string;
  onChange: (emoji: string | undefined) => void;
}

export function EmojiPicker({ value, onChange }: EmojiPickerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [activeCategory, setActiveCategory] = useState<string>(Object.keys(EMOJI_CATEGORIES)[0]);

  const handleSelect = (emoji: string) => {
    onChange(emoji);
    setIsOpen(false);
  };

  const handleClear = () => {
    onChange(undefined);
    setIsOpen(false);
  };

  return (
    <div className="relative">
      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
        Icon (optional)
      </label>
      
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className={cn(
          'w-full h-12 flex items-center justify-center rounded-lg border-2 border-dashed transition-all',
          'hover:border-gray-400 dark:hover:border-gray-500',
          value 
            ? 'border-primary-500 bg-primary-50 dark:bg-primary-900/20' 
            : 'border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800'
        )}
      >
        {value ? (
          <span className="text-2xl">{value}</span>
        ) : (
          <span className="text-sm text-gray-500 dark:text-gray-400">Click to add an emoji</span>
        )}
      </button>

      {isOpen && (
        <>
          <div 
            className="fixed inset-0 z-10" 
            onClick={() => setIsOpen(false)} 
          />
          <div className={cn(
            'absolute left-0 right-0 mt-2 p-3 z-20',
            'bg-white dark:bg-gray-800 rounded-xl shadow-lg',
            'border border-gray-200 dark:border-gray-700',
            'animate-scale-in origin-top'
          )}>
            {/* Category tabs */}
            <div className="flex flex-wrap gap-1 mb-3 pb-2 border-b border-gray-100 dark:border-gray-700">
              {Object.keys(EMOJI_CATEGORIES).map((category) => (
                <button
                  key={category}
                  type="button"
                  onClick={() => setActiveCategory(category)}
                  className={cn(
                    'px-2 py-1 text-xs rounded-md transition-colors',
                    activeCategory === category
                      ? 'bg-primary-100 dark:bg-primary-900/50 text-primary-700 dark:text-primary-300'
                      : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700'
                  )}
                >
                  {category}
                </button>
              ))}
            </div>

            {/* Emoji grid */}
            <div className="grid grid-cols-8 gap-1">
              {EMOJI_CATEGORIES[activeCategory as keyof typeof EMOJI_CATEGORIES].map((emoji) => (
                <button
                  key={emoji}
                  type="button"
                  onClick={() => handleSelect(emoji)}
                  className={cn(
                    'w-8 h-8 flex items-center justify-center text-lg rounded-md transition-all',
                    'hover:bg-gray-100 dark:hover:bg-gray-700 hover:scale-110',
                    value === emoji && 'bg-primary-100 dark:bg-primary-900/50'
                  )}
                >
                  {emoji}
                </button>
              ))}
            </div>

            {/* Clear button */}
            {value && (
              <button
                type="button"
                onClick={handleClear}
                className="w-full mt-3 py-2 text-sm text-gray-500 dark:text-gray-400 hover:text-red-500 dark:hover:text-red-400 transition-colors"
              >
                Remove icon
              </button>
            )}
          </div>
        </>
      )}
    </div>
  );
}
