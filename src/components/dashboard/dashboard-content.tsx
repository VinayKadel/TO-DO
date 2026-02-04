'use client';

// Dashboard content with tab switching between Habits and Notes
import { useState, useEffect } from 'react';
import { CheckSquare, FileText } from 'lucide-react';
import { HabitGrid } from '@/components/tasks';
import { DailyNotes } from '@/components/notes';
import { TabSwitcher, TabValue } from '@/components/ui/tab-switcher';
import { TaskWithCompletions } from '@/types';

interface DashboardContentProps {
  initialTasks: TaskWithCompletions[];
}

const TABS = [
  {
    value: 'habits' as const,
    label: 'Habit Tracker',
    icon: <CheckSquare className="w-4 h-4" />,
  },
  {
    value: 'notes' as const,
    label: 'Daily Notes',
    icon: <FileText className="w-4 h-4" />,
  },
];

export function DashboardContent({ initialTasks }: DashboardContentProps) {
  const [activeTab, setActiveTab] = useState<TabValue>('habits');

  // Load saved tab preference
  useEffect(() => {
    const saved = localStorage.getItem('habittrack-active-tab');
    if (saved === 'habits' || saved === 'notes') {
      setActiveTab(saved);
    }
  }, []);

  // Save tab preference
  const handleTabChange = (tab: TabValue) => {
    setActiveTab(tab);
    localStorage.setItem('habittrack-active-tab', tab);
  };

  return (
    <div className="flex flex-col h-full">
      {/* Tab Switcher */}
      <div className="mb-6">
        <TabSwitcher
          tabs={TABS}
          activeTab={activeTab}
          onChange={handleTabChange}
        />
      </div>

      {/* Content */}
      <div className="flex-1">
        {activeTab === 'habits' ? (
          <HabitGrid initialTasks={initialTasks} />
        ) : (
          <DailyNotes />
        )}
      </div>
    </div>
  );
}
