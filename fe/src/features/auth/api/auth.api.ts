import axiosInstance from '../../../lib/axios';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { API_ENDPOINTS, QUERY_KEYS } from '../../../lib/constants';
import type { User, ApiResponse } from '../../../types';
import { useAuthStore } from '../../../store/auth.store';

export const authApi = {
  register: async (data: { email: string; name: string; password: string }) => {
    const response = await axiosInstance.post<ApiResponse<{ user: User; accessToken: string; refreshToken: string }>>(
      API_ENDPOINTS.AUTH.REGISTER,
      data
    );
    return response.data;
  },

  login: async (data: { email: string; password: string }) => {
    const response = await axiosInstance.post<ApiResponse<{ user: User; accessToken: string; refreshToken: string }>>(
      API_ENDPOINTS.AUTH.LOGIN,
      data
    );
    return response.data;
  },

  logout: async () => {
    await axiosInstance.post(API_ENDPOINTS.AUTH.LOGOUT);
  },
};

// ─── Hooks ────────────────────────────────────────────────────────────────────

export const useGetMe = () => {
  const updateUser = useAuthStore((s) => s.updateUser)
  return useQuery({
    queryKey: [QUERY_KEYS.ME],
    queryFn: async () => {
      const res = await axiosInstance.get<ApiResponse<User>>(API_ENDPOINTS.AUTH.ME)
      updateUser(res.data.data)
      return res.data.data
    },
    staleTime: 60_000,
  })
}

export const useUpdateProfile = () => {
  const queryClient = useQueryClient()
  const updateUser = useAuthStore((s) => s.updateUser)
  return useMutation({
    mutationFn: async (data: { name?: string; avatarUrl?: string }) => {
      const res = await axiosInstance.patch<ApiResponse<User>>(API_ENDPOINTS.AUTH.ME, data)
      return res.data.data
    },
    onSuccess: (user) => {
      updateUser(user)
      queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.ME] })
      toast.success('Profile updated successfully!')
    },
    onError: (err: Error) => toast.error(err.message || 'Failed to update profile'),
  })
}

export const useChangePassword = () =>
  useMutation({
    mutationFn: async (data: { currentPassword: string; newPassword: string }) => {
      const res = await axiosInstance.patch<ApiResponse<User>>(API_ENDPOINTS.AUTH.ME, data)
      return res.data.data
    },
    onSuccess: () => toast.success('Password changed successfully!'),
    onError: (err: Error) => toast.error(err.message || 'Failed to change password'),
  })