export interface User {
  id: string
  email: string
  name: string
  avatarUrl?: string
  createdAt: string
}

export interface Wallet {
  id: string
  userId: string
  name: string
  type: 'CASH' | 'BANK' | 'E_WALLET' | 'GENERAL'
  initialBalance: number
  currentBalance: number
  isDefault: boolean
  archivedAt?: string
}

export interface Category {
  id: string
  userId?: string
  name: string
  type: 'INCOME' | 'EXPENSE'
  icon: string
  isDefault: boolean
}

export interface Transaction {
  id: string
  userId: string
  walletId: string
  categoryId: string
  type: 'INCOME' | 'EXPENSE'
  amount: number
  transactionDate: string
  merchant?: string
  note?: string
  source: 'MANUAL' | 'OCR' | 'RECURRING'
  wallet?: Wallet
  category?: Category
}

export interface AuthResponse {
  user: User
  accessToken: string
  refreshToken: string
}

export interface ApiResponse<T> {
  success: boolean
  data: T
  message: string
}

export interface ApiError {
  success: false
  message: string
  code: string
}