import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import apiClient from '../../../lib/axios'
import { QUERY_KEYS, API_ENDPOINTS } from '../../../lib/constants'
import { Wallet, ApiResponse } from '../../../types'

export const useWallets = () => {
  return useQuery({
    queryKey: [QUERY_KEYS.WALLETS],
    queryFn: async () => {
      const response = await apiClient.get<ApiResponse<Wallet[]>>(API_ENDPOINTS.WALLETS)
      return response.data.data
    }
  })
}

export const useCreateWallet = () => {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (data: Partial<Wallet>) => {
      const response = await apiClient.post<ApiResponse<Wallet>>(API_ENDPOINTS.WALLETS, data)
      return response.data.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.WALLETS] })
    }
  })
}

export const useUpdateWallet = () => {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, ...data }: Partial<Wallet> & { id: string }) => {
      const response = await apiClient.patch<ApiResponse<Wallet>>(`${API_ENDPOINTS.WALLETS}/${id}`, data)
      return response.data.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.WALLETS] })
    }
  })
}

export const useDeleteWallet = () => {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (id: string) => {
      const response = await apiClient.delete<ApiResponse<null>>(`${API_ENDPOINTS.WALLETS}/${id}`)
      return response.data.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.WALLETS] })
    }
  })
}

export const useSetDefaultWallet = () => {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (id: string) => {
      const response = await apiClient.post<ApiResponse<Wallet>>(`${API_ENDPOINTS.WALLETS}/${id}/set-default`)
      return response.data.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.WALLETS] })
    }
  })
}
