import apiClient from '../../../lib/axios'

export interface ExportParams {
  from?: string
  to?: string
  walletId?: string
}

export async function downloadCSV(params: ExportParams): Promise<void> {
  const response = await apiClient.get('/export/transactions/csv', {
    params,
    responseType: 'blob',
  })
  const url = URL.createObjectURL(new Blob([response.data], { type: 'text/csv;charset=utf-8;' }))
  const a = document.createElement('a')
  a.href = url
  a.download = `transactions_${Date.now()}.csv`
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}

export async function downloadPDF(params: ExportParams): Promise<void> {
  const response = await apiClient.get('/export/transactions/pdf', {
    params,
    responseType: 'blob',
  })
  const url = URL.createObjectURL(new Blob([response.data], { type: 'application/pdf' }))
  const a = document.createElement('a')
  a.href = url
  a.download = `transactions_${Date.now()}.pdf`
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}
