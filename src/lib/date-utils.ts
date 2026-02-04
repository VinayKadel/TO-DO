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
 * Uses noon UTC to avoid timezone issues
 */
export function formatDateForStorage(date: Date): string {
  // Parse the date string and create a UTC date at noon to avoid timezone shifts
  const year = date.getFullYear();
  const month = date.getMonth();
  const day = date.getDate();
  // Create date at noon UTC to avoid any timezone boundary issues
  return new Date(Date.UTC(year, month, day, 12, 0, 0)).toISOString();
}

/**
 * Check if a task is completed on a specific date
 * Compares using local date parts to avoid timezone issues
 */
export function isTaskCompletedOnDate(
  completions: { date: Date | string; completed: boolean }[],
  targetDate: Date
): boolean {
  const targetYear = targetDate.getFullYear();
  const targetMonth = targetDate.getMonth();
  const targetDay = targetDate.getDate();
  
  return completions.some((completion) => {
    const completionDate = new Date(completion.date);
    // Compare using UTC date parts since we store at noon UTC
    return (
      completionDate.getUTCFullYear() === targetYear &&
      completionDate.getUTCMonth() === targetMonth &&
      completionDate.getUTCDate() === targetDay &&
      completion.completed
    );
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
