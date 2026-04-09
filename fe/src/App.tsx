import { QueryClientProvider } from '@tanstack/react-query'
import { ReactQueryDevtools } from '@tanstack/react-query-devtools'
import { RouterProvider } from 'react-router-dom'
import { Toaster } from 'sonner'
import { router } from './routes'
import { queryClient } from './lib/queryClient'

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <RouterProvider router={router} />
      <Toaster position="top-right" richColors />
      <ReactQueryDevtools initialIsOpen={false} />
    </QueryClientProvider>
  )
}