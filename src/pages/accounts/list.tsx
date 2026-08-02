import { useState } from 'react';
import { useNavigate } from 'react-router';
import { toast } from 'sonner';
import {
  Plus,
  Loader2,
  RefreshCw,
  Pencil,
  Trash2,
  Eye,
  ShieldCheck,
  ShieldAlert,
  Zap,
  Store,
} from 'lucide-react';
import { useAccounts, useUpdateAccount, useRetryLogin } from '@/hooks/use-accounts';
import { useAccountsTransmit } from '@/hooks/use-accounts-transmit';
import type { MarketplaceAccount } from '@/types';
import { EditAccountDialog } from '@/components/accounts/edit-account-dialog';
import { DeleteAccountDialog } from '@/components/accounts/delete-account-dialog';
import { AccountDetailsDialog } from '@/components/accounts/account-details-dialog';

function getInitials(name?: string) {
  if (!name) return 'MK';
  return name.substring(0, 2).toUpperCase();
}

export default function AccountsListPage() {
  const navigate = useNavigate();
  const { data: accounts, isLoading } = useAccounts();
  const { mutate: retryLogin } = useRetryLogin();
  const { mutate: updateAccount } = useUpdateAccount();

  // Connect Transmit SSE for real-time session reconnection & status updates
  useAccountsTransmit();

  const [reconnectingId, setReconnectingId] = useState<string | number | null>(null);
  const [togglingAutoAcceptId, setTogglingAutoAcceptId] = useState<string | number | null>(null);
  const [selectedAccountForDetails, setSelectedAccountForDetails] = useState<MarketplaceAccount | null>(null);
  const [selectedAccountForEdit, setSelectedAccountForEdit] = useState<MarketplaceAccount | null>(null);
  const [selectedAccountForDelete, setSelectedAccountForDelete] = useState<MarketplaceAccount | null>(null);

  const handleReconnect = (account: MarketplaceAccount) => {
    setReconnectingId(account.id);
    retryLogin(account.id, {
      onSuccess: () => {
        toast.info(`Session sync initiated for ${account.supplierData?.name || account.email}`, {
          description: 'Waiting for live status update via SSE...',
        });
      },
      onError: (err: Error) => {
        toast.error(err.message || 'Failed to re-initiate login session');
        setReconnectingId(null);
      },
    });
  };

  const handleToggleAutoAccept = (account: MarketplaceAccount) => {
    const nextState = account.autoAcceptOrders === false ? true : false;
    setTogglingAutoAcceptId(account.id);

    updateAccount(
      { id: account.id, data: { autoAcceptOrders: nextState } },
      {
        onSuccess: () => {
          toast.success(
            `Auto Accept Orders ${nextState ? 'enabled' : 'disabled'} for ${account.supplierData?.name || account.email}`,
          );
          setTogglingAutoAcceptId(null);
        },
        onError: (err: Error) => {
          toast.error(err.message || 'Failed to update auto accept setting');
          setTogglingAutoAcceptId(null);
        },
      },
    );
  };

  return (
    <div className="space-y-6 pb-8">
      {/* Header Section */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-2xl font-bold tracking-tight">Marketplace Accounts</h1>
            {accounts && accounts.length > 0 && (
              <span className="inline-flex items-center rounded-full bg-primary/10 px-2.5 py-0.5 text-xs font-semibold text-primary">
                {accounts.length} {accounts.length === 1 ? 'Account' : 'Accounts'}
              </span>
            )}
          </div>
          <p className="mt-1 text-sm text-muted-foreground">
            Manage connected seller accounts, auto-accept settings, and live session status.
          </p>
        </div>

        <button
          type="button"
          onClick={() => navigate('/accounts/connect')}
          className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-primary px-5 text-sm font-semibold text-primary-foreground shadow-sm transition-all hover:bg-primary/90 active:scale-[0.98] cursor-pointer"
        >
          <Plus className="h-4 w-4" />
          Connect Account
        </button>
      </div>

      {/* Main Content Area */}
      {isLoading ? (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {[1, 2, 3, 4].map((i) => (
            <div
              key={i}
              className="flex h-52 flex-col justify-between rounded-2xl border border-border/60 bg-card p-6 shadow-xs animate-pulse"
            >
              <div className="flex items-center gap-4">
                <div className="h-12 w-12 rounded-2xl bg-muted" />
                <div className="space-y-2 flex-1">
                  <div className="h-4 w-3/4 rounded-md bg-muted" />
                  <div className="h-3 w-1/2 rounded-md bg-muted" />
                </div>
              </div>
              <div className="space-y-2 pt-4">
                <div className="h-8 w-full rounded-xl bg-muted" />
              </div>
            </div>
          ))}
        </div>
      ) : !accounts || accounts.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-border/80 bg-card/40 py-16 px-4 text-center">
          <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/10 text-primary mb-4 ring-8 ring-primary/5">
            <Store className="h-8 w-8" />
          </div>
          <h3 className="text-lg font-bold text-foreground">No Connected Accounts</h3>
          <p className="mt-1 text-sm text-muted-foreground max-w-sm">
            Connect your Meesho seller account to start syncing products, orders, and managing return delivery OTPs.
          </p>
          <button
            type="button"
            onClick={() => navigate('/accounts/connect')}
            className="mt-6 inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-primary px-5 text-sm font-semibold text-primary-foreground shadow-xs transition-all hover:bg-primary/90 active:scale-[0.98] cursor-pointer"
          >
            <Plus className="h-4 w-4" />
            Connect Your First Account
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {accounts.map((account) => {
            const isSessionPending = account.sessionStatus === 'pending';
            const isActive = account.sessionStatus === 'active' && !isSessionPending;
            const isReconnectingThis = reconnectingId === account.id || isSessionPending;
            const isAutoAcceptEnabled = account.autoAcceptOrders !== false;
            const isTogglingAutoAccept = togglingAutoAcceptId === account.id;

            return (
              <div
                key={account.id}
                className="group relative flex flex-col justify-between rounded-2xl border border-border/60 bg-card p-5 transition-all duration-200 hover:border-primary/40 hover:shadow-lg hover:shadow-primary/5"
              >
                {/* Card Header: Avatar & Branding */}
                <div
                  onClick={() => setSelectedAccountForDetails(account)}
                  className="flex items-center gap-3.5 cursor-pointer"
                >
                  <div className="relative shrink-0">
                    <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/10 text-base font-bold text-primary ring-4 ring-background transition-transform group-hover:scale-105">
                      {getInitials(account.supplierData?.name || account.email)}
                    </div>
                    {isReconnectingThis ? (
                      <span className="absolute -bottom-0.5 -right-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-amber-500 text-white shadow-sm ring-2 ring-background">
                        <RefreshCw className="h-2.5 w-2.5 animate-spin" />
                      </span>
                    ) : (
                      <span
                        className={`absolute -bottom-0.5 -right-0.5 h-3.5 w-3.5 rounded-full border-2 border-background ${
                          isActive ? 'bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.6)]' : 'bg-rose-500'
                        }`}
                        title={`Status: ${account.sessionStatus}`}
                      />
                    )}
                  </div>

                  <div className="min-w-0 flex-1">
                    <h3 className="font-bold text-foreground text-sm tracking-tight truncate group-hover:text-primary transition-colors">
                      {account.supplierData?.name || account.email}
                    </h3>
                    <p className="text-xs text-muted-foreground truncate">{account.email}</p>
                  </div>
                </div>

                {/* Card Middle: Session Status & Dedicated Auto Accept Toggle */}
                <div className="my-4 space-y-3">
                  {/* Status Indicator */}
                  <div className="flex items-center justify-between text-xs rounded-xl bg-muted/30 p-2.5 border border-border/40">
                    <span className="text-muted-foreground font-medium">Session Status</span>
                    <span
                      className={`inline-flex items-center gap-1.5 font-semibold ${
                        isReconnectingThis
                          ? 'text-amber-600 dark:text-amber-400'
                          : isActive
                          ? 'text-emerald-600 dark:text-emerald-400'
                          : 'text-rose-600 dark:text-rose-400'
                      }`}
                    >
                      {isReconnectingThis ? (
                        <>
                          <RefreshCw className="h-3.5 w-3.5 animate-spin text-amber-500" />
                          <span>Syncing...</span>
                        </>
                      ) : isActive ? (
                        <>
                          <ShieldCheck className="h-3.5 w-3.5" />
                          <span>Active</span>
                        </>
                      ) : (
                        <>
                          <ShieldAlert className="h-3.5 w-3.5" />
                          <span>Failed</span>
                        </>
                      )}
                    </span>
                  </div>

                  {/* Dedicated Auto Accept Toggle Button */}
                  <div className="flex items-center justify-between text-xs rounded-xl border border-border/50 bg-card p-2.5">
                    <div className="flex items-center gap-2">
                      <Zap
                        className={`h-4 w-4 ${
                          isAutoAcceptEnabled ? 'text-amber-500 fill-amber-500' : 'text-muted-foreground'
                        }`}
                      />
                      <span className="font-medium text-foreground">Auto Accept Orders</span>
                    </div>

                    <button
                      type="button"
                      disabled={isTogglingAutoAccept}
                      onClick={() => handleToggleAutoAccept(account)}
                      className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-hidden disabled:opacity-50 ${
                        isAutoAcceptEnabled ? 'bg-primary' : 'bg-muted-foreground/30'
                      }`}
                      title={isAutoAcceptEnabled ? 'Disable Auto Accept' : 'Enable Auto Accept'}
                    >
                      {isTogglingAutoAccept ? (
                        <span className="absolute inset-0 flex items-center justify-center">
                          <Loader2 className="h-3 w-3 animate-spin text-white" />
                        </span>
                      ) : (
                        <span
                          className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-lg ring-0 transition duration-200 ease-in-out ${
                            isAutoAcceptEnabled ? 'translate-x-5' : 'translate-x-0'
                          }`}
                        />
                      )}
                    </button>
                  </div>
                </div>

                {/* Card Footer: Direct Action Toolbar */}
                <div className="flex items-center gap-2 pt-2 border-t border-border/60">
                  <button
                    type="button"
                    onClick={() => setSelectedAccountForDetails(account)}
                    className="h-10 w-10 shrink-0 rounded-xl border border-border/80 bg-background text-foreground hover:bg-muted transition-colors flex items-center justify-center active:scale-95 cursor-pointer"
                    title="View Account Details"
                  >
                    <Eye className="h-4 w-4 text-muted-foreground" />
                  </button>

                  <button
                    type="button"
                    onClick={() => handleReconnect(account)}
                    disabled={isReconnectingThis}
                    className="flex-1 h-10 rounded-xl border border-border/80 bg-background text-xs font-semibold text-foreground hover:bg-muted transition-colors flex items-center justify-center gap-1.5 active:scale-[0.98] cursor-pointer"
                    title="Re-test session login"
                  >
                    <RefreshCw
                      className={`h-3.5 w-3.5 ${isReconnectingThis ? 'animate-spin text-primary' : 'text-muted-foreground'}`}
                    />
                    <span>{isReconnectingThis ? 'Syncing...' : 'Sync'}</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setSelectedAccountForEdit(account)}
                    className="h-10 w-10 shrink-0 rounded-xl bg-primary/10 hover:bg-primary/20 text-primary transition-colors flex items-center justify-center active:scale-95 cursor-pointer"
                    title="Edit account credentials"
                  >
                    <Pencil className="h-4 w-4" />
                  </button>

                  <button
                    type="button"
                    onClick={() => setSelectedAccountForDelete(account)}
                    className="h-10 w-10 shrink-0 rounded-xl border border-destructive/20 bg-destructive/10 hover:bg-destructive/20 text-destructive transition-colors flex items-center justify-center active:scale-95 cursor-pointer"
                    title="Delete account"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Account Details Dialog/Sheet */}
      <AccountDetailsDialog
        open={!!selectedAccountForDetails}
        onOpenChange={(open) => !open && setSelectedAccountForDetails(null)}
        account={selectedAccountForDetails}
        onEdit={() => {
          setSelectedAccountForEdit(selectedAccountForDetails);
        }}
        onDelete={() => {
          setSelectedAccountForDelete(selectedAccountForDetails);
        }}
        onReconnect={() => {
          if (selectedAccountForDetails) handleReconnect(selectedAccountForDetails);
        }}
        isReconnecting={reconnectingId === selectedAccountForDetails?.id}
      />

      {/* Edit Account Dialog/Sheet */}
      <EditAccountDialog
        open={!!selectedAccountForEdit}
        onOpenChange={(open) => !open && setSelectedAccountForEdit(null)}
        account={selectedAccountForEdit}
      />

      {/* Delete Account Dialog/Sheet */}
      <DeleteAccountDialog
        open={!!selectedAccountForDelete}
        onOpenChange={(open) => !open && setSelectedAccountForDelete(null)}
        account={selectedAccountForDelete}
      />
    </div>
  );
}
