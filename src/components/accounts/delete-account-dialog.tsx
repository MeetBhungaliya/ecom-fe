import { toast } from 'sonner';
import { Loader2, AlertTriangle, Trash2 } from 'lucide-react';
import type { MarketplaceAccount } from '@/types';
import { useDeleteAccount } from '@/hooks/use-accounts';
import { useIsDesktop } from '@/hooks/use-media-query';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from '@/components/ui/sheet';

interface DeleteAccountDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  account: MarketplaceAccount | null;
}

export function DeleteAccountDialog({ open, onOpenChange, account }: DeleteAccountDialogProps) {
  const isDesktop = useIsDesktop();
  const { mutate: deleteAccount, isPending } = useDeleteAccount();

  const handleDelete = () => {
    if (!account) return;

    deleteAccount(account.id, {
      onSuccess: () => {
        toast.success('Marketplace account removed', {
          description: `Successfully disconnected ${account.supplierData?.name || account.email}`,
        });
        onOpenChange(false);
      },
      onError: (err: Error) => {
        toast.error(err.message || 'Failed to delete account');
      },
    });
  };

  const bodyContent = (
    <div className="space-y-5 pt-2">
      <div className="flex items-start gap-3.5 rounded-2xl bg-destructive/10 border border-destructive/20 p-4 text-destructive">
        <AlertTriangle className="h-5 w-5 shrink-0 mt-0.5" />
        <div className="text-sm leading-relaxed">
          This action will permanently disconnect{' '}
          <span className="font-bold">{account?.supplierData?.name || account?.email}</span> from
          Ecom Manager. Active order syncs and automated actions for this account will stop.
        </div>
      </div>

      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={() => onOpenChange(false)}
          className="flex-1 h-11 rounded-xl border border-border bg-background text-sm font-medium text-foreground transition-colors hover:bg-muted active:scale-[0.98] cursor-pointer"
        >
          Cancel
        </button>
        <button
          type="button"
          disabled={isPending}
          onClick={handleDelete}
          className="flex-1 h-11 rounded-xl bg-destructive text-sm font-medium text-destructive-foreground transition-colors hover:bg-destructive/90 disabled:opacity-50 flex items-center justify-center gap-2 active:scale-[0.98] cursor-pointer"
        >
          {isPending ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              Deleting...
            </>
          ) : (
            <>
              <Trash2 className="h-4 w-4" />
              Delete Account
            </>
          )}
        </button>
      </div>
    </div>
  );

  if (isDesktop) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-md rounded-2xl p-6">
          <DialogHeader>
            <DialogTitle className="text-destructive flex items-center gap-2">
              <Trash2 className="h-5 w-5" /> Delete Connected Account
            </DialogTitle>
            <DialogDescription>Are you sure you want to remove this account?</DialogDescription>
          </DialogHeader>
          {bodyContent}
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="rounded-t-3xl px-6 pt-6 pb-8">
        <SheetHeader className="text-left mb-2">
          <SheetTitle className="text-destructive flex items-center gap-2">
            <Trash2 className="h-5 w-5" /> Delete Connected Account
          </SheetTitle>
          <SheetDescription>Are you sure you want to remove this account?</SheetDescription>
        </SheetHeader>
        {bodyContent}
      </SheetContent>
    </Sheet>
  );
}
