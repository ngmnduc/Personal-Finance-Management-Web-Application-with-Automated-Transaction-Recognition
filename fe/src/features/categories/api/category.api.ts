import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import apiClient from '../../../lib/axios'
import { QUERY_KEYS, API_ENDPOINTS } from '../../../lib/constants'
import { Category, ApiResponse, TransactionType } from '../../../types'

export const useCategories = (type?: TransactionType) => {
  return useQuery({
    queryKey: [QUERY_KEYS.CATEGORIES, type],
    queryFn: async () => {
      const params = type ? { type } : undefined
      const response = await apiClient.get<ApiResponse<Category[]>>(API_ENDPOINTS.CATEGORIES, { params })
      return response.data.data
    }
  })
}

export const useCreateCategory = () => {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (data: Partial<Category>) => {
      const response = await apiClient.post<ApiResponse<Category>>(API_ENDPOINTS.CATEGORIES, data)
      return response.data.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.CATEGORIES] })
    }
  })
}

export const useUpdateCategory = () => {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, ...data }: Partial<Category> & { id: string }) => {
      const response = await apiClient.patch<ApiResponse<Category>>(`${API_ENDPOINTS.CATEGORIES}/${id}`, data)
      return response.data.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.CATEGORIES] })
    }
  })
}

export const useDeleteCategory = () => {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (id: string) => {
      const response = await apiClient.delete<ApiResponse<null>>(`${API_ENDPOINTS.CATEGORIES}/${id}`)
      return response.data.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.CATEGORIES] })
    }
  })
}
