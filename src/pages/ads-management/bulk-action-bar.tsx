import { motion, AnimatePresence } from 'motion/react';
import { GripVertical, Pause, Loader2, X, CheckSquare } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useBulkPauseAdsCampaigns, type BulkPauseCampaignItem } from '@/hooks/use-ads-campaigns';

export interface BulkActionBarProps {
  selectedItems: BulkPauseCampaignItem[];
  onClearSelection: () => void;
}

export function BulkActionBar({ selectedItems, onClearSelection }: BulkActionBarProps) {
  const bulkPauseMutation = useBulkPauseAdsCampaigns();
  const count = selectedItems.length;

  if (count === 0) return null;

  const handleBulkPause = () => {
    bulkPauseMutation.mutate(
      { items: selectedItems },
      {
        onSuccess: () => {
          onClearSelection();
        },
      },
    );
  };

  return (
    <AnimatePresence>
      <motion.div
        drag
        dragMomentum={false}
        initial={{ opacity: 0, y: 40, scale: 0.92 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 30, scale: 0.92 }}
        transition={{ type: 'spring', stiffness: 400, damping: 30 }}
        className="fixed bottom-8 left-1/2 -translate-x-1/2 z-50 flex items-center gap-3 bg-zinc-950/95 dark:bg-zinc-900/95 backdrop-blur-md text-white px-3.5 py-2 rounded-2xl border border-zinc-700/60 shadow-2xl shadow-black/40 select-none cursor-default"
      >
        {/* Drag Handle */}
        <div
          className="flex items-center justify-center pl-0.5 pr-1 text-zinc-400 hover:text-zinc-200 cursor-grab active:cursor-grabbing transition-colors"
          title="Drag to reposition toolbar"
        >
          <GripVertical className="h-4 w-4" />
        </div>

        <div className="h-4 w-px bg-zinc-700/60 shrink-0" />

        {/* Selected Count Indicator */}
        <div className="flex items-center gap-1.5 text-xs font-mono font-medium">
          <CheckSquare className="h-3.5 w-3.5 text-[#0ea5e9]" />
          <span className="text-zinc-200">
            <strong className="text-white font-semibold">{count}</strong> selected
          </span>
        </div>

        {/* Action: Bulk Pause */}
        <Button
          type="button"
          size="sm"
          onClick={handleBulkPause}
          disabled={bulkPauseMutation.isPending}
          className="h-8 px-3 text-xs font-mono font-medium rounded-xl bg-amber-600 hover:bg-amber-500 text-white gap-1.5 shadow-xs transition-colors cursor-pointer disabled:opacity-60"
        >
          {bulkPauseMutation.isPending ? (
            <>
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
              <span>Pausing {count}...</span>
            </>
          ) : (
            <>
              <Pause className="h-3.5 w-3.5 fill-current" />
              <span>Pause Selected</span>
            </>
          )}
        </Button>

        <div className="h-4 w-px bg-zinc-700/60 shrink-0" />

        {/* Clear Selection (✕) */}
        <button
          type="button"
          onClick={onClearSelection}
          className="h-6 w-6 flex items-center justify-center rounded-lg text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800 transition-colors cursor-pointer"
          title="Deselect all"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      </motion.div>
    </AnimatePresence>
  );
}
