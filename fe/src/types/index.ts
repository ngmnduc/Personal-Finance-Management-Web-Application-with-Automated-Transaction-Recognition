export interface User {
  id: string
  email: string
  name: string
  avatarUrl?: string
  createdAt: string
}

export type TransactionType = 'INCOME' | 'EXPENSE'
export type WalletType = 'cash' | 'bank' | 'e-wallet' | 'general'

export interface Wallet {
  id: string
  userId?: string
  name: string
  type: WalletType
  initialBalance: number | string
  currentBalance: number | string
  isDefault: boolean
  archivedAt?: string
}

export interface Category {
  color: any
  id: string
  userId?: string
  name: string
  type:TransactionType
  icon: string
  isDefault: boolean
}

export interface DashboardOverview {
  totalBalance: number
  wallets: Wallet[]
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