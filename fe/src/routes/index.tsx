import { lazy, Suspense } from 'react'
import { createBrowserRouter, Navigate } from 'react-router-dom'
import PrivateRoute from './PrivateRoute'
import AppLayout from '../layouts/AppLayout'
import PageSkeleton from '../components/shared/PageSkeleton'
import AuthLayout from '../layouts/AuthLayout'

const LoginPage = lazy(() => import('../pages/Auth/LoginPage'))
const RegisterPage = lazy(() => import('../pages/Auth/RegisterPage'))
const DashboardPage = lazy(() => import('../pages/Dashboard/index'))
const ScanPage = lazy(() => import('../pages/Scan/index'))
const WalletsPage = lazy(() => import('../pages/Wallets/index'))
const TransactionsPage = lazy(() => import('../pages/Transactions/index'))
const BudgetsPage = lazy(() => import('../pages/Budgets/index'))
const GoalsPage = lazy(() => import('../pages/Goals/index'))
const ReportsPage = lazy(() => import('../pages/Reports/index'))
const SettingsPage = lazy(() => import('../pages/Settings/index'))
const CategoriesPage = lazy(() => import('../pages/categories/index'))

const router = createBrowserRouter([
  {
    element: <AuthLayout />,
    children: [
      { path: '/', element: <Navigate to="/login" replace /> },

      { path: '/login', element: <Suspense fallback={<PageSkeleton />}><LoginPage /></Suspense> },
      { path: '/register', element: <Suspense fallback={<PageSkeleton />}><RegisterPage /></Suspense> },
    ],
  },
  {
    element: <PrivateRoute />,
    children: [
      {
        element: <AppLayout />,
        children: [
          { path: '/dashboard', element: <Suspense fallback={<PageSkeleton />}><DashboardPage /></Suspense> },
          { path: '/scan', element: <Suspense fallback={<PageSkeleton />}><ScanPage /></Suspense> },
          { path: '/wallets', element: <Suspense fallback={<PageSkeleton />}><WalletsPage /></Suspense> },
          { path: '/transactions', element: <Suspense fallback={<PageSkeleton />}><TransactionsPage /></Suspense> },
          { path: '/budgets', element: <Suspense fallback={<PageSkeleton />}><BudgetsPage /></Suspense> },
          { path: '/goals', element: <Suspense fallback={<PageSkeleton />}><GoalsPage /></Suspense> },
          { path: '/reports', element: <Suspense fallback={<PageSkeleton />}><ReportsPage /></Suspense> },
          { path: '/settings', element: <Suspense fallback={<PageSkeleton />}><SettingsPage /></Suspense> },
          { path: '/categories', element: <Suspense fallback={<PageSkeleton />}><CategoriesPage /></Suspense> },
        ],
      },
    ],
  },
])

export default router