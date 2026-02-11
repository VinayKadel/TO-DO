// API route for free-form notes (the Notes section)
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import prisma from '@/lib/prisma';

// GET - Fetch all notes for the user
export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const notes = await prisma.note.findMany({
      where: { userId: session.user.id },
      orderBy: [{ sortOrder: 'asc' }, { createdAt: 'desc' }],
    });

    return NextResponse.json({ success: true, data: notes });
  } catch (error) {
    console.error('Error fetching notes:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch notes' },
      { status: 500 }
    );
  }
}

// POST - Create a new note
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { title, content } = body;

    if (!title?.trim()) {
      return NextResponse.json(
        { success: false, error: 'Title is required' },
        { status: 400 }
      );
    }

    // Get the highest sortOrder for this user
    const lastNote = await prisma.note.findFirst({
      where: { userId: session.user.id },
      orderBy: { sortOrder: 'desc' },
      select: { sortOrder: true },
    });

    const note = await prisma.note.create({
      data: {
        userId: session.user.id,
        title: title.trim(),
        content: content || '[]',
        sortOrder: (lastNote?.sortOrder ?? -1) + 1,
      },
    });

    return NextResponse.json({ success: true, data: note });
  } catch (error) {
    console.error('Error creating note:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to create note' },
      { status: 500 }
    );
  }
}
