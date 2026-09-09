import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useProduct, useUpdateProduct, useAdjustStock } from '@/hooks/use-inventory';
import { ROUTES } from '@/constants/routes';
import { cn } from '@/lib/cn';
import { formatCurrency } from '@/lib/formatters';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { ArrowLeft, Clock, TrendingUp, TrendingDown, Minus, Plus, Loader2 } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useIsDesktop } from '@/hooks/use-media-query';
import type { StockTransaction } from '@/types';

const formSchema = z.object({
  name: z.string().trim().min(1, 'Product name is required').max(255),
  price: z.coerce.number().min(0, 'Price must be non-negative'),
  minimumStock: z.coerce.number().int().min(0).optional(),
  note: z.string().trim().max(1000).optional().or(z.literal('')),
});

type FormValues = z.infer<typeof formSchema>;

function TransactionItem({ tx }: { tx: StockTransaction }) {
  const isAdd = tx.changeAmount > 0;
  const date = new Date(tx.createdAt);

  return (
    <div className="flex items-start gap-3 py-2 text-xs">
      <div
        className={cn(
          'mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full',
          isAdd ? 'bg-emerald-500/10' : 'bg-red-500/10',
        )}
      >
        {isAdd ? (
          <TrendingUp className="h-3 w-3 text-emerald-500" />
        ) : (
          <TrendingDown className="h-3 w-3 text-red-500" />
        )}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5">
          <span className={cn('font-semibold', isAdd ? 'text-emerald-500' : 'text-red-500')}>
            {isAdd ? '+' : ''}
            {tx.changeAmount}
          </span>
          <Minus className="h-2 w-2 text-muted-foreground/30" />
          <span className="text-muted-foreground">Stock: {tx.stockAfter}</span>
          <Badge variant="outline" className="text-[9px] px-1 py-0 ml-auto capitalize">
            {tx.type.replace(/_/g, ' ')}
          </Badge>
        </div>
        {tx.note && (
          <p className="text-[11px] text-muted-foreground/80 mt-0.5 truncate">{tx.note}</p>
        )}
        <p className="text-[10px] text-muted-foreground/50 mt-0.5">
          {date.toLocaleDateString()} ·{' '}
          {date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
        </p>
      </div>
    </div>
  );
}

export default function EditProductPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const isDesktop = useIsDesktop();
  const { data: product, isLoading } = useProduct(id || '');
  const updateProduct = useUpdateProduct();
  const adjustStock = useAdjustStock();

  const [pendingDelta, setPendingDelta] = useState(0);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isDirty },
  } = useForm<FormValues>({
    resolver: zodResolver(formSchema),
  });

  useEffect(() => {
    if (product) {
      reset({
        name: product.name,
        price: product.price,
        minimumStock: product.minimumStock,
        note: product.note || '',
      });
    }
  }, [product, reset]);

  function onSubmit(values: FormValues) {
    if (!id) return;
    updateProduct.mutate(
      {
        id,
        data: {
          name: values.name,
          price: values.price,
          minimumStock: values.minimumStock ?? 0,
          note: values.note || null,
          isActive: true,
        },
      },
      {
        onSuccess: () => {
          navigate(ROUTES.INVENTORY);
        },
      },
    );
  }

  if (isLoading) {
    return (
      <div className="max-w-4xl mx-auto space-y-4">
        {/* Loading skeleton */}
        <div className="flex items-center gap-3">
          <Skeleton className="h-8 w-8 rounded-full" />
          <Skeleton className="h-6 w-32" />
        </div>
      </div>
    );
  }

  if (!product) {
    return (
      <div className="flex flex-col items-center justify-center py-16">
        <p className="text-muted-foreground font-medium text-sm">Product not found</p>
        <Button
          variant="outline"
          size="sm"
          className="mt-3 text-xs"
          onClick={() => navigate(ROUTES.INVENTORY)}
        >
          Back to Inventory
        </Button>
      </div>
    );
  }

  const isStockPending = adjustStock.isPending && adjustStock.variables?.id === String(product?.id);

  // Debounced API mutation trigger
  useEffect(() => {
    if (pendingDelta === 0 || !product) return;

    const timer = setTimeout(() => {
      const changeAmount = pendingDelta;
      setPendingDelta(0);

      adjustStock.mutate({
        id: String(product.id),
        data: {
          changeAmount,
          type: changeAmount > 0 ? 'manual_add' : 'manual_deduct',
        },
      });
    }, 800); // 800ms debounce

    return () => clearTimeout(timer);
  }, [pendingDelta, product]);

  const handleIncrement = () => {
    if (isStockPending) return;
    setPendingDelta((prev) => prev + 1);
  };

  const handleDecrement = () => {
    if (isStockPending || !product) return;
    if (product.currentStock + pendingDelta <= 0) return;
    setPendingDelta((prev) => prev - 1);
  };

  const isPending = updateProduct.isPending;

  return (
    <div className="max-w-4xl mx-auto space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 rounded-full hover:bg-muted"
            onClick={() => navigate(ROUTES.INVENTORY)}
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
          {!isDesktop && (
            <div className="flex items-center gap-2">
              {product.imageUrl && (
                <img
                  src={product.imageUrl}
                  alt=""
                  className="h-7 w-7 rounded-md object-cover border border-border"
                />
              )}
              <h1 className="text-lg font-bold tracking-tight text-foreground">{product.name}</h1>
            </div>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Left: Form */}
        <div className="md:col-span-2">
          <form
            onSubmit={handleSubmit(onSubmit)}
            className="space-y-4 bg-card border border-border rounded-xl p-5 shadow-sm"
          >
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="sm:col-span-2">
                <Input
                  id="name"
                  label="Product Name"
                  error={errors.name?.message}
                  {...register('name')}
                />
              </div>
              <div>
                <Input
                  id="price"
                  label="Price (₹)"
                  type="number"
                  step="0.01"
                  min="0"
                  error={errors.price?.message}
                  {...register('price')}
                />
              </div>
              <div>
                <Input
                  id="minimumStock"
                  label="Min Stock Threshold"
                  type="number"
                  min="0"
                  error={errors.minimumStock?.message}
                  {...register('minimumStock')}
                />
              </div>
              <div className="sm:col-span-2 space-y-1">
                <span className="text-xs font-semibold tracking-wide uppercase text-muted-foreground/80 block">
                  Notes
                </span>
                <Textarea
                  id="note"
                  placeholder="Notes..."
                  rows={2}
                  className="resize-none min-h-[60px]"
                  {...register('note')}
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-border/60">
              <Button
                type="button"
                variant="outline"
                onClick={() => navigate(ROUTES.INVENTORY)}
                disabled={isPending}
                className="h-9 px-4 text-xs font-medium"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={isPending || !isDirty}
                className="h-9 px-4 text-xs font-medium"
              >
                {isPending ? (
                  <>
                    <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
                    Saving...
                  </>
                ) : (
                  'Save Changes'
                )}
              </Button>
            </div>
          </form>
        </div>

        {/* Right: Stock Info & History */}
        <div className="space-y-4">
          <div className="bg-card border border-border rounded-xl p-4 shadow-sm space-y-3">
            <div className="flex items-center justify-between pb-1.5 border-b border-border/60">
              <span className="text-xs font-semibold tracking-wide uppercase text-muted-foreground/80">
                Stock Details
              </span>
            </div>

            <div className="space-y-3">
              {/* Inline stock adjuster */}
              <div className="flex items-center justify-between bg-muted/20 border border-border/30 rounded-lg p-2.5">
                <div className="flex flex-col gap-0.5">
                  <span className="text-[10px] text-muted-foreground uppercase font-medium tracking-wide">
                    In Stock
                  </span>
                  <span
                    className={cn(
                      'text-sm font-bold mt-0.5 tabular-nums',
                      product.stockStatus === 'out_of_stock' && 'text-red-500',
                      product.stockStatus === 'low_stock' && 'text-amber-500',
                      product.stockStatus === 'in_stock' && 'text-emerald-500',
                    )}
                  >
                    {product.currentStock}
                  </span>
                </div>

                <div
                  className={cn(
                    'flex items-center border border-border bg-background rounded-lg p-0.5 transition-all shrink-0',
                    (isStockPending || pendingDelta !== 0) && 'bg-muted/10',
                  )}
                >
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    disabled={isStockPending || product.currentStock + pendingDelta <= 0}
                    onClick={handleDecrement}
                    className="h-8 w-8 text-muted-foreground hover:text-red-500 hover:bg-red-500/5 rounded-md shrink-0"
                  >
                    <Minus className="h-3.5 w-3.5" />
                  </Button>

                  <div className="relative flex items-center justify-center w-10 h-8 overflow-hidden">
                    <AnimatePresence mode="popLayout" initial={false}>
                      <motion.span
                        key={pendingDelta}
                        initial={{ y: pendingDelta > 0 ? 12 : -12, opacity: 0 }}
                        animate={{ y: 0, opacity: 1 }}
                        exit={{ y: pendingDelta > 0 ? -12 : 12, opacity: 0 }}
                        transition={{ type: 'spring', stiffness: 300, damping: 25 }}
                        className={cn(
                          'text-sm font-bold tabular-nums absolute',
                          pendingDelta > 0 && 'text-emerald-500',
                          pendingDelta < 0 && 'text-red-500',
                          pendingDelta === 0 && 'text-muted-foreground',
                        )}
                      >
                        {pendingDelta > 0
                          ? `+${pendingDelta}`
                          : pendingDelta < 0
                            ? pendingDelta
                            : '0'}
                      </motion.span>
                    </AnimatePresence>

                    {isStockPending && (
                      <div className="absolute inset-0 bg-background/50 flex items-center justify-center rounded-md">
                        <Loader2 className="h-3.5 w-3.5 animate-spin text-primary" />
                      </div>
                    )}
                  </div>

                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    disabled={isStockPending}
                    onClick={handleIncrement}
                    className="h-8 w-8 text-muted-foreground hover:text-emerald-500 hover:bg-emerald-500/5 rounded-md shrink-0"
                  >
                    <Plus className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </div>

              {/* Value block */}
              <div className="bg-muted/30 border border-border/30 rounded-lg p-2.5 flex items-center justify-between">
                <span className="text-[10px] text-muted-foreground uppercase tracking-wide font-medium">
                  Inventory Value
                </span>
                <span className="text-sm font-bold tabular-nums text-foreground">
                  {formatCurrency(product.inventoryValue)}
                </span>
              </div>
            </div>
          </div>

          <div className="bg-card border border-border rounded-xl p-4 shadow-sm">
            <div className="flex items-center gap-1.5 mb-2 pb-1.5 border-b border-border/60">
              <Clock className="h-3.5 w-3.5 text-muted-foreground" />
              <span className="text-xs font-semibold tracking-wide uppercase text-muted-foreground/80">
                Stock History
              </span>
            </div>

            {product.recentTransactions && product.recentTransactions.length > 0 ? (
              <div className="divide-y divide-border/50 max-h-48 overflow-y-auto pr-1">
                {product.recentTransactions.map((tx) => (
                  <TransactionItem key={tx.id} tx={tx} />
                ))}
              </div>
            ) : (
              <p className="text-[11px] text-muted-foreground text-center py-4">
                No recent movements
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
