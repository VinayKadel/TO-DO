'use client';

// Daily To-Do Manager - manage your daily tasks with reminders
import { useState, useEffect, useCallback, useRef } from 'react';
import { format, addDays, subDays, isToday } from 'date-fns';
import { ChevronLeft, ChevronRight, Calendar, Loader2, Check, Plus, Trash2, Pencil, GripVertical, ListTodo, Bell, BellOff, BellRing, Clock, CalendarDays, X } from 'lucide-react';
import { Button } from '@/components/ui';
import { formatDateForStorage } from '@/lib/date-utils';
import { DailyNote } from '@/types';
import { cn } from '@/lib/utils';

interface TodoItem {
  id: string;
  text: string;
  completed: boolean;
  reminderTime?: string; // HH:mm format
}

// Check if text has multiple lines
function isMultiLine(text: string): boolean {
  return text.includes('\n');
}

interface DailyNotesProps {
  initialNotes?: DailyNote[];
}

// Parse content into todo items
// Format: Tasks start with [ ] or [x], continuation lines are indented with 2 spaces
// Reminders stored as @remind:HH:mm at end of first line
function parseContent(content: string): TodoItem[] {
  if (!content.trim()) return [];
  
  const items: TodoItem[] = [];
  const lines = content.split('\n');
  let currentItem: TodoItem | null = null;
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const checklistMatch = line.match(/^\[([ x])\]\s*(.*)$/);
    
    if (checklistMatch) {
      // New task found
      if (currentItem) {
        items.push(currentItem);
      }
      let text = checklistMatch[2];
      let reminderTime: string | undefined;

      // Extract reminder tag
      const reminderMatch = text.match(/\s*@remind:(\d{2}:\d{2})$/);
      if (reminderMatch) {
        reminderTime = reminderMatch[1];
        text = text.replace(/\s*@remind:\d{2}:\d{2}$/, '');
      }

      currentItem = {
        id: `todo-${i}-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
        text,
        completed: checklistMatch[1] === 'x',
        reminderTime,
      };
    } else if (currentItem && line.startsWith('  ')) {
      // Continuation line (indented) - append to current task
      currentItem.text += '\n' + line.substring(2); // Remove the 2-space indent
    } else if (currentItem && line.trim() === '') {
      // Empty line within a task - preserve it
      currentItem.text += '\n';
    } else if (line.trim()) {
      // Non-indented, non-checkbox line - treat as new task
      if (currentItem) {
        items.push(currentItem);
      }
      currentItem = {
        id: `todo-${i}-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
        text: line,
        completed: false,
      };
    }
  }
  
  // Don't forget the last item
  if (currentItem) {
    items.push(currentItem);
  }
  
  return items;
}

// Convert todo items to storage format
// Multi-line tasks have continuation lines indented with 2 spaces
// Reminders stored as @remind:HH:mm at end of first line
function serializeItems(items: TodoItem[]): string {
  return items.map(item => {
    const checkbox = `[${item.completed ? 'x' : ' '}] `;
    const lines = item.text.split('\n');
    const reminderTag = item.reminderTime ? ` @remind:${item.reminderTime}` : '';
    // First line gets the checkbox + reminder tag, subsequent lines get 2-space indent
    return checkbox + lines[0] + reminderTag + (lines.length > 1 
      ? '\n' + lines.slice(1).map(l => '  ' + l).join('\n')
      : '');
  }).join('\n');
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
  const editInputRef = useRef<HTMLTextAreaElement>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editText, setEditText] = useState('');

  // Drag and drop state
  const [draggedItemId, setDraggedItemId] = useState<string | null>(null);
  const [dragOverItemId, setDragOverItemId] = useState<string | null>(null);
  const dragCounterRef = useRef(0);

  // Reminder state
  const [reminderPickerId, setReminderPickerId] = useState<string | null>(null);
  const [reminderTimeInput, setReminderTimeInput] = useState('');
  const [notifPermission, setNotifPermission] = useState<NotificationPermission>('default');
  const firedRemindersRef = useRef<Set<string>>(new Set());
  const [showUpcoming, setShowUpcoming] = useState(false);
  const [upcomingTasks, setUpcomingTasks] = useState<{ date: string; items: TodoItem[] }[]>([]);
  const [loadingUpcoming, setLoadingUpcoming] = useState(false);

  const dateKey = format(selectedDate, 'yyyy-MM-dd');

  // ─── Request notification permission on mount ────────────────────
  useEffect(() => {
    if (typeof window === 'undefined') return;
    try {
      if ('Notification' in window) {
        setNotifPermission(Notification.permission);
        if (Notification.permission === 'default') {
          // Some browsers (older Safari) use callback instead of Promise
          const result = Notification.requestPermission((perm) => {
            setNotifPermission(perm);
          });
          // Modern browsers return a Promise
          if (result && typeof result.then === 'function') {
            result.then((perm) => setNotifPermission(perm)).catch(() => {});
          }
        }
      }
    } catch {
      // Notification API not supported
      console.log('Notifications not supported on this device');
    }
  }, []);

  // ─── Show notification via Service Worker (mobile) or Notification API (desktop) ─
  const showNotification = useCallback(async (title: string, body: string, tag: string) => {
    try {
      // Try service worker first (works on mobile + background)
      if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
        const reg = await navigator.serviceWorker.ready;
        await reg.showNotification(title, {
          body,
          icon: '/icons/icon-192.png',
          badge: '/icons/icon-72.png',
          tag,
          data: { url: '/dashboard' },
        } as NotificationOptions);
        return;
      }
      // Fallback to basic Notification API (desktop)
      if ('Notification' in window && Notification.permission === 'granted') {
        new Notification(title, { body, icon: '/icon.svg', tag });
      }
    } catch {
      // Silently fail — notifications not supported
    }
  }, []);

  // ─── Notification scheduler — checks every 15s ──────────────────
  useEffect(() => {
    if (notifPermission !== 'granted') return;

    const checkReminders = () => {
      const now = new Date();
      const currentTime = format(now, 'HH:mm');
      const todayKey = format(now, 'yyyy-MM-dd');

      // Also check the currently loaded items for the selected date (if it's today)
      const todayNote = notes[todayKey];
      const itemsToCheck = todayNote ? parseContent(todayNote.content) : [];

      // If we're viewing today, prefer live items state
      const finalItems = (dateKey === todayKey) ? items : itemsToCheck;

      finalItems.forEach((item) => {
        if (
          item.reminderTime &&
          !item.completed &&
          item.reminderTime === currentTime &&
          !firedRemindersRef.current.has(`${todayKey}-${item.id}-${item.reminderTime}`)
        ) {
          firedRemindersRef.current.add(`${todayKey}-${item.id}-${item.reminderTime}`);
          showNotification('⏰ To-Do Reminder', item.text, `reminder-${item.id}`);
        }
      });
    };

    checkReminders();
    const interval = setInterval(checkReminders, 15000);
    return () => clearInterval(interval);
  }, [notifPermission, notes, items, dateKey, showNotification]);

  // ─── Set/remove reminder on a task ───────────────────────────────
  const setReminder = (id: string, time: string | undefined) => {
    const newItems = items.map((item) =>
      item.id === id ? { ...item, reminderTime: time } : item
    );
    setItems(newItems);
    triggerAutoSave(newItems);
    setReminderPickerId(null);
    setReminderTimeInput('');
  };

  const openReminderPicker = (item: TodoItem) => {
    setReminderPickerId(item.id);
    setReminderTimeInput(item.reminderTime || '');
  };

  // ─── Load upcoming tasks with reminders ──────────────────────────
  const loadUpcomingTasks = useCallback(async () => {
    setLoadingUpcoming(true);
    try {
      const today = new Date();
      const futureDate = addDays(today, 30);
      const startStr = format(addDays(today, 1), 'yyyy-MM-dd');
      const endStr = format(futureDate, 'yyyy-MM-dd');

      const response = await fetch(`/api/notes?startDate=${startStr}&endDate=${endStr}`);
      const result = await response.json();

      if (result.success && result.data.length > 0) {
        const upcoming: { date: string; items: TodoItem[] }[] = [];
        for (const note of result.data) {
          const noteDate = format(new Date(note.date), 'yyyy-MM-dd');
          const parsed = parseContent(note.content);
          const withReminders = parsed.filter((i) => i.reminderTime && !i.completed);
          const pending = parsed.filter((i) => !i.completed && !i.reminderTime);
          const all = [...withReminders, ...pending];
          if (all.length > 0) {
            upcoming.push({ date: noteDate, items: all });
          }
        }
        // Sort by date ascending
        upcoming.sort((a, b) => a.date.localeCompare(b.date));
        setUpcomingTasks(upcoming);
      } else {
        setUpcomingTasks([]);
      }
    } catch (err) {
      console.error('Error loading upcoming tasks:', err);
    } finally {
      setLoadingUpcoming(false);
    }
  }, []);

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

  // Start editing a task
  const startEditing = (item: TodoItem) => {
    setEditingId(item.id);
    setEditText(item.text);
    setTimeout(() => {
      editInputRef.current?.focus();
      // Auto-resize the textarea
      if (editInputRef.current) {
        editInputRef.current.style.height = 'auto';
        editInputRef.current.style.height = editInputRef.current.scrollHeight + 'px';
      }
    }, 10);
  };

  // Save edited task
  const saveEdit = () => {
    if (!editingId || !editText.trim()) {
      cancelEdit();
      return;
    }
    const newItems = items.map(item =>
      item.id === editingId ? { ...item, text: editText.trim() } : item
    );
    setItems(newItems);
    triggerAutoSave(newItems);
    setEditingId(null);
    setEditText('');
  };

  // Cancel editing
  const cancelEdit = () => {
    setEditingId(null);
    setEditText('');
  };

  // Handle edit textarea keydown
  const handleEditKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Escape') {
      e.preventDefault();
      cancelEdit();
    } else if (e.key === 'Enter' && !e.shiftKey && !isMobile) {
      e.preventDefault();
      saveEdit();
    }
  };

  // Auto-resize edit textarea
  const handleEditTextChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setEditText(e.target.value);
    e.target.style.height = 'auto';
    e.target.style.height = Math.min(e.target.scrollHeight, 200) + 'px';
  };

  // Drag and drop handlers for reordering
  const handleDragStart = (e: React.DragEvent, itemId: string) => {
    setDraggedItemId(itemId);
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', itemId);
    (e.currentTarget as HTMLElement).style.opacity = '0.5';
  };

  const handleDragEnd = (e: React.DragEvent) => {
    (e.currentTarget as HTMLElement).style.opacity = '1';
    setDraggedItemId(null);
    setDragOverItemId(null);
    dragCounterRef.current = 0;
  };

  const handleDragEnter = (e: React.DragEvent, itemId: string) => {
    e.preventDefault();
    dragCounterRef.current++;
    if (itemId !== draggedItemId) {
      setDragOverItemId(itemId);
    }
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    dragCounterRef.current--;
    if (dragCounterRef.current === 0) {
      setDragOverItemId(null);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  };

  const handleDrop = (e: React.DragEvent, targetItemId: string) => {
    e.preventDefault();
    dragCounterRef.current = 0;

    if (!draggedItemId || draggedItemId === targetItemId) {
      setDraggedItemId(null);
      setDragOverItemId(null);
      return;
    }

    const draggedIndex = items.findIndex(i => i.id === draggedItemId);
    const targetIndex = items.findIndex(i => i.id === targetItemId);

    if (draggedIndex === -1 || targetIndex === -1) return;

    const newItems = [...items];
    const [draggedItem] = newItems.splice(draggedIndex, 1);
    newItems.splice(targetIndex, 0, draggedItem);

    setItems(newItems);
    setDraggedItemId(null);
    setDragOverItemId(null);
    triggerAutoSave(newItems);
  };

  // Detect if device is mobile/touch
  const [isMobile, setIsMobile] = useState(false);
  
  useEffect(() => {
    // Check for touch device
    const checkMobile = () => {
      setIsMobile('ontouchstart' in window || navigator.maxTouchPoints > 0);
    };
    checkMobile();
  }, []);

  // Handle Enter key in input
  // Desktop: Enter submits, Shift+Enter adds new line
  // Mobile: Enter adds new line (use Add button to submit)
  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter') {
      if (isMobile) {
        // On mobile, let Enter add new lines naturally
        return;
      }
      if (!e.shiftKey) {
        // Desktop: Enter without Shift submits
        e.preventDefault();
        addTask();
      }
      // Shift+Enter allows default behavior (new line)
    }
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
            placeholder={`Add a task for ${isTodaySelected ? 'today' : format(selectedDate, 'EEEE')}...${isMobile ? '' : ' (Shift+Enter for new line)'}`}
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
                draggable={editingId !== item.id}
                onDragStart={(e) => handleDragStart(e, item.id)}
                onDragEnd={handleDragEnd}
                onDragEnter={(e) => handleDragEnter(e, item.id)}
                onDragLeave={handleDragLeave}
                onDragOver={handleDragOver}
                onDrop={(e) => handleDrop(e, item.id)}
                className={cn(
                  'group flex flex-col p-4 rounded-xl',
                  'bg-white dark:bg-gray-800',
                  'border border-gray-100 dark:border-gray-700',
                  'shadow-sm hover:shadow-md transition-all duration-200',
                  editingId === item.id 
                    ? 'border-primary-300 dark:border-primary-600 ring-2 ring-primary-100 dark:ring-primary-900/30'
                    : 'hover:border-primary-200 dark:hover:border-primary-800',
                  dragOverItemId === item.id && 'border-primary-400 dark:border-primary-500 bg-primary-50/50 dark:bg-primary-900/20',
                  draggedItemId === item.id && 'opacity-50'
                )}
              >
                <div className="flex items-start gap-3">
                  <div
                    className={cn(
                      'flex-shrink-0 w-5 h-5 mt-0.5 flex items-center justify-center text-gray-300 dark:text-gray-600 cursor-grab active:cursor-grabbing transition-opacity',
                      !isMobile && 'opacity-0 group-hover:opacity-100'
                    )}
                    title="Drag to reorder"
                  >
                    <GripVertical className="w-4 h-4" />
                  </div>
                  <button
                    onClick={() => toggleTask(item.id)}
                    className={cn(
                      'flex-shrink-0 w-6 h-6 mt-0.5 rounded-md border-2 flex items-center justify-center transition-all duration-200',
                      'border-gray-300 dark:border-gray-600',
                      'hover:border-primary-500 dark:hover:border-primary-400',
                      'hover:bg-primary-50 dark:hover:bg-primary-900/30'
                    )}
                  >
                  </button>
                  
                  {editingId === item.id ? (
                    <div className="flex-1 flex flex-col gap-2">
                      <textarea
                        ref={editInputRef}
                        value={editText}
                        onChange={handleEditTextChange}
                        onKeyDown={handleEditKeyDown}
                        className="w-full bg-transparent border-none outline-none text-gray-800 dark:text-gray-200 font-medium resize-none min-h-[24px]"
                        rows={1}
                      />
                      <div className="flex items-center gap-2">
                        <Button variant="primary" size="sm" onClick={saveEdit}>
                          Save
                        </Button>
                        <Button variant="ghost" size="sm" onClick={cancelEdit}>
                          Cancel
                        </Button>
                        <span className="text-xs text-gray-400 dark:text-gray-500 ml-auto">
                          {isMobile ? 'Tap Save when done' : 'Enter to save, Esc to cancel'}
                        </span>
                      </div>
                    </div>
                  ) : (
                    <>
                      <span 
                        className="flex-1 text-gray-800 dark:text-gray-200 font-medium whitespace-pre-wrap cursor-pointer hover:text-primary-600 dark:hover:text-primary-400 transition-colors"
                        onClick={() => startEditing(item)}
                        title="Click to edit"
                      >
                        {item.text}
                      </span>
                      
                      {/* Reminder bell icon — always visible on mobile */}
                      <button
                        onClick={() => openReminderPicker(item)}
                        className={cn(
                          'flex-shrink-0 w-8 h-8 flex items-center justify-center rounded-lg transition-all',
                          item.reminderTime
                            ? 'text-amber-500 dark:text-amber-400 bg-amber-50 dark:bg-amber-900/20'
                            : 'text-gray-400 dark:text-gray-500 hover:text-amber-500 dark:hover:text-amber-400 hover:bg-amber-50 dark:hover:bg-amber-900/20',
                          !item.reminderTime && !isMobile && 'sm:opacity-0 sm:group-hover:opacity-100'
                        )}
                        title={item.reminderTime ? `Reminder at ${item.reminderTime}` : 'Set reminder'}
                      >
                        {item.reminderTime ? <BellRing className="w-4 h-4" /> : <Bell className="w-4 h-4" />}
                      </button>

                      <button
                        onClick={() => startEditing(item)}
                        className={cn(
                          'flex-shrink-0 w-8 h-8 flex items-center justify-center text-gray-400 dark:text-gray-500 hover:text-primary-500 dark:hover:text-primary-400 transition-all rounded-lg hover:bg-primary-50 dark:hover:bg-primary-900/20',
                          !isMobile && 'sm:opacity-0 sm:group-hover:opacity-100'
                        )}
                        title="Edit task"
                      >
                        <Pencil className="w-4 h-4" />
                      </button>
                    </>
                  )}
                  
                  <button
                    onClick={() => deleteTask(item.id)}
                    className={cn(
                      'flex-shrink-0 w-8 h-8 flex items-center justify-center text-gray-400 dark:text-gray-500 hover:text-red-500 dark:hover:text-red-400 transition-all rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20',
                      !isMobile && 'sm:opacity-0 sm:group-hover:opacity-100'
                    )}
                    title="Delete task"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>

                {/* Reminder badge */}
                {item.reminderTime && reminderPickerId !== item.id && (
                  <div className="flex items-center gap-1.5 mt-2 ml-14">
                    <Clock className="w-3 h-3 text-amber-500 dark:text-amber-400" />
                    <span className="text-xs font-medium text-amber-600 dark:text-amber-400">
                      Reminder at {item.reminderTime}
                    </span>
                    <button
                      onClick={() => setReminder(item.id, undefined)}
                      className="ml-1 text-gray-400 hover:text-red-500 dark:hover:text-red-400 transition-colors"
                      title="Remove reminder"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                )}

                {/* Reminder time picker */}
                {reminderPickerId === item.id && (
                  <div className="flex items-center gap-2 mt-2 ml-14 p-2 bg-amber-50 dark:bg-amber-900/20 rounded-lg border border-amber-200 dark:border-amber-800">
                    <Clock className="w-4 h-4 text-amber-500 dark:text-amber-400 flex-shrink-0" />
                    <input
                      type="time"
                      value={reminderTimeInput}
                      onChange={(e) => setReminderTimeInput(e.target.value)}
                      className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600 rounded-md px-2 py-1 text-sm text-gray-800 dark:text-gray-200 outline-none focus:ring-2 focus:ring-amber-300 dark:focus:ring-amber-700"
                      autoFocus
                    />
                    <Button
                      variant="primary"
                      size="sm"
                      onClick={() => {
                        if (reminderTimeInput) {
                          setReminder(item.id, reminderTimeInput);
                        }
                      }}
                      disabled={!reminderTimeInput}
                      className="!py-1 !px-2 text-xs"
                    >
                      Set
                    </Button>
                    {item.reminderTime && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setReminder(item.id, undefined)}
                        className="!py-1 !px-2 text-xs text-red-500 hover:text-red-600"
                      >
                        Remove
                      </Button>
                    )}
                    <button
                      onClick={() => { setReminderPickerId(null); setReminderTimeInput(''); }}
                      className="ml-auto text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                )}
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
                      className={cn(
                        'flex-shrink-0 w-8 h-8 flex items-center justify-center text-gray-400 dark:text-gray-500 hover:text-red-500 dark:hover:text-red-400 transition-all rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20',
                        !isMobile && 'sm:opacity-0 sm:group-hover:opacity-100'
                      )}
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

      {/* Upcoming Section */}
      <div className="mt-4 pt-4 border-t border-gray-100 dark:border-gray-700">
        <button
          onClick={() => {
            const next = !showUpcoming;
            setShowUpcoming(next);
            if (next) loadUpcomingTasks();
          }}
          className="w-full flex items-center justify-between p-3 rounded-xl bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 shadow-sm hover:shadow-md transition-all"
        >
          <div className="flex items-center gap-2">
            <CalendarDays className="w-5 h-5 text-primary-500" />
            <span className="font-semibold text-gray-800 dark:text-gray-200">Upcoming</span>
          </div>
          <ChevronRight className={cn(
            'w-5 h-5 text-gray-400 transition-transform duration-200',
            showUpcoming && 'rotate-90'
          )} />
        </button>

        {showUpcoming && (
          <div className="mt-3 space-y-3 max-h-[400px] overflow-y-auto">
            {loadingUpcoming ? (
              <div className="flex items-center justify-center py-6">
                <Loader2 className="w-6 h-6 text-gray-400 animate-spin" />
              </div>
            ) : upcomingTasks.length === 0 ? (
              <div className="text-center py-6 text-gray-400 dark:text-gray-500">
                <CalendarDays className="w-10 h-10 mx-auto mb-2 opacity-30" />
                <p className="text-sm">No upcoming tasks</p>
                <p className="text-xs mt-1">Navigate to future dates and add tasks</p>
              </div>
            ) : (
              upcomingTasks.map((group) => (
                <div key={group.date} className="bg-white dark:bg-gray-800 rounded-xl border border-gray-100 dark:border-gray-700 overflow-hidden">
                  <button
                    onClick={() => {
                      setSelectedDate(new Date(group.date + 'T00:00:00'));
                      setShowUpcoming(false);
                    }}
                    className="w-full px-4 py-2 text-left bg-gray-50 dark:bg-gray-700/50 border-b border-gray-100 dark:border-gray-700 hover:bg-primary-50 dark:hover:bg-primary-900/20 transition-colors"
                  >
                    <span className="text-sm font-semibold text-primary-600 dark:text-primary-400">
                      {format(new Date(group.date + 'T00:00:00'), 'EEEE, MMM d')}
                    </span>
                    <span className="text-xs text-gray-400 dark:text-gray-500 ml-2">
                      {group.items.length} task{group.items.length !== 1 ? 's' : ''}
                    </span>
                  </button>
                  <div className="divide-y divide-gray-50 dark:divide-gray-700/50">
                    {group.items.map((task) => (
                      <div key={task.id} className="flex items-center gap-3 px-4 py-2.5">
                        <div className="w-4 h-4 rounded border-2 border-gray-300 dark:border-gray-600 flex-shrink-0" />
                        <span className="flex-1 text-sm text-gray-700 dark:text-gray-300 truncate">
                          {task.text}
                        </span>
                        {task.reminderTime && (
                          <span className="flex items-center gap-1 text-xs text-amber-500 dark:text-amber-400 flex-shrink-0">
                            <BellRing className="w-3 h-3" />
                            {task.reminderTime}
                          </span>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              ))
            )}
          </div>
        )}
      </div>
    </div>
  );
}
