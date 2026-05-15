import { useQuery } from '@tanstack/react-query'
import apiClient from '../../../lib/axios'
import { QUERY_KEYS, API_ENDPOINTS } from '../../../lib/constants'
import { DashboardOverview, ApiResponse } from '../../../types'

// ─── Types ────────────────────────────────────────────────────────────────────

export interface MonthlyChartItem {
  month: string
  income: number
  expense: number
  net: number
}

export interface CategoryBreakdownItem {
  categoryId: string | null
  name: string
  icon: string
  amount: number
  percent: number
}

// ─── Hooks ────────────────────────────────────────────────────────────────────

export const useDashboardOverview = () =>
  useQuery({
    queryKey: [QUERY_KEYS.DASHBOARD, 'overview'],
    queryFn: async () => {
      const response = await apiClient.get<ApiResponse<DashboardOverview>>(
        `${API_ENDPOINTS.DASHBOARD}/overview`,
      )
      return response.data.data
    },
    staleTime: 60_000,
  })

export const useMonthlyCharts = (year: number) =>
  useQuery({
    queryKey: [QUERY_KEYS.DASHBOARD, 'charts', 'monthly', year],
    queryFn: async () => {
      const response = await apiClient.get<ApiResponse<MonthlyChartItem[]>>(
        `${API_ENDPOINTS.DASHBOARD}/charts/monthly`,
        { params: { year } },
      )
      return response.data.data
    },
    staleTime: 60_000,
  })

export const useCategoryBreakdown = (month: string) =>
  useQuery({
    queryKey: [QUERY_KEYS.DASHBOARD, 'charts', 'categories', month],
    queryFn: async () => {
      const response = await apiClient.get<ApiResponse<CategoryBreakdownItem[]>>(
        `${API_ENDPOINTS.DASHBOARD}/charts/categories`,
        { params: { month } },
      )
      return response.data.data
    },
    staleTime: 60_000,
  })
