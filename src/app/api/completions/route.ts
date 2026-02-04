// Task completion API routes - Toggle completion status
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { z } from 'zod';
import prisma from '@/lib/prisma';
import { authOptions } from '@/lib/auth';

// Validation schema for toggling completion
const toggleCompletionSchema = z.object({
  taskId: z.string().min(1, 'Task ID is required'),
  date: z.string(), // Accept any date string format
  completed: z.boolean(),
});

/**
 * Parse date string and return UTC date at noon to avoid timezone issues
 */
function parseToUTCNoon(dateStr: string): Date {
  // Handle both ISO format and yyyy-MM-dd format
  const date = new Date(dateStr);
  const year = date.getFullYear();
  const month = date.getMonth();
  const day = date.getDate();
  // Return date at noon UTC to avoid timezone boundary issues
  return new Date(Date.UTC(year, month, day, 12, 0, 0));
}

// POST - Toggle task completion for a specific date
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Parse and validate request body
    const body = await request.json();
    const validationResult = toggleCompletionSchema.safeParse(body);
    
    if (!validationResult.success) {
      return NextResponse.json(
        { success: false, error: validationResult.error.errors[0].message },
        { status: 400 }
      );
    }

    const { taskId, date, completed } = validationResult.data;
    const completionDate = parseToUTCNoon(date);

    // Verify task belongs to user
    const task = await prisma.task.findFirst({
      where: {
        id: taskId,
        userId: session.user.id,
      },
    });

    if (!task) {
      return NextResponse.json(
        { success: false, error: 'Task not found' },
        { status: 404 }
      );
    }

    // Check if completion already exists
    const existingCompletion = await prisma.taskCompletion.findUnique({
      where: {
        taskId_date: {
          taskId,
          date: completionDate,
        },
      },
    });

    let completion;

    if (completed) {
      // Create or update completion
      if (existingCompletion) {
        completion = await prisma.taskCompletion.update({
          where: { id: existingCompletion.id },
          data: { completed: true },
        });
      } else {
        completion = await prisma.taskCompletion.create({
          data: {
            taskId,
            date: completionDate,
            completed: true,
          },
        });
      }
    } else {
      // Delete completion if exists
      if (existingCompletion) {
        await prisma.taskCompletion.delete({
          where: { id: existingCompletion.id },
        });
        completion = null;
      }
    }

    return NextResponse.json({
      success: true,
      data: {
        taskId,
        date: completionDate.toISOString(),
        completed,
        completion,
      },
    });
  } catch (error) {
    console.error('Error toggling completion:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to toggle completion' },
      { status: 500 }
    );
  }
}

// GET - Get completions for a date range
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const searchParams = request.nextUrl.searchParams;
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');

    if (!startDate || !endDate) {
      return NextResponse.json(
        { success: false, error: 'startDate and endDate are required' },
        { status: 400 }
      );
    }

    // Get all completions for user's tasks within date range
    const completions = await prisma.taskCompletion.findMany({
      where: {
        task: {
          userId: session.user.id,
        },
        date: {
          gte: new Date(startDate),
          lte: new Date(endDate),
        },
      },
      include: {
        task: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });

    return NextResponse.json({ success: true, data: completions });
  } catch (error) {
    console.error('Error fetching completions:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch completions' },
      { status: 500 }
    );
  }
}
