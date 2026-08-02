import { useState } from 'react';
import { useNavigate } from 'react-router';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useAddAccount } from '@/hooks/use-accounts';
import { useIsDesktop } from '@/hooks/use-media-query';
import { Loader2 } from 'lucide-react';

const connectSchema = z.object({
  email: z.string().min(1, 'Email is required').email('Invalid email address'),
  password: z.string().min(1, 'Password is required'),
});

type ConnectFormValues = z.infer<typeof connectSchema>;

export default function AccountConnectPage() {
  const navigate = useNavigate();
  const isDesktop = useIsDesktop();
  const { mutate: addAccount, isPending } = useAddAccount();
  const [error, setError] = useState('');

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<ConnectFormValues>({
    resolver: zodResolver(connectSchema),
    defaultValues: {
      email: '',
      password: '',
    },
  });

  const onSubmit = (values: ConnectFormValues) => {
    setError('');

    addAccount(
      { email: values.email, password: values.password, provider: 'meesho' },
      {
        onSuccess: () => {
          navigate('/accounts');
        },
        onError: (err: Error) => {
          setError(err.message || 'Failed to connect account');
        },
      },
    );
  };

  return (
    <div className={`mx-auto max-w-md space-y-6 ${isDesktop ? 'pt-2' : 'pt-10'}`}>
      {!isDesktop && (
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Connect Meesho Account</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Connect your Meesho seller account to start managing your listings.
          </p>
        </div>
      )}

      <form
        onSubmit={handleSubmit(onSubmit)}
        noValidate
        className="space-y-4 rounded-xl border border-border bg-card p-6 shadow-sm"
      >
        {error && (
          <div className="rounded-lg bg-destructive/10 p-3 text-sm text-destructive">{error}</div>
        )}

        <div className="space-y-2">
          <label className="text-sm font-medium" htmlFor="email">
            Email
          </label>
          <input
            id="email"
            type="email"
            {...register('email')}
            className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
            placeholder="seller@example.com"
          />
          {errors.email && <p className="text-xs text-destructive">{errors.email.message}</p>}
        </div>

        <div className="space-y-2">
          <label className="text-sm font-medium" htmlFor="password">
            Password
          </label>
          <input
            id="password"
            type="password"
            {...register('password')}
            className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
            placeholder="Enter your password"
          />
          {errors.password && <p className="text-xs text-destructive">{errors.password.message}</p>}
        </div>

        <button
          type="submit"
          disabled={isPending}
          className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-lg bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90 disabled:opacity-50"
        >
          {isPending ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              Connecting...
            </>
          ) : (
            'Connect Account'
          )}
        </button>
      </form>
    </div>
  );
}
