import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { useIsDesktop } from '@/hooks/use-media-query';
import type { MarketplaceAccount } from '@/types';
import { Hash, Mail, Pencil, Phone, RefreshCw, ShieldAlert, ShieldCheck, Trash2 } from 'lucide-react';

interface AccountDetailsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  account: MarketplaceAccount | null;
  onEdit: () => void;
  onDelete: () => void;
  onReconnect: () => void;
  isReconnecting: boolean;
}

export function AccountDetailsDialog({
  open,
  onOpenChange,
  account,
  onEdit,
  onDelete,
  onReconnect,
  isReconnecting,
}: AccountDetailsDialogProps) {
  const isDesktop = useIsDesktop();

  if (!account) return null;

  const supplier = account.supplierData;
  const isActive = account.sessionStatus === 'active';
  const isPending = account.sessionStatus === 'pending' || isReconnecting;

  const bodyContent = (
    <div className="space-y-6 pt-2">
      {/* Account Overview Header */}
      <div className="flex items-center gap-4 rounded-2xl border border-border/60 bg-muted/30 p-4">
        <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10 text-xl font-bold text-primary ring-4 ring-primary/5 shrink-0">
          {(supplier?.name || account.email).substring(0, 2).toUpperCase()}
        </div>
        <div className="min-w-0 flex-1">
          <h3 className="font-bold text-base text-foreground truncate">
            {supplier?.name || 'Meesho Account'}
          </h3>
          <p className="text-xs text-muted-foreground truncate">{account.email}</p>
          <div className="mt-1.5 flex items-center gap-2">
            <span
              className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                isActive
                  ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20'
                  : isPending
                  ? 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20'
                  : 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20'
              }`}
            >
              {isPending ? (
                <RefreshCw className="h-3.5 w-3.5 animate-spin text-amber-500" />
              ) : isActive ? (
                <ShieldCheck className="h-3.5 w-3.5" />
              ) : (
                <ShieldAlert className="h-3.5 w-3.5" />
              )}
              {isPending ? 'Syncing...' : account.sessionStatus || 'Unknown'}
            </span>
          </div>
        </div>
      </div>

      {/* Session Error Banner if any */}
      {account.sessionError && (
        <div className="rounded-xl bg-destructive/10 border border-destructive/20 p-3.5 text-xs text-destructive">
          <span className="font-semibold block mb-0.5">Session Alert:</span>
          {account.sessionError}
        </div>
      )}

      {/* Supplier Metadata */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <div className="rounded-xl border border-border/60 bg-card p-3.5 space-y-1">
          <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1">
            <Hash className="h-3 w-3" /> Supplier ID
          </span>
          <p className="text-sm font-medium text-foreground">
            {supplier?.supplierId ? `#${supplier.supplierId}` : 'N/A'}
          </p>
        </div>

        <div className="rounded-xl border border-border/60 bg-card p-3.5 space-y-1">
          <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1">
            <Phone className="h-3 w-3" /> Phone Number
          </span>
          <p className="text-sm font-medium text-foreground">
            {supplier?.phone || 'Not available'}
          </p>
        </div>

        <div className="rounded-xl border border-border/60 bg-card p-3.5 space-y-1 sm:col-span-2">
          <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1">
            <Mail className="h-3 w-3" /> Supplier Email
          </span>
          <p className="text-sm font-medium text-foreground truncate">
            {supplier?.email || account.email}
          </p>
        </div>
      </div>

      {/* Quick Action Toolbar */}
      <div className="pt-2 flex flex-col sm:flex-row items-center gap-2.5">
        <button
          type="button"
          onClick={() => {
            onOpenChange(false);
            onReconnect();
          }}
          disabled={isPending}
          className="w-full sm:flex-1 h-11 rounded-xl border border-border bg-card hover:bg-muted text-sm font-medium text-foreground transition-all flex items-center justify-center gap-2 active:scale-[0.98] cursor-pointer"
        >
          <RefreshCw className={`h-4 w-4 ${isPending ? 'animate-spin text-primary' : ''}`} />
          {isPending ? 'Syncing...' : 'Reconnect Session'}
        </button>

        <button
          type="button"
          onClick={() => {
            onOpenChange(false);
            onEdit();
          }}
          className="w-full sm:flex-1 h-11 rounded-xl bg-primary text-primary-foreground hover:bg-primary/90 text-sm font-medium transition-all flex items-center justify-center gap-2 active:scale-[0.98] cursor-pointer"
        >
          <Pencil className="h-4 w-4" />
          Edit Account
        </button>

        <button
          type="button"
          onClick={() => {
            onOpenChange(false);
            onDelete();
          }}
          className="w-full sm:w-auto h-11 px-4 rounded-xl border border-destructive/30 bg-destructive/10 text-destructive hover:bg-destructive/20 text-sm font-medium transition-all flex items-center justify-center gap-2 active:scale-[0.98] cursor-pointer"
        >
          <Trash2 className="h-4 w-4" />
          <span className="sm:hidden">Delete Account</span>
        </button>
      </div>
    </div>
  );

  if (isDesktop) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-lg rounded-2xl p-6">
          <DialogHeader>
            <DialogTitle>Marketplace Account Details</DialogTitle>
          </DialogHeader>
          {bodyContent}
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="rounded-t-3xl px-6 pt-6 pb-8 max-h-[90vh] overflow-y-auto">
        <SheetHeader className="text-left mb-2">
          <SheetTitle>Marketplace Account Details</SheetTitle>
        </SheetHeader>
        {bodyContent}
      </SheetContent>
    </Sheet>
  );
}
