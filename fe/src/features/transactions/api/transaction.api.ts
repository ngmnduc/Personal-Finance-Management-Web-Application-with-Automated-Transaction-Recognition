import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import apiClient from '../../../lib/axios'
import { QUERY_KEYS, API_ENDPOINTS } from '../../../lib/constants'
import { ApiResponse, Transaction } from '../../../types'

// ─── Types ───────────────────────────────────────────────────────────────────

export interface CreateTransactionPayload {
  walletId: string
  categoryId: string
  type: 'INCOME' | 'EXPENSE'
  amount: number
  transactionDate: string
  merchant?: string
  note?: string
}

export interface TransactionFilters {
  type?: 'INCOME' | 'EXPENSE'
  category_id?: string
  wallet_id?: string
  start_date?: string
  end_date?: string
  search?: string
  page: number
  limit: number
}

export interface TransactionListResponse {
  transactions: Transaction[]
  pagination: {
    page: number
    limit: number
    total: number
    totalPages: number
  }
}

export interface MonthlySummary {
  month: string
  totalIncome: number
  totalExpense: number
  net: number
}

// ─── Hooks ───────────────────────────────────────────────────────────────────

export const useTransactions = (filters: TransactionFilters) => {
  return useQuery({
    queryKey: [QUERY_KEYS.TRANSACTIONS, filters],
    queryFn: async () => {
      const response = await apiClient.get<ApiResponse<TransactionListResponse>>(
        API_ENDPOINTS.TRANSACTIONS,
        { params: filters }
      )
      return response.data.data
    },
    staleTime: 30_000,
  })
}

export const useMonthlySummary = (year: number, walletId?: string) => {
  return useQuery({
    queryKey: [QUERY_KEYS.TRANSACTIONS, 'monthly-summary', year, walletId],
    queryFn: async () => {
      const params: Record<string, unknown> = { year }
      if (walletId) params.wallet_id = walletId
      const response = await apiClient.get<ApiResponse<MonthlySummary[]>>(
        `${API_ENDPOINTS.TRANSACTIONS}/summary/monthly`,
        { params }
      )
      return response.data.data
    },
    staleTime: 30_000,
  })
}

export const useCreateTransaction = () => {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (data: CreateTransactionPayload) => {
      const response = await apiClient.post<ApiResponse<Transaction>>(
        API_ENDPOINTS.TRANSACTIONS,
        data
      )
      return response.data.data
    },
    onSuccess: () => {
      toast.success('Transaction created successfully')
      queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.TRANSACTIONS] })
      queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.WALLETS] })
      queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.DASHBOARD] })
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to create transaction')
    },
  })
}

export const useUpdateTransaction = () => {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, ...data }: Partial<CreateTransactionPayload> & { id: string }) => {
      const response = await apiClient.patch<ApiResponse<Transaction>>(
        `${API_ENDPOINTS.TRANSACTIONS}/${id}`,
        data
      )
      return response.data.data
    },
    onSuccess: () => {
      toast.success('Transaction updated successfully')
      queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.TRANSACTIONS] })
      queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.WALLETS] })
      queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.DASHBOARD] })
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to update transaction')
    },
  })
}

export const useDeleteTransaction = () => {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (id: string) => {
      const response = await apiClient.delete<ApiResponse<null>>(
        `${API_ENDPOINTS.TRANSACTIONS}/${id}`
      )
      return response.data.data
    },
    onSuccess: () => {
      toast.success('Transaction deleted successfully')
      queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.TRANSACTIONS] })
      queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.WALLETS] })
      queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.DASHBOARD] })
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to delete transaction')
    },
  })
}
