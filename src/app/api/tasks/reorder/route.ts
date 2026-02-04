// Task reorder API route - Update task sort order
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { z } from 'zod';
import prisma from '@/lib/prisma';
import { authOptions } from '@/lib/auth';

// Validation schema for reordering tasks
const reorderSchema = z.object({
  taskIds: z.array(z.string()).min(1, 'At least one task ID is required'),
});

// PUT - Update task order
export async function PUT(request: NextRequest) {
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
    const validationResult = reorderSchema.safeParse(body);
    
    if (!validationResult.success) {
      return NextResponse.json(
        { success: false, error: validationResult.error.errors[0].message },
        { status: 400 }
      );
    }

    const { taskIds } = validationResult.data;

    // Verify all tasks belong to the user
    const tasks = await prisma.task.findMany({
      where: {
        id: { in: taskIds },
        userId: session.user.id,
      },
      select: { id: true },
    });

    if (tasks.length !== taskIds.length) {
      return NextResponse.json(
        { success: false, error: 'One or more tasks not found' },
        { status: 404 }
      );
    }

    // Update sort order for each task
    const updatePromises = taskIds.map((taskId, index) =>
      prisma.task.update({
        where: { id: taskId },
        data: { sortOrder: index },
      })
    );

    await Promise.all(updatePromises);

    return NextResponse.json({ 
      success: true, 
      data: { message: 'Tasks reordered successfully' } 
    });
  } catch (error) {
    console.error('Error reordering tasks:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to reorder tasks' },
      { status: 500 }
    );
  }
}
