'use client';

// Dashboard content with tab switching
import { useState, useEffect } from 'react';
import { CheckSquare, ListTodo, StickyNote } from 'lucide-react';
import { HabitGrid } from '@/components/tasks';
import { DailyNotes } from '@/components/notes';
import { NotesManager } from '@/components/notes';
import { TabSwitcher } from '@/components/ui/tab-switcher';
import { TaskWithCompletions, DailyNote } from '@/types';

interface DashboardContentProps {
  tasks: TaskWithCompletions[];
  notes: DailyNote[];
}

const TABS = [
  { id: 'habits', label: 'Habit Tracker', icon: <CheckSquare className="w-4 h-4" /> },
  { id: 'todos', label: "Daily To-Do's", icon: <ListTodo className="w-4 h-4" /> },
  { id: 'notes', label: 'Notes', icon: <StickyNote className="w-4 h-4" /> },
];

export function DashboardContent({ tasks, notes }: DashboardContentProps) {
  const [activeTab, setActiveTab] = useState('habits');

  // Persist tab preference
  useEffect(() => {
    const saved = localStorage.getItem('dashboard-tab');
    // Migrate old 'notes' preference to 'todos'
    if (saved === 'notes') {
      localStorage.setItem('dashboard-tab', 'todos');
      setActiveTab('todos');
    } else if (saved && TABS.find(t => t.id === saved)) {
      setActiveTab(saved);
    }
  }, []);

  const handleTabChange = (tabId: string) => {
    setActiveTab(tabId);
    localStorage.setItem('dashboard-tab', tabId);
  };

  return (
    <div className="flex flex-col h-full">
      {/* Tab switcher */}
      <div className="flex justify-center mb-6">
        <TabSwitcher
          tabs={TABS}
          activeTab={activeTab}
          onChange={handleTabChange}
        />
      </div>

      {/* Content */}
      <div className="flex-1">
        {activeTab === 'habits' && <HabitGrid initialTasks={tasks} />}
        {activeTab === 'todos' && <DailyNotes initialNotes={notes} />}
        {activeTab === 'notes' && <NotesManager />}
      </div>
    </div>
  );
}
