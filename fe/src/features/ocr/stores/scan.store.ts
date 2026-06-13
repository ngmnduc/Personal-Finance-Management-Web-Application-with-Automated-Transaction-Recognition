import { create } from 'zustand';
import type { QueueItem } from '../components/ThumbnailItem';
import type { ScanResponse } from '../api/ocr.api';

export type ScanPhase = 'upload' | 'scanning' | 'confirm';
export type ScanContext = 'expense' | 'income';

interface ScanState {
  scanContext: ScanContext;
  scanPhase: ScanPhase;
  previewUrl: string | null;
  scanResult: ScanResponse | null;
  currentFile: File | null;
  activeTab: 'single' | 'bulk';
  bulkPhase: 'upload' | 'scanning' | 'review';
  bulkQueue: QueueItem[];
  confirmingItemId: string | null;
  globalScanContext: ScanContext;
  cleanupTimeoutId: ReturnType<typeof setTimeout> | null;
  singleFormValues: any | null; // Lưu trữ giá trị form Single Mode khi chuyển tab

  setStates: (fields: Partial<ScanState> | ((state: ScanState) => Partial<ScanState>)) => void;
  startCleanupTimer: (delayMs?: number) => void;
  clearCleanupTimer: () => void;
  resetStore: () => void;
}

const defaultState = {
  scanContext: 'expense' as ScanContext,
  scanPhase: 'upload' as ScanPhase,
  previewUrl: null,
  scanResult: null,
  currentFile: null,
  activeTab: 'single' as const,
  bulkPhase: 'upload' as const,
  bulkQueue: [],
  confirmingItemId: null,
  globalScanContext: 'expense' as ScanContext,
  cleanupTimeoutId: null,
  singleFormValues: null, // Khởi tạo giá trị form mặc định là null để dọn dẹp bộ nhớ khi reset
};

export const useScanStore = create<ScanState>((set, get) => ({
  ...defaultState,

  setStates: (fields) => set((state) => (typeof fields === 'function' ? fields(state) : fields)),

  startCleanupTimer: (delayMs = 180000) => {
    const { cleanupTimeoutId } = get();
    if (cleanupTimeoutId) {
      clearTimeout(cleanupTimeoutId);
    }
    const timeoutId = setTimeout(() => {
      get().resetStore();
    }, delayMs);
    set({ cleanupTimeoutId: timeoutId });
  },

  clearCleanupTimer: () => {
    const { cleanupTimeoutId } = get();
    if (cleanupTimeoutId) {
      clearTimeout(cleanupTimeoutId);
      set({ cleanupTimeoutId: null });
    }
  },

  resetStore: () => {
    const { previewUrl, bulkQueue, cleanupTimeoutId } = get();

    if (previewUrl) URL.revokeObjectURL(previewUrl);
    bulkQueue.forEach((item) => {
      if (item.previewUrl) URL.revokeObjectURL(item.previewUrl);
    });

    if (cleanupTimeoutId) clearTimeout(cleanupTimeoutId);

    set({ ...defaultState });
  },
}));
