'use client';

// Daily Notes component - a notepad for each day
import { useState, useEffect, useCallback, useRef } from 'react';
import { format, addDays, subDays, isToday, isSameDay } from 'date-fns';
import { ChevronLeft, ChevronRight, Calendar, Save, FileText, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui';
import { formatDateForStorage } from '@/lib/date-utils';
import { DailyNote } from '@/types';
import { cn } from '@/lib/utils';

interface DailyNotesProps {
  initialNotes?: DailyNote[];
}

export function DailyNotes({ initialNotes = [] }: DailyNotesProps) {
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [content, setContent] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const [notes, setNotes] = useState<Record<string, DailyNote>>(
    // Index initial notes by date
    initialNotes.reduce((acc, note) => {
      const dateKey = format(new Date(note.date), 'yyyy-MM-dd');
      acc[dateKey] = note;
      return acc;
    }, {} as Record<string, DailyNote>)
  );
  
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Get the current date key
  const dateKey = format(selectedDate, 'yyyy-MM-dd');

  // Load note for selected date
  const loadNote = useCallback(async (date: Date) => {
    const key = format(date, 'yyyy-MM-dd');
    
    // If we already have the note cached, use it
    if (notes[key]) {
      setContent(notes[key].content);
      return;
    }

    setIsLoading(true);
    try {
      const response = await fetch(`/api/notes?date=${key}`);
      const result = await response.json();
      
      if (result.success && result.data.length > 0) {
        const note = result.data[0];
        setNotes(prev => ({ ...prev, [key]: note }));
        setContent(note.content);
      } else {
        setContent('');
      }
    } catch (error) {
      console.error('Error loading note:', error);
      setContent('');
    } finally {
      setIsLoading(false);
    }
  }, [notes]);

  // Load note when date changes
  useEffect(() => {
    loadNote(selectedDate);
  }, [selectedDate, loadNote]);

  // Auto-save with debounce
  const saveNote = useCallback(async (noteContent: string) => {
    setIsSaving(true);
    try {
      const response = await fetch('/api/notes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          date: formatDateForStorage(selectedDate),
          content: noteContent,
        }),
      });

      const result = await response.json();
      if (result.success) {
        setNotes(prev => ({ ...prev, [dateKey]: result.data }));
        setLastSaved(new Date());
      }
    } catch (error) {
      console.error('Error saving note:', error);
    } finally {
      setIsSaving(false);
    }
  }, [selectedDate, dateKey]);

  // Handle content change with debounced save
  const handleContentChange = (newContent: string) => {
    setContent(newContent);
    
    // Clear existing timeout
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }
    
    // Set new timeout for auto-save (1.5 seconds after typing stops)
    saveTimeoutRef.current = setTimeout(() => {
      saveNote(newContent);
    }, 1500);
  };

  // Manual save
  const handleManualSave = () => {
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }
    saveNote(content);
  };

  // Navigate dates
  const goToPrevious = () => setSelectedDate(subDays(selectedDate, 1));
  const goToNext = () => setSelectedDate(addDays(selectedDate, 1));
  const goToToday = () => setSelectedDate(new Date());

  // Focus textarea on load
  useEffect(() => {
    if (textareaRef.current && !isLoading) {
      textareaRef.current.focus();
    }
  }, [isLoading, selectedDate]);

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
    };
  }, []);

  const isTodaySelected = isToday(selectedDate);

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Daily Notes</h1>
          <p className="text-gray-500 dark:text-gray-400 mt-1">Write your daily tasks and notes</p>
        </div>
        <div className="flex items-center gap-2">
          {lastSaved && (
            <span className="text-xs text-gray-400 dark:text-gray-500">
              Saved {format(lastSaved, 'h:mm a')}
            </span>
          )}
          <Button 
            variant="secondary" 
            size="sm" 
            onClick={handleManualSave}
            disabled={isSaving}
          >
            {isSaving ? (
              <Loader2 className="w-4 h-4 mr-1 animate-spin" />
            ) : (
              <Save className="w-4 h-4 mr-1" />
            )}
            Save
          </Button>
        </div>
      </div>

      {/* Date navigation */}
      <div className="flex items-center justify-between mb-4 bg-white dark:bg-gray-800 rounded-xl p-3 shadow-sm border border-gray-100 dark:border-gray-700">
        <Button variant="ghost" size="sm" onClick={goToPrevious}>
          <ChevronLeft className="w-5 h-5" />
        </Button>
        
        <div className="flex items-center gap-2">
          <div className="text-center">
            <div className={cn(
              'text-lg font-semibold',
              isTodaySelected ? 'text-primary-600 dark:text-primary-400' : 'text-gray-800 dark:text-gray-100'
            )}>
              {format(selectedDate, 'EEEE')}
            </div>
            <div className={cn(
              'text-sm',
              isTodaySelected ? 'text-primary-500 dark:text-primary-400' : 'text-gray-500 dark:text-gray-400'
            )}>
              {format(selectedDate, 'MMMM d, yyyy')}
            </div>
          </div>
          {!isTodaySelected && (
            <Button variant="ghost" size="sm" onClick={goToToday}>
              <Calendar className="w-4 h-4 mr-1" />
              Today
            </Button>
          )}
        </div>
        
        <Button variant="ghost" size="sm" onClick={goToNext}>
          <ChevronRight className="w-5 h-5" />
        </Button>
      </div>

      {/* Note editor */}
      <div className="flex-1 bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 overflow-hidden flex flex-col">
        {isLoading ? (
          <div className="flex-1 flex items-center justify-center">
            <Loader2 className="w-8 h-8 text-gray-400 animate-spin" />
          </div>
        ) : (
          <>
            {/* Editor header */}
            <div className="flex items-center gap-2 px-4 py-3 border-b border-gray-100 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/50">
              <FileText className="w-4 h-4 text-gray-400 dark:text-gray-500" />
              <span className="text-sm font-medium text-gray-600 dark:text-gray-300">
                {isTodaySelected ? "Today's Notes" : `Notes for ${format(selectedDate, 'MMM d')}`}
              </span>
              {notes[dateKey] && (
                <span className="text-xs text-gray-400 dark:text-gray-500 ml-auto">
                  Last updated {format(new Date(notes[dateKey].updatedAt), 'MMM d, h:mm a')}
                </span>
              )}
            </div>
            
            {/* Textarea */}
            <textarea
              ref={textareaRef}
              value={content}
              onChange={(e) => handleContentChange(e.target.value)}
              placeholder={`What do you need to do ${isTodaySelected ? 'today' : 'on ' + format(selectedDate, 'EEEE')}?

• Task 1
• Task 2
• Task 3

Notes:
...`}
              className={cn(
                'flex-1 w-full p-4 resize-none',
                'bg-transparent text-gray-800 dark:text-gray-100',
                'placeholder-gray-400 dark:placeholder-gray-500',
                'focus:outline-none',
                'font-mono text-sm leading-relaxed'
              )}
              spellCheck="true"
            />
          </>
        )}
      </div>

      {/* Quick tips */}
      <div className="mt-4 text-center text-xs text-gray-400 dark:text-gray-500">
        Auto-saves as you type • Use bullet points (•) or dashes (-) for lists
      </div>
    </div>
  );
}
