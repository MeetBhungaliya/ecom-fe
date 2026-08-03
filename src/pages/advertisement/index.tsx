import { ActionButton } from '@/components/ui/action-button';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router';
import { ROUTES } from '@/constants/routes';
import { useAccounts } from '@/hooks/use-accounts';
import { useAdConfig } from '@/hooks/use-ad-config';
import { useIsDesktop } from '@/hooks/use-media-query';
import { PageLoader } from '@/app/router';
import { useTransmitJob } from '@/hooks/use-transmit-job';
import { api } from '@/lib/api-client';
import { cn } from '@/lib/cn';
import { useMarketplaceStore } from '@/store/marketplace.store';
import { format, setHours, setMinutes } from 'date-fns';
import {
  Calendar as CalendarIcon,
  CheckCircle2,
  Megaphone,
  PlayCircle,
  RotateCcw,
  Settings2,
  X,
  XCircle,
} from 'lucide-react';
import { AnimatePresence, motion } from 'motion/react';
import { toast } from 'sonner';

// ============================================
// TYPES
// ============================================

interface FlixOfferConfig {
  catalogIds: string[];
  startDate: Date | undefined;
  startTime: string;
  endDate: Date | undefined;
  endTime: string;
  dynamicFieldValues: Record<string, string>;
}

// ============================================
// HELPERS
// ============================================

function formatFieldName(path: string): string {
  return path.replace(/\./g, ' ➔ ');
}

function nowTimeString(offsetMinutes = 0): string {
  const d = new Date();
  d.setMinutes(d.getMinutes() + offsetMinutes);
  return `${d.getHours().toString().padStart(2, '0')}:${d.getMinutes().toString().padStart(2, '0')}`;
}

function formatLocalISO(date: Date | undefined, time: string): string | undefined {
  if (!date) return undefined;
  const [h, m] = time.split(':').map(Number);
  const combined = setMinutes(setHours(date, h || 0), m || 0);
  return format(combined, "yyyy-MM-dd'T'HH:mm:ssXXX");
}

// ============================================
// COMPONENTS
// ============================================

function DateTimePicker({
  id,
  label,
  date,
  time,
  onDateChange,
  onTimeChange,
  error,
  optional,
  minDate,
}: {
  id: string;
  label: string;
  date: Date | undefined;
  time: string;
  onDateChange: (date: Date | undefined) => void;
  onTimeChange: (time: string) => void;
  error?: string;
  optional?: boolean;
  minDate?: Date;
}) {
  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center gap-1.5">
        <Label className="text-sm font-semibold">{label}</Label>
        {optional && (
          <Badge variant="outline" className="text-[9px] h-4 px-1.5 font-normal ml-auto">
            Optional
          </Badge>
        )}
      </div>

      <div className="flex w-full gap-3 sm:gap-5 flex-row">
        {/* Date Field */}
        <div className="flex-1 min-w-0">
          <Popover>
            <PopoverTrigger asChild>
              <Button
                id={id}
                variant="outline"
                className={cn(
                  'w-full justify-start text-left font-normal rounded-lg text-xs sm:text-sm h-11 sm:h-10 px-3',
                  !date && 'text-muted-foreground',
                  error && 'border-destructive focus-visible:ring-destructive',
                )}
              >
                <CalendarIcon className="mr-2 h-4 w-4 shrink-0" />
                <span className="truncate">{date ? format(date, 'PPP') : 'Pick a date'}</span>
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <Calendar
                mode="single"
                selected={date}
                onSelect={onDateChange}
                disabled={minDate ? (d) => d < minDate : undefined}
                className="w-full flex justify-center pb-2"
              />

              {optional && date && (
                <div className="border-t border-border/40 p-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="w-full text-xs h-7"
                    onClick={() => {
                      onDateChange(undefined);
                      onTimeChange('00:00');
                    }}
                  >
                    <X className="h-3 w-3 mr-1" />
                    Clear date
                  </Button>
                </div>
              )}
            </PopoverContent>
          </Popover>
        </div>

        {/* Time Field */}
        <div className="w-[120px] shrink-0">
          <Input
            id={`${id}-time`}
            type="time"
            value={date ? time : ''}
            onChange={(e) => onTimeChange(e.target.value)}
            disabled={!date}
            className={cn(
              'h-11 sm:h-10 text-xs sm:text-sm rounded-lg appearance-none [&::-webkit-calendar-picker-indicator]:hidden [&::-webkit-calendar-picker-indicator]:appearance-none',
              'bg-background dark:bg-input/30',
              error && 'border-destructive focus-visible:ring-destructive',
            )}
          />
        </div>
      </div>
    </div>
  );
}

// ============================================
// MAIN DASHBOARD
// ============================================

export default function AdvertisementDashboard() {
  const navigate = useNavigate();
  const isDesktop = useIsDesktop();
  const { data: accounts } = useAccounts();
  const activeAccountIds = useMarketplaceStore((s) => s.activeAccountIds);
  const currentAccount = accounts?.find((a) => a.id.toString() === activeAccountIds[0]);

  const { data: savedConfig, isLoading: configLoading } = useAdConfig(currentAccount?.id);
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
  } = useTransmitJob();

  // Offer State
  const [flixOffer, setFlixOffer] = useState<FlixOfferConfig>({
    catalogIds: [],
    startDate: new Date(),
    startTime: nowTimeString(5),
    endDate: undefined,
    endTime: nowTimeString(0),
    dynamicFieldValues: {},
  });
  const [catalogInput, setCatalogInput] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const logsEndRef = useRef<HTMLDivElement>(null);

  // Auto scroll logs
  useEffect(() => {
    if (logsEndRef.current) {
      logsEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [logs]);

  // Handlers
  const handleCreateNewOffer = () => {
    setFlixOffer({
      catalogIds: [],
      startDate: new Date(),
      startTime: nowTimeString(5),
      endDate: undefined,
      endTime: nowTimeString(0),
      dynamicFieldValues: {},
    });
    setCatalogInput('');
    setErrors({});
    resetJobState();
  };

  const addCatalogIds = useCallback((ids: string[]) => {
    setFlixOffer((prev) => {
      const newIds = new Set(prev.catalogIds);
      ids.forEach((id) => newIds.add(id));
      return { ...prev, catalogIds: Array.from(newIds) };
    });
    setErrors((prev) => ({ ...prev, catalogIds: '' }));
  }, []);

  const handleCatalogInputKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault();
      const val = catalogInput.trim();
      if (val) {
        addCatalogIds(
          val
            .split(',')
            .map((s) => s.trim())
            .filter(Boolean),
        );
        setCatalogInput('');
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
      addCatalogIds(ids);
    }
  };

  const removeCatalogId = useCallback((id: string) => {
    setFlixOffer((prev) => ({
      ...prev,
      catalogIds: prev.catalogIds.filter((cid) => cid !== id),
    }));
  }, []);

  const handleLaunch = async () => {
    const newErrors: Record<string, string> = {};
    if (flixOffer.catalogIds.length === 0)
      newErrors.catalogIds = 'At least one Catalog ID is required';
    if (!flixOffer.startDate) newErrors.startDate = 'Start date is required';

    // Validate dynamic fields
    for (const field of savedConfig?.dynamicFields || []) {
      if (!flixOffer.dynamicFieldValues[field]?.trim()) {
        newErrors[`dynamic_${field}`] = `${formatFieldName(field)} is required`;
      }
    }

    setErrors(newErrors);
    if (Object.keys(newErrors).length > 0) return;

    if (!currentAccount) return;

    setIsSubmitting(true);
    try {
      const startTime = formatLocalISO(flixOffer.startDate, flixOffer.startTime);
      const endTime = formatLocalISO(flixOffer.endDate, flixOffer.endTime);

      const response = await api.post<{ jobId: string }>('/accounts/advertisement', {
        accountId: currentAccount.id,
        catalogIds: flixOffer.catalogIds,
        startTime,
        endTime,
        dynamicFieldValues: flixOffer.dynamicFieldValues,
      });

      if (response?.jobId) {
        toast.info('Ad launch job submitted.');
        await subscribeToJob(`ad-launch:${response.jobId}`, {
          onCompleted: () => toast.success('Ad launch completed'),
          onError: (msg) => toast.error(`Ad launch error: ${msg}`),
        });
      }
    } catch (error: any) {
      toast.error(error?.response?.data?.message || 'Failed to launch ads');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleRetry = async () => {
    if (!currentAccount || failedItems.length === 0) return;

    setIsSubmitting(true);
    try {
      const startTime = formatLocalISO(flixOffer.startDate, flixOffer.startTime);
      const endTime = formatLocalISO(flixOffer.endDate, flixOffer.endTime);
      const retryCatalogIds = failedItems.map((i) => i.catalogId).filter(Boolean) as string[];

      const response = await api.post<{ jobId: string }>('/accounts/advertisement/retry', {
        accountId: currentAccount.id,
        catalogIds: retryCatalogIds,
        startTime,
        endTime,
        dynamicFieldValues: flixOffer.dynamicFieldValues,
      });

      if (response?.jobId) {
        resetJobState(); // Clean slate for retry
        toast.info('Retry job submitted.');
        await subscribeToJob(`ad-launch:${response.jobId}`, {
          onCompleted: () => toast.success('Retry completed'),
          onError: (msg) => toast.error(`Retry error: ${msg}`),
        });
      }
    } catch (error: any) {
      toast.error(error?.response?.data?.message || 'Failed to retry ads');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Render logic

  if (!currentAccount) {
    return (
      <div className="p-3 rounded-xl bg-destructive/10 border border-destructive/20 text-destructive text-sm font-medium flex items-center gap-2">
        <XCircle className="h-4 w-4 shrink-0" />
        Please select an account from the sidebar to proceed.
      </div>
    );
  }

  if (configLoading) {
    return <PageLoader />;
  }

  // EMPTY STATE (No Config)
  if (!savedConfig) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-center px-4">
        <div className="h-16 w-16 bg-primary/10 text-primary rounded-full flex items-center justify-center mb-6">
          <Settings2 className="h-8 w-8" />
        </div>
        <h2 className="text-2xl font-bold tracking-tight mb-2">No Configuration Found</h2>
        <p className="text-muted-foreground text-sm max-w-[400px] mb-8">
          Before launching advertisements, you must configure the API endpoint and base payload
          schema for this account.
        </p>
        <ActionButton
          onClick={() => navigate(ROUTES.ADVERTISEMENT_CONFIG)}
          className="w-full sm:w-auto px-8"
          icon={Settings2}
        >
          Configure Account
        </ActionButton>
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
            <Megaphone className="h-5 w-5 text-primary" />
            Ads Manager
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
          <div>
            <p className="text-sm font-semibold">
              Configured for {currentAccount.supplierData?.name}
            </p>
            <p className="text-xs text-muted-foreground">{savedConfig.apiUrl}</p>
          </div>
        </div>
        <Button
          variant="secondary"
          size="sm"
          className="h-8 rounded-lg text-xs"
          onClick={() => navigate(ROUTES.ADVERTISEMENT_CONFIG)}
          disabled={isExecuting}
        >
          <Settings2 className="h-3.5 w-3.5 mr-2" />
          Edit
        </Button>
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
            {/* Catalog IDs */}
            <div className="space-y-2">
              <Label className="text-sm font-semibold">Catalog IDs</Label>
              <div className="flex flex-col gap-3">
                <div
                  className={cn(
                    'flex min-h-[120px] items-start content-start flex-wrap gap-2 rounded-xl border bg-card border-input px-3 py-3 transition-colors',
                    errors.catalogIds ? 'border-destructive' : 'border-input',
                  )}
                >
                  {flixOffer.catalogIds.map((id) => (
                    <Badge
                      key={id}
                      variant="secondary"
                      className="h-7 gap-1 pr-1.5 font-mono text-xs"
                    >
                      {id}
                      <button
                        type="button"
                        onClick={() => removeCatalogId(id)}
                        className="rounded-full hover:bg-muted-foreground/20 p-0.5"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </Badge>
                  ))}
                  <input
                    type="text"
                    value={catalogInput}
                    onChange={(e) => setCatalogInput(e.target.value)}
                    onKeyDown={handleCatalogInputKeyDown}
                    onPaste={handlePaste}
                    placeholder={
                      flixOffer.catalogIds.length === 0 ? 'Paste IDs or type & enter...' : ''
                    }
                    className="flex-1 bg-transparent text-sm font-mono outline-none min-w-[120px] h-7"
                  />
                </div>
              </div>
            </div>

            {/* Dates */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <DateTimePicker
                id="startDate"
                label="Start Time"
                date={flixOffer.startDate}
                time={flixOffer.startTime}
                onDateChange={(d) => setFlixOffer((prev) => ({ ...prev, startDate: d }))}
                onTimeChange={(t) => setFlixOffer((prev) => ({ ...prev, startTime: t }))}
                error={errors.startDate}
                minDate={new Date()}
              />
              <DateTimePicker
                id="endDate"
                label="End Time"
                date={flixOffer.endDate}
                time={flixOffer.endTime}
                onDateChange={(d) => setFlixOffer((prev) => ({ ...prev, endDate: d }))}
                onTimeChange={(t) => setFlixOffer((prev) => ({ ...prev, endTime: t }))}
                optional
                minDate={flixOffer.startDate || new Date()}
              />
            </div>

            {/* Dynamic Fields (if any) */}
            {savedConfig.dynamicFields.length > 0 && (
              <div className="space-y-4 pt-4 border-t border-border/50 grid grid-cols-1 sm:grid-cols-2 gap-4">
                {savedConfig.dynamicFields.map((field) => (
                  <div key={field} className="flex flex-col gap-y-2">
                    <Label htmlFor={field} className="pb-1 truncate capitalize">
                      {formatFieldName(field)}
                    </Label>
                    <Input
                      id={field}
                      value={flixOffer.dynamicFieldValues[field] || ''}
                      onChange={(e) =>
                        setFlixOffer((prev) => ({
                          ...prev,
                          dynamicFieldValues: {
                            ...prev.dynamicFieldValues,
                            [field]: e.target.value,
                          },
                        }))
                      }
                      placeholder="Enter value"
                      className={cn(
                        'rounded-xl h-11',
                        errors[`dynamic_${field}`] && 'border-destructive',
                      )}
                    />
                  </div>
                ))}
              </div>
            )}

            {/* Launch Action */}
            <div className="fixed bottom-0 left-0 right-0 p-4 bg-background/80 backdrop-blur-xl border-t border-border z-10 sm:static sm:bg-transparent sm:border-0 sm:p-0 sm:pt-6">
              <div className="max-w-4xl mx-auto">
                <ActionButton
                  onClick={handleLaunch}
                  loading={isSubmitting}
                  icon={PlayCircle}
                  size="lg"
                >
                  Launch Advertisement
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
                  Processed {processed} of {total} catalogs
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
                  'h-full rounded-full transition-all duration-300',
                  status === 'completed' ? 'bg-emerald-500' : 'bg-primary',
                )}
                initial={{ width: 0 }}
                animate={{ width: `${progressPercent}%` }}
              />
            </div>

            {/* Vercel-like Logs */}
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
