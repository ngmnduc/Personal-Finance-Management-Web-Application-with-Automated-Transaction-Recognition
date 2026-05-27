import { Navigate, Outlet } from 'react-router-dom'
import { useAuthStore, useIsAuthenticated } from '../store/auth.store'
import { useGetMe } from '../features/auth/api/auth.api'
import PageSkeleton from '../components/shared/PageSkeleton'

export default function PrivateRoute() {
  const isAuthLoading = useAuthStore((state) => state.isAuthLoading)
  const isAuthenticated = useIsAuthenticated()
  const { isLoading: meLoading } = useGetMe()

  if (isAuthLoading || meLoading) return <PageSkeleton />

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />
  }

  return <Outlet />
}