'use client';

// Daily Notes component - a notepad for each day
import { useState, useEffect, useCallback, useRef } from 'react';
import { ChevronLeft, ChevronRight, Calendar, Save, FileText, Check } from 'lucide-react';
import { format, addDays, subDays, isToday, parseISO } from 'date-fns';
import { Button } from '@/components/ui';
import { cn } from '@/lib/utils';

export function DailyNotes() {
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [content, setContent] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const originalContentRef = useRef('');

  // Format date for API
  const formatDateForAPI = (date: Date) => {
    return format(date, 'yyyy-MM-dd');
  };

  // Fetch note for selected date
  const fetchNote = useCallback(async () => {
    setIsLoading(true);
    try {
      const response = await fetch(`/api/notes?date=${formatDateForAPI(selectedDate)}`);
      const result = await response.json();
      
      if (result.success) {
        const noteContent = result.data?.content || '';
        setContent(noteContent);
        originalContentRef.current = noteContent;
        setHasUnsavedChanges(false);
      }
    } catch (error) {
      console.error('Error fetching note:', error);
    } finally {
      setIsLoading(false);
    }
  }, [selectedDate]);

  // Load note when date changes
  useEffect(() => {
    fetchNote();
  }, [fetchNote]);

  // Save note
  const saveNote = useCallback(async () => {
    if (!hasUnsavedChanges) return;
    
    setIsSaving(true);
    try {
      const response = await fetch('/api/notes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          date: formatDateForAPI(selectedDate),
          content,
        }),
      });

      const result = await response.json();
      
      if (result.success) {
        setLastSaved(new Date());
        originalContentRef.current = content;
        setHasUnsavedChanges(false);
      }
    } catch (error) {
      console.error('Error saving note:', error);
    } finally {
      setIsSaving(false);
    }
  }, [selectedDate, content, hasUnsavedChanges]);

  // Auto-save after 2 seconds of inactivity
  useEffect(() => {
    if (hasUnsavedChanges) {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
      saveTimeoutRef.current = setTimeout(() => {
        saveNote();
      }, 2000);
    }

    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
    };
  }, [content, hasUnsavedChanges, saveNote]);

  // Handle content change
  const handleContentChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newContent = e.target.value;
    setContent(newContent);
    setHasUnsavedChanges(newContent !== originalContentRef.current);
  };

  // Navigation
  const goToPrevious = () => setSelectedDate(subDays(selectedDate, 1));
  const goToNext = () => setSelectedDate(addDays(selectedDate, 1));
  const goToToday = () => setSelectedDate(new Date());

  // Get display date
  const displayDate = format(selectedDate, 'EEEE, MMMM d, yyyy');
  const isCurrentDay = isToday(selectedDate);

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Daily Notes</h1>
          <p className="text-gray-500 dark:text-gray-400 mt-1">Write your daily tasks and notes</p>
        </div>
        
        {/* Save status */}
        <div className="flex items-center gap-2">
          {isSaving ? (
            <span className="text-sm text-gray-500 dark:text-gray-400 flex items-center gap-1">
              <Save className="w-4 h-4 animate-pulse" />
              Saving...
            </span>
          ) : hasUnsavedChanges ? (
            <span className="text-sm text-amber-500 dark:text-amber-400 flex items-center gap-1">
              <Save className="w-4 h-4" />
              Unsaved changes
            </span>
          ) : lastSaved ? (
            <span className="text-sm text-green-500 dark:text-green-400 flex items-center gap-1">
              <Check className="w-4 h-4" />
              Saved
            </span>
          ) : null}
          
          <Button 
            onClick={saveNote} 
            disabled={!hasUnsavedChanges || isSaving}
            size="sm"
          >
            <Save className="w-4 h-4 mr-1" />
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
          <span className={cn(
            "text-sm font-medium",
            isCurrentDay 
              ? "text-primary-600 dark:text-primary-400" 
              : "text-gray-700 dark:text-gray-200"
          )}>
            {displayDate}
            {isCurrentDay && <span className="ml-2 text-xs bg-primary-100 dark:bg-primary-900/50 text-primary-700 dark:text-primary-300 px-2 py-0.5 rounded-full">Today</span>}
          </span>
          {!isCurrentDay && (
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

      {/* Notepad */}
      <div className="flex-1 bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 overflow-hidden flex flex-col">
        {isLoading ? (
          <div className="flex-1 flex items-center justify-center text-gray-500 dark:text-gray-400">
            <div className="animate-pulse flex flex-col items-center gap-2">
              <FileText className="w-8 h-8" />
              <span>Loading notes...</span>
            </div>
          </div>
        ) : (
          <>
            {/* Toolbar/Header */}
            <div className="px-4 py-2 border-b border-gray-100 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/50">
              <span className="text-xs text-gray-500 dark:text-gray-400">
                💡 Tip: Your notes auto-save after you stop typing
              </span>
            </div>
            
            {/* Text area */}
            <textarea
              value={content}
              onChange={handleContentChange}
              placeholder={`What do you need to do on ${format(selectedDate, 'MMMM d')}?

• Task 1
• Task 2
• Task 3

Notes:
...`}
              className={cn(
                "flex-1 w-full p-4 resize-none focus:outline-none",
                "bg-transparent text-gray-900 dark:text-gray-100",
                "placeholder-gray-400 dark:placeholder-gray-500",
                "font-mono text-sm leading-relaxed"
              )}
              spellCheck
            />
          </>
        )}
      </div>
    </div>
  );
}
