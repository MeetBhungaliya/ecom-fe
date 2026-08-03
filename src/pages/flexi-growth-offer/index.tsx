import { Button } from '@/components/ui/button';
import { ActionButton } from '@/components/ui/action-button';
import { Calendar } from '@/components/ui/calendar';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Progress } from '@/components/ui/progress';
import { useAccounts } from '@/hooks/use-accounts';
import { useTransmitJob } from '@/hooks/use-transmit-job';
import { api } from '@/lib/api-client';
import { cn } from '@/lib/cn';
import { useMarketplaceStore } from '@/store/marketplace.store';
import { zodResolver } from '@hookform/resolvers/zod';
import { format } from 'date-fns';
import {
  Calendar as CalendarIcon,
  CheckCircle2,
  PlayCircle,
  RotateCcw,
  XCircle,
  Sparkles,
  TrendingUp,
} from 'lucide-react';
import { Controller, useForm } from 'react-hook-form';
import { toast } from 'sonner';
import { z } from 'zod';
import { useIsDesktop } from '@/hooks/use-media-query';

// ============================================
// FORM SCHEMA
// ============================================

const formSchema = z.object({
  productIds: z.string().min(1, 'Product IDs are required'),
  start: z.string().min(1, 'Start Date is required'),
  end: z.string().min(1, 'End Date is required'),
  discountPercent: z.coerce.number().min(0.01, 'Discount percent must be greater than 0'),
});

type FormValues = z.infer<typeof formSchema>;

// ============================================
// PAGE
// ============================================

export default function FlexiGrowthOfferPage() {
  const { data: accounts } = useAccounts();
  const activeAccountIds = useMarketplaceStore((s) => s.activeAccountIds);
  const isDesktop = useIsDesktop();

  // Use the first active account for this operation
  const currentAccountId = activeAccountIds[0];
  const currentAccount = accounts?.find((a) => a.id.toString() === currentAccountId);

  const {
    status,
    total,
    processed,
    successCount,
    failedCount,
    failedItems,
    errorMessage,
    subscribeToJob,
    resetJobState,
  } = useTransmitJob();

  const {
    register,
    handleSubmit,
    control,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      productIds: '',
      start: '',
      end: '',
      discountPercent: 1,
    },
  });

  const onSubmit = async (values: FormValues) => {
    if (!currentAccount) {
      toast.error('Please select an account first');
      return;
    }

    // Generate a unique jobId on the client to avoid race conditions
    // where the worker starts broadcasting before we subscribe.
    const newJobId = crypto.randomUUID();

    await subscribeToJob(`flexi-growth-offer:${newJobId}`, {
      onCompleted: () => toast.success('Job completed!'),
      onError: (msg) => toast.error('Job error: ' + msg),
    });

    try {
      const response = await api.post<{ data?: { jobId?: string }; jobId?: string }>(
        '/accounts/flexi-growth-offer',
        {
          accountId: currentAccount.id,
          jobId: newJobId,
          ...values,
        },
      );

      if (response?.jobId || response?.data?.jobId) {
        toast.info('Job submitted. Listening for progress...');
      }
    } catch (error: unknown) {
      const msg =
        error && typeof error === 'object' && 'response' in error
          ? (error as { response?: { data?: { message?: string } } }).response?.data?.message
          : 'Failed to submit job';
      toast.error(msg || 'Failed to submit job');
    }
  };

  const handleRetry = async () => {
    if (!currentAccount || failedItems.length === 0) return;

    const productIds = failedItems.map((i) => i.productId);

    // Generate a unique jobId for retry
    const retryJobId = crypto.randomUUID();

    await subscribeToJob(`flexi-growth-offer:${retryJobId}`, {
      onCompleted: () => toast.success('Retry job completed!'),
      onError: (msg) => toast.error('Retry job error: ' + msg),
    });

    try {
      // For retry, we need start, end, discountPercent.
      // We assume they haven't changed the form, or we can just grab from DOM,
      // but to be safe let's assume the user hasn't changed the form values.

      const formEl = document.querySelector('form');
      if (!formEl) return;
      const start = (formEl.querySelector('[name="start"]') as HTMLInputElement).value;
      const end = (formEl.querySelector('[name="end"]') as HTMLInputElement).value;
      const discountPercent = (formEl.querySelector('[name="discountPercent"]') as HTMLInputElement)
        .value;

      const response = await api.post<{ data?: { jobId?: string }; jobId?: string }>(
        '/accounts/flexi-growth-offer/retry',
        {
          accountId: currentAccount.id,
          jobId: retryJobId,
          productIds,
          start,
          end,
          discountPercent: Number(discountPercent),
        },
      );

      if (response?.jobId || response?.data?.jobId) {
        resetJobState(); // clear current fails
        toast.info('Retry job submitted. Listening for progress...');
      }
    } catch (error: unknown) {
      const msg =
        error && typeof error === 'object' && 'response' in error
          ? (error as { response?: { data?: { message?: string } } }).response?.data?.message
          : 'Failed to submit retry job';
      toast.error(msg || 'Failed to submit retry job');
    }
  };

  const progressPercent = total > 0 ? (processed / total) * 100 : 0;

  return (
    <div className="space-y-5">
      {/* Header */}
      {!isDesktop && (
        <div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight flex items-center gap-2">
            <Sparkles className="h-5 w-5 sm:h-6 sm:w-6 text-primary" />
            Flexi Growth Offer
          </h1>
          <p className="mt-0.5 text-xs sm:text-sm text-muted-foreground">
            Bulk apply promotions to multiple products at once.
          </p>
        </div>
      )}

      {/* Two-panel layout — stacks on mobile */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-5">

        {/* Form Panel */}
        <Card className="lg:col-span-3 border-border/50 bg-card/60 backdrop-blur-sm shadow-sm">
          <CardHeader className="pb-4">
            <CardTitle className="text-base">Submit Offer</CardTitle>
            <CardDescription className="text-xs">
              Enter comma-separated product IDs, select date range, and set discount.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {!currentAccount && (
              <div className="mb-5 p-3 rounded-lg bg-destructive/10 border border-destructive/20 text-destructive text-xs sm:text-sm font-medium flex items-center gap-2">
                <XCircle className="h-4 w-4 shrink-0" />
                Please select an account from the sidebar to proceed.
              </div>
            )}

            <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
              {/* Product IDs */}
              <div className="space-y-1.5">
                <Label htmlFor="productIds" className="text-xs sm:text-sm">Product IDs</Label>
                <textarea
                  id="productIds"
                  {...register('productIds')}
                  className={cn(
                    'flex min-h-[100px] sm:min-h-[120px] w-full rounded-xl border border-input bg-background/50 px-3 py-2.5 text-sm shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50 transition-colors resize-none',
                    errors.productIds ? 'border-destructive focus-visible:ring-destructive' : '',
                  )}
                  placeholder="e.g. 899039966, 899039967, 899039968"
                />
                {errors.productIds && (
                  <p className="text-destructive text-[11px] font-medium">{errors.productIds.message}</p>
                )}
              </div>

              {/* Date pickers — side by side, stack on very small screens */}
              <div className="grid grid-cols-1 xs:grid-cols-2 gap-4">
                <div className="space-y-1.5 flex flex-col">
                  <Label className="text-xs sm:text-sm">Start Date</Label>
                  <Controller
                    name="start"
                    control={control}
                    render={({ field }) => (
                      <Popover>
                        <PopoverTrigger asChild>
                          <Button
                            variant={'outline'}
                            className={cn(
                              'w-full justify-start text-left font-normal rounded-xl text-xs sm:text-sm',
                              !field.value && 'text-muted-foreground',
                              errors.start && 'border-destructive focus-visible:ring-destructive',
                            )}
                          >
                            <CalendarIcon className="mr-2 h-3.5 w-3.5" />
                            {field.value ? (
                              format(new Date(field.value), 'PPP')
                            ) : (
                              <span>Pick a date</span>
                            )}
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0" align="start">
                          <Calendar
                            mode="single"
                            selected={field.value ? new Date(field.value) : undefined}
                            onSelect={(date) =>
                              field.onChange(date ? format(date, 'yyyy-MM-dd') : '')
                            }
                          />
                        </PopoverContent>
                      </Popover>
                    )}
                  />
                  {errors.start && (
                    <p className="text-destructive text-[11px] font-medium">{errors.start.message}</p>
                  )}
                </div>
                <div className="space-y-1.5 flex flex-col">
                  <Label className="text-xs sm:text-sm">End Date</Label>
                  <Controller
                    name="end"
                    control={control}
                    render={({ field }) => (
                      <Popover>
                        <PopoverTrigger asChild>
                          <Button
                            variant={'outline'}
                            className={cn(
                              'w-full justify-start text-left font-normal rounded-xl text-xs sm:text-sm',
                              !field.value && 'text-muted-foreground',
                              errors.end && 'border-destructive focus-visible:ring-destructive',
                            )}
                          >
                            <CalendarIcon className="mr-2 h-3.5 w-3.5" />
                            {field.value ? (
                              format(new Date(field.value), 'PPP')
                            ) : (
                              <span>Pick a date</span>
                            )}
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0" align="start">
                          <Calendar
                            mode="single"
                            selected={field.value ? new Date(field.value) : undefined}
                            onSelect={(date) =>
                              field.onChange(date ? format(date, 'yyyy-MM-dd') : '')
                            }
                          />
                        </PopoverContent>
                      </Popover>
                    )}
                  />
                  {errors.end && (
                    <p className="text-destructive text-[11px] font-medium">{errors.end.message}</p>
                  )}
                </div>
              </div>

              {/* Discount */}
              <div className="space-y-1.5">
                <Label htmlFor="discountPercent" className="text-xs sm:text-sm">Discount Percent (%)</Label>
                <Input
                  id="discountPercent"
                  type="number"
                  step="0.01"
                  {...register('discountPercent')}
                  className={cn(
                    'rounded-xl transition-colors',
                    errors.discountPercent ? 'border-destructive focus-visible:ring-destructive' : '',
                  )}
                />
                {errors.discountPercent && (
                  <p className="text-destructive text-[11px] font-medium">
                    {errors.discountPercent.message}
                  </p>
                )}
              </div>

              <ActionButton
                type="submit"
                disabled={isSubmitting || !currentAccount}
                loading={isSubmitting}
                icon={PlayCircle}
              >
                Run Offer
              </ActionButton>
            </form>
          </CardContent>
        </Card>

        {/* Progress Panel */}
        <Card className="lg:col-span-2 border-border/50 bg-card/60 backdrop-blur-sm shadow-sm flex flex-col">
          <CardHeader className="pb-4">
            <CardTitle className="text-base flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
              Live Progress
            </CardTitle>
            <CardDescription className="text-xs">
              {status === 'idle' && 'Waiting for job to start…'}
              {status === 'started' && 'Job started, initializing…'}
              {status === 'progress' && `Processing ${processed} of ${total}`}
              {status === 'completed' && 'Job completed'}
              {status === 'error' && 'Job failed'}
            </CardDescription>
          </CardHeader>
          <CardContent className="flex-1 overflow-y-auto">
            {status !== 'idle' && (
              <div className="space-y-5">
                {/* Progress bar */}
                <div className="space-y-2">
                  <div className="flex justify-between text-xs font-medium text-muted-foreground">
                    <span>{Math.round(progressPercent)}%</span>
                    <span>{processed} / {total}</span>
                  </div>
                  <Progress value={progressPercent} className="h-2" />
                </div>

                {/* Stats */}
                <div className="grid grid-cols-2 gap-3">
                  <div className="rounded-xl border border-border/40 bg-background/50 p-3 sm:p-4 flex flex-col items-center justify-center gap-1">
                    <CheckCircle2 className="h-5 w-5 text-emerald-500" />
                    <div className="text-xl sm:text-2xl font-bold tabular-nums">{successCount}</div>
                    <div className="text-[10px] text-muted-foreground font-medium">Successful</div>
                  </div>
                  <div className="rounded-xl border border-border/40 bg-background/50 p-3 sm:p-4 flex flex-col items-center justify-center gap-1">
                    <XCircle className="h-5 w-5 text-destructive" />
                    <div className="text-xl sm:text-2xl font-bold tabular-nums">{failedCount}</div>
                    <div className="text-[10px] text-muted-foreground font-medium">Failed</div>
                  </div>
                </div>

                {/* Failed items */}
                {failedItems.length > 0 && (
                  <div className="space-y-3 pt-3 border-t border-border/40">
                    <div className="flex items-center justify-between gap-2">
                      <h4 className="font-semibold text-xs sm:text-sm">Failed Items</h4>
                      <Button size="sm" variant="outline" onClick={handleRetry} className="h-7 text-xs rounded-lg">
                        <RotateCcw className="mr-1.5 h-3 w-3" />
                        Retry All
                      </Button>
                    </div>
                    <div className="space-y-1.5 max-h-[200px] overflow-y-auto">
                      {failedItems.map((item, i) => (
                        <div
                          key={i}
                          className="text-[11px] rounded-lg bg-destructive/10 border border-destructive/20 p-2.5 text-destructive"
                        >
                          <span className="font-semibold">ID: {item.productId}</span> — {item.reason}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Global error */}
                {status === 'error' && (
                  <div className="p-3 bg-destructive/10 border border-destructive/20 rounded-lg text-destructive text-xs sm:text-sm">
                    {errorMessage}
                  </div>
                )}
              </div>
            )}

            {/* Idle state */}
            {status === 'idle' && (
              <div className="flex h-[180px] sm:h-[200px] items-center justify-center flex-col text-muted-foreground/50">
                <PlayCircle className="h-10 w-10 mb-3" />
                <p className="text-xs sm:text-sm font-medium">Submit the form to start</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
