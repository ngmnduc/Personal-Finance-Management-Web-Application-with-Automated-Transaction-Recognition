import { lazy } from 'react'
import { createBrowserRouter, Navigate } from 'react-router-dom'
import PrivateRoute from './PrivateRoute'
import AppLayout from '../layouts/AppLayout'
import PageSkeleton from '../components/shared/PageSkeleton'

// Lazy load pages
const LoginPage = lazy(() => import('../pages/Login'))
const RegisterPage = lazy(() => import('../pages/Register'))
const DashboardPage = lazy(() => import('../pages/Dashboard'))
const ScanPage = lazy(() => import('../pages/Scan'))
const WalletsPage = lazy(() => import('../pages/Wallets'))
const TransactionsPage = lazy(() => import('../pages/Transactions'))
const BudgetsPage = lazy(() => import('../pages/Budgets'))
const GoalsPage = lazy(() => import('../pages/Goals'))
const ReportsPage = lazy(() => import('../pages/Reports'))
const SettingsPage = lazy(() => import('../pages/Settings'))


export const router = createBrowserRouter([
  {
    path: '/login',
    element: (
      <Suspense fallback={<PageSkeleton />}>
        <LoginPage />
      </Suspense>
    ),
  },
  {
    path: '/register',
    element: (
      <Suspense fallback={<PageSkeleton />}>
        <RegisterPage />
      </Suspense>
    ),
  },
  {
    element: <PrivateRoute />,
    children: [
      {
        element: <AppLayout />,
        children: [
          { path: '/', element: <Navigate to="/dashboard" replace /> },
          { path: '/dashboard', element: <Suspense fallback={<PageSkeleton />}><DashboardPage /></Suspense> },
          { path: '/scan', element: <Suspense fallback={<PageSkeleton />}><ScanPage /></Suspense> },
          { path: '/wallets', element: <Suspense fallback={<PageSkeleton />}><WalletsPage /></Suspense> },
          { path: '/transactions', element: <Suspense fallback={<PageSkeleton />}><TransactionsPage /></Suspense> },
          { path: '/budgets', element: <Suspense fallback={<PageSkeleton />}><BudgetsPage /></Suspense> },
          { path: '/goals', element: <Suspense fallback={<PageSkeleton />}><GoalsPage /></Suspense> },
          { path: '/reports', element: <Suspense fallback={<PageSkeleton />}><ReportsPage /></Suspense> },
          { path: '/settings', element: <Suspense fallback={<PageSkeleton />}><SettingsPage /></Suspense> },
        ]
      }
    ]
  }
])