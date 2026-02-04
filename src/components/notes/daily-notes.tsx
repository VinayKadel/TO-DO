'use client';

// Daily Notes component - a notepad for each day with checklist support
import { useState, useEffect, useCallback, useRef } from 'react';
import { format, addDays, subDays, isToday } from 'date-fns';
import { ChevronLeft, ChevronRight, Calendar, FileText, Loader2, Check, Square, CheckSquare, Plus, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui';
import { formatDateForStorage } from '@/lib/date-utils';
import { DailyNote } from '@/types';
import { cn } from '@/lib/utils';

interface NoteItem {
  id: string;
  text: string;
  completed: boolean;
  isChecklistItem: boolean;
}

interface DailyNotesProps {
  initialNotes?: DailyNote[];
}

// Parse content into structured note items
function parseContent(content: string): NoteItem[] {
  if (!content.trim()) return [];
  
  const lines = content.split('\n');
  return lines.map((line, index) => {
    const checklistMatch = line.match(/^\[([ x])\]\s*(.*)$/);
    if (checklistMatch) {
      return {
        id: `item-${index}-${Date.now()}`,
        text: checklistMatch[2],
        completed: checklistMatch[1] === 'x',
        isChecklistItem: true,
      };
    }
    return {
      id: `item-${index}-${Date.now()}`,
      text: line,
      completed: false,
      isChecklistItem: false,
    };
  });
}

// Convert note items back to content string
function serializeItems(items: NoteItem[]): string {
  return items.map(item => {
    if (item.isChecklistItem) {
      return `[${item.completed ? 'x' : ' '}] ${item.text}`;
    }
    return item.text;
  }).join('\n');
}

export function DailyNotes({ initialNotes = [] }: DailyNotesProps) {
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [items, setItems] = useState<NoteItem[]>([]);
  const [isSaving, setIsSaving] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const [notes, setNotes] = useState<Record<string, DailyNote>>(
    initialNotes.reduce((acc, note) => {
      const dateKey = format(new Date(note.date), 'yyyy-MM-dd');
      acc[dateKey] = note;
      return acc;
    }, {} as Record<string, DailyNote>)
  );
  
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const inputRefs = useRef<Map<string, HTMLInputElement | HTMLTextAreaElement>>(new Map());

  const dateKey = format(selectedDate, 'yyyy-MM-dd');

  // Load note for selected date
  const loadNote = useCallback(async (date: Date) => {
    const key = format(date, 'yyyy-MM-dd');
    
    if (notes[key]) {
      setItems(parseContent(notes[key].content));
      return;
    }

    setIsLoading(true);
    try {
      const response = await fetch(`/api/notes?date=${key}`);
      const result = await response.json();
      
      if (result.success && result.data.length > 0) {
        const note = result.data[0];
        setNotes(prev => ({ ...prev, [key]: note }));
        setItems(parseContent(note.content));
      } else {
        setItems([]);
      }
    } catch (error) {
      console.error('Error loading note:', error);
      setItems([]);
    } finally {
      setIsLoading(false);
    }
  }, [notes]);

  useEffect(() => {
    loadNote(selectedDate);
  }, [selectedDate, loadNote]);

  // Auto-save with debounce
  const saveNote = useCallback(async (noteItems: NoteItem[]) => {
    const content = serializeItems(noteItems);
    setIsSaving(true);
    try {
      const response = await fetch('/api/notes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          date: formatDateForStorage(selectedDate),
          content,
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

  // Trigger auto-save
  const triggerAutoSave = useCallback((newItems: NoteItem[]) => {
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }
    saveTimeoutRef.current = setTimeout(() => {
      saveNote(newItems);
    }, 800); // Save 800ms after last change
  }, [saveNote]);

  // Update item text
  const updateItemText = (id: string, text: string) => {
    const newItems = items.map(item => 
      item.id === id ? { ...item, text } : item
    );
    setItems(newItems);
    triggerAutoSave(newItems);
  };

  // Toggle item completion
  const toggleItemComplete = (id: string) => {
    const newItems = items.map(item => 
      item.id === id ? { ...item, completed: !item.completed } : item
    );
    setItems(newItems);
    triggerAutoSave(newItems);
  };

  // Convert item to/from checklist
  const toggleChecklistItem = (id: string) => {
    const newItems = items.map(item => 
      item.id === id ? { ...item, isChecklistItem: !item.isChecklistItem, completed: false } : item
    );
    setItems(newItems);
    triggerAutoSave(newItems);
  };

  // Add new item
  const addNewItem = (afterId?: string, isChecklist = false) => {
    const newItem: NoteItem = {
      id: `item-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      text: '',
      completed: false,
      isChecklistItem: isChecklist,
    };
    
    let newItems: NoteItem[];
    if (afterId) {
      const index = items.findIndex(item => item.id === afterId);
      newItems = [...items.slice(0, index + 1), newItem, ...items.slice(index + 1)];
    } else {
      newItems = [...items, newItem];
    }
    
    setItems(newItems);
    
    // Focus the new input after render
    setTimeout(() => {
      inputRefs.current.get(newItem.id)?.focus();
    }, 10);
  };

  // Delete item
  const deleteItem = (id: string) => {
    const newItems = items.filter(item => item.id !== id);
    setItems(newItems);
    triggerAutoSave(newItems);
  };

  // Handle Enter key
  const handleKeyDown = (e: React.KeyboardEvent, item: NoteItem) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      addNewItem(item.id, item.isChecklistItem);
    } else if (e.key === 'Backspace' && item.text === '' && items.length > 1) {
      e.preventDefault();
      const index = items.findIndex(i => i.id === item.id);
      deleteItem(item.id);
      // Focus previous item
      if (index > 0) {
        const prevItem = items[index - 1];
        setTimeout(() => {
          inputRefs.current.get(prevItem.id)?.focus();
        }, 10);
      }
    }
  };

  // Navigate dates
  const goToPrevious = () => setSelectedDate(subDays(selectedDate, 1));
  const goToNext = () => setSelectedDate(addDays(selectedDate, 1));
  const goToToday = () => setSelectedDate(new Date());

  // Cleanup
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
          {isSaving && (
            <span className="text-xs text-gray-400 dark:text-gray-500 flex items-center gap-1">
              <Loader2 className="w-3 h-3 animate-spin" />
              Saving...
            </span>
          )}
          {!isSaving && lastSaved && (
            <span className="text-xs text-gray-400 dark:text-gray-500">
              Saved {format(lastSaved, 'h:mm a')}
            </span>
          )}
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
      <div className="flex-1 bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 overflow-hidden flex flex-col min-h-[400px]">
        {isLoading ? (
          <div className="flex-1 flex items-center justify-center">
            <Loader2 className="w-8 h-8 text-gray-400 animate-spin" />
          </div>
        ) : (
          <>
            {/* Editor header */}
            <div className="flex items-center justify-between gap-2 px-4 py-3 border-b border-gray-100 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/50">
              <div className="flex items-center gap-2">
                <FileText className="w-4 h-4 text-gray-400 dark:text-gray-500" />
                <span className="text-sm font-medium text-gray-600 dark:text-gray-300">
                  {isTodaySelected ? "Today's Notes" : `Notes for ${format(selectedDate, 'MMM d')}`}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => addNewItem(undefined, true)}
                  className="text-xs"
                >
                  <CheckSquare className="w-4 h-4 mr-1" />
                  Add Task
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => addNewItem(undefined, false)}
                  className="text-xs"
                >
                  <Plus className="w-4 h-4 mr-1" />
                  Add Note
                </Button>
              </div>
            </div>
            
            {/* Items list */}
            <div className="flex-1 overflow-y-auto p-4 space-y-1">
              {items.length === 0 ? (
                <div className="text-center py-12 text-gray-400 dark:text-gray-500">
                  <FileText className="w-12 h-12 mx-auto mb-3 opacity-50" />
                  <p className="font-medium">No notes for this day</p>
                  <p className="text-sm mt-1">Add a task or note to get started</p>
                  <div className="flex justify-center gap-2 mt-4">
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={() => addNewItem(undefined, true)}
                    >
                      <CheckSquare className="w-4 h-4 mr-1" />
                      Add Task
                    </Button>
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={() => addNewItem(undefined, false)}
                    >
                      <Plus className="w-4 h-4 mr-1" />
                      Add Note
                    </Button>
                  </div>
                </div>
              ) : (
                items.map((item) => (
                  <div
                    key={item.id}
                    className={cn(
                      'group flex items-start gap-2 py-1.5 px-2 rounded-lg transition-colors',
                      'hover:bg-gray-50 dark:hover:bg-gray-700/50'
                    )}
                  >
                    {item.isChecklistItem ? (
                      <button
                        onClick={() => toggleItemComplete(item.id)}
                        className={cn(
                          'flex-shrink-0 w-5 h-5 mt-0.5 rounded border-2 flex items-center justify-center transition-colors',
                          item.completed
                            ? 'bg-primary-500 border-primary-500 text-white'
                            : 'border-gray-300 dark:border-gray-600 hover:border-primary-400 dark:hover:border-primary-500'
                        )}
                      >
                        {item.completed && <Check className="w-3 h-3" strokeWidth={3} />}
                      </button>
                    ) : (
                      <button
                        onClick={() => toggleChecklistItem(item.id)}
                        className="flex-shrink-0 w-5 h-5 mt-0.5 flex items-center justify-center text-gray-300 dark:text-gray-600 hover:text-gray-400 dark:hover:text-gray-500 transition-colors"
                        title="Convert to task"
                      >
                        <Square className="w-4 h-4" />
                      </button>
                    )}
                    
                    <input
                      ref={(el) => {
                        if (el) inputRefs.current.set(item.id, el);
                      }}
                      type="text"
                      value={item.text}
                      onChange={(e) => updateItemText(item.id, e.target.value)}
                      onKeyDown={(e) => handleKeyDown(e, item)}
                      placeholder={item.isChecklistItem ? "Enter task..." : "Enter note..."}
                      className={cn(
                        'flex-1 bg-transparent border-none outline-none text-sm py-0.5',
                        'placeholder-gray-400 dark:placeholder-gray-500',
                        item.completed && 'line-through text-gray-400 dark:text-gray-500',
                        !item.completed && 'text-gray-800 dark:text-gray-200'
                      )}
                    />
                    
                    <button
                      onClick={() => deleteItem(item.id)}
                      className="flex-shrink-0 w-5 h-5 flex items-center justify-center text-gray-300 dark:text-gray-600 hover:text-red-500 dark:hover:text-red-400 opacity-0 group-hover:opacity-100 transition-all"
                      title="Delete"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))
              )}
            </div>
          </>
        )}
      </div>

      {/* Quick tips */}
      <div className="mt-4 text-center text-xs text-gray-400 dark:text-gray-500">
        Auto-saves as you type • Press Enter to add new line • Click checkbox to convert notes to tasks
      </div>
    </div>
  );
}
