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
  isActive: boolean;
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
}

export interface UpdateTaskInput {
  name?: string;
  description?: string;
  color?: string;
  isActive?: boolean;
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
