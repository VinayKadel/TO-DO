// Dashboard page - main habit tracking view
import { redirect } from 'next/navigation';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import prisma from '@/lib/prisma';
import { Header } from '@/components/layout';
import { DashboardContent } from '@/components/dashboard';
import { subDays, addDays, startOfDay } from 'date-fns';

export const metadata = {
  title: 'Dashboard - HabitTrack',
  description: 'Track your daily habits with HabitTrack',
};

// Force dynamic rendering for authenticated pages
export const dynamic = 'force-dynamic';

export default async function DashboardPage() {
  // Check authentication
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    redirect('/login');
  }

  // Fetch user's tasks with completions for the last 30 days
  const today = new Date();
  const startDate = startOfDay(subDays(today, 30));
  const endDate = startOfDay(addDays(today, 30));

  const tasks = await prisma.task.findMany({
    where: {
      userId: session.user.id,
      isActive: true,
    },
    include: {
      completions: {
        where: {
          date: {
            gte: startDate,
            lte: endDate,
          },
        },
        orderBy: {
          date: 'asc',
        },
      },
    },
    orderBy: [
      { sortOrder: 'asc' },
      { createdAt: 'asc' },
    ],
  });

  // Serialize dates for client component
  const serializedTasks = tasks.map((task) => ({
    ...task,
    createdAt: task.createdAt,
    updatedAt: task.updatedAt,
    completions: task.completions.map((c) => ({
      ...c,
      date: c.date,
      createdAt: c.createdAt,
      updatedAt: c.updatedAt,
    })),
  }));

  return (
    <div className="min-h-screen flex flex-col bg-gray-50 dark:bg-gray-900 transition-colors">
      <Header />
      
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <DashboardContent initialTasks={serializedTasks} />
      </main>

      {/* Footer */}
      <footer className="py-4 text-center text-sm text-gray-400 dark:text-gray-500">
        <p>© {new Date().getFullYear()} HabitTrack. Build better habits.</p>
      </footer>
    </div>
  );
}
