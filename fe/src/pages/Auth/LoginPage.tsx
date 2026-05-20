import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Mail, Lock, Eye, EyeOff } from 'lucide-react';
import { authApi } from '../../features/auth/api/auth.api';
import { useAuthStore } from '../../store/auth.store';
import { ROUTES } from '../../lib/constants';
import axiosInstance from '../../lib/axios';

const loginSchema = z.object({
  email: z.string().email('Invalid email'),
  password: z.string().min(1, 'Password is required'),
  rememberMe: z.boolean().optional(),
});

const forgotSchema = z.object({
  email: z.string().email('Invalid email'),
});

type LoginFormValues = z.infer<typeof loginSchema>;
type ForgotFormValues = z.infer<typeof forgotSchema>;

function GoogleIcon() {
  return (
    <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
      <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
      <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" fill="#FBBC05"/>
      <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
    </svg>
  );
}



export default function LoginPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const [view, setView] = useState<'login' | 'forgot'>('login');
  const [apiError, setApiError] = useState('');
  const [forgotSuccess, setForgotSuccess] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  // Protective Layer chống spam đăng nhập
  const [failedAttempts, setFailedAttempts] = useState(0);
  const [lockoutTime, setLockoutTime] = useState<number | null>(null);

  // Đếm ngược thời gian khoá
  useEffect(() => {
    let timer: ReturnType<typeof setInterval>;
    if (lockoutTime !== null && lockoutTime > 0) {
      timer = setInterval(() => {
        setLockoutTime((prev) => (prev !== null ? prev - 1 : null));
      }, 1000);
    } else if (lockoutTime === 0) {
      setLockoutTime(null);
      setFailedAttempts(0);
    }
    return () => clearInterval(timer);
  }, [lockoutTime]);

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
    // Chặn request nếu đang bị khoá
    if (lockoutTime !== null) return;

    setApiError('');

    // Hàm helper chạy bất đồng bộ lồng bên trong, sử dụng đệ quy có giới hạn
    // để quản lý số lần thử lại (Tối đa 3 lần retry ngầm, tương đương tổng 4 lần gửi bao gồm lần đầu)
    const executeLoginWithRetry = async (attempt: number): Promise<void> => {
      try {
        const res = await authApi.login(data);
        
        // Request thành công: reset các trạng thái lỗi/spam
        setFailedAttempts(0);
        setLockoutTime(null);

        const { user, accessToken, refreshToken } = res.data;
        useAuthStore.getState().setAuth(user, accessToken, refreshToken);
        navigate(ROUTES.DASHBOARD);
      } catch (error: any) {
        // PHÂN TÁCH LUỒNG LOGIC XỬ LÝ LỖI:
        // 1. Kiểm tra chính xác lỗi có phải do quá hạn (Timeout) hoặc mất kết nối mạng hay không
        const isTimeout = error.message === 'Request timeout';
        const isNetworkError = error.code === 'ERR_NETWORK' || error.message === 'Network Error' || !error.response;

        // 2. Logic Retry chỉ kích hoạt khi xác định chính xác lỗi mạng/timeout và chưa vượt quá số lần thử tối đa
        if ((isTimeout || isNetworkError) && attempt < 3) {
          // Tiến hành checkHealth ngầm để gửi tín hiệu đánh thức máy chủ (Health Check Polling)
          await authApi.checkHealth();

          // Khởi tạo Promise trì hoãn bắt luồng xử lý dừng lại đúng 4000ms trước khi thử lại
          await new Promise((resolve) => setTimeout(resolve, 4000));

          // Đệ quy thực hiện lượt gửi request tiếp theo
          return executeLoginWithRetry(attempt + 1);
        }

        // 3. Nếu toàn bộ lượt Retry đều thất bại hoặc gặp lỗi nghiệp vụ thông thường (400, 401, 403, 422)
        if (isTimeout || isNetworkError) {
          // Gán thông báo lỗi kết nối cuối cùng lên màn hình
          setApiError('Connection failed. Please try again.');
        } else {
          // Các lỗi nghiệp vụ khác được trả về ngay lập tức để xử lý cục bộ
          // Tăng số lần thử thất bại
          const newFailedAttempts = failedAttempts + 1;
          setFailedAttempts(newFailedAttempts);
          
          if (newFailedAttempts >= 5) {
            setLockoutTime(30);
            setApiError('Too many attempts. Wait 30s.');
          } else {
            setApiError(error.message || 'Sign in failed. Please try again.');
          }
        }
      }
    };

    // Kích hoạt tiến trình gửi request đầu tiên (attempt = 0)
    await executeLoginWithRetry(0);
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

  const inputClass =
    'w-full rounded-xl border border-slate-200 bg-white px-4 py-3 pl-11 text-base text-[#0f1f3d] placeholder:text-slate-400 focus:border-[#10b981] focus:outline-none focus:ring-2 focus:ring-[#10b981]/20 transition-all duration-200';

  return (
    <div className="w-full">
      {/* === VIEW LOGIN === */}
      {view === 'login' && (
        <>
          <div className="mb-8">
            <h1 className="text-2xl font-bold text-foreground">Welcome back</h1>
            <p className="mt-1.5 text-sm text-muted-foreground">Sign in to your Finman account to continue</p>
          </div>

          {apiError && (
            <div className="mb-5 rounded-xl bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-600 dark:bg-red-500/10 dark:border-red-500/20 dark:text-red-400">
              {apiError}
            </div>
          )}

          <form onSubmit={handleLoginSubmit(onLoginSubmit)} className="space-y-4">
            {/* Email */}
            <div>
              <label className="mb-1.5 block text-sm font-medium text-foreground">Email address</label>
              <div className="relative">
                <Mail className="absolute left-3.5 top-1/2 h-4.5 w-4.5 -translate-y-1/2 text-muted-foreground" />
                <input
                  type="email"
                  placeholder="you@example.com"
                  className={inputClass}
                  style={{ fontSize: '16px' }}
                  {...registerLogin('email')}
                />
              </div>
              {loginErrors.email && (
                <p className="mt-1 text-xs text-red-500">{loginErrors.email.message}</p>
              )}
            </div>

            {/* Password */}
            <div>
              <label className="mb-1.5 block text-sm font-medium text-foreground">Password</label>
              <div className="relative">
                <Lock className="absolute left-3.5 top-1/2 h-4.5 w-4.5 -translate-y-1/2 text-muted-foreground" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  placeholder="Enter your password"
                  className={inputClass}
                  style={{ fontSize: '16px' }}
                  {...registerLogin('password')}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              {loginErrors.password && (
                <p className="mt-1 text-xs text-red-500">{loginErrors.password.message}</p>
              )}
            </div>

            {/* Remember me + Forgot password */}
            <div className="flex items-center justify-between">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  className="w-4 h-4 rounded border-border accent-[#10b981] cursor-pointer"
                  {...registerLogin('rememberMe')}
                />
                <span className="text-sm text-muted-foreground">Remember me</span>
              </label>
              <button
                type="button"
                onClick={switchToForgot}
                className="text-sm font-medium text-[#10b981] hover:text-[#059669] transition-colors"
              >
                Forgot password?
              </button>
            </div>

            {/* Submit */}
            <button
              type="submit"
              disabled={isLoginSubmitting || lockoutTime !== null}
              className="w-full rounded-xl bg-[#10b981] py-3 font-semibold text-white transition-all duration-200 hover:bg-[#059669] disabled:cursor-not-allowed disabled:opacity-70 mt-2"
            >
              {lockoutTime !== null
                ? `Try again in ${lockoutTime}s`
                : isLoginSubmitting
                ? 'Signing in...'
                : 'Sign In'}
            </button>
          </form>

          {/* OR Divider */}
          <div className="my-6 flex items-center gap-4">
            <div className="h-px flex-1 bg-border" />
            <span className="text-xs font-medium text-muted-foreground uppercase tracking-widest">or</span>
            <div className="h-px flex-1 bg-border" />
          </div>

          {/* Social Logins */}
          <div className="space-y-3">
            <button
              type="button"
              className="w-full flex items-center justify-center gap-3 rounded-xl border border-border bg-background py-3 text-sm font-medium text-foreground hover:bg-muted transition-colors duration-200"
            >
              <GoogleIcon />
              Sign in with Google
            </button>

          </div>

          {/* Sign up link */}
          <p className="mt-8 text-center text-sm text-muted-foreground">
            Don&apos;t have an account?{' '}
            <Link to={ROUTES.REGISTER} className="font-semibold text-[#10b981] hover:text-[#059669] transition-colors">
              Sign up
            </Link>
          </p>
        </>
      )}

      {/* === VIEW FORGOT === */}
      {view === 'forgot' && (
        <>
          <div className="mb-8">
            <h1 className="text-2xl font-bold text-foreground">Reset password</h1>
            <p className="mt-1.5 text-sm text-muted-foreground">
              Enter your email and we&apos;ll send you a reset link.
            </p>
          </div>

          {apiError && (
            <div className="mb-5 rounded-xl bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-600 dark:bg-red-500/10 dark:border-red-500/20 dark:text-red-400">
              {apiError}
            </div>
          )}
          {forgotSuccess && (
            <div className="mb-5 rounded-xl bg-green-50 border border-green-200 px-4 py-3 text-sm text-green-700 dark:bg-green-500/10 dark:border-green-500/20 dark:text-green-400">
              Reset link sent — please check your inbox.
            </div>
          )}

          <form onSubmit={handleForgotSubmit(onForgotSubmit)} className="space-y-4">
            <div>
              <label className="mb-1.5 block text-sm font-medium text-foreground">Email address</label>
              <div className="relative">
                <Mail className="absolute left-3.5 top-1/2 h-4.5 w-4.5 -translate-y-1/2 text-muted-foreground" />
                <input
                  type="email"
                  placeholder="you@example.com"
                  className={inputClass}
                  style={{ fontSize: '16px' }}
                  {...registerForgot('email')}
                />
              </div>
              {forgotErrors.email && (
                <p className="mt-1 text-xs text-red-500">{forgotErrors.email.message}</p>
              )}
            </div>

            <button
              type="submit"
              disabled={isForgotSubmitting || forgotSuccess}
              className="w-full rounded-xl bg-[#10b981] py-3 font-semibold text-white transition-all duration-200 hover:bg-[#059669] disabled:cursor-not-allowed disabled:opacity-70"
            >
              {isForgotSubmitting ? 'Sending...' : 'Send reset link'}
            </button>
          </form>

          <div className="mt-6 text-center">
            <button
              type="button"
              onClick={switchToLogin}
              className="text-sm font-medium text-[#10b981] hover:text-[#059669] transition-colors"
            >
              ← Back to sign in
            </button>
          </div>
        </>
      )}
    </div>
  );
}