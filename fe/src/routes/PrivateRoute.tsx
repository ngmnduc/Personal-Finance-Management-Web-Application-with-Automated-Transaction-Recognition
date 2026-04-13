import { Navigate, Outlet } from 'react-router-dom'
import { useAuthStore,useIsAuthenticated } from '../store/auth.store'
import PageSkeleton from '../components/shared/PageSkeleton'


export default function PrivateRoute() {
  const isAuthLoading = useAuthStore((state) => state.isAuthLoading); 

  if(isAuthLoading) {return <PageSkeleton/>}
  if (!useIsAuthenticated) {
    return <Navigate to="/login" replace />
  }

  return <Outlet />
}