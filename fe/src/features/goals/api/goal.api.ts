import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import apiClient from '@/lib/axios'
import { QUERY_KEYS, API_ENDPOINTS } from '@/lib/constants'
import { ApiResponse } from '@/types'

// ─── Types ────────────────────────────────────────────────────────────────────

export type GoalStatus = 'ACTIVE' | 'COMPLETED' | 'ABANDONED'

export interface GoalSourceWallet {
  id: string
  name: string
  type: string
  currentBalance: number
}

export interface Goal {
  id: string
  name: string
  targetAmount: number
  currentAmount: number
  deadline?: string
  status: GoalStatus
  progressPercent: number
  sourceWallet: GoalSourceWallet
  createdAt: string
}

export interface CreateGoalInput {
  sourceWalletId: string
  name: string
  targetAmount: number
  deadline?: string
}

export interface UpdateGoalInput {
  name?: string
  targetAmount?: number
  deadline?: string
}

export interface DepositGoalInput {
  amount: number
}

// ─── Hooks ────────────────────────────────────────────────────────────────────

export const useGoals = () =>
  useQuery({
    queryKey: [QUERY_KEYS.GOALS],
    queryFn: async () => {
      const res = await apiClient.get<ApiResponse<Goal[]>>(API_ENDPOINTS.GOALS)
      return res.data.data
    },
  })

export const useGoalsSummary = () =>
  useQuery({
    queryKey: [QUERY_KEYS.GOALS, 'summary'],
    queryFn: async () => {
      const res = await apiClient.get<ApiResponse<Goal[]>>(
        `${API_ENDPOINTS.DASHBOARD}/goals/summary`,
      )
      return res.data.data
    },
  })

export const useCreateGoal = () => {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (data: CreateGoalInput) => {
      const res = await apiClient.post<ApiResponse<Goal>>(API_ENDPOINTS.GOALS, data)
      return res.data.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.GOALS] })
      queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.WALLETS] })
      toast.success('Goal created successfully!')
    },
    onError: (err: Error) => toast.error(err.message || 'Failed to create goal'),
  })
}

export const useUpdateGoal = () => {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, ...data }: UpdateGoalInput & { id: string }) => {
      const res = await apiClient.patch<ApiResponse<Goal>>(
        `${API_ENDPOINTS.GOALS}/${id}`,
        data,
      )
      return res.data.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.GOALS] })
      toast.success('Goal updated successfully!')
    },
    onError: (err: Error) => toast.error(err.message || 'Failed to update goal'),
  })
}

export const useDepositGoal = () => {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, amount }: { id: string; amount: number }) => {
      const res = await apiClient.post<ApiResponse<{ goal: Goal; wallet: object; autoCompleted: boolean }>>(
        `${API_ENDPOINTS.GOALS}/${id}/deposit`,
        { amount },
      )
      return res.data.data
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.GOALS] })
      queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.WALLETS] })
      queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.DASHBOARD] })
      if (data.autoCompleted) {
        toast.success('🎉 Goal completed! Target reached!')
      } else {
        toast.success('Deposit successful!')
      }
    },
    onError: (err: Error) => toast.error(err.message || 'Deposit failed'),
  })
}

export const useDeleteGoal = () => {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (id: string) => {
      const res = await apiClient.delete<ApiResponse<{ refundedAmount: number }>>(
        `${API_ENDPOINTS.GOALS}/${id}`,
      )
      return res.data.data
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.GOALS] })
      queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.WALLETS] })
      queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.DASHBOARD] })
      toast.success(
        `Goal abandoned. ${new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND', maximumFractionDigits: 0 }).format(data.refundedAmount)} refunded.`,
      )
    },
    onError: (err: Error) => toast.error(err.message || 'Failed to delete goal'),
  })
}
