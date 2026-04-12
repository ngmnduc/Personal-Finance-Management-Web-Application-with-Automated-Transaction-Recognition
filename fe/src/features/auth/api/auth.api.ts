import axiosInstance from '../../../lib/axios';
import { API_ENDPOINTS } from '../../../lib/constants';
import type { User, ApiResponse } from '../../../types';

export const authApi = {
  register: async (data: { email: string; name: string; password: string }) => {
    const response = await axiosInstance.post<ApiResponse<{ user: User; accessToken: string; refreshToken: string }>>(
      API_ENDPOINTS.AUTH.REGISTER,
      data
    );
    return response.data; // Trả về thẳng data cho Controller/Page dùng
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