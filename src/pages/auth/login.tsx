import { useState } from 'react';
import { useNavigate, Navigate } from 'react-router';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { ROUTES } from '@/constants/routes';
import { Eye, EyeOff, Mail, Lock, ShieldAlert, Loader2 } from 'lucide-react';
import { useAuthStore } from '@/store/auth.store';
import { api, setTokens } from '@/lib/api-client';
import { toast } from 'sonner';
import type { User } from '@/types';

const loginSchema = z.object({
  email: z.string().min(1, 'Email is required').email('Invalid email address'),
  password: z.string().min(1, 'Password is required'),
});

type LoginFormValues = z.infer<typeof loginSchema>;

export default function LoginPage() {
  const [showPassword, setShowPassword] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);

  const navigate = useNavigate();
  const { setUser, isAuthenticated } = useAuthStore();

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: '',
      password: '',
    },
  });

  // If already authenticated, redirect immediately to dashboard
  if (isAuthenticated) {
    return <Navigate to={ROUTES.DASHBOARD} replace />;
  }

  const onSubmit = async (values: LoginFormValues) => {
    setServerError(null);

    try {
      const response = await api.post<{
        message: string;
        data: { user: User; accessToken: string; refreshToken: string };
      }>('/login', values);

      // Store tokens for Authorization header (Safari/Capacitor can't use cookies)
      if (response.data.accessToken && response.data.refreshToken) {
        setTokens(response.data.accessToken, response.data.refreshToken);
      }

      setUser(response.data.user);
      toast.success('Successfully logged in.');
      navigate(ROUTES.DASHBOARD);
    } catch (err: unknown) {
      console.error(err);
      const errorMessage =
        err instanceof Error ? err.message : 'Invalid credentials or connection issue.';
      setServerError(errorMessage);
      toast.error('Authentication failed.');
    }
  };

  return (
    <div className="relative flex min-h-dvh items-center justify-center bg-radial from-slate-900 via-slate-950 to-black p-4 overflow-hidden">
      {/* Dynamic Background Elements */}
      <div className="absolute top-[-10%] left-[-10%] h-[500px] w-[500px] rounded-full bg-primary/10 blur-[120px] pointer-events-none" />
      <div className="absolute bottom-[-10%] right-[-10%] h-[500px] w-[500px] rounded-full bg-emerald-500/5 blur-[120px] pointer-events-none" />

      <div className="relative w-full max-w-md space-y-8 bg-slate-950/40 backdrop-blur-xl border border-slate-800/80 p-8 md:p-10 rounded-2xl shadow-2xl">
        {/* Brand Header */}
        <div className="text-center space-y-2.5">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-tr from-primary to-indigo-600 shadow-lg shadow-primary/30 text-xl font-bold text-white transition-transform hover:scale-105 duration-300">
            E
          </div>
          <h1 className="text-3xl font-extrabold tracking-tight text-white bg-clip-text">
            Ecom Manager
          </h1>
          <p className="text-sm text-slate-400">Internal Commerce Operations Platform</p>
        </div>

        {/* Error Alert Box */}
        {serverError && (
          <div className="flex items-start gap-3 rounded-xl bg-rose-500/10 border border-rose-500/20 p-4 text-sm text-rose-200 animate-in fade-in slide-in-from-top-2 duration-200">
            <ShieldAlert className="h-5 w-5 shrink-0 text-rose-400 mt-0.5" />
            <div className="space-y-1">
              <span className="font-semibold">Authentication Error</span>
              <p className="text-rose-300/95 leading-relaxed">{serverError}</p>
            </div>
          </div>
        )}

        {/* Login Form */}
        <form className="space-y-6" onSubmit={handleSubmit(onSubmit)} noValidate>
          {/* Email Input */}
          <div className="space-y-2">
            <label
              htmlFor="email"
              className="text-xs font-semibold uppercase tracking-wider text-slate-400"
            >
              Email Address
            </label>
            <div className="relative group">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-500 group-focus-within:text-primary transition-colors" />
              <input
                id="email"
                type="email"
                {...register('email')}
                placeholder="name@company.com"
                autoComplete="email"
                className="h-12 w-full rounded-xl border border-slate-800 bg-slate-900/50 pl-11 pr-4 text-sm text-white placeholder:text-slate-600 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all"
              />
            </div>
            {errors.email && <p className="text-xs text-rose-400">{errors.email.message}</p>}
          </div>

          {/* Password Input */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label
                htmlFor="password"
                className="text-xs font-semibold uppercase tracking-wider text-slate-400"
              >
                Password
              </label>
            </div>
            <div className="relative group">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-500 group-focus-within:text-primary transition-colors" />
              <input
                id="password"
                type={showPassword ? 'text' : 'password'}
                {...register('password')}
                placeholder="••••••••"
                autoComplete="current-password"
                className="h-12 w-full rounded-xl border border-slate-800 bg-slate-900/50 pl-11 pr-12 text-sm text-white placeholder:text-slate-600 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute h-full aspect-square right-0 top-0 flex items-center justify-center text-slate-500 hover:text-white transition-colors"
              >
                {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
              </button>
            </div>
            {errors.password && <p className="text-xs text-rose-400">{errors.password.message}</p>}
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            disabled={isSubmitting}
            className="flex h-12 w-full items-center justify-center rounded-xl bg-gradient-to-r from-primary to-indigo-600 hover:from-primary/95 hover:to-indigo-500 active:scale-[0.99] text-sm font-semibold text-white shadow-lg shadow-primary/20 transition-all duration-150 disabled:opacity-50 disabled:pointer-events-none cursor-pointer"
          >
            {isSubmitting ? <Loader2 className="h-5 w-5 animate-spin" /> : 'Sign In to Dashboard'}
          </button>
        </form>

        <div className="pt-2 text-center text-[10px] text-slate-600 tracking-wider uppercase font-semibold">
          Secure Multi-Channel Node — Node Auth Enabled
        </div>
      </div>
    </div>
  );
}
