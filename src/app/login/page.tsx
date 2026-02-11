// Login page
import { redirect } from 'next/navigation';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { LoginForm } from '@/components/auth';

export const metadata = {
  title: 'Sign In - SONITRACK',
  description: 'Sign in to your SONITRACK account',
};

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ registered?: string }>;
}) {
  // Await searchParams for Next.js 16
  const resolvedSearchParams = await searchParams;
  
  // Redirect if already logged in
  const session = await getServerSession(authOptions);
  if (session) {
    redirect('/dashboard');
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-4 bg-gradient-to-br from-primary-50 via-white to-primary-50 dark:from-gray-900 dark:via-gray-900 dark:to-gray-800 transition-colors">
      {/* Background decoration */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-primary-100 dark:bg-primary-900/30 rounded-full opacity-50 blur-3xl" />
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-primary-100 dark:bg-primary-900/30 rounded-full opacity-50 blur-3xl" />
      </div>

      {/* Logo */}
      <div className="flex items-center gap-3 mb-8 relative">
        <img src="/favicon.svg" alt="SONITRACK" className="w-12 h-12 rounded-xl shadow-lg shadow-primary-200 dark:shadow-primary-900/50" />
        <span className="text-2xl font-bold text-gray-900 dark:text-white font-[family-name:var(--font-brand)] tracking-tight">SONITRACK</span>
      </div>

      {/* Success message after registration */}
      {resolvedSearchParams.registered && (
        <div className="mb-6 p-4 bg-green-50 dark:bg-green-900/30 border border-green-200 dark:border-green-800 rounded-lg text-green-700 dark:text-green-300 text-sm max-w-md w-full relative">
          Account created successfully! Please sign in.
        </div>
      )}

      {/* Login form */}
      <div className="relative w-full">
        <LoginForm />
      </div>
    </div>
  );
}
