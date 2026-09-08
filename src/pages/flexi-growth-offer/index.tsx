import { ActionButton } from '@/components/ui/action-button';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { useCallback, useEffect, useRef, useState } from 'react';
import { useAccounts } from '@/hooks/use-accounts';
import { useIsDesktop } from '@/hooks/use-media-query';
import { useTransmitJob } from '@/hooks/use-transmit-job';
import { api } from '@/lib/api-client';
import { cn } from '@/lib/cn';
import { useMarketplaceStore } from '@/store/marketplace.store';
import { format } from 'date-fns';
import { type DateRange } from "react-day-picker"
import {
  Calendar as CalendarIcon,
  CheckCircle2,
  PlayCircle,
  RotateCcw,
  Sparkles,
  X,
  XCircle,
} from 'lucide-react';
import { AnimatePresence, motion } from 'motion/react';
import { toast } from 'sonner';

// ============================================
// TYPES
// ============================================

interface FlexiOfferConfig {
  productIds: string[];
  dateRange: DateRange | undefined;
  discountPercent: number;
}

// ============================================
// HELPERS
// ============================================

function formatDateString(date: Date | undefined): string | undefined {
  if (!date) return undefined;
  return format(date, 'yyyy-MM-dd');
}

// ============================================
// COMPONENTS
// ============================================

function DateRangePickerField({
  id,
  label,
  className,
  dateRange,
  onDateRangeChange,
  error,
  minDate,
}: {
  id: string;
  label: string;
  className?: string;
  dateRange: DateRange | undefined;
  onDateRangeChange: (range: DateRange | undefined) => void;
  error?: string;
  minDate?: Date;
}) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className={cn('grid gap-2', className)}>
      <Label className="text-sm font-semibold">{label}</Label>

      <Popover open={isOpen} onOpenChange={setIsOpen}>
        <PopoverTrigger asChild>
          <Button
            id={id}
            variant="outline"
            className={cn(
              'w-full justify-start text-left font-normal rounded-xl text-sm h-11 px-3',
              !dateRange && 'text-muted-foreground',
              error && 'border-destructive focus-visible:ring-destructive',
            )}
          >
            <CalendarIcon className="mr-2 h-4 w-4 shrink-0" />
            {dateRange?.from ? (
              dateRange.to ? (
                <>
                  {format(dateRange.from, 'LLL dd, yyyy')} - {format(dateRange.to, 'LLL dd, yyyy')}
                </>
              ) : (
                format(dateRange.from, 'LLL dd, yyyy')
              )
            ) : (
              <span>Pick a date</span>
            )}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-[var(--radix-popover-trigger-width)] p-0" align="start">
          <Calendar
            initialFocus
            mode="range"
            defaultMonth={dateRange?.from || minDate}
            selected={dateRange}
            onSelect={(range) => {
              onDateRangeChange(range);
              if (range?.from && range?.to) {
                setIsOpen(false);
              }
            }}
            numberOfMonths={2}
            disabled={minDate ? (d) => d < minDate : undefined}
          />
        </PopoverContent>
      </Popover>
      {error && <p className="text-destructive text-xs font-medium">{error}</p>}
    </div>
  );
}

// ============================================
// MAIN PAGE
// ============================================

export default function FlexiGrowthOfferPage() {
  const isDesktop = useIsDesktop();
  const { data: accounts } = useAccounts();
  const activeAccountIds = useMarketplaceStore((s) => s.activeAccountIds);
  const currentAccount = accounts?.find((a) => a.id.toString() === activeAccountIds[0]);

  const {
    status,
    total,
    processed,
    successCount,
    failedCount,
    failedItems,
    logs,
    subscribeToJob,
    resetJobState,
  } = useTransmitJob('flexi-growth-offer');

  // State
  const [offerState, setOfferState] = useState<FlexiOfferConfig>({
    productIds: [],
    dateRange: undefined,
    discountPercent: 1,
  });

  const [productInput, setProductInput] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const logsEndRef = useRef<HTMLDivElement>(null);
  const productInputRef = useRef<HTMLInputElement>(null);

  // Auto scroll logs
  useEffect(() => {
    if (logsEndRef.current) {
      logsEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [logs]);

  // Handlers
  const handleCreateNewOffer = () => {
    setOfferState({
      productIds: [],
      dateRange: undefined,
      discountPercent: 1,
    });
    setProductInput('');
    setErrors({});
    resetJobState();
  };

  const addProductIds = useCallback((ids: string[]) => {
    setOfferState((prev) => {
      const newIds = new Set(prev.productIds);
      ids.forEach((id) => newIds.add(id));
      return { ...prev, productIds: Array.from(newIds) };
    });
    setErrors((prev) => ({ ...prev, productIds: '' }));
  }, []);

  const handleProductInputKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault();
      const val = productInput.trim();
      if (val) {
        addProductIds(
          val
            .split(',')
            .map((s) => s.trim())
            .filter(Boolean),
        );
        setProductInput('');
      }
    }
  };

  const handlePaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
    e.preventDefault();
    const pasted = e.clipboardData.getData('text');
    if (pasted) {
      const ids = pasted
        .split(/[\n,]/)
        .map((s) => s.trim())
        .filter(Boolean);
      addProductIds(ids);
    }
  };

  const removeProductId = useCallback((id: string) => {
    setOfferState((prev) => ({
      ...prev,
      productIds: prev.productIds.filter((pid) => pid !== id),
    }));
  }, []);

  const handleLaunch = async () => {
    const newErrors: Record<string, string> = {};
    if (offerState.productIds.length === 0) {
      newErrors.productIds = 'At least one Product ID is required';
    }
    if (!offerState.dateRange?.from) {
      newErrors.dateRange = 'Start date is required';
    }
    if (!offerState.dateRange?.to) {
      newErrors.dateRange = 'End date is required';
    }
    if (!offerState.discountPercent || offerState.discountPercent <= 0) {
      newErrors.discountPercent = 'Discount percent must be greater than 0';
    }

    setErrors(newErrors);
    if (Object.keys(newErrors).length > 0) return;

    if (!currentAccount) {
      toast.error('Please select an account first');
      return;
    }

    setIsSubmitting(true);
    try {
      const startStr = formatDateString(offerState.dateRange?.from);
      const endStr = formatDateString(offerState.dateRange?.to);
      const newJobId = crypto.randomUUID();

      await subscribeToJob(`flexi-growth-offer:${newJobId}`, {
        onCompleted: () => toast.success('Flexi Growth Offer completed!'),
        onError: (msg) => toast.error(`Flexi Growth Offer error: ${msg}`),
      });

      const response = await api.post<{ data?: { jobId?: string }; jobId?: string }>(
        '/accounts/flexi-growth-offer',
        {
          accountId: currentAccount.id,
          jobId: newJobId,
          productIds: offerState.productIds.join(','),
          start: startStr,
          end: endStr,
          discountPercent: offerState.discountPercent,
        },
      );

      if (response?.jobId || response?.data?.jobId) {
        toast.info('Offer job submitted. Listening for progress...');
      }
    } catch (error: any) {
      toast.error(error?.response?.data?.message || 'Failed to submit flexi growth offer');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleRetry = async () => {
    if (!currentAccount || failedItems.length === 0) return;

    setIsSubmitting(true);
    try {
      const retryProductIds = failedItems.map((i) => i.productId).filter(Boolean) as string[];
      const startStr = formatDateString(offerState.dateRange?.from);
      const endStr = formatDateString(offerState.dateRange?.to);
      const retryJobId = crypto.randomUUID();

      await subscribeToJob(`flexi-growth-offer:${retryJobId}`, {
        onCompleted: () => toast.success('Retry completed!'),
        onError: (msg) => toast.error(`Retry error: ${msg}`),
      });

      const response = await api.post<{ data?: { jobId?: string }; jobId?: string }>(
        '/accounts/flexi-growth-offer/retry',
        {
          accountId: currentAccount.id,
          jobId: retryJobId,
          productIds: retryProductIds,
          start: startStr,
          end: endStr,
          discountPercent: offerState.discountPercent,
        },
      );

      if (response?.jobId || response?.data?.jobId) {
        resetJobState(); // Clean slate for retry
        toast.info('Retry job submitted.');
      }
    } catch (error: any) {
      toast.error(error?.response?.data?.message || 'Failed to retry flexi growth offer');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!currentAccount) {
    return (
      <div className="p-3 rounded-xl bg-destructive/10 border border-destructive/20 text-destructive text-sm font-medium flex items-center gap-2">
        <XCircle className="h-4 w-4 shrink-0" />
        Please select an account from the sidebar to proceed.
      </div>
    );
  }

  const isExecuting = status !== 'idle';
  const progressPercent = total > 0 ? (processed / total) * 100 : 0;

  return (
    <div className="space-y-6 pb-24 max-w-4xl mx-auto">
      {/* Header */}
      {!isDesktop && !isExecuting && (
        <div>
          <h1 className="text-xl font-bold tracking-tight flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary" />
            Flexi Growth Offer
          </h1>
        </div>
      )}

      {/* CONNECTED STATE COMPACT CARD */}
      <div className="flex items-center justify-between p-4 rounded-xl border border-border bg-card/40 backdrop-blur-sm">
        <div className="flex items-center gap-3">
          <div className="relative flex h-3 w-3">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500"></span>
          </div>
          <p className="text-sm font-semibold">
            Configured for {currentAccount.supplierData?.name}
          </p>
        </div>
      </div>

      <AnimatePresence mode="wait">
        {!isExecuting ? (
          /* =========================================
             FORM MODE
             ========================================= */
          <motion.div
            key="form"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="space-y-6"
          >
            {/* Product IDs */}
            <div className="space-y-2">
              <Label className="text-sm font-semibold">Product IDs</Label>
              <div className="flex flex-col gap-3">
                <div
                  onClick={() => productInputRef.current?.focus()}
                  className={cn(
                    'flex min-h-[120px] items-start content-start flex-wrap gap-2 rounded-xl border bg-card border-input px-3 py-3 transition-colors cursor-text',
                    errors.productIds ? 'border-destructive' : 'border-input',
                  )}
                >
                  {offerState.productIds.map((id) => (
                    <Badge
                      key={id}
                      variant="secondary"
                      className="h-7 gap-1 pr-1.5 font-mono text-xs"
                    >
                      {id}
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          removeProductId(id);
                        }}
                        className="rounded-full hover:bg-muted-foreground/20 p-0.5"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </Badge>
                  ))}
                  <input
                    ref={productInputRef}
                    type="text"
                    value={productInput}
                    onChange={(e) => setProductInput(e.target.value)}
                    onKeyDown={handleProductInputKeyDown}
                    onPaste={handlePaste}
                    placeholder={
                      offerState.productIds.length === 0
                        ? 'Paste Product IDs or type & enter...'
                        : ''
                    }
                    className="flex-1 bg-transparent text-sm font-mono outline-none min-w-[120px] h-7"
                  />
                </div>
                {errors.productIds && (
                  <p className="text-destructive text-xs font-medium">{errors.productIds}</p>
                )}
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Date Range Picker */}
              <DateRangePickerField
                id="dateRange"
                label="Offer Date Range (Start - End Date)"
                dateRange={offerState.dateRange}
                onDateRangeChange={(range) => {
                  setOfferState((prev) => ({ ...prev, dateRange: range }));
                  setErrors((prev) => ({ ...prev, dateRange: '' }));
                }}
                error={errors.dateRange}
                minDate={new Date()}
              />

              {/* Discount Percent */}
              <div className="space-y-2">
                <Label htmlFor="discountPercent" className="text-sm font-semibold">
                  Discount Percent (%)
                </Label>
                <Input
                  id="discountPercent"
                  type="number"
                  step="0.01"
                  value={offerState.discountPercent}
                  onChange={(e) =>
                    setOfferState((prev) => ({
                      ...prev,
                      discountPercent: parseFloat(e.target.value) || 0,
                    }))
                  }
                  className={cn(
                    'h-11 rounded-xl',
                    errors.discountPercent && 'border-destructive focus-visible:ring-destructive',
                  )}
                />
                {errors.discountPercent && (
                  <p className="text-destructive text-xs font-medium">{errors.discountPercent}</p>
                )}
              </div>
            </div>

            {/* Submit Action */}
            <div className="fixed bottom-0 left-0 right-0 bg-background/80 backdrop-blur-xl border-t border-border z-10 sm:static sm:bg-transparent sm:border-0 sm:p-0 sm:pt-6">
              <div className="max-w-4xl mx-auto">
                <ActionButton
                  onClick={handleLaunch}
                  loading={isSubmitting}
                  icon={PlayCircle}
                  size="lg"
                >
                  Run Offer
                </ActionButton>
              </div>
            </div>
          </motion.div>
        ) : (
          /* =========================================
             EXECUTION / TRACKER MODE
             ========================================= */
          <motion.div
            key="tracker"
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            className="space-y-6"
          >
            {/* Status Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-5 rounded-xl border border-border bg-card/60 backdrop-blur-sm">
              <div>
                <h2 className="text-xl font-bold flex items-center gap-2">
                  {status === 'progress' || status === 'started' ? (
                    <>
                      <div className="h-5 w-5 rounded-full border-2 border-primary border-t-transparent animate-spin" />
                      Running...
                    </>
                  ) : status === 'completed' ? (
                    <>
                      <CheckCircle2 className="h-5 w-5 text-emerald-500" />
                      Completed
                    </>
                  ) : (
                    <>
                      <XCircle className="h-5 w-5 text-destructive" />
                      Error
                    </>
                  )}
                </h2>
                <p className="text-sm text-muted-foreground mt-1">
                  Processed {processed} of {total} products
                </p>
              </div>
              <div className="flex gap-4 sm:gap-6">
                <div className="text-center">
                  <p className="text-2xl font-bold text-emerald-500">{successCount}</p>
                  <p className="text-xs text-muted-foreground uppercase tracking-wider font-semibold">
                    Success
                  </p>
                </div>
                <div className="text-center">
                  <p className="text-2xl font-bold text-destructive">{failedCount}</p>
                  <p className="text-xs text-muted-foreground uppercase tracking-wider font-semibold">
                    Failed
                  </p>
                </div>
              </div>
            </div>

            {/* Progress Bar */}
            <div className="h-2 w-full bg-secondary rounded-full overflow-hidden">
              <motion.div
                className={cn(
                  'h-full rounded-full',
                  status === 'completed' ? 'bg-emerald-500' : 'bg-primary',
                )}
                initial={false}
                animate={{ width: `${progressPercent}%` }}
                transition={{ type: 'spring', stiffness: 80, damping: 20 }}
              />
            </div>

            {/* Execution Logs */}
            <div className="rounded-xl border border-border bg-[#0C0C0C] overflow-hidden flex flex-col h-[300px]">
              <div className="px-4 py-2 bg-black/40 border-b border-white/10 flex items-center justify-between text-xs font-mono text-muted-foreground">
                <span>Execution Logs</span>
                <span>{status.toUpperCase()}</span>
              </div>
              <div className="flex-1 overflow-y-auto p-4 space-y-2 font-mono text-[11px] sm:text-xs">
                {logs.length === 0 && <span className="text-white/40">Waiting for logs...</span>}
                {logs.map((log, idx) => (
                  <div key={idx} className="flex items-start gap-3">
                    <span className="text-white/30 shrink-0 w-16">
                      {format(log.timestamp, 'HH:mm:ss')}
                    </span>
                    <span
                      className={cn(
                        log.type === 'error' && 'text-red-400',
                        log.type === 'success' && 'text-emerald-400',
                        log.type === 'info' && 'text-blue-300',
                      )}
                    >
                      {log.message}
                    </span>
                  </div>
                ))}
                <div ref={logsEndRef} />
              </div>
            </div>

            {/* Post-Run Actions */}
            {(status === 'completed' || status === 'error') && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="flex flex-col sm:flex-row gap-3 pt-4"
              >
                <ActionButton variant="outline" onClick={handleCreateNewOffer} className="flex-1">
                  Create New Offer
                </ActionButton>

                {failedCount > 0 && (
                  <ActionButton
                    variant="destructive"
                    onClick={handleRetry}
                    loading={isSubmitting}
                    icon={RotateCcw}
                    className="flex-1"
                  >
                    Retry {failedCount} Failed
                  </ActionButton>
                )}
              </motion.div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
