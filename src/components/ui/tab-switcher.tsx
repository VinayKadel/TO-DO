'use client';

// Tab switcher component for dashboard sections
import { cn } from '@/lib/utils';

export type TabValue = 'habits' | 'notes';

interface Tab {
  value: TabValue;
  label: string;
  icon: React.ReactNode;
}

interface TabSwitcherProps {
  tabs: Tab[];
  activeTab: TabValue;
  onChange: (tab: TabValue) => void;
}

export function TabSwitcher({ tabs, activeTab, onChange }: TabSwitcherProps) {
  return (
    <div className="flex items-center gap-1 p-1 bg-gray-100 dark:bg-gray-800 rounded-xl">
      {tabs.map((tab) => (
        <button
          key={tab.value}
          onClick={() => onChange(tab.value)}
          className={cn(
            'flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all',
            activeTab === tab.value
              ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm'
              : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200'
          )}
        >
          {tab.icon}
          <span className="hidden sm:inline">{tab.label}</span>
        </button>
      ))}
    </div>
  );
}
