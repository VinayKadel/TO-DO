// Tasks API routes - CRUD operations for tasks
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { z } from 'zod';
import prisma from '@/lib/prisma';
import { authOptions } from '@/lib/auth';

// Validation schema for creating a task
const createTaskSchema = z.object({
  name: z.string().min(1, 'Task name is required').max(100, 'Task name is too long'),
  description: z.string().max(500, 'Description is too long').optional(),
  color: z.string().regex(/^#[0-9A-Fa-f]{6}$/, 'Invalid color format').optional(),
  emoji: z.string().optional(),
});

// GET - Fetch all tasks for the authenticated user
export async function GET(request: NextRequest) {
  try {
    // Check authentication
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Get query parameters for date range
    const searchParams = request.nextUrl.searchParams;
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');

    // Fetch tasks with completions
    const tasks = await prisma.task.findMany({
      where: {
        userId: session.user.id,
        isActive: true,
      },
      include: {
        completions: startDate && endDate ? {
          where: {
            date: {
              gte: new Date(startDate),
              lte: new Date(endDate),
            },
          },
        } : true,
      },
      orderBy: [
        { sortOrder: 'asc' },
        { createdAt: 'asc' },
      ],
    });

    return NextResponse.json({ success: true, data: tasks });
  } catch (error) {
    console.error('Error fetching tasks:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch tasks' },
      { status: 500 }
    );
  }
}

// POST - Create a new task
export async function POST(request: NextRequest) {
  console.log('[API /api/tasks POST] Request received');
  
  try {
    // Check authentication
    const session = await getServerSession(authOptions);
    console.log('[API /api/tasks POST] Session:', session?.user?.id ? 'authenticated' : 'not authenticated');
    
    if (!session?.user?.id) {
      console.log('[API /api/tasks POST] Unauthorized - no session');
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Parse and validate request body
    const body = await request.json();
    console.log('[API /api/tasks POST] Request body:', JSON.stringify(body));
    
    const validationResult = createTaskSchema.safeParse(body);
    
    if (!validationResult.success) {
      console.log('[API /api/tasks POST] Validation failed:', validationResult.error.errors);
      return NextResponse.json(
        { success: false, error: validationResult.error.errors[0].message },
        { status: 400 }
      );
    }

    const { name, description, color, emoji } = validationResult.data;
    console.log('[API /api/tasks POST] Creating task:', { name, description, color, emoji, userId: session.user.id });

    // Create task
    const task = await prisma.task.create({
      data: {
        name,
        description: description || null,
        color: color || '#0ea5e9',
        emoji: emoji || null,
        userId: session.user.id,
      },
      include: {
        completions: true,
      },
    });

    console.log('[API /api/tasks POST] Task created:', task.id);
    
    return NextResponse.json(
      { success: true, data: task },
      { status: 201 }
    );
  } catch (error) {
    console.error('[API /api/tasks POST] Error creating task:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    const errorStack = error instanceof Error ? error.stack : '';
    console.error('[API /api/tasks POST] Error details:', { message: errorMessage, stack: errorStack });
    return NextResponse.json(
      { success: false, error: `Failed to create task: ${errorMessage}` },
      { status: 500 }
    );
  }
}
