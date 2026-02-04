// API route for daily notes
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import prisma from '@/lib/prisma';

// GET - fetch note for a specific date
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(request.url);
    const dateParam = searchParams.get('date');

    if (!dateParam) {
      return NextResponse.json(
        { success: false, error: 'Date parameter is required' },
        { status: 400 }
      );
    }

    // Parse the date and create a date-only value
    const date = new Date(dateParam);
    date.setUTCHours(0, 0, 0, 0);

    const note = await prisma.dailyNote.findUnique({
      where: {
        userId_date: {
          userId: session.user.id,
          date: date,
        },
      },
    });

    return NextResponse.json({
      success: true,
      data: note || { content: '', date: dateParam },
    });
  } catch (error) {
    console.error('Error fetching daily note:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch note' },
      { status: 500 }
    );
  }
}

// POST - create or update note for a specific date
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
    const { date: dateParam, content } = body;

    if (!dateParam) {
      return NextResponse.json(
        { success: false, error: 'Date is required' },
        { status: 400 }
      );
    }

    // Parse the date and create a date-only value
    const date = new Date(dateParam);
    date.setUTCHours(0, 0, 0, 0);

    // Upsert - create or update the note
    const note = await prisma.dailyNote.upsert({
      where: {
        userId_date: {
          userId: session.user.id,
          date: date,
        },
      },
      update: {
        content: content || '',
      },
      create: {
        userId: session.user.id,
        date: date,
        content: content || '',
      },
    });

    return NextResponse.json({
      success: true,
      data: note,
    });
  } catch (error) {
    console.error('Error saving daily note:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to save note' },
      { status: 500 }
    );
  }
}
