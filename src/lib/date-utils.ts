// Date utility functions for the habit tracker
import {
  format,
  startOfDay,
  addDays,
  subDays,
  isToday,
  isSameDay,
  eachDayOfInterval,
  startOfWeek,
  endOfWeek,
} from 'date-fns';
import { DateColumn } from '@/types';

/**
 * Generate an array of date columns for the grid view
 * @param centerDate - The date to center the view around
 * @param daysToShow - Number of days to show (default: 14)
 * @returns Array of DateColumn objects
 */
export function generateDateColumns(
  centerDate: Date = new Date(),
  daysToShow: number = 14
): DateColumn[] {
  const halfDays = Math.floor(daysToShow / 2);
  const startDate = subDays(centerDate, halfDays);
  const endDate = addDays(centerDate, halfDays - 1);

  const interval = eachDayOfInterval({ start: startDate, end: endDate });

  return interval.map((date) => ({
    date,
    dateString: format(date, 'yyyy-MM-dd'),
    dayName: format(date, 'EEE'),
    dayNumber: parseInt(format(date, 'd')),
    monthName: format(date, 'MMM'),
    isToday: isToday(date),
  }));
}

/**
 * Format a date to ISO string for storage (date only, no time)
 */
export function formatDateForStorage(date: Date): string {
  return startOfDay(date).toISOString();
}

/**
 * Check if a task is completed on a specific date
 */
export function isTaskCompletedOnDate(
  completions: { date: Date | string; completed: boolean }[],
  targetDate: Date
): boolean {
  return completions.some((completion) => {
    const completionDate = new Date(completion.date);
    return isSameDay(completionDate, targetDate) && completion.completed;
  });
}

/**
 * Get week boundaries for a given date
 */
export function getWeekBoundaries(date: Date) {
  return {
    start: startOfWeek(date, { weekStartsOn: 1 }), // Monday
    end: endOfWeek(date, { weekStartsOn: 1 }),
  };
}

/**
 * Format date for display
 */
export function formatDisplayDate(date: Date): string {
  return format(date, 'MMM d, yyyy');
}
