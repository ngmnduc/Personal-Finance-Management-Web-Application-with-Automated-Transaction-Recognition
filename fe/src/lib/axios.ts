import axios, { type AxiosError, type InternalAxiosRequestConfig } from 'axios'
import { useAuthStore } from '../store/auth.store'

const apiClient = axios.create({
  baseURL: import.meta.env.VITE_API_URL,
  timeout: 10000,
  headers: { 'Content-Type': 'application/json' }
})

let isRefreshing = false
let failedQueue: Array<{ resolve: Function; reject: Function }> = []

const processQueue = (error: any, token: string | null = null) => {
  failedQueue.forEach(prom => {
    if (error) {
      prom.reject(error)
    } else {
      prom.resolve(token)
    }
  })
  failedQueue = []
}

// Request Interceptor: Gắn Access Token
apiClient.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    const token = useAuthStore.getState().accessToken
    if (token) {
      config.headers.Authorization = `Bearer ${token}`
    }
    return config
  },
  (error) => Promise.reject(error)
)

// Response Interceptor: Xử lý 401 & Refresh Token
apiClient.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const originalRequest = error.config as any

    if (error.response?.status === 401 && !originalRequest._retry) {
      if (isRefreshing) {
        // Nếu đang refresh rồi, đưa request hiện tại vào hàng đợi
        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject })
        }).then(token => {
          originalRequest.headers.Authorization = `Bearer ${token}`
          return apiClient(originalRequest)
        }).catch(err => Promise.reject(err))
      }

      originalRequest._retry = true
      isRefreshing = true

      const { refreshToken, clearAuth, setAuth, user } = useAuthStore.getState()

      if (!refreshToken) {
        clearAuth()
        window.location.href = '/login'
        return Promise.reject(error)
      }

      try {
        const res = await axios.post(`${import.meta.env.VITE_API_URL}/auth/refresh`, {
          refreshToken
        })
        
        const newAccessToken = res.data.data.accessToken
        const newRefreshToken = res.data.data.refreshToken || refreshToken
        
        // Cập nhật state global
        if (user) {
          setAuth(user, newAccessToken, newRefreshToken)
        }

        processQueue(null, newAccessToken)
        
        originalRequest.headers.Authorization = `Bearer ${newAccessToken}`
        return apiClient(originalRequest)
      } catch (refreshError) {
        processQueue(refreshError, null)
        clearAuth()
        window.location.href = '/login'
        return Promise.reject(refreshError)
      } finally {
        isRefreshing = false
      }
    }

    // Các lỗi khác: extract message
    const message = (error.response?.data as any)?.message || 'An error occurred'
    return Promise.reject(new Error(message))
  }
)

export default apiClient