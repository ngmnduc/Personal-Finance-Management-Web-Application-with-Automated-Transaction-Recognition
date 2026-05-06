import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import apiClient from '@/lib/axios'
import { API_ENDPOINTS, QUERY_KEYS } from '@/lib/constants'
import { ApiResponse } from '@/types'

// ─── Types ────────────────────────────────────────────────────────────────────

/** A pending auto-detected suggestion (isActive=false on BE) */
export interface RecurringSuggestion {
  id: string
  merchant: string
  amount: number
  intervalDays: number
  nextDueDate?: string
  category: { id: string; name: string; icon: string }
  wallet: { id: string; name: string }
  createdAt: string
}

/** A user-confirmed active recurring rule (isActive=true on BE) */
export interface RecurringRule {
  id: string
  merchant: string
  amount: number
  intervalDays: number
  nextDueDate?: string
  category: { id: string; name: string; icon: string }
  wallet: { id: string; name: string }
  createdAt: string
}

// ─── Hooks ────────────────────────────────────────────────────────────────────

/** GET /recurring/suggestions — pending rules awaiting user confirmation */
export const useRecurringSuggestions = () =>
  useQuery({
    queryKey: [QUERY_KEYS.RECURRING_SUGGESTIONS],
    queryFn: async () => {
      const res = await apiClient.get<ApiResponse<RecurringSuggestion[]>>(
        `${API_ENDPOINTS.RECURRING}/suggestions`,
      )
      return res.data.data
    },
    staleTime: 60_000,
  })

/** GET /recurring/rules — active confirmed rules */
export const useRecurringRules = () =>
  useQuery({
    queryKey: [QUERY_KEYS.RECURRING_RULES],
    queryFn: async () => {
      const res = await apiClient.get<ApiResponse<RecurringRule[]>>(
        `${API_ENDPOINTS.RECURRING}/rules`,
      )
      return res.data.data
    },
    staleTime: 60_000,
  })

/** POST /recurring/rules { ruleId } — user confirms a suggestion, activates it */
export const useConfirmRecurringRule = () => {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (ruleId: string) => {
      const res = await apiClient.post<ApiResponse<RecurringRule>>(
        `${API_ENDPOINTS.RECURRING}/rules`,
        { ruleId },
      )
      return res.data.data
    },
    onSuccess: () => {
      toast.success('Recurring rule activated! Transactions will be created automatically.')
      queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.RECURRING_SUGGESTIONS] })
      queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.RECURRING_RULES] })
    },
    onError: (err: Error) => toast.error(err.message || 'Failed to confirm rule'),
  })
}

/** POST /recurring/suggestions/:id/snooze — hide suggestion for 60 days */
export const useSnoozeSuggestion = () => {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (id: string) => {
      const res = await apiClient.post<ApiResponse<unknown>>(
        `${API_ENDPOINTS.RECURRING}/suggestions/${id}/snooze`,
      )
      return res.data
    },
    onSuccess: () => {
      toast.info('Snoozed for 60 days.')
      queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.RECURRING_SUGGESTIONS] })
    },
    onError: (err: Error) => toast.error(err.message || 'Failed to snooze'),
  })
}

/** DELETE /recurring/rules/:id — remove a confirmed rule */
export const useDeleteRecurringRule = () => {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (id: string) => {
      await apiClient.delete(`${API_ENDPOINTS.RECURRING}/rules/${id}`)
    },
    onSuccess: () => {
      toast.success('Recurring rule deleted.')
      queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.RECURRING_RULES] })
    },
    onError: (err: Error) => toast.error(err.message || 'Failed to delete rule'),
  })
}
