import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Mail, Lock } from 'lucide-react';
import { authApi } from '../../features/auth/api/auth.api';
import { useAuthStore } from '../../store/auth.store';
import { ROUTES } from '../../lib/constants';
import axiosInstance from '../../lib/axios';

const loginSchema = z.object({
  email: z.string().email('Invalid email'),
  password: z.string().min(1, 'Password is required'),
});

const forgotSchema = z.object({
  email: z.string().email('Invalid email'),
});

type LoginFormValues = z.infer<typeof loginSchema>;
type ForgotFormValues = z.infer<typeof forgotSchema>;

export default function LoginPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  
  const [view, setView] = useState<'login' | 'forgot'>('login');
  const [apiError, setApiError] = useState('');
  const [forgotSuccess, setForgotSuccess] = useState(false);

  // FIX GAP 3: Nếu user click link từ email chứa ?token=xyz, tự động nhảy sang view forgot để không bị kẹt
  useEffect(() => {
    if (searchParams.get('token')) {
      setView('forgot');
    }
  }, [searchParams]);

  const {
    register: registerLogin,
    handleSubmit: handleLoginSubmit,
    formState: { errors: loginErrors, isSubmitting: isLoginSubmitting },
  } = useForm<LoginFormValues>({ resolver: zodResolver(loginSchema) });

  const {
    register: registerForgot,
    handleSubmit: handleForgotSubmit,
    formState: { errors: forgotErrors, isSubmitting: isForgotSubmitting },
    reset: resetForgotForm,
  } = useForm<ForgotFormValues>({ resolver: zodResolver(forgotSchema) });

  const onLoginSubmit = async (data: LoginFormValues) => {
    try {
      setApiError('');
      const res = await authApi.login(data);
      const { user, accessToken, refreshToken } = res.data;
      useAuthStore.getState().setAuth(user, accessToken, refreshToken);
      navigate(ROUTES.DASHBOARD);
    } catch (error: any) {
      setApiError(error.message || 'Sign in failed. Please try again.');
    }
  };

  const onForgotSubmit = async (data: ForgotFormValues) => {
    try {
      setApiError('');
      setForgotSuccess(false);
      await axiosInstance.post('/auth/forgot-password', data);
      setForgotSuccess(true);
    } catch (error: any) {
      setApiError(error.message || 'Request failed. Please try again.');
    }
  };

  const switchToForgot = () => {
    setView('forgot');
    setApiError('');
    setForgotSuccess(false);
    resetForgotForm();
  };

  const switchToLogin = () => {
    setView('login');
    setApiError('');
    setForgotSuccess(false);
  };

  // Class chung cho Input chuẩn Glass effect
  const inputClass = "w-full rounded-xl border border-white/10 bg-white/5 p-3 pl-10 text-base text-white placeholder-gray-400 focus:border-brand-green focus:outline-none focus:ring-2 focus:ring-brand-green";

  return (
    <section className="flex min-h-screen items-center justify-center bg-navy px-4 [filter:saturate(150%)]">
      {/* Glassmorphism Card chuẩn bản cũ */}
      <div className="w-[480px] max-w-[95vw] rounded-3xl border border-white/20 bg-white/10 p-8 shadow-lg shadow-[0_8px_32px_rgba(31,38,135,0.37)] backdrop-blur-[30px]">
        
        {/* === VIEW LOGIN === */}
        {view === 'login' && (
          <>
            <div className="mb-8 text-center">
              <h1 className="text-2xl font-bold text-white">Welcome back</h1>
              <p className="mt-2 text-sm text-gray-300">Sign in to continue</p>
            </div>

            {apiError && (
              <div className="mb-4 rounded-lg bg-red-500/20 border border-red-400/30 p-3 text-sm text-red-300">{apiError}</div>
            )}

            <form onSubmit={handleLoginSubmit(onLoginSubmit)} className="space-y-5">
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-gray-400" />
                <input type="email" placeholder="email@example.com" className={inputClass} style={{ fontSize: '16px' }} {...registerLogin('email')} />
                {loginErrors.email && <p className="mt-1 text-xs text-red-400">{loginErrors.email.message}</p>}
              </div>

              <div>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-gray-400" />
                  <input type="password" placeholder="Password" className={inputClass} style={{ fontSize: '16px' }} {...registerLogin('password')} />
                  <button type="button" onClick={switchToForgot} className="absolute right-3 top-1/2 -translate-y-1/2 text-sm font-medium text-[#22c55e] hover:underline">
                    Forgot password?
                  </button>
                </div>
                {loginErrors.password && <p className="mt-1 text-xs text-red-400">{loginErrors.password.message}</p>}
              </div>

              <button type="submit" disabled={isLoginSubmitting} className="w-full rounded-xl bg-brand-green py-3 font-semibold text-white transition-all duration-300 hover:scale-105 hover:bg-green-600 disabled:cursor-not-allowed disabled:opacity-70 disabled:hover:scale-100">
                {isLoginSubmitting ? 'Signing in...' : 'Sign in'}
              </button>
            </form>

            <p className="mt-6 text-center text-sm text-gray-300">
              Don't have an account?{' '}
              <a href={ROUTES.REGISTER} className="font-medium text-[#22c55e] hover:underline">Sign up</a>
            </p>
          </>
        )}

        {/* === VIEW FORGOT === */}
        {view === 'forgot' && (
          <>
            <div className="mb-8 text-center">
              <h1 className="text-2xl font-bold text-white">Forgot password</h1>
              <p className="mt-2 text-sm text-gray-300">Enter your email to receive a reset link</p>
            </div>

            {apiError && (
              <div className="mb-4 rounded-lg bg-red-500/20 border border-red-400/30 p-3 text-sm text-red-300">{apiError}</div>
            )}
            {forgotSuccess && (
              <div className="mb-4 rounded-lg bg-green-500/20 border border-green-400/30 p-3 text-sm text-green-300">
                Reset link sent. Please check your email.
              </div>
            )}

            <form onSubmit={handleForgotSubmit(onForgotSubmit)} className="space-y-5">
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-gray-400" />
                <input type="email" placeholder="email@example.com" className={inputClass} style={{ fontSize: '16px' }} {...registerForgot('email')} />
                {forgotErrors.email && <p className="mt-1 text-xs text-red-400">{forgotErrors.email.message}</p>}
              </div>

              <button type="submit" disabled={isForgotSubmitting || forgotSuccess} className="w-full rounded-xl bg-brand-green py-3 font-semibold text-white transition-all duration-300 hover:scale-105 hover:bg-green-600 disabled:cursor-not-allowed disabled:opacity-70 disabled:hover:scale-100">
                {isForgotSubmitting ? 'Sending...' : 'Send reset link'}
              </button>
            </form>

            <div className="mt-6 text-center">
              <button type="button" onClick={switchToLogin} className="text-sm font-medium text-gray-300 hover:underline">
                Back to sign in
              </button>
            </div>
          </>
        )}

      </div>
    </section>
  );
}