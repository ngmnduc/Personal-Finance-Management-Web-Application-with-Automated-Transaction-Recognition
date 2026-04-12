import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { User, Mail, Lock } from 'lucide-react';
import { authApi } from '../../features/auth/api/auth.api';
import { useAuthStore } from '../../store/auth.store';
import { ROUTES } from '../../lib/constants';

// Schema UI tách 2 cột, nhưng backend vẫn nhận 1 chuỗi name
const registerSchema = z.object({
  firstName: z.string().min(2, 'Min 2 characters'),
  lastName: z.string().min(1, 'Last name is required'),
  email: z.string().email('Invalid email'),
  password: z.string().min(6, 'Password min 6 characters'),
});

type RegisterFormValues = z.infer<typeof registerSchema>;

export default function RegisterPage() {
  const navigate = useNavigate();
  const [apiError, setApiError] = useState('');

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
      // Nối Họ + Tên thành 1 chuỗi trước khi gọi API đúng chuẩn BE
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

  return (
    <section className="flex min-h-screen items-center justify-center bg-navy px-4 [filter:saturate(150%)]">
      {/* Glassmorphism Card chuẩn bản cũ */}
      <div className="w-[480px] max-w-[95vw] rounded-3xl border border-white/20 bg-white/10 p-8 shadow-lg shadow-[0_8px_32px_rgba(31,38,135,0.37)] backdrop-blur-[30px]">
        
        <div className="mb-8 text-center">
          <h1 className="text-2xl font-bold text-white">Create account</h1>
          <p className="mt-2 text-sm text-gray-300">Manage your finances smarter</p>
        </div>

        {apiError && (
          <div className="mb-4 rounded-lg bg-red-500/20 border border-red-400/30 p-3 text-sm text-red-300">
            {apiError}
          </div>
        )}

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
          {/* Grid 2 cột First/Last Name */}
          <div className="grid grid-cols-2 gap-4">
            <div className="relative">
              <User className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                placeholder="First name"
                className="w-full rounded-xl border border-white/10 bg-white/5 p-3 pl-10 text-base text-white placeholder-gray-400 focus:border-brand-green focus:outline-none focus:ring-2 focus:ring-brand-green"
                style={{ fontSize: '16px' }}
                {...register('firstName')}
              />
              {errors.firstName && (
                <p className="mt-1 text-xs text-red-400">{errors.firstName.message}</p>
              )}
            </div>
            <div className="relative">
              <User className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                placeholder="Last name"
                className="w-full rounded-xl border border-white/10 bg-white/5 p-3 pl-10 text-base text-white placeholder-gray-400 focus:border-brand-green focus:outline-none focus:ring-2 focus:ring-brand-green"
                style={{ fontSize: '16px' }}
                {...register('lastName')}
              />
              {errors.lastName && (
                <p className="mt-1 text-xs text-red-400">{errors.lastName.message}</p>
              )}
            </div>
          </div>

          {/* Email Field */}
          <div className="relative">
            <Mail className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-gray-400" />
            <input
              type="email"
              placeholder="email@example.com"
              className="w-full rounded-xl border border-white/10 bg-white/5 p-3 pl-10 text-base text-white placeholder-gray-400 focus:border-brand-green focus:outline-none focus:ring-2 focus:ring-brand-green"
              style={{ fontSize: '16px' }}
              {...register('email')}
            />
            {errors.email && (
              <p className="mt-1 text-xs text-red-400">{errors.email.message}</p>
            )}
          </div>

          {/* Password Field */}
          <div className="relative">
            <Lock className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-gray-400" />
            <input
              type="password"
              placeholder="Min 6 characters"
              className="w-full rounded-xl border border-white/10 bg-white/5 p-3 pl-10 text-base text-white placeholder-gray-400 focus:border-brand-green focus:outline-none focus:ring-2 focus:ring-brand-green"
              style={{ fontSize: '16px' }}
              {...register('password')}
            />
            {errors.password && (
              <p className="mt-1 text-xs text-red-400">{errors.password.message}</p>
            )}
          </div>

          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full rounded-xl bg-brand-green py-3 font-semibold text-white transition-all duration-300 hover:scale-105 hover:bg-green-600 disabled:cursor-not-allowed disabled:opacity-70 disabled:hover:scale-100"
          >
            {isSubmitting ? 'Creating account...' : 'Create account'}
          </button>
        </form>

        <p className="mt-6 text-center text-sm text-gray-300">
          Already have an account?{' '}
          <a href={ROUTES.LOGIN} className="font-medium text-[#22c55e] hover:underline">
            Sign in
          </a>
        </p>
      </div>
    </section>
  );
}