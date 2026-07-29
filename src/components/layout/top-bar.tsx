import { useIsDesktop } from '@/hooks/use-media-query';
import { useOnlineStatus } from '@/hooks/use-online-status';
import { useMarketplaceStore } from '@/store/marketplace.store';
import { WifiOff, Loader2, Check } from 'lucide-react';
import { useAccounts } from '@/hooks/use-accounts';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { cn } from '@/lib/cn';

function getInitials(name?: string) {
  if (!name) return 'A';
  return name.substring(0, 2).toUpperCase();
}

export function TopBar() {
  const isDesktop = useIsDesktop();
  const isOnline = useOnlineStatus();

  // Account selection
  const { data: accounts, isLoading: accountsLoading } = useAccounts();
  const activeAccountIds = useMarketplaceStore((s) => s.activeAccountIds);
  const toggleActiveAccount = useMarketplaceStore((s) => s.toggleActiveAccount);

  const selectedAccounts =
    accounts?.filter((a) => activeAccountIds.includes(a.id.toString())) || [];

  return (
    <header className="flex h-14 shrink-0 items-center gap-3 border-b border-border bg-background/95 px-4 backdrop-blur-lg supports-[backdrop-filter]:bg-background/80 md:px-6">
      {/* Mobile: Title */}
      {!isDesktop && (
        <div className="flex items-center gap-2.5">
          <div className="flex h-7 w-7 items-center justify-center rounded-md bg-primary text-xs font-bold text-primary-foreground">
            E
          </div>
          <span className="text-base font-semibold tracking-tight">Ecom Manager</span>
        </div>
      )}

      <div className="flex-1" />

      {/* Offline indicator */}
      {!isOnline && (
        <div className="flex items-center gap-1.5 rounded-full bg-warning/10 px-2.5 py-1 text-xs font-medium text-warning mr-3">
          <WifiOff className="h-3 w-3" />
          <span>Offline</span>
        </div>
      )}

      {/* Account Selector Dropdown */}
      {accountsLoading ? (
        <div className="flex items-center justify-center w-10">
          <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
        </div>
      ) : accounts && accounts.length > 0 ? (
        <DropdownMenu>
          <DropdownMenuTrigger className="outline-none">
            <div className="flex items-center hover:opacity-80 transition-opacity p-1 rounded-full bg-muted/50 border border-border/50">
              {selectedAccounts.length > 0 ? (
                <div className="flex items-center -space-x-2">
                  {selectedAccounts.map((acc, i) => (
                    <div
                      key={acc.id}
                      className="flex h-7 w-7 items-center justify-center rounded-full bg-primary text-[10px] font-bold text-primary-foreground border-2 border-background ring-1 ring-border/20 z-10"
                      style={{ zIndex: 10 - i }}
                      title={acc.supplierData?.name || acc.email}
                    >
                      {getInitials(acc.supplierData?.name || acc.email)}
                    </div>
                  ))}
                </div>
              ) : (
                <div className="flex h-7 w-7 items-center justify-center rounded-full bg-muted text-[10px] font-medium text-muted-foreground border-2 border-background border-dashed">
                  +
                </div>
              )}
            </div>
          </DropdownMenuTrigger>
          <DropdownMenuContent
            align="end"
            className="w-56 mt-1 shadow-xl rounded-xl border-border/50 bg-card/95 backdrop-blur-md"
          >
            <div className="px-2 py-1.5 text-xs font-semibold text-muted-foreground">
              Select Accounts
            </div>
            {accounts.map((acc) => {
              const isSelected = activeAccountIds.includes(acc.id.toString());
              return (
                <DropdownMenuItem
                  key={acc.id}
                  onSelect={(e) => {
                    e.preventDefault();
                    toggleActiveAccount(acc.id.toString());
                  }}
                  className={cn(
                    'flex items-center gap-3 cursor-pointer py-2 px-2.5 mx-1 my-0.5 rounded-lg transition-colors',
                    isSelected ? 'bg-primary/10 text-primary' : 'text-foreground',
                  )}
                >
                  <div
                    className={cn(
                      'flex h-4 w-4 items-center justify-center rounded border',
                      isSelected
                        ? 'bg-primary border-primary text-primary-foreground'
                        : 'border-input bg-background',
                    )}
                  >
                    {isSelected && <Check className="h-3 w-3" strokeWidth={3} />}
                  </div>
                  <span className="flex-1 truncate font-medium text-sm">
                    {acc.supplierData?.name || acc.email}
                  </span>
                </DropdownMenuItem>
              );
            })}
          </DropdownMenuContent>
        </DropdownMenu>
      ) : null}
    </header>
  );
}
