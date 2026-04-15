import { useQuery } from '@tanstack/react-query'
import apiClient from '../../../lib/axios'
import { QUERY_KEYS, API_ENDPOINTS } from '../../../lib/constants'
import { DashboardOverview, ApiResponse } from '../../../types'

export const useDashboardOverview = () => {
  return useQuery({
    queryKey: [QUERY_KEYS.DASHBOARD, 'overview'],
    queryFn: async () => {
      const response = await apiClient.get<ApiResponse<DashboardOverview>>(`${API_ENDPOINTS.DASHBOARD}/overview`)
      return response.data.data
    }
  })
}
