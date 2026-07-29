import { Button } from '@/components/ui/button';
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
  Loader2,
  PlayCircle,
  RotateCcw,
  XCircle,
} from 'lucide-react';
import { Controller, useForm } from 'react-hook-form';
import { toast } from 'sonner';
import { z } from 'zod';

const formSchema = z.object({
  productIds: z.string().min(1, 'Product IDs are required'),
  start: z.string().min(1, 'Start Date is required'),
  end: z.string().min(1, 'End Date is required'),
  discountPercent: z.coerce.number().min(0.01, 'Discount percent must be greater than 0'),
});

type FormValues = z.infer<typeof formSchema>;

export default function FlexiGrowthOfferPage() {
  const { data: accounts } = useAccounts();
  const activeAccountIds = useMarketplaceStore((s) => s.activeAccountIds);

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

    // We get the form values we need to retry
    // In a real app we might store the form values in state so we don't have to extract them
    // but here we can just prompt or use the last values if needed.
    // For simplicity, we just trigger the retry API for the failed items and reset the form/state.

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
    <div className="flex w-full flex-col space-y-6 p-4 md:p-6 lg:p-8 animate-in fade-in duration-500">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold tracking-tight">Flexi Growth Offer</h1>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card className="shadow-lg border-muted/50 dark:bg-zinc-900/50 backdrop-blur-sm">
          <CardHeader>
            <CardTitle>Submit Offer</CardTitle>
            <CardDescription>
              Bulk apply promotions to multiple products. Comma separated product IDs.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {!currentAccount && (
              <div className="mb-4 p-4 rounded-lg bg-red-500/10 border border-red-500/20 text-red-500 font-medium">
                Please select an account from the header to proceed.
              </div>
            )}

            <form onSubmit={handleSubmit(onSubmit)} className="space-y-5 mt-2">
              <div className="space-y-2">
                <Label htmlFor="productIds">Product IDs</Label>
                <textarea
                  id="productIds"
                  {...register('productIds')}
                  className={cn(
                    'flex min-h-[120px] w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50 transition-colors',
                    errors.productIds ? 'border-red-500 focus-visible:ring-red-500' : '',
                  )}
                  placeholder="e.g. 899039966, 899039967"
                />
                {errors.productIds && (
                  <p className="text-red-500 text-xs font-medium">{errors.productIds.message}</p>
                )}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                <div className="space-y-2 flex flex-col">
                  <Label>Start Date</Label>
                  <Controller
                    name="start"
                    control={control}
                    render={({ field }) => (
                      <Popover>
                        <PopoverTrigger asChild>
                          <Button
                            variant={'outline'}
                            className={cn(
                              'w-full justify-start text-left font-normal',
                              !field.value && 'text-muted-foreground',
                              errors.start && 'border-red-500 focus-visible:ring-red-500',
                            )}
                          >
                            <CalendarIcon className="mr-2 h-4 w-4" />
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
                    <p className="text-red-500 text-xs font-medium">{errors.start.message}</p>
                  )}
                </div>
                <div className="space-y-2 flex flex-col">
                  <Label>End Date</Label>
                  <Controller
                    name="end"
                    control={control}
                    render={({ field }) => (
                      <Popover>
                        <PopoverTrigger asChild>
                          <Button
                            variant={'outline'}
                            className={cn(
                              'w-full justify-start text-left font-normal',
                              !field.value && 'text-muted-foreground',
                              errors.end && 'border-red-500 focus-visible:ring-red-500',
                            )}
                          >
                            <CalendarIcon className="mr-2 h-4 w-4" />
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
                    <p className="text-red-500 text-xs font-medium">{errors.end.message}</p>
                  )}
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="discountPercent">Discount Percent (%)</Label>
                <Input
                  id="discountPercent"
                  type="number"
                  step="0.01"
                  {...register('discountPercent')}
                  className={cn(
                    'transition-colors',
                    errors.discountPercent ? 'border-red-500 focus-visible:ring-red-500' : '',
                  )}
                />
                {errors.discountPercent && (
                  <p className="text-red-500 text-xs font-medium">
                    {errors.discountPercent.message}
                  </p>
                )}
              </div>

              <Button
                type="submit"
                disabled={isSubmitting || !currentAccount}
                className="w-full font-semibold shadow-md mt-4"
              >
                {isSubmitting ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <PlayCircle className="mr-2 h-4 w-4" />
                )}
                Run Offer
              </Button>
            </form>
          </CardContent>
        </Card>

        <Card className="shadow-lg border-muted/50 dark:bg-zinc-900/50 backdrop-blur-sm flex flex-col h-full max-h-[600px]">
          <CardHeader>
            <CardTitle>Live Progress</CardTitle>
            <CardDescription>
              {status === 'idle' && 'Waiting for job to start...'}
              {status === 'started' && 'Job started, initializing...'}
              {status === 'progress' && `Processing ${processed} of ${total}`}
              {status === 'completed' && 'Job completed'}
              {status === 'error' && 'Job failed'}
            </CardDescription>
          </CardHeader>
          <CardContent className="flex-1 overflow-y-auto">
            {status !== 'idle' && (
              <div className="space-y-6">
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="font-medium text-muted-foreground">
                      {Math.round(progressPercent)}%
                    </span>
                    <span className="font-medium text-muted-foreground">
                      {processed} / {total}
                    </span>
                  </div>
                  <Progress value={progressPercent} className="h-2" />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="rounded-xl border bg-card p-4 shadow-sm flex flex-col items-center justify-center space-y-1">
                    <CheckCircle2 className="h-6 w-6 text-emerald-500" />
                    <div className="text-2xl font-bold">{successCount}</div>
                    <div className="text-xs text-muted-foreground">Successful</div>
                  </div>
                  <div className="rounded-xl border bg-card p-4 shadow-sm flex flex-col items-center justify-center space-y-1">
                    <XCircle className="h-6 w-6 text-red-500" />
                    <div className="text-2xl font-bold">{failedCount}</div>
                    <div className="text-xs text-muted-foreground">Failed</div>
                  </div>
                </div>

                {failedItems.length > 0 && (
                  <div className="space-y-3 pt-4 border-t">
                    <div className="flex items-center justify-between">
                      <h4 className="font-semibold text-sm">Failed Items</h4>
                      <Button size="sm" variant="outline" onClick={handleRetry} className="h-8">
                        <RotateCcw className="mr-2 h-3.5 w-3.5" />
                        Retry All Failed
                      </Button>
                    </div>
                    <div className="space-y-2 max-h-[200px] overflow-y-auto pr-2 custom-scrollbar">
                      {failedItems.map((item, i) => (
                        <div
                          key={i}
                          className="text-xs rounded-md bg-red-500/10 border border-red-500/20 p-2 text-red-600 dark:text-red-400"
                        >
                          <span className="font-semibold">ID: {item.productId}</span> -{' '}
                          {item.reason}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {status === 'error' && (
                  <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-md text-red-600 text-sm">
                    {errorMessage}
                  </div>
                )}
              </div>
            )}

            {status === 'idle' && (
              <div className="flex h-[200px] items-center justify-center flex-col text-muted-foreground">
                <PlayCircle className="h-10 w-10 mb-2 opacity-20" />
                <p className="text-sm">Submit the form to start processing</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
