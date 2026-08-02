import { Plus, Loader2 } from 'lucide-react';
import { useNavigate } from 'react-router';
import { useAccounts } from '@/hooks/use-accounts';
import { useIsDesktop } from '@/hooks/use-media-query';

function getInitials(name?: string) {
  if (!name) return 'S';
  return name.substring(0, 2).toUpperCase();
}

export default function AccountsListPage() {
  const navigate = useNavigate();
  const isDesktop = useIsDesktop();
  const { data: accounts, isLoading } = useAccounts();

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        {!isDesktop && (
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Marketplace Accounts</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Manage your connected seller accounts.
            </p>
          </div>
        )}
        {isDesktop && <div />}
        <button
          onClick={() => navigate('/accounts/connect')}
          className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90 active:scale-[0.98]"
        >
          <Plus className="h-4 w-4" />
          Connect Account
        </button>
      </div>

      {isLoading ? (
        <div className="flex h-40 items-center justify-center rounded-xl border border-border border-dashed bg-card/50">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      ) : accounts?.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-xl border border-border border-dashed bg-card/50 py-12 text-center">
          <p className="text-muted-foreground">No accounts connected yet.</p>
          <button
            onClick={() => navigate('/accounts/connect')}
            className="mt-4 text-sm font-medium text-primary hover:underline"
          >
            Connect your first account
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {accounts?.map((account) => {
            return (
              <div
                key={account.id}
                className="group relative flex flex-col justify-center items-center gap-3 rounded-2xl border border-border/60 bg-card p-6 text-center transition-all hover:border-primary/40 hover:shadow-lg hover:shadow-primary/5 cursor-pointer"
              >
                {/* Status Dot */}
                <div
                  className={`absolute top-4 right-4 h-2 w-2 rounded-full ${account.sessionStatus === 'active' ? 'bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.5)]' : 'bg-destructive'}`}
                  title={`Status: ${account.sessionStatus}`}
                />

                {/* Logo Placeholder */}
                <div className="flex h-14 w-14 items-center justify-center rounded-full bg-primary/10 text-xl font-bold text-primary ring-4 ring-background">
                  {getInitials(account.supplierData?.name || account.email)}
                </div>

                <div className="w-full">
                  <h3 className="font-semibold text-foreground truncate">
                    {account.supplierData?.name || account.email}
                  </h3>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
