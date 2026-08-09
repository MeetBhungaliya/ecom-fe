import React, { useEffect, useState, useRef } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { RefreshCw } from 'lucide-react';
import { cn } from '@/lib/cn';
import { useIsDesktop } from '@/hooks/use-media-query';

interface PullToRefreshProps {
  children: React.ReactNode;
  scrollRef: React.RefObject<HTMLElement | null>;
}

export function PullToRefresh({ children, scrollRef }: PullToRefreshProps) {
  const isDesktop = useIsDesktop();
  const queryClient = useQueryClient();

  const [pullDistance, setPullDistance] = useState(0);
  const [status, setStatus] = useState<'idle' | 'pulling' | 'refreshing' | 'completed'>('idle');

  const startY = useRef(0);
  const isTracking = useRef(false);
  const triggerThreshold = 60; // drag distance required to trigger refresh in pixels

  useEffect(() => {
    const el = scrollRef.current;
    if (!el || isDesktop) return;

    const handleTouchStart = (e: TouchEvent) => {
      // Only trigger if we are scrolled to the very top
      if (el.scrollTop <= 0) {
        startY.current = e.touches[0].clientY;
        isTracking.current = true;
      }
    };

    const handleTouchMove = (e: TouchEvent) => {
      if (!isTracking.current) return;

      const currentY = e.touches[0].clientY;
      const deltaY = currentY - startY.current;

      if (deltaY > 0) {
        // Apply exponential resistance for a premium "elastic" feel
        const resistance = 0.35;
        const drag = deltaY * resistance;
        const boundedDrag = Math.min(drag, 100);

        setPullDistance(boundedDrag);
        if (boundedDrag > 5) {
          setStatus('pulling');
          // Prevent scroll bounce on iOS
          if (e.cancelable) {
            e.preventDefault();
          }
        }
      } else {
        // If scrolling up, reset
        isTracking.current = false;
        setPullDistance(0);
        setStatus('idle');
      }
    };

    const handleTouchEnd = async () => {
      if (!isTracking.current) return;
      isTracking.current = false;

      if (status === 'pulling' && pullDistance >= triggerThreshold) {
        setStatus('refreshing');
        setPullDistance(50); // Keep spinner partially visible while refreshing

        try {
          await queryClient.invalidateQueries();
        } catch (err) {
          console.error('Pull-to-refresh failed:', err);
        } finally {
          setStatus('completed');
          setTimeout(() => {
            setPullDistance(0);
            setStatus('idle');
          }, 400);
        }
      } else {
        // Bounce back to top
        setStatus('idle');
        setPullDistance(0);
      }
    };

    el.addEventListener('touchstart', handleTouchStart, { passive: true });
    el.addEventListener('touchmove', handleTouchMove, { passive: false });
    el.addEventListener('touchend', handleTouchEnd, { passive: true });

    return () => {
      el.removeEventListener('touchstart', handleTouchStart);
      el.removeEventListener('touchmove', handleTouchMove);
      el.removeEventListener('touchend', handleTouchEnd);
    };
  }, [scrollRef, status, pullDistance, isDesktop, queryClient]);

  // Don't render pull container on desktop
  if (isDesktop) {
    return <>{children}</>;
  }

  const rotation = Math.min(pullDistance * 6, 360);
  const opacity = Math.min(pullDistance / triggerThreshold, 1);
  const scale = Math.min(pullDistance / triggerThreshold, 1);

  return (
    <div className="relative w-full h-full">
      {/* Pull indicator spinner container */}
      <div
        className="absolute left-0 right-0 top-0 z-50 flex items-center justify-center pointer-events-none transition-all duration-200"
        style={{
          transform: `translateY(${pullDistance - 40}px)`,
          opacity: status === 'idle' ? opacity : 1,
        }}
      >
        <div className="flex h-9 w-9 items-center justify-center rounded-full bg-slate-900/80 backdrop-blur-md border border-white/10 shadow-lg ring-1 ring-black/10">
          <RefreshCw
            className={cn(
              'h-4 w-4 text-primary-foreground transition-transform duration-75',
              status === 'refreshing' && 'animate-spin text-primary',
              status === 'completed' && 'text-emerald-400'
            )}
            style={{
              transform: status === 'pulling' ? `rotate(${rotation}deg) scale(${scale})` : undefined,
            }}
          />
        </div>
      </div>

      {/* Main children container */}
      <div
        className="w-full h-full transition-transform duration-200 ease-out"
        style={{
          transform: status === 'pulling' ? `translateY(${pullDistance * 0.5}px)` : undefined,
        }}
      >
        {children}
      </div>
    </div>
  );
}
