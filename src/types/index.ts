// Type definitions for the application

import { DefaultSession, DefaultUser } from 'next-auth';
import { JWT, DefaultJWT } from 'next-auth/jwt';

// Extend NextAuth types to include user ID
declare module 'next-auth' {
  interface Session {
    user: {
      id: string;
    } & DefaultSession['user'];
  }

  interface User extends DefaultUser {
    id: string;
  }
}

declare module 'next-auth/jwt' {
  interface JWT extends DefaultJWT {
    id: string;
  }
}

// Task type
export interface Task {
  id: string;
  name: string;
  description?: string | null;
  color: string;
  emoji?: string | null;
  isActive: boolean;
  isCompleted: boolean;
  completedAt?: Date | null;
  sortOrder: number;
  createdAt: Date;
  updatedAt: Date;
  userId: string;
  completions?: TaskCompletion[];
}

// Task completion type
export interface TaskCompletion {
  id: string;
  date: Date;
  completed: boolean;
  taskId: string;
}

// API response types
export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
}

// Form data types
export interface CreateTaskInput {
  name: string;
  description?: string;
  color?: string;
  emoji?: string;
}

export interface UpdateTaskInput {
  name?: string;
  description?: string;
  color?: string;
  emoji?: string;
  isActive?: boolean;
  isCompleted?: boolean;
}

export interface ToggleCompletionInput {
  taskId: string;
  date: string; // ISO date string
  completed: boolean;
}

// Grid view types
export interface TaskWithCompletions extends Task {
  completions: TaskCompletion[];
}

export interface DateColumn {
  date: Date;
  dateString: string;
  dayName: string;
  dayNumber: number;
  monthName: string;
  isToday: boolean;
}

// Daily Note types
export interface DailyNote {
  id: string;
  date: Date;
  content: string;
  createdAt: Date;
  updatedAt: Date;
  userId: string;
}

export interface CreateDailyNoteInput {
  date: string; // ISO date string
  content: string;
}

export interface UpdateDailyNoteInput {
  content: string;
}

// Note types (free-form notes section)
export interface NoteBlock {
  id: string;
  type: 'text' | 'todo' | 'image';
  content: string; // For text: the text, for todo: the label, for image: the URL/data URI
  completed?: boolean; // Only for todo type
}

export interface NoteData {
  id: string;
  title: string;
  content: string; // JSON string of NoteBlock[]
  sortOrder: number;
  createdAt: Date;
  updatedAt: Date;
  userId: string;
}
