import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router';
import { cn } from '@/lib/cn';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useAdjustStock } from '@/hooks/use-inventory';
import { Trash2, Edit, ImageIcon, MoreVertical, Plus, Minus, Loader2 } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { ROUTES } from '@/constants/routes';
import type { Product } from '@/types';

type ProductCardProps = {
  product: Product;
  onDelete: (product: Product) => void;
};

export function ProductCard({ product, onDelete }: ProductCardProps) {
  const navigate = useNavigate();
  const adjustStock = useAdjustStock();

  // Local state for pending stock adjustment (e.g. +5, -3)
  const [pendingDelta, setPendingDelta] = useState(0);

  // Is this card currently adjusting stock in the backend
  const isPending = adjustStock.isPending && adjustStock.variables?.id === String(product.id);

  // Debounced API mutation trigger
  useEffect(() => {
    if (pendingDelta === 0) return;

    const timer = setTimeout(() => {
      // Capture the delta to apply and reset local state
      const changeAmount = pendingDelta;
      setPendingDelta(0);

      adjustStock.mutate({
        id: String(product.id),
        data: {
          changeAmount,
          type: changeAmount > 0 ? 'manual_add' : 'manual_deduct',
        },
      });
    }, 800); // 800ms debounce window

    return () => clearTimeout(timer);
  }, [pendingDelta, product.id]);

  const handleIncrement = () => {
    if (isPending) return;
    setPendingDelta((prev) => prev + 1);
  };

  const handleDecrement = () => {
    if (isPending) return;
    // Don't allow decrementing below the total available stock
    if (product.currentStock + pendingDelta <= 0) return;
    setPendingDelta((prev) => prev - 1);
  };

  return (
    <div className="relative rounded-xl border border-border bg-card p-3.5 shadow-sm hover:shadow-md hover:border-border/80 transition-all flex items-center justify-between gap-3.5 min-h-[76px]">
      {/* Left: Balanced Details */}
      <div className="flex items-center gap-3 min-w-0 flex-1">
        {/* Expanded Product Thumbnail */}
        <div className="h-11 w-11 rounded-lg overflow-hidden border border-border bg-muted/30 flex items-center justify-center shrink-0 shadow-2xs">
          {product.imageUrl ? (
            <img src={product.imageUrl} alt={product.name} className="h-full w-full object-cover" />
          ) : (
            <ImageIcon className="h-4.5 w-4.5 text-muted-foreground/30" />
          )}
        </div>

        {/* Name & Current Stock */}
        <div className="min-w-0 flex flex-col gap-1">
          <h3 className="font-semibold text-sm text-foreground truncate pr-1" title={product.name}>
            {product.name}
          </h3>
          <div className="flex items-center gap-2">
            <span className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider">
              Stock:
            </span>
            <span
              className={cn(
                'text-sm font-bold tabular-nums px-2 py-0.5 rounded-full text-xs border',
                product.stockStatus === 'out_of_stock' &&
                  'text-red-500 bg-red-500/5 border-red-500/10',
                product.stockStatus === 'low_stock' &&
                  'text-amber-500 bg-amber-500/5 border-amber-500/10',
                product.stockStatus === 'in_stock' &&
                  'text-emerald-500 bg-emerald-500/5 border-emerald-500/10',
              )}
            >
              {product.currentStock}
            </span>
          </div>
        </div>
      </div>

      {/* Right: Quick Delta Stock Adjuster & Actions */}
      <div className="flex items-center gap-2 shrink-0">
        {/* Delta Controller */}
        <div
          className={cn(
            'flex items-center border border-border bg-muted/15 rounded-lg p-0.5 transition-all shadow-2xs',
            (isPending || pendingDelta !== 0) && 'bg-muted/10',
          )}
        >
          {/* Deduct Button */}
          <Button
            type="button"
            variant="ghost"
            size="icon"
            disabled={isPending || product.currentStock + pendingDelta <= 0}
            onClick={handleDecrement}
            className="h-7 w-7 text-muted-foreground hover:text-red-500 hover:bg-red-500/5 rounded-md shrink-0 transition-colors"
          >
            <Minus className="h-3.5 w-3.5" />
          </Button>

          {/* Delta Display (Nicely Animated, Non-Typable) */}
          <div className="relative flex items-center justify-center w-10 h-7 overflow-hidden">
            <AnimatePresence mode="popLayout" initial={false}>
              <motion.span
                key={pendingDelta}
                initial={{ y: pendingDelta > 0 ? 12 : -12, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                exit={{ y: pendingDelta > 0 ? -12 : 12, opacity: 0 }}
                transition={{ type: 'spring', stiffness: 300, damping: 25 }}
                className={cn(
                  'text-xs font-bold tabular-nums absolute',
                  pendingDelta > 0 && 'text-emerald-500',
                  pendingDelta < 0 && 'text-red-500',
                  pendingDelta === 0 && 'text-muted-foreground',
                )}
              >
                {pendingDelta > 0 ? `+${pendingDelta}` : pendingDelta < 0 ? pendingDelta : '0'}
              </motion.span>
            </AnimatePresence>

            {isPending && (
              <div className="absolute inset-0 bg-background/50 flex items-center justify-center rounded-md">
                <Loader2 className="h-3.5 w-3.5 animate-spin text-primary" />
              </div>
            )}
          </div>

          {/* Add Button */}
          <Button
            type="button"
            variant="ghost"
            size="icon"
            disabled={isPending}
            onClick={handleIncrement}
            className="h-7 w-7 text-muted-foreground hover:text-emerald-500 hover:bg-emerald-500/5 rounded-md shrink-0 transition-colors"
          >
            <Plus className="h-3.5 w-3.5" />
          </Button>
        </div>

        {/* Dropdown Menu (Prevents Accidental Actions) */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 text-muted-foreground hover:text-foreground rounded-lg"
            >
              <MoreVertical className="h-4 w-4" />
              <span className="sr-only">Open actions menu</span>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-36">
            <DropdownMenuItem
              onClick={() => navigate(ROUTES.INVENTORY_EDIT(String(product.id)))}
              className="cursor-pointer gap-2"
            >
              <Edit className="h-3.5 w-3.5" />
              Edit Product
            </DropdownMenuItem>
            <DropdownMenuItem
              variant="destructive"
              onClick={() => onDelete(product)}
              className="cursor-pointer gap-2 text-destructive focus:bg-destructive/10 focus:text-destructive dark:focus:bg-destructive/20"
            >
              <Trash2 className="h-3.5 w-3.5" />
              Delete Product
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  );
}
