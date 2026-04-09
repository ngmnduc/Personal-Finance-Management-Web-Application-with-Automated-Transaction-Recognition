import { create } from 'zustand'

interface UiState {
  isLoading: boolean
  selectedWalletId: string | null
  setLoading: (v: boolean) => void
  setSelectedWallet: (id: string | null) => void
}

export const useUiStore = create<UiState>()((set) => ({
  isLoading: false,
  selectedWalletId: null,
  setLoading: (v) => set({ isLoading: v }),
  setSelectedWallet: (id) => set({ selectedWalletId: id }),
}))