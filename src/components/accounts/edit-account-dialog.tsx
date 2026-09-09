import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { toast } from 'sonner';
import { Loader2, KeyRound, Mail } from 'lucide-react';
import type { MarketplaceAccount } from '@/types';
import { useUpdateAccount } from '@/hooks/use-accounts';
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

const editSchema = z.object({
  email: z.string().min(1, 'Email is required').email('Invalid email address'),
  password: z.string().optional(),
});

type EditFormValues = z.infer<typeof editSchema>;

interface EditAccountDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  account: MarketplaceAccount | null;
}

export function EditAccountDialog({ open, onOpenChange, account }: EditAccountDialogProps) {
  const isDesktop = useIsDesktop();
  const { mutate: updateAccount, isPending } = useUpdateAccount();

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<EditFormValues>({
    resolver: zodResolver(editSchema),
    defaultValues: {
      email: account?.email || '',
      password: '',
    },
  });

  useEffect(() => {
    if (account) {
      reset({
        email: account.email || '',
        password: '',
      });
    }
  }, [account, reset]);

  const onSubmit = (values: EditFormValues) => {
    if (!account) return;

    const payload: Partial<{ email: string; password: string }> = {};
    if (values.email && values.email !== account.email) {
      payload.email = values.email;
    }
    if (values.password && values.password.trim() !== '') {
      payload.password = values.password;
    }

    if (Object.keys(payload).length === 0) {
      onOpenChange(false);
      return;
    }

    updateAccount(
      { id: account.id, data: payload },
      {
        onSuccess: () => {
          toast.success('Marketplace account updated successfully', {
            description: payload.password
              ? 'Credentials updated and re-login initiated.'
              : 'Account email updated.',
          });
          onOpenChange(false);
        },
        onError: (err: Error) => {
          toast.error(err.message || 'Failed to update account');
        },
      },
    );
  };

  const formContent = (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 pt-2">
      <div className="space-y-2">
        <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
          <Mail className="h-3.5 w-3.5" />
          Account Email
        </label>
        <input
          type="email"
          {...register('email')}
          className="flex h-11 w-full rounded-xl border border-input bg-background px-3.5 py-2 text-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
          placeholder="seller@example.com"
        />
        {errors.email && <p className="text-xs text-destructive">{errors.email.message}</p>}
      </div>

      <div className="space-y-2">
        <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
          <KeyRound className="h-3.5 w-3.5" />
          New Password (Optional)
        </label>
        <input
          type="password"
          {...register('password')}
          className="flex h-11 w-full rounded-xl border border-input bg-background px-3.5 py-2 text-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
          placeholder="Leave blank to keep current password"
        />
        {errors.password && <p className="text-xs text-destructive">{errors.password.message}</p>}
        <p className="text-[11px] text-muted-foreground">
          Updating your password will trigger an automated session re-login.
        </p>
      </div>

      <div className="pt-3 flex items-center gap-3">
        <button
          type="button"
          onClick={() => onOpenChange(false)}
          className="flex-1 h-11 rounded-xl border border-border bg-background text-sm font-medium text-foreground transition-colors hover:bg-muted active:scale-[0.98] cursor-pointer"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={isPending}
          className="flex-1 h-11 rounded-xl bg-primary text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90 disabled:opacity-50 flex items-center justify-center gap-2 active:scale-[0.98] cursor-pointer"
        >
          {isPending ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              Saving...
            </>
          ) : (
            'Save Changes'
          )}
        </button>
      </div>
    </form>
  );

  if (isDesktop) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-md rounded-2xl p-6">
          <DialogHeader>
            <DialogTitle>Edit Marketplace Account</DialogTitle>
            <DialogDescription>
              Update credentials for{' '}
              <span className="font-semibold text-foreground">
                {account?.supplierData?.name || account?.email}
              </span>
              .
            </DialogDescription>
          </DialogHeader>
          {formContent}
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="bottom"
        className="rounded-t-3xl px-6 pt-6 pb-8 max-h-[90vh] overflow-y-auto"
      >
        <SheetHeader className="text-left mb-2">
          <SheetTitle>Edit Marketplace Account</SheetTitle>
          <SheetDescription>
            Update credentials for{' '}
            <span className="font-semibold text-foreground">
              {account?.supplierData?.name || account?.email}
            </span>
            .
          </SheetDescription>
        </SheetHeader>
        {formContent}
      </SheetContent>
    </Sheet>
  );
}
