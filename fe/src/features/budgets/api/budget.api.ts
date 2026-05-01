import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import apiClient from '../../../lib/axios'
import { API_ENDPOINTS, QUERY_KEYS } from '../../../lib/constants'
import { ApiResponse } from '../../../types'

// ─── Types ────────────────────────────────────────────────────────────────────

export interface Budget {
  id: string
  categoryId: string
  category: { id: string; name: string; icon: string; type: string }
  amountLimit: number
  period: 'WEEKLY' | 'MONTHLY'
  spent: number
  remaining: number
  percent: number
  status: 'ok' | 'warning' | 'exceeded'
  alert80SentAt: string | null
}

export interface CreateBudgetPayload {
  categoryId: string
  amountLimit: number
  period: 'WEEKLY' | 'MONTHLY'
}

export interface UpdateBudgetPayload {
  amountLimit: number
}

// ─── Hooks ────────────────────────────────────────────────────────────────────

export const useBudgets = (period?: 'WEEKLY' | 'MONTHLY') => {
  return useQuery({
    queryKey: [QUERY_KEYS.BUDGETS, period ?? 'all'],
    queryFn: async () => {
      const params = period ? { period } : undefined
      const response = await apiClient.get<ApiResponse<Budget[]>>(
        API_ENDPOINTS.BUDGETS,
        { params },
      )
      return response.data.data
    },
    staleTime: 30_000,
  })
}

export const useCreateBudget = () => {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (data: CreateBudgetPayload) => {
      const response = await apiClient.post<ApiResponse<Budget>>(
        API_ENDPOINTS.BUDGETS,
        data,
      )
      return response.data.data
    },
    onSuccess: () => {
      toast.success('Budget created successfully!')
      queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.BUDGETS] })
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to create budget')
    },
  })
}

export const useUpdateBudget = () => {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, ...data }: UpdateBudgetPayload & { id: string }) => {
      const response = await apiClient.patch<ApiResponse<Budget>>(
        `${API_ENDPOINTS.BUDGETS}/${id}`,
        data,
      )
      return response.data.data
    },
    onSuccess: () => {
      toast.success('Budget updated successfully!')
      queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.BUDGETS] })
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to update budget')
    },
  })
}

export const useDeleteBudget = () => {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (id: string) => {
      const response = await apiClient.delete<ApiResponse<null>>(
        `${API_ENDPOINTS.BUDGETS}/${id}`,
      )
      return response.data.data
    },
    onSuccess: () => {
      toast.success('Budget deleted.')
      queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.BUDGETS] })
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to delete budget')
    },
  })
}
