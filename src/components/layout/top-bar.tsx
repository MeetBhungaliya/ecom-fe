import { useAccounts } from '@/hooks/use-accounts';
import { useIsDesktop } from '@/hooks/use-media-query';
import { useOnlineStatus } from '@/hooks/use-online-status';
import { cn } from '@/lib/cn';
import { useAdsSyncStore } from '@/store/ads.store';
import { useMarketplaceStore } from '@/store/marketplace.store';
import { useQueryClient } from '@tanstack/react-query';
import { Check, Loader2, RefreshCw, Users, WifiOff } from 'lucide-react';
import { useCallback, useEffect, useRef, useState } from 'react';
import { useLocation } from 'react-router';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function getInitials(name?: string) {
  if (!name) return 'A';
  const words = name.trim().split(/\s+/);
  if (words.length >= 2) return (words[0][0] + words[1][0]).toUpperCase();
  return name.substring(0, 2).toUpperCase();
}

const PAGE_TITLES: Record<string, string> = {
  '/dashboard': 'Dashboard',
  '/inventory': 'Inventory',
  '/inventory/add': 'Add Product',
  '/inventory/analytics': 'Inventory Analytics',
  '/accounts': 'Marketplace Accounts',
  '/accounts/connect': 'Connect Meesho Account',
  '/ads-management': 'Ads Management',
  '/flexi-growth-offer': 'Flexi Growth Offer',
  '/return-otps': 'Return OTPs',
  '/download-app': 'Get the Mobile App',
};

const getPageTitle = (pathname: string) => {
  if (PAGE_TITLES[pathname]) return PAGE_TITLES[pathname];
  if (pathname.startsWith('/inventory/') && pathname.endsWith('/edit')) return 'Edit Product';
  return '';
};

// ─── Avatar chip ──────────────────────────────────────────────────────────────

function Avatar({ name, size = 28 }: { name: string; size?: number }) {
  const initials = getInitials(name);
  return (
    <span
      className="inline-flex items-center justify-center rounded-full bg-primary text-primary-foreground font-semibold select-none shrink-0"
      style={{ width: size, height: size, fontSize: size * 0.35 }}
      aria-hidden="true"
    >
      {initials}
    </span>
  );
}

// ─── Refresh button ───────────────────────────────────────────────────────────

interface RefreshButtonProps {
  isRefreshing: boolean;
  disabled: boolean;
  onClick: () => void;
}

function RefreshButton({ isRefreshing, disabled, onClick }: RefreshButtonProps) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      aria-label="Refresh data"
      className={cn(
        'relative flex items-center justify-center w-[38px] h-[38px] shrink-0 rounded-xl',
        'bg-muted/60 border border-border/40 text-muted-foreground',
        'active:scale-90 active:bg-muted active:text-foreground',
        'transition-[transform,opacity] duration-150 ease-out',
        'disabled:opacity-40 disabled:cursor-not-allowed',
        'md:hover:bg-muted md:hover:text-foreground md:hover:border-border/70',
      )}
    >
      {isRefreshing && (
        <span
          className="absolute inset-0 rounded-xl border border-sky-500/50 animate-ping pointer-events-none"
          style={{ animationDuration: '1s' }}
        />
      )}
      <RefreshCw
        className={cn(
          'w-[15px] h-[15px]',
          isRefreshing ? 'animate-spin text-sky-400' : 'text-muted-foreground',
        )}
        style={isRefreshing ? { animationDuration: '0.7s' } : undefined}
        strokeWidth={2.2}
      />
    </button>
  );
}

// ─── Account Selector ─────────────────────────────────────────────────────────

interface AccountSelectorProps {
  accounts: import('@/types').MarketplaceAccount[];
  activeAccountIds: string[];
  toggleActiveAccount: (id: string) => void;
}

function AccountSelector({
  accounts,
  activeAccountIds,
  toggleActiveAccount,
}: AccountSelectorProps) {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const selected = accounts.filter((a) => activeAccountIds.includes(a.id.toString()));

  useEffect(() => {
    if (!open) return;
    const handler = (e: PointerEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('pointerdown', handler, { passive: true });
    return () => document.removeEventListener('pointerdown', handler);
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [open]);

  const handleToggle = useCallback(
    (id: string) => {
      toggleActiveAccount(id);
    },
    [toggleActiveAccount],
  );

  return (
    <div ref={containerRef} className="relative z-50">
      {/* Trigger */}
      <button
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-label="Select accounts"
        className={cn(
          'flex items-center gap-1.5 h-[38px] rounded-xl border px-2.5 shrink-0',
          'bg-muted/60 border-border/40 text-foreground',
          'active:scale-95 active:bg-muted',
          'transition-[box-shadow,border-color] duration-150 ease-out',
          'md:hover:border-border/70 md:hover:bg-muted',
          open && 'border-primary/50 bg-muted shadow-[0_0_0_3px_hsl(var(--primary)/0.12)]',
        )}
      >
        {/* Avatar stack with fixed container footprint to eliminate width jumps */}
        <span
          className="flex items-center justify-center shrink-0 w-[42px] h-[22px] overflow-hidden"
          aria-hidden="true"
        >
          {selected.length === 0 ? (
            <span className="inline-flex items-center justify-center w-[22px] h-[22px] rounded-full border border-dashed border-border/70 text-muted-foreground">
              <Users className="w-3 h-3" />
            </span>
          ) : (
            <span className="flex -space-x-2 shrink-0">
              {selected.slice(0, 2).map((acc, i) => (
                <span
                  key={acc.id}
                  className="relative inline-flex shrink-0"
                  style={{ zIndex: 10 - i }}
                >
                  <Avatar name={acc.supplierData?.name || acc.email} size={22} />
                </span>
              ))}
              {selected.length > 2 && (
                <span
                  className="relative inline-flex items-center justify-center w-[22px] h-[22px] rounded-full bg-muted text-[9px] font-bold text-muted-foreground shrink-0"
                  style={{ zIndex: 7 }}
                >
                  +{selected.length - 2}
                </span>
              )}
            </span>
          )}
        </span>

        {/* Label */}
        <span className="hidden sm:block text-xs font-medium text-foreground/80 leading-none w-[72px] truncate text-left">
          {selected.length === 0
            ? 'All'
            : selected.length === 1
              ? (selected[0].supplierData?.name || selected[0].email).split(' ')[0]
              : `${selected.length} accounts`}
        </span>

        {/* Chevron */}
        <svg
          className={cn(
            'w-3 h-3 shrink-0 text-muted-foreground transition-transform duration-150',
            open && 'rotate-180',
          )}
          viewBox="0 0 12 12"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M2 4l4 4 4-4" />
        </svg>
      </button>

      {/* Dropdown panel — high z-index and hardware accelerated */}
      <div
        role="listbox"
        aria-label="Account list"
        aria-multiselectable="true"
        className={cn(
          'absolute right-0 top-[calc(100%+6px)] z-[100]',
          'w-64 max-w-[calc(100vw-2rem)] rounded-xl overflow-hidden',
          'bg-card/95 border border-border/50',
          'shadow-[0_12px_36px_rgba(0,0,0,0.5)] backdrop-blur-md',
          'transition-[transform,opacity] duration-200 ease-out origin-top-right',
          open
            ? 'opacity-100 scale-100 pointer-events-auto'
            : 'opacity-0 scale-95 pointer-events-none',
        )}
        style={{ willChange: 'transform, opacity' }}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-3 py-2.5 border-b border-border/40">
          <span className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">
            Accounts
          </span>
          {selected.length > 0 && (
            <span className="text-[10px] font-medium text-primary bg-primary/10 px-1.5 py-0.5 rounded-full">
              {selected.length} active
            </span>
          )}
        </div>

        {/* Account rows */}
        <ul className="py-1" role="presentation">
          {accounts.map((acc) => {
            const isSelected = activeAccountIds.includes(acc.id.toString());
            const displayName = acc.supplierData?.name || acc.email;

            return (
              <li key={acc.id} role="presentation">
                <button
                  role="option"
                  aria-selected={isSelected}
                  onClick={() => handleToggle(acc.id.toString())}
                  className={cn(
                    'w-full flex items-center gap-3 px-3 py-2.5 min-h-[44px]',
                    'active:bg-muted/80',
                    'md:hover:bg-muted/60',
                    isSelected ? 'bg-primary/[0.08]' : '',
                    'transition-colors duration-100',
                  )}
                >
                  <Avatar name={displayName} size={30} />

                  <span className="flex flex-col items-start flex-1 min-w-0">
                    <span
                      className={cn(
                        'text-sm font-medium truncate w-full text-left leading-tight',
                        isSelected ? 'text-primary' : 'text-foreground',
                      )}
                    >
                      {displayName}
                    </span>
                    {acc.supplierData?.name && (
                      <span className="text-[10px] text-muted-foreground truncate w-full text-left leading-tight mt-0.5">
                        {acc.email}
                      </span>
                    )}
                  </span>

                  <span
                    className={cn(
                      'flex items-center justify-center w-4 h-4 rounded shrink-0 border transition-colors duration-100',
                      isSelected
                        ? 'bg-primary border-primary text-primary-foreground'
                        : 'border-border/60 bg-transparent',
                    )}
                  >
                    {isSelected && <Check className="w-2.5 h-2.5" strokeWidth={3} />}
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
      </div>
    </div>
  );
}

// ─── TopBar ───────────────────────────────────────────────────────────────────

export function TopBar() {
  const isDesktop = useIsDesktop();
  const isOnline = useOnlineStatus();
  const { pathname } = useLocation();
  const pageTitle = getPageTitle(pathname);

  const { data: accounts, isLoading: accountsLoading } = useAccounts();
  const activeAccountIds = useMarketplaceStore((s) => s.activeAccountIds);
  const toggleActiveAccount = useMarketplaceStore((s) => s.toggleActiveAccount);

  const queryClient = useQueryClient();
  const [isRefreshing, setIsRefreshing] = useState(false);
  const adsRefreshHandler = useAdsSyncStore((s) => s.refreshHandler);
  const adsIsFetching = useAdsSyncStore((s) => s.isFetching);

  const handleRefresh = useCallback(async () => {
    setIsRefreshing(true);
    try {
      if (pathname === '/ads-management' && adsRefreshHandler) {
        await adsRefreshHandler();
      } else {
        await queryClient.invalidateQueries();
      }
    } catch (err) {
      console.error('Refresh failed:', err);
    } finally {
      setTimeout(() => setIsRefreshing(false), 600);
    }
  }, [pathname, adsRefreshHandler, queryClient]);

  const isRefreshDisabled = isRefreshing || (pathname === '/ads-management' && adsIsFetching);

  return (
    <header
      className="relative z-40 flex shrink-0 items-center gap-2.5 border-b border-border/60 bg-background/95 px-4 backdrop-blur-lg supports-[backdrop-filter]:bg-background/80 md:px-6"
      style={{
        paddingTop: 'env(safe-area-inset-top, 0px)',
        height: 'calc(3.5rem + env(safe-area-inset-top, 0px))',
      }}
    >
      {/* Mobile: Brand */}
      {!isDesktop && (
        <div className="flex items-center gap-2">
          <div className="flex h-[26px] w-[26px] items-center justify-center rounded-lg bg-primary text-[11px] font-black text-primary-foreground select-none shrink-0">
            E
          </div>
          <span className="text-[15px] font-semibold tracking-tight text-foreground">
            Ecom Manager
          </span>
        </div>
      )}

      {/* Desktop: Page title */}
      {isDesktop && pageTitle && (
        <h1 className="text-lg font-semibold tracking-tight text-foreground">{pageTitle}</h1>
      )}

      <div className="flex-1" />

      {/* Offline badge */}
      {!isOnline && (
        <div className="flex items-center gap-1.5 rounded-full bg-warning/10 px-2.5 py-1 text-xs font-medium text-warning">
          <WifiOff className="h-3 w-3" />
          <span className="hidden sm:inline">Offline</span>
        </div>
      )}

      {/* Refresh */}
      <RefreshButton
        isRefreshing={isRefreshing || (pathname === '/ads-management' && adsIsFetching)}
        disabled={isRefreshDisabled}
        onClick={handleRefresh}
      />

      {/* Account Selector */}
      {accountsLoading ? (
        <div className="flex items-center justify-center w-[38px] h-[38px]">
          <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
        </div>
      ) : accounts && accounts.length > 0 ? (
        <AccountSelector
          accounts={accounts}
          activeAccountIds={activeAccountIds}
          toggleActiveAccount={toggleActiveAccount}
        />
      ) : null}
    </header>
  );
}
