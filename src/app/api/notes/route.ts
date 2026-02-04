// API route for daily notes
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import prisma from '@/lib/prisma';
import { formatDateForStorage } from '@/lib/date-utils';

// GET - Fetch notes for a date range or specific date
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
    const startDateParam = searchParams.get('startDate');
    const endDateParam = searchParams.get('endDate');

    let where: { userId: string; date?: Date | { gte?: Date; lte?: Date } } = {
      userId: session.user.id,
    };

    if (dateParam) {
      // Fetch single date note
      where.date = new Date(formatDateForStorage(new Date(dateParam)));
    } else if (startDateParam && endDateParam) {
      // Fetch date range
      where.date = {
        gte: new Date(formatDateForStorage(new Date(startDateParam))),
        lte: new Date(formatDateForStorage(new Date(endDateParam))),
      };
    }

    const notes = await prisma.dailyNote.findMany({
      where,
      orderBy: { date: 'desc' },
    });

    return NextResponse.json({ success: true, data: notes });
  } catch (error) {
    console.error('Error fetching daily notes:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch notes' },
      { status: 500 }
    );
  }
}

// POST - Create or update a daily note
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
    const { date, content } = body;

    if (!date) {
      return NextResponse.json(
        { success: false, error: 'Date is required' },
        { status: 400 }
      );
    }

    const noteDate = new Date(formatDateForStorage(new Date(date)));

    // Upsert - create if doesn't exist, update if it does
    const note = await prisma.dailyNote.upsert({
      where: {
        userId_date: {
          userId: session.user.id,
          date: noteDate,
        },
      },
      update: {
        content: content || '',
      },
      create: {
        userId: session.user.id,
        date: noteDate,
        content: content || '',
      },
    });

    return NextResponse.json({ success: true, data: note });
  } catch (error) {
    console.error('Error saving daily note:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to save note' },
      { status: 500 }
    );
  }
}

// DELETE - Delete a daily note
export async function DELETE(request: NextRequest) {
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
        { success: false, error: 'Date is required' },
        { status: 400 }
      );
    }

    const noteDate = new Date(formatDateForStorage(new Date(dateParam)));

    await prisma.dailyNote.delete({
      where: {
        userId_date: {
          userId: session.user.id,
          date: noteDate,
        },
      },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting daily note:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to delete note' },
      { status: 500 }
    );
  }
}
