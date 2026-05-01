import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import apiClient from '../../../lib/axios'
import { API_ENDPOINTS, QUERY_KEYS } from '../../../lib/constants'
import { ApiResponse } from '../../../types'

// ─── Types ────────────────────────────────────────────────────────────────────

export interface RecurringIncome {
  id: string
  name: string
  amount: number
  dayOfMonth: number
  isActive: boolean
  wallet: { id: string; name: string; type: string }
  category: { id: string; name: string; icon: string }
}

export interface CreateRecurringIncomePayload {
  walletId: string
  categoryId: string
  name: string
  amount: number
  dayOfMonth: number
  isActive?: boolean
}

// ─── Hooks ────────────────────────────────────────────────────────────────────

export const useRecurringIncomes = () => {
  return useQuery({
    queryKey: [QUERY_KEYS.RECURRING_INCOMES],
    queryFn: async () => {
      const response = await apiClient.get<ApiResponse<RecurringIncome[]>>(
        API_ENDPOINTS.RECURRING_INCOMES,
      )
      return response.data.data
    },
    staleTime: 60_000,
  })
}

export const useCreateRecurringIncome = () => {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (data: CreateRecurringIncomePayload) => {
      const response = await apiClient.post<ApiResponse<RecurringIncome>>(
        API_ENDPOINTS.RECURRING_INCOMES,
        data,
      )
      return response.data.data
    },
    onSuccess: () => {
      toast.success('Recurring income created!')
      queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.RECURRING_INCOMES] })
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to create recurring income')
    },
  })
}

export const useUpdateRecurringIncome = () => {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, ...data }: Partial<CreateRecurringIncomePayload> & { id: string }) => {
      const response = await apiClient.patch<ApiResponse<RecurringIncome>>(
        `${API_ENDPOINTS.RECURRING_INCOMES}/${id}`,
        data,
      )
      return response.data.data
    },
    onSuccess: () => {
      toast.success('Recurring income updated!')
      queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.RECURRING_INCOMES] })
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to update recurring income')
    },
  })
}

export const useDeleteRecurringIncome = () => {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (id: string) => {
      const response = await apiClient.delete<ApiResponse<null>>(
        `${API_ENDPOINTS.RECURRING_INCOMES}/${id}`,
      )
      return response.data.data
    },
    onSuccess: () => {
      toast.success('Recurring income deleted.')
      queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.RECURRING_INCOMES] })
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to delete recurring income')
    },
  })
}

export const useToggleRecurringIncome = () => {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, isActive }: { id: string; isActive: boolean }) => {
      const response = await apiClient.patch<ApiResponse<RecurringIncome>>(
        `${API_ENDPOINTS.RECURRING_INCOMES}/${id}`,
        { isActive },
      )
      return response.data.data
    },
    onSuccess: () => {
      // No toast — toggle must feel instant
      queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.RECURRING_INCOMES] })
    },
  })
}
