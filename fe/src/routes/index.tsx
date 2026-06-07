import { lazy, Suspense } from 'react'
import { createBrowserRouter, Navigate } from 'react-router-dom'
import PrivateRoute from './PrivateRoute'
import AppLayout from '../layouts/AppLayout'
import PageSkeleton from '../components/shared/PageSkeleton'
import AuthLayout from '../layouts/AuthLayout'

/* Dedicated layout wrapper component to guarantee that whenever a lazy-loaded route is pending instantiation, the placeholder container forces a full-width and full-height layout context, preventing background flickering or clipping */
function PageFallback() {
  return (
    <div className="flex min-h-screen w-full flex-1 flex-col items-center justify-center bg-background lg:min-h-full">
      <PageSkeleton />
    </div>
  )
}

const LandingPage = lazy(() => import('../pages/Landing/index'))
const LoginPage = lazy(() => import('../pages/Auth/LoginPage'))
const RegisterPage = lazy(() => import('../pages/Auth/RegisterPage'))
const DashboardPage = lazy(() => import('../pages/Dashboard/index'))
const ScanPage = lazy(() => import('../pages/Scan/index'))
const WalletsPage = lazy(() => import('../pages/Wallets/index'))
const TransactionsPage = lazy(() => import('../pages/Transactions/index'))
const BudgetsPage = lazy(() => import('../pages/Budgets/index'))
const GoalsPage = lazy(() => import('../pages/Goals/index'))
const SettingsPage = lazy(() => import('../pages/Settings/index'))
const CategoriesPage = lazy(() => import('../pages/categories/index'))

const router = createBrowserRouter([
  {
    path: '/',
    element: <Suspense fallback={<PageFallback />}><LandingPage /></Suspense>,
  },
  {
    element: <AuthLayout />,
    children: [
      { path: '/login', element: <Suspense fallback={<PageFallback />}><LoginPage /></Suspense> },
      { path: '/register', element: <Suspense fallback={<PageFallback />}><RegisterPage /></Suspense> },
    ],
  },
  {
    element: <PrivateRoute />,
    children: [
      {
        element: <AppLayout />,
        children: [
          { path: '/dashboard', element: <Suspense fallback={<PageFallback />}><DashboardPage /></Suspense> },
          { path: '/scan', element: <Suspense fallback={<PageFallback />}><ScanPage /></Suspense> },
          { path: '/wallets', element: <Suspense fallback={<PageFallback />}><WalletsPage /></Suspense> },
          { path: '/transactions', element: <Suspense fallback={<PageFallback />}><TransactionsPage /></Suspense> },
          { path: '/budgets', element: <Suspense fallback={<PageFallback />}><BudgetsPage /></Suspense> },
          { path: '/goals', element: <Suspense fallback={<PageFallback />}><GoalsPage /></Suspense> },
          { path: '/reports', element: <Navigate to="/dashboard" replace /> },
          { path: '/settings', element: <Suspense fallback={<PageFallback />}><SettingsPage /></Suspense> },
          { path: '/categories', element: <Suspense fallback={<PageFallback />}><CategoriesPage /></Suspense> },
        ],
      },
    ],
  },
])

export default router

