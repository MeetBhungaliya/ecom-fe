import { RefreshCw, Phone, KeyRound, AlertCircle, Clock, Package, Truck } from 'lucide-react';
import { useMarketplaceStore } from '@/store/marketplace.store';
import { useReturnOtps } from '@/hooks/use-return-otps';
import type { ReturnOtpData } from '@/hooks/use-return-otps';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '@/lib/cn';
import { format, parseISO, differenceInMilliseconds, isValid } from 'date-fns';

// ============================================
// TYPES
// ============================================

type CarrierEntry = NonNullable<NonNullable<ReturnOtpData['data']>['supplier_delivery_otp']>[number];

// ============================================
// HELPERS
// ============================================

/**
 * Parse a timestamp (may include timezone offset like +05:30) and
 * return a user-friendly countdown + the absolute local time.
 */
function formatExpiryTime(timestamp: string): {
  countdown: string;
  localTime: string;
  isExpired: boolean;
  isUrgent: boolean;
} {
  try {
    const expiry = parseISO(timestamp);
    if (!isValid(expiry)) return { countdown: '—', localTime: '—', isExpired: false, isUrgent: false };

    const now = new Date();
    const diff = differenceInMilliseconds(expiry, now);

    // Format the absolute local time
    const localTime = format(expiry, 'dd MMM, hh:mm a');

    if (diff <= 0) return { countdown: 'Expired', localTime, isExpired: true, isUrgent: false };

    const hours = Math.floor(diff / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    const isUrgent = hours < 1;

    let countdown: string;
    if (hours >= 24) {
      const days = Math.floor(hours / 24);
      countdown = `${days}d ${hours % 24}h`;
    } else if (hours > 0) {
      countdown = `${hours}h ${minutes}m`;
    } else {
      countdown = `${minutes}m`;
    }

    return { countdown, localTime, isExpired: false, isUrgent };
  } catch {
    return { countdown: '—', localTime: '—', isExpired: false, isUrgent: false };
  }
}

// Accent colors per carrier
const CARRIER_COLORS: Record<string, { bg: string; text: string; border: string }> = {
  delhivery: { bg: 'bg-blue-500/10', text: 'text-blue-400', border: 'border-blue-500/20' },
  xpressbees: { bg: 'bg-amber-500/10', text: 'text-amber-400', border: 'border-amber-500/20' },
  shadowfax: { bg: 'bg-violet-500/10', text: 'text-violet-400', border: 'border-violet-500/20' },
  valmo: { bg: 'bg-emerald-500/10', text: 'text-emerald-400', border: 'border-emerald-500/20' },
};

function getCarrierColor(name: string) {
  return CARRIER_COLORS[name.toLowerCase()] ?? { bg: 'bg-primary/10', text: 'text-primary' };
}

// ============================================
// COMPONENTS
// ============================================

function EmptyState() {
  return (
    <div className="flex min-h-[60dvh] flex-col items-center justify-center text-center px-6">
      <div className="relative mb-6">
        <div className="absolute inset-0 rounded-full bg-primary/20 blur-2xl" />
        <div className="relative flex h-20 w-20 items-center justify-center rounded-full bg-card border border-border/60">
          <KeyRound className="h-9 w-9 text-primary" />
        </div>
      </div>
      <h2 className="text-xl font-bold tracking-tight mb-2">No Accounts Selected</h2>
      <p className="text-muted-foreground text-sm max-w-xs leading-relaxed">
        Select one or more accounts from the sidebar to view their return delivery OTPs.
      </p>
    </div>
  );
}

function OtpDisplay({ otp }: { otp?: string }) {
  if (!otp) {
    return (
      <span className="text-[11px] font-medium text-muted-foreground/60 italic">
        No OTP
      </span>
    );
  }

  return (
    <span className="font-mono text-lg sm:text-xl font-bold tracking-[0.25em] text-primary select-all">
      {otp}
    </span>
  );
}

function CarrierRow({ courier }: { courier: CarrierEntry }) {
  const color = getCarrierColor(courier.carrier_name);
  const displayName = courier.carrier_details?.name || courier.carrier_name;
  const iconUrl = courier.carrier_details?.icon;

  // Best expiry timestamp
  const expiryTs = courier.otp_details?.[0]?.expiry_timestamp || courier.otp_expiry_timestamp;
  const expiry = expiryTs ? formatExpiryTime(expiryTs) : null;

  return (
    <div className="rounded-xl bg-background/60 border border-border/40 p-3 sm:p-3.5 transition-colors hover:bg-background/80">
      {/* Carrier info row */}
      <div className="flex items-center gap-2.5 mb-2.5">
        {/* Carrier logo or fallback icon */}
        <div className={cn(
          'flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border overflow-hidden',
          iconUrl ? 'bg-white/90' : color.bg,
        )}>
          {iconUrl ? (
            <img src={iconUrl} alt={displayName} className="h-full w-full object-contain" />
          ) : (
            <Truck className={cn('h-4 w-4', color.text)} />
          )}
        </div>

        <div className="flex-1 min-w-0">
          <h4 className="text-sm font-semibold text-foreground capitalize truncate leading-tight">{displayName}</h4>
          <span className="text-[10px] text-muted-foreground font-medium">
            {courier.count} shipment{courier.count !== 1 ? 's' : ''}
          </span>
        </div>
      </div>

      {/* OTP + Expiry */}
      <div className="flex items-center justify-between gap-2">
        <OtpDisplay otp={courier.otp} />

        {expiry && (
          <div className="text-right shrink-0">
            <div className={cn(
              'flex items-center gap-1 text-[10px] sm:text-[11px] font-semibold justify-end',
              expiry.isExpired ? 'text-destructive' :
              expiry.isUrgent ? 'text-amber-500' :
              'text-muted-foreground'
            )}>
              <Clock className="h-3 w-3" />
              <span>{expiry.countdown}</span>
            </div>
            <p className="text-[9px] sm:text-[10px] text-muted-foreground/60 mt-0.5">{expiry.localTime}</p>
          </div>
        )}
      </div>
    </div>
  );
}

function AccountCard({ account }: { account: ReturnOtpData }) {
  const carriers = account.data?.supplier_delivery_otp ?? [];

  return (
    <div className="rounded-2xl border border-border/50 bg-card/60 backdrop-blur-sm overflow-hidden transition-shadow hover:shadow-lg hover:shadow-black/5">
      {/* Account header */}
      <div className="flex items-center gap-3 border-b border-border/40 px-4 py-3 sm:px-5">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-bold text-primary ring-1 ring-primary/20">
          {(account.accountName || '?')[0].toUpperCase()}
        </div>
        <div className="min-w-0 flex-1">
          <h3 className="text-sm font-bold text-foreground truncate">{account.accountName}</h3>
          <div className="flex items-center gap-1 text-[11px] text-muted-foreground">
            <Phone className="h-3 w-3 shrink-0" />
            <span className="truncate">{account.mobileNumber}</span>
          </div>
        </div>
      </div>

      {/* Carrier OTP rows */}
      <div className="p-3 sm:p-4 space-y-2">
        {account.error && (
          <div className="rounded-lg bg-destructive/10 border border-destructive/20 px-3 py-2 text-xs font-medium text-destructive flex items-center gap-2">
            <AlertCircle className="h-3.5 w-3.5 shrink-0" />
            <span className="truncate">{account.error}</span>
          </div>
        )}

        {carriers.length > 0 ? (
          carriers.map((courier, idx) => <CarrierRow key={idx} courier={courier} />)
        ) : (
          !account.error && (
            <div className="flex flex-col items-center justify-center py-8 text-center text-muted-foreground/50">
              <Package className="h-7 w-7 mb-2" />
              <span className="text-xs font-medium">No pending OTPs</span>
            </div>
          )
        )}
      </div>
    </div>
  );
}

/**
 * Summary section: total return shipments per carrier (across all accounts) + grand total.
 */
function ReturnsSummary({ accountsData }: { accountsData: ReturnOtpData[] }) {
  // Aggregate counts per carrier across all accounts
  const carrierTotals = new Map<string, { name: string; icon?: string; count: number }>();
  let grandTotal = 0;

  for (const account of accountsData) {
    for (const carrier of account.data?.supplier_delivery_otp ?? []) {
      const key = carrier.carrier_name.toLowerCase();
      const existing = carrierTotals.get(key);
      const shipments = carrier.delivery_shipment_details?.total_shipment_count ?? carrier.count;
      if (existing) {
        existing.count += shipments;
      } else {
        carrierTotals.set(key, {
          name: carrier.carrier_details?.name || carrier.carrier_name,
          icon: carrier.carrier_details?.icon,
          count: shipments,
        });
      }
      grandTotal += shipments;
    }
  }

  if (grandTotal === 0) return null;

  const entries = Array.from(carrierTotals.entries());

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, delay: 0.15 }}
      className="rounded-2xl border border-border/50 bg-card/40 backdrop-blur-sm overflow-hidden"
    >
      <div className="flex items-center gap-2 border-b border-border/40 px-4 py-3.5 sm:px-5">
        <Package className="h-4.5 w-4.5 text-muted-foreground" />
        <h3 className="text-[14px] sm:text-lg font-bold text-foreground">Return Shipments Summary</h3>
        <span className="ml-auto shrink-0 rounded-full bg-primary/10 px-3 py-1 text-[14px] sm:text-sm font-bold tabular-nums text-primary">
          {grandTotal} Total
        </span>
      </div>

      <div className="p-3 sm:p-4">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
          {entries.map(([key, data]) => {
            const color = getCarrierColor(key);
            return (
              <div
                key={key}
                className="rounded-xl bg-background/60 border border-border/30 p-3 flex flex-col items-center gap-1.5 text-center"
              >
                <div
                  className={cn(
                    'flex h-8 w-8 items-center justify-center rounded-lg border overflow-hidden',
                    data.icon ? 'bg-white/90 border-border/30' : cn(color.bg),
                  )}
                >
                  {data.icon ? (
                    <img src={data.icon} alt={data.name} className="h-full w-full object-contain" />
                  ) : (
                    <Truck className={cn('h-4 w-4', color.text)} />
                  )}
                </div>
                <span className="text-[10px] text-muted-foreground font-medium capitalize truncate w-full">
                  {data.name}
                </span>
                <span className="text-lg font-bold tabular-nums text-foreground">{data.count}</span>
              </div>
            );
          })}
        </div>
      </div>
    </motion.div>
  );
}

function LoadingSkeleton() {
  return (
    <div className="rounded-2xl border border-border/30 bg-card/30 overflow-hidden">
      <div className="flex items-center gap-3 border-b border-border/30 px-4 py-3.5">
        <div className="h-9 w-9 rounded-full bg-muted/50 animate-pulse" />
        <div className="flex-1 space-y-1.5">
          <div className="h-4 w-28 rounded bg-muted/50 animate-pulse" />
          <div className="h-3 w-20 rounded bg-muted/40 animate-pulse" />
        </div>
      </div>
      <div className="p-4 space-y-2">
        {[1, 2].map((j) => (
          <div key={j} className="rounded-xl bg-background/30 p-3.5">
            <div className="flex items-center gap-2.5 mb-2.5">
              <div className="h-8 w-8 rounded-lg bg-muted/50 animate-pulse" />
              <div className="space-y-1 flex-1">
                <div className="h-3.5 w-20 rounded bg-muted/50 animate-pulse" />
                <div className="h-2.5 w-14 rounded bg-muted/40 animate-pulse" />
              </div>
            </div>
            <div className="h-6 w-24 rounded bg-primary/5 animate-pulse" />
          </div>
        ))}
      </div>
    </div>
  );
}

// ============================================
// PAGE
// ============================================

export default function ReturnOtpsPage() {
  const activeAccountIds = useMarketplaceStore((s) => s.activeAccountIds);
  const { data: accountsData, isLoading, isRefetching, refetch, error } = useReturnOtps(activeAccountIds);

  const isFetching = isLoading || isRefetching;

  if (activeAccountIds.length === 0) return <EmptyState />;

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-foreground">
            Return OTPs
          </h1>
          <p className="mt-0.5 text-xs sm:text-sm text-muted-foreground">
            Delivery OTPs across {activeAccountIds.length} active account{activeAccountIds.length !== 1 ? 's' : ''}.
          </p>
        </div>
        <button
          onClick={() => refetch()}
          disabled={isFetching}
          className="shrink-0 inline-flex items-center gap-2 rounded-xl border border-border/50 bg-card/80 px-3.5 py-2 text-xs sm:text-sm font-medium text-foreground transition-all hover:bg-accent active:scale-[0.97] disabled:opacity-60 disabled:pointer-events-none backdrop-blur-sm"
        >
          <RefreshCw className={cn('h-3.5 w-3.5', isFetching && 'animate-spin')} />
          <span className="hidden sm:inline">{isFetching ? 'Refreshing…' : 'Refresh'}</span>
        </button>
      </div>

      {/* Global error */}
      {error && (
        <div className="rounded-xl border border-destructive/40 bg-destructive/10 p-4 flex items-center gap-3 text-destructive">
          <AlertCircle className="h-4 w-4 shrink-0" />
          <p className="text-sm font-medium">Failed to load OTPs. Please try refreshing.</p>
        </div>
      )}

      {/* Account OTP cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
        <AnimatePresence mode="popLayout">
          {isLoading ? (
            Array.from({ length: Math.min(activeAccountIds.length, 3) }).map((_, i) => (
              <motion.div
                key={`skeleton-${i}`}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
              >
                <LoadingSkeleton />
              </motion.div>
            ))
          ) : (
            accountsData?.map((account, i) => (
              <motion.div
                key={account.accountId}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.25, delay: i * 0.05 }}
              >
                <AccountCard account={account} />
              </motion.div>
            ))
          )}
        </AnimatePresence>
      </div>

      {/* Return shipments summary — lower priority section */}
      {!isLoading && accountsData && accountsData.length > 0 && (
        <ReturnsSummary accountsData={accountsData} />
      )}
    </div>
  );
}
