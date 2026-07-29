import { QueryClientProvider } from '@tanstack/react-query';
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';
import { ThemeProvider } from 'next-themes';
import { Toaster } from 'sonner';
import { queryClient } from '@/lib/query-client';

/**
 * Providers — Composes all context providers in the correct order.
 * Wrap the entire app with this component.
 */
export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <ThemeProvider
      attribute="class"
      defaultTheme="dark"
      storageKey="comops-theme"
      disableTransitionOnChange
    >
      <QueryClientProvider client={queryClient}>
        {children}

        {/* Toast notifications */}
        <Toaster
          position="bottom-right"
          expand={false}
          richColors
          closeButton
          theme="system"
          toastOptions={{
            className: 'font-sans',
            duration: 4000,
          }}
        />

        {/* Query devtools — only in development */}
        <ReactQueryDevtools initialIsOpen={false} buttonPosition="bottom-left" />
      </QueryClientProvider>
    </ThemeProvider>
  );
}
