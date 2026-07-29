import { Outlet, Navigate } from 'react-router';
import { useIsDesktop } from '@/hooks/use-media-query';
import { Sidebar } from './sidebar';
import { BottomNav } from './bottom-nav';
import { TopBar } from './top-bar';
import { cn } from '@/lib/cn';
import { useAuthStore } from '@/store/auth.store';
import { useEffect, useState } from 'react';

export function AppShell() {
  const isDesktop = useIsDesktop();
  const { isAuthenticated, checkSession } = useAuthStore();
  const [isChecking, setIsChecking] = useState(true);

  useEffect(() => {
    checkSession().finally(() => {
      setIsChecking(false);
    });
  }, [checkSession]);

  if (isChecking) {
    return (
      <div className="relative flex h-dvh w-full items-center justify-center bg-slate-950/80 backdrop-blur-md overflow-hidden">
        {/* Dynamic Background Elements */}
        <div className="absolute top-1/4 left-1/4 h-[300px] w-[300px] rounded-full bg-primary/10 blur-[100px] pointer-events-none animate-pulse" />
        <div
          className="absolute bottom-1/4 right-1/4 h-[300px] w-[300px] rounded-full bg-emerald-500/10 blur-[100px] pointer-events-none animate-pulse"
          style={{ animationDelay: '1s' }}
        />

        <div className="relative z-10 flex flex-col items-center justify-center p-10 rounded-3xl bg-slate-900/50 border border-white/5 shadow-[0_8px_32px_0_rgba(0,0,0,0.36)] backdrop-blur-xl">
          <div className="relative flex items-center justify-center mb-8">
            <div className="absolute h-24 w-24 rounded-full border border-primary/20 animate-[ping_2.5s_cubic-bezier(0,0,0.2,1)_infinite]" />
            <div className="absolute h-16 w-16 rounded-full border-t-2 border-r-2 border-primary/80 animate-[spin_1.5s_linear_infinite]" />
            <div className="h-10 w-10 rounded-full bg-gradient-to-tr from-primary to-indigo-500 animate-pulse shadow-[0_0_20px_rgba(var(--primary),0.6)]" />
          </div>

          <span className="text-xs font-bold text-slate-300 tracking-[0.3em] uppercase bg-clip-text text-transparent bg-gradient-to-r from-slate-200 to-slate-400">
            Verifying Secure Session
          </span>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  return (
    <div className="flex h-dvh w-full overflow-hidden bg-background">
      {/* Desktop sidebar */}
      {isDesktop && <Sidebar />}

      {/* Main content area */}
      <div className="flex flex-1 flex-col overflow-hidden">
        <TopBar />

        <main
          className={cn(
            'flex-1 overflow-y-auto overflow-x-hidden',
            // Add bottom padding on mobile for bottom nav
            !isDesktop && 'pb-20',
          )}
        >
          <div className="mx-auto w-full max-w-7xl px-4 py-4 md:px-6 lg:px-8 lg:py-6">
            <Outlet />
          </div>
        </main>
      </div>

      {/* Mobile bottom nav */}
      {!isDesktop && <BottomNav />}
    </div>
  );
}
