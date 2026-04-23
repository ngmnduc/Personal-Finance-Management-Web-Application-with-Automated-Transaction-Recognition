import { useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import apiClient from '../../../lib/axios'
import { API_ENDPOINTS, QUERY_KEYS } from '../../../lib/constants'
import { ApiResponse } from '../../../types'

// ─── Types ────────────────────────────────────────────────────────────────────

export interface ExtractedData {
  amount: number | null
  transaction_date: string | null
  merchant: string | null
  type: 'INCOME' | 'EXPENSE' | null
  bank_detected: string | null
  confidence: number
  error?: string | null
}

export interface ScanResponse {
  extracted: ExtractedData
  extracted_text: string
  suggested_category_id: string | null
  default_wallet_id: string | null
}

export interface ConfirmOCRPayload {
  amount: number
  transactionDate: string
  merchant?: string
  type: 'INCOME' | 'EXPENSE'
  categoryId: string
  walletId: string
  note?: string
  extractedText?: string
}

// ─── Hooks ────────────────────────────────────────────────────────────────────

/**
 * useScanImage — POST multipart file to OCR service.
 * Intentionally no Content-Type header: browser sets correct boundary automatically.
 * No toast here — caller handles UX based on confidence score.
 */
export const useScanImage = () => {
  return useMutation({
    mutationFn: async ({
      file,
      scanContext,
    }: {
      file: File
      scanContext: 'expense' | 'income'
    }): Promise<ScanResponse> => {
      const form = new FormData()
      form.append('file', file)
      form.append('scan_context', scanContext.toUpperCase())

      const response = await apiClient.post<ApiResponse<ScanResponse>>(
        `${API_ENDPOINTS.OCR}/scan`,
        form,
        {
          headers: {
            // Ép Axios dùng chuẩn gửi file, ghi đè cái mặc định application/json của project
            'Content-Type': 'multipart/form-data', 
          },
        }
        
        // No Content-Type — let browser inject multipart boundary
      )
      return response.data.data
    },
  })
}

/**
 * useConfirmOCR — POST confirmed transaction data to create transaction record.
 */
export const useConfirmOCR = () => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (payload: ConfirmOCRPayload) => {
      const response = await apiClient.post<ApiResponse<unknown>>(
        `${API_ENDPOINTS.OCR}/confirm`,
        payload,
      )
      return response.data.data
    },
    onSuccess: () => {
      toast.success('Transaction saved successfully!')
      queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.TRANSACTIONS] })
      queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.WALLETS] })
      queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.DASHBOARD] })
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to save transaction')
    },
  })
}
