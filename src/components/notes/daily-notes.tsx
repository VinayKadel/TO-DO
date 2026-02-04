'use client';

// Daily To-Do Manager - manage your daily tasks
import { useState, useEffect, useCallback, useRef } from 'react';
import { format, addDays, subDays, isToday } from 'date-fns';
import { ChevronLeft, ChevronRight, Calendar, Loader2, Check, Plus, Trash2, GripVertical, ListTodo } from 'lucide-react';
import { Button } from '@/components/ui';
import { formatDateForStorage } from '@/lib/date-utils';
import { DailyNote } from '@/types';
import { cn } from '@/lib/utils';

interface TodoItem {
  id: string;
  text: string;
  completed: boolean;
}

// Check if text has multiple lines
function isMultiLine(text: string): boolean {
  return text.includes('\n');
}

interface DailyNotesProps {
  initialNotes?: DailyNote[];
}

// Parse content into todo items
function parseContent(content: string): TodoItem[] {
  if (!content.trim()) return [];
  
  const lines = content.split('\n').filter(line => line.trim());
  return lines.map((line, index) => {
    const checklistMatch = line.match(/^\[([ x])\]\s*(.*)$/);
    if (checklistMatch) {
      return {
        id: `todo-${index}-${Date.now()}`,
        text: checklistMatch[2],
        completed: checklistMatch[1] === 'x',
      };
    }
    // Treat any non-checkbox line as an incomplete todo
    return {
      id: `todo-${index}-${Date.now()}`,
      text: line,
      completed: false,
    };
  });
}

// Convert todo items to storage format
function serializeItems(items: TodoItem[]): string {
  return items.map(item => `[${item.completed ? 'x' : ' '}] ${item.text}`).join('\n');
}

export function DailyNotes({ initialNotes = [] }: DailyNotesProps) {
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [items, setItems] = useState<TodoItem[]>([]);
  const [newTaskText, setNewTaskText] = useState('');
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
  const inputRef = useRef<HTMLTextAreaElement>(null);

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

  // Save to server
  const saveNote = useCallback(async (todoItems: TodoItem[]) => {
    const content = serializeItems(todoItems);
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

  // Auto-save with debounce
  const triggerAutoSave = useCallback((newItems: TodoItem[]) => {
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }
    saveTimeoutRef.current = setTimeout(() => {
      saveNote(newItems);
    }, 500);
  }, [saveNote]);

  // Add new task
  const addTask = () => {
    if (!newTaskText.trim()) return;
    
    const newItem: TodoItem = {
      id: `todo-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      text: newTaskText.trim(),
      completed: false,
    };
    
    const newItems = [...items, newItem];
    setItems(newItems);
    setNewTaskText('');
    triggerAutoSave(newItems);
    inputRef.current?.focus();
  };

  // Toggle task completion
  const toggleTask = (id: string) => {
    const newItems = items.map(item => 
      item.id === id ? { ...item, completed: !item.completed } : item
    );
    setItems(newItems);
    triggerAutoSave(newItems);
  };

  // Delete task
  const deleteTask = (id: string) => {
    const newItems = items.filter(item => item.id !== id);
    setItems(newItems);
    triggerAutoSave(newItems);
  };

  // Handle Enter key in input (Shift+Enter for new line, Enter to submit)
  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      addTask();
    }
    // Shift+Enter allows default behavior (new line in textarea)
  };

  // Auto-resize textarea
  const handleTextareaChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setNewTaskText(e.target.value);
    // Auto-resize
    e.target.style.height = 'auto';
    e.target.style.height = Math.min(e.target.scrollHeight, 120) + 'px';
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
  const completedCount = items.filter(i => i.completed).length;
  const totalCount = items.length;

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
            <ListTodo className="w-7 h-7 text-primary-500" />
            Daily To-Do
          </h1>
          <p className="text-gray-500 dark:text-gray-400 mt-1">Manage your daily tasks</p>
        </div>
        <div className="flex items-center gap-3">
          {totalCount > 0 && (
            <div className="text-sm text-gray-500 dark:text-gray-400">
              <span className="font-medium text-primary-600 dark:text-primary-400">{completedCount}</span>
              <span> / {totalCount} done</span>
            </div>
          )}
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

      {/* Add task input */}
      <div className="mb-4 bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 p-3">
        <div className="flex items-start gap-3">
          <div className="flex-shrink-0 w-6 h-6 mt-1 rounded-md border-2 border-dashed border-gray-300 dark:border-gray-600 flex items-center justify-center">
            <Plus className="w-4 h-4 text-gray-400" />
          </div>
          <textarea
            ref={inputRef}
            value={newTaskText}
            onChange={handleTextareaChange}
            onKeyDown={handleKeyDown}
            placeholder={`Add a task for ${isTodaySelected ? 'today' : format(selectedDate, 'EEEE')}... (Shift+Enter for new line)`}
            rows={1}
            className="flex-1 bg-transparent border-none outline-none text-gray-800 dark:text-gray-200 placeholder-gray-400 dark:placeholder-gray-500 resize-none min-h-[24px]"
          />
          <Button
            variant="primary"
            size="sm"
            onClick={addTask}
            disabled={!newTaskText.trim()}
            className="mt-0.5"
          >
            Add
          </Button>
        </div>
        {newTaskText.includes('\n') && (
          <div className="text-xs text-gray-400 dark:text-gray-500 mt-2 ml-9">
            Multi-line task • Press Enter to add
          </div>
        )}
      </div>

      {/* Tasks list */}
      <div className="flex-1 overflow-y-auto space-y-2">
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-8 h-8 text-gray-400 animate-spin" />
          </div>
        ) : items.length === 0 ? (
          <div className="text-center py-16 text-gray-400 dark:text-gray-500">
            <ListTodo className="w-16 h-16 mx-auto mb-4 opacity-30" />
            <p className="font-medium text-lg">No tasks yet</p>
            <p className="text-sm mt-1">Add your first task above to get started</p>
          </div>
        ) : (
          <>
            {/* Pending tasks */}
            {items.filter(i => !i.completed).map((item) => (
              <div
                key={item.id}
                className={cn(
                  'group flex items-center gap-3 p-4 rounded-xl',
                  'bg-white dark:bg-gray-800',
                  'border border-gray-100 dark:border-gray-700',
                  'shadow-sm hover:shadow-md transition-all duration-200',
                  'hover:border-primary-200 dark:hover:border-primary-800'
                )}
              >
                <button
                  onClick={() => toggleTask(item.id)}
                  className={cn(
                    'flex-shrink-0 w-6 h-6 rounded-md border-2 flex items-center justify-center transition-all duration-200',
                    'border-gray-300 dark:border-gray-600',
                    'hover:border-primary-500 dark:hover:border-primary-400',
                    'hover:bg-primary-50 dark:hover:bg-primary-900/30'
                  )}
                >
                </button>
                
                <span className="flex-1 text-gray-800 dark:text-gray-200 font-medium whitespace-pre-wrap">
                  {item.text}
                </span>
                
                <button
                  onClick={() => deleteTask(item.id)}
                  className="flex-shrink-0 w-8 h-8 flex items-center justify-center text-gray-300 dark:text-gray-600 hover:text-red-500 dark:hover:text-red-400 opacity-0 group-hover:opacity-100 transition-all rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20"
                  title="Delete task"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ))}
            
            {/* Completed tasks section */}
            {items.filter(i => i.completed).length > 0 && (
              <div className="pt-4">
                <div className="text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider mb-2 px-1">
                  Completed ({items.filter(i => i.completed).length})
                </div>
                {items.filter(i => i.completed).map((item) => (
                  <div
                    key={item.id}
                    className={cn(
                      'group flex items-center gap-3 p-4 rounded-xl mb-2',
                      'bg-gray-50 dark:bg-gray-800/50',
                      'border border-gray-100 dark:border-gray-700/50',
                    )}
                  >
                    <button
                      onClick={() => toggleTask(item.id)}
                      className={cn(
                        'flex-shrink-0 w-6 h-6 rounded-md flex items-center justify-center transition-all duration-200',
                        'bg-green-500 border-2 border-green-500 text-white'
                      )}
                    >
                      <Check className="w-4 h-4" strokeWidth={3} />
                    </button>
                    
                    <span className="flex-1 text-gray-400 dark:text-gray-500 line-through whitespace-pre-wrap">
                      {item.text}
                    </span>
                    
                    <button
                      onClick={() => deleteTask(item.id)}
                      className="flex-shrink-0 w-8 h-8 flex items-center justify-center text-gray-300 dark:text-gray-600 hover:text-red-500 dark:hover:text-red-400 opacity-0 group-hover:opacity-100 transition-all rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20"
                      title="Delete task"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </>
        )}
      </div>

      {/* Progress bar */}
      {totalCount > 0 && (
        <div className="mt-4 pt-4 border-t border-gray-100 dark:border-gray-700">
          <div className="flex items-center justify-between text-sm mb-2">
            <span className="text-gray-500 dark:text-gray-400">Daily Progress</span>
            <span className="font-medium text-gray-700 dark:text-gray-300">
              {Math.round((completedCount / totalCount) * 100)}%
            </span>
          </div>
          <div className="h-2 bg-gray-100 dark:bg-gray-700 rounded-full overflow-hidden">
            <div 
              className="h-full bg-gradient-to-r from-primary-500 to-green-500 rounded-full transition-all duration-500"
              style={{ width: `${(completedCount / totalCount) * 100}%` }}
            />
          </div>
        </div>
      )}
    </div>
  );
}
