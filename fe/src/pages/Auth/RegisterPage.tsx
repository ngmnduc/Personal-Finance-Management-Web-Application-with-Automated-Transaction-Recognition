import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { User, Mail, Lock, Eye, EyeOff } from 'lucide-react';
import { authApi } from '../../features/auth/api/auth.api';
import { useAuthStore } from '../../store/auth.store';
import { ROUTES } from '../../lib/constants';

const registerSchema = z.object({
  firstName: z.string().min(2, 'Min 2 characters'),
  lastName: z.string().min(1, 'Last name is required'),
  email: z.string().email('Invalid email'),
  password: z.string().min(6, 'Password min 6 characters'),
});

type RegisterFormValues = z.infer<typeof registerSchema>;
/*
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
*/



export default function RegisterPage() {
  const navigate = useNavigate();
  const [apiError, setApiError] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<RegisterFormValues>({
    resolver: zodResolver(registerSchema),
  });

  const onSubmit = async (data: RegisterFormValues) => {
    try {
      setApiError('');
      const fullName = `${data.lastName} ${data.firstName}`.trim();
      const res = await authApi.register({
        name: fullName,
        email: data.email,
        password: data.password,
      });
      const { user, accessToken, refreshToken } = res.data;
      useAuthStore.getState().setAuth(user, accessToken, refreshToken);
      navigate(ROUTES.DASHBOARD);
    } catch (error: any) {
      setApiError(error.message || 'Registration failed. Please try again.');
    }
  };

  const inputClass =
    'w-full rounded-xl border border-slate-200 bg-white px-4 py-3 pl-11 text-base text-[#0f1f3d] placeholder:text-slate-400 focus:border-[#10b981] focus:outline-none focus:ring-2 focus:ring-[#10b981]/20 transition-all duration-200';

  return (
    <div className="w-full">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-foreground">Create your account</h1>
        <p className="mt-1.5 text-sm text-muted-foreground">Start managing your finances smarter today</p>
      </div>

      {apiError && (
        <div className="mb-5 rounded-xl bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-600 dark:bg-red-500/10 dark:border-red-500/20 dark:text-red-400">
          {apiError}
        </div>
      )}

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        {/* Name row */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="mb-1.5 block text-sm font-medium text-foreground">First name</label>
            <div className="relative">
              <User className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <input
                type="text"
                placeholder="John"
                className={inputClass}
                style={{ fontSize: '16px' }}
                {...register('firstName')}
              />
            </div>
            {errors.firstName && (
              <p className="mt-1 text-xs text-red-500">{errors.firstName.message}</p>
            )}
          </div>
          <div>
            <label className="mb-1.5 block text-sm font-medium text-foreground">Last name</label>
            <div className="relative">
              <User className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <input
                type="text"
                placeholder="Doe"
                className={inputClass}
                style={{ fontSize: '16px' }}
                {...register('lastName')}
              />
            </div>
            {errors.lastName && (
              <p className="mt-1 text-xs text-red-500">{errors.lastName.message}</p>
            )}
          </div>
        </div>

        {/* Email */}
        <div>
          <label className="mb-1.5 block text-sm font-medium text-foreground">Email address</label>
          <div className="relative">
            <Mail className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <input
              type="email"
              placeholder="you@example.com"
              className={inputClass}
              style={{ fontSize: '16px' }}
              {...register('email')}
            />
          </div>
          {errors.email && (
            <p className="mt-1 text-xs text-red-500">{errors.email.message}</p>
          )}
        </div>

        {/* Password */}
        <div>
          <label className="mb-1.5 block text-sm font-medium text-foreground">Password</label>
          <div className="relative">
            <Lock className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <input
              type={showPassword ? 'text' : 'password'}
              placeholder="Min 6 characters"
              className={inputClass}
              style={{ fontSize: '16px' }}
              {...register('password')}
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
            >
              {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>
          {errors.password && (
            <p className="mt-1 text-xs text-red-500">{errors.password.message}</p>
          )}
        </div>

        <button
          type="submit"
          disabled={isSubmitting}
          className="w-full rounded-xl bg-[#10b981] py-3 font-semibold text-white transition-all duration-200 hover:bg-[#059669] disabled:cursor-not-allowed disabled:opacity-70 mt-2"
        >
          {isSubmitting ? 'Creating account...' : 'Create account'}
        </button>
      </form>

      {/* OR Divider */}
                {/*
          <div className="my-6 flex items-center gap-4">
            <div className="h-px flex-1 bg-border" />
            <span className="text-xs font-medium text-muted-foreground uppercase tracking-widest">or</span>
            <div className="h-px flex-1 bg-border" />
          </div>

          <div className="space-y-3">
            <button
              type="button"
              className="w-full flex items-center justify-center gap-3 rounded-xl border border-border bg-background py-3 text-sm font-medium text-foreground hover:bg-muted transition-colors duration-200"
            >
              <GoogleIcon />
              Sign in with Google
            </button>
          </div>
          */}


      <p className="mt-8 text-center text-sm text-muted-foreground">
        Already have an account?{' '}
        <Link to={ROUTES.LOGIN} className="font-semibold text-[#10b981] hover:text-[#059669] transition-colors">
          Sign in
        </Link>
      </p>
    </div>
  );
}