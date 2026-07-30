import { lazy, Suspense } from 'react';
import { createBrowserRouter, Navigate } from 'react-router';
import { AppShell } from '@/components/layout/app-shell';
import { ROUTES } from '@/constants/routes';
import { Skeleton } from '@/components/ui/skeleton';

// ============================================
// LAZY-LOADED PAGES
// Each page is a separate chunk for code splitting.
// ============================================

const DashboardPage = lazy(() => import('@/pages/dashboard'));
const AccountsListPage = lazy(() => import('@/pages/accounts/list'));
const AccountConnectPage = lazy(() => import('@/pages/accounts/connect'));
const FlexiGrowthOfferPage = lazy(() => import('@/pages/flexi-growth-offer'));
const ReturnOtpsPage = lazy(() => import('@/pages/return-otps'));
const LoginPage = lazy(() => import('@/pages/auth/login'));
const NotFoundPage = lazy(() => import('@/pages/not-found'));

// ============================================
// PAGE LOADING FALLBACK
// ============================================

function PageLoader() {
  return (
    <div className="flex w-full flex-col space-y-6 p-4 md:p-6 lg:p-8 animate-in fade-in duration-500">
      {/* Header Skeleton */}
      <div className="flex items-center justify-between">
        <Skeleton className="h-10 w-[200px]" />
        <Skeleton className="h-10 w-[120px]" />
      </div>

      {/* Content Skeleton */}
      <div className="space-y-4">
        <Skeleton className="h-4 w-[60%]" />
        <Skeleton className="h-4 w-[80%]" />
      </div>

      {/* Grid/Table Skeleton */}
      <div className="grid grid-cols-1 gap-4 pt-4 md:grid-cols-3">
        <Skeleton className="h-[150px] w-full rounded-xl" />
        <Skeleton className="h-[150px] w-full rounded-xl" />
        <Skeleton className="h-[150px] w-full rounded-xl" />
      </div>

      <div className="pt-4">
        <Skeleton className="h-[250px] w-full rounded-xl" />
      </div>
    </div>
  );
}

function SuspenseWrapper({ children }: { children: React.ReactNode }) {
  return <Suspense fallback={<PageLoader />}>{children}</Suspense>;
}

// ============================================
// ROUTER
// ============================================

export const router = createBrowserRouter([
  // Auth routes (no shell)
  {
    path: ROUTES.LOGIN,
    element: (
      <SuspenseWrapper>
        <LoginPage />
      </SuspenseWrapper>
    ),
  },

  // App routes (with shell)
  {
    element: <AppShell />,
    children: [
      {
        index: true,
        element: <Navigate to={ROUTES.DASHBOARD} replace />,
      },
      {
        path: ROUTES.DASHBOARD,
        element: (
          <SuspenseWrapper>
            <DashboardPage />
          </SuspenseWrapper>
        ),
      },

      // Accounts
      {
        path: ROUTES.ACCOUNTS,
        element: (
          <SuspenseWrapper>
            <AccountsListPage />
          </SuspenseWrapper>
        ),
      },
      {
        path: ROUTES.ACCOUNT_CONNECT,
        element: (
          <SuspenseWrapper>
            <AccountConnectPage />
          </SuspenseWrapper>
        ),
      },

      // Tools
      {
        path: ROUTES.FLEXI_GROWTH_OFFER,
        element: (
          <SuspenseWrapper>
            <FlexiGrowthOfferPage />
          </SuspenseWrapper>
        ),
      },
      {
        path: ROUTES.RETURN_OTPS,
        element: (
          <SuspenseWrapper>
            <ReturnOtpsPage />
          </SuspenseWrapper>
        ),
      },

      // 404
      {
        path: '*',
        element: (
          <SuspenseWrapper>
            <NotFoundPage />
          </SuspenseWrapper>
        ),
      },
    ],
  },
]);
