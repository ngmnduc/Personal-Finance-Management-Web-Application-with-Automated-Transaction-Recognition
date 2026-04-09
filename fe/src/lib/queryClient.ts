import { QueryClient } from '@tanstack/react-query'

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 60 * 1000, // 1 phút
      retry: 1,
      refetchOnWindowFocus: false,
    },
    mutations: {
      retry: 0,
    }
  }
})