import { useCallback, useEffect, useRef, useState } from 'react'
import { useDropzone } from 'react-dropzone'
import { useForm, useWatch } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useNavigate } from 'react-router-dom'
import { toast } from 'sonner'
import { TransformWrapper, TransformComponent } from 'react-zoom-pan-pinch'
import {
  Upload,
  ImageIcon,
  RotateCcw,
  CheckCircle2,
  Loader2,
  ZoomIn,
  ZoomOut,
  RotateCw,
  Check,
  AlertTriangle,
  RefreshCw,
} from 'lucide-react'

import { Button } from '../../components/ui/button'
import { Input } from '../../components/ui/input'
import { Card, CardContent } from '../../components/ui/card'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../components/ui/select'
import ConfidenceBadge from '../../components/shared/ConfidenceBadge'

import { useWallets } from '../../features/wallets/api/wallet.api'
import { useCategories } from '../../features/categories/api/category.api'
import { useScanImage, useConfirmOCR, useScanBulk, type ScanResponse } from '../../features/ocr/api/ocr.api'
import ThumbnailItem, { type QueueItem, type QueueStatus } from '../../features/ocr/components/ThumbnailItem'
import { ROUTES } from '../../lib/constants'
import { useScanStore } from '../../features/ocr/stores/scan.store'
import { VndCurrencyInput } from '../../components/shared/VndCurrencyInput'

// ─── Form Schema ──────────────────────────────────────────────────────────────

const confirmSchema = z.object({
  amount: z.number({ error: 'Amount is required' }).positive('Amount must be greater than 0'),
  type: z.enum(['INCOME', 'EXPENSE']),
  transactionDate: z.string().min(1, 'Date is required'),
  categoryId: z.string().min(1, 'Category is required'),
  walletId: z.string().min(1, 'Wallet is required'),
  merchant: z.string().optional(),
  note: z.string().optional(),
})

type ConfirmFormValues = z.infer<typeof confirmSchema>

// ─── SingleThumbnailItem (inline sub-component) ────────────────────────────────────

function SingleThumbnailItem({ file, previewUrl }: { file: File; previewUrl: string }) {
  return (
    <div className="flex items-center gap-3 p-3 rounded-2xl border-2 border-[#0f1f3d] bg-white">
      <div className="w-14 h-14 rounded-xl overflow-hidden flex-shrink-0 bg-slate-100">
        {file.type.startsWith('image/') ? (
          <img src={previewUrl} alt={file.name} className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <ImageIcon size={24} className="text-slate-400" />
          </div>
        )}
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-xs font-semibold text-[#0f1f3d] truncate">{file.name}</p>
        <p className="text-[10px] text-slate-400 mt-0.5">{(file.size / 1024).toFixed(0)} KB</p>
      </div>
      <span className="flex-shrink-0 text-[10px] font-bold bg-emerald-500 text-white px-2 py-0.5 rounded-full">
        READY
      </span>
    </div>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────

// Removed local types as they are now in the store if needed

export default function ScanPage() {
  const navigate = useNavigate()

  // ── State ────────────────────────────────────────────────────────────────
  const {
    scanContext, scanPhase, previewUrl, scanResult, currentFile,
    activeTab, bulkPhase, bulkQueue, confirmingItemId, globalScanContext,
    singleFormValues, setStates, startCleanupTimer, clearCleanupTimer
  } = useScanStore()
  
  // Sử dụng ref để theo dõi giá trị tab và item trước đó nhằm ngăn chặn vòng lặp render vô hạn
  const prevTabRef = useRef(activeTab)
  const prevItemIdRef = useRef(confirmingItemId)

  const bulkFileInputRef = useRef<HTMLInputElement>(null)
  const MAX_BULK_FILES = 10

  // Invalidate data on unmount (3-minute TTL)
  useEffect(() => {
    clearCleanupTimer()
    return () => {
      startCleanupTimer(180000)
    }
  }, [clearCleanupTimer, startCleanupTimer])

  // ── Form ─────────────────────────────────────────────────────────────────
  const form = useForm<ConfirmFormValues>({
    resolver: zodResolver(confirmSchema),
    defaultValues: {
      type: 'EXPENSE',
      amount: undefined,
      transactionDate: '',
      categoryId: '',
      walletId: '',
      merchant: '',
      note: '',
    },
  })

  const watchedType = form.watch('type')
  const watchedWalletId = form.watch('walletId')

  // ── Data ─────────────────────────────────────────────────────────────────
  const { data: wallets = [] } = useWallets()
  const { data: categories = [] } = useCategories(watchedType as 'INCOME' | 'EXPENSE')
  const scanMutation = useScanImage()
  const confirmMutation = useConfirmOCR()
  const bulkScanMutation = useScanBulk()

  // ── Bulk form ─────────────────────────────────────────────────────────────
  const bulkForm = useForm<ConfirmFormValues>({
    resolver: zodResolver(confirmSchema),
    defaultValues: { type: 'EXPENSE', amount: undefined, transactionDate: '', categoryId: '', walletId: '', merchant: '', note: '' },
  })
  const bulkWatchedType = bulkForm.watch('type')
  const bulkWatchedWalletId = bulkForm.watch('walletId')
  const { data: bulkCategories = [] } = useCategories(bulkWatchedType as 'INCOME' | 'EXPENSE')

  // Sync bulk form when active item changes
  useEffect(() => {
    if (confirmingItemId !== prevItemIdRef.current) {
      if (confirmingItemId) {
        // Chỉ reset form khi thực sự thay đổi item đang được chọn trong bulk queue
        const item = bulkQueue.find((i) => i.id === confirmingItemId)
        if (item?.result) {
          const ex = item.result.extracted
          bulkForm.reset({
            type: ex.type ?? (globalScanContext.toUpperCase() as 'INCOME' | 'EXPENSE'),
            amount: ex.amount ?? undefined,
            transactionDate: ex.transaction_date ?? new Date().toISOString().split('T')[0],
            categoryId: item.result.suggested_category_id ?? '',
            walletId: item.result.default_wallet_id ?? '',
            merchant: ex.merchant ?? '',
            note: (item.result as any).note ?? '',
          })
        }
      }
      // Cập nhật ref lưu trữ ID item trước đó để chặn lặp
      prevItemIdRef.current = confirmingItemId
    }
  }, [confirmingItemId, globalScanContext, bulkForm])

  // ── Single Mode Form Synchronization ──────────────────────────────────────
  const sAmount = useWatch({ control: form.control, name: 'amount' })
  const sType = useWatch({ control: form.control, name: 'type' })
  const sDate = useWatch({ control: form.control, name: 'transactionDate' })
  const sCat = useWatch({ control: form.control, name: 'categoryId' })
  const sWallet = useWatch({ control: form.control, name: 'walletId' })
  const sMerchant = useWatch({ control: form.control, name: 'merchant' })
  const sNote = useWatch({ control: form.control, name: 'note' })

  useEffect(() => {
    if (activeTab === 'single' && scanPhase === 'confirm') {
      setStates({
        singleFormValues: {
          amount: sAmount, type: sType, transactionDate: sDate,
          categoryId: sCat, walletId: sWallet, merchant: sMerchant, note: sNote,
        },
      })
    }
  }, [sAmount, sType, sDate, sCat, sWallet, sMerchant, sNote, activeTab, scanPhase, setStates])

  useEffect(() => {
    if (activeTab === 'single' && prevTabRef.current !== 'single') {
      if (scanPhase === 'confirm' && singleFormValues) {
        // Khôi phục giá trị form Single Mode khi chuyển tab trở lại
        form.reset(singleFormValues)
      }
    }
    // Cập nhật ref lưu trữ tab trước đó để đánh dấu biên chuyển đổi tab
    prevTabRef.current = activeTab
  }, [activeTab, scanPhase, singleFormValues, form])

  // ── Bulk Mode Form Synchronization ────────────────────────────────────────
  const bAmount = useWatch({ control: bulkForm.control, name: 'amount' })
  const bType = useWatch({ control: bulkForm.control, name: 'type' })
  const bDate = useWatch({ control: bulkForm.control, name: 'transactionDate' })
  const bCat = useWatch({ control: bulkForm.control, name: 'categoryId' })
  const bWallet = useWatch({ control: bulkForm.control, name: 'walletId' })
  const bMerchant = useWatch({ control: bulkForm.control, name: 'merchant' })
  const bNote = useWatch({ control: bulkForm.control, name: 'note' })

  useEffect(() => {
    if (activeTab === 'bulk' && confirmingItemId) {
      const activeItem = bulkQueue.find((i) => i.id === confirmingItemId)
      if (activeItem?.result) {
        const ex = activeItem.result.extracted
        const currentCatId = activeItem.result.suggested_category_id ?? ''
        const currentWalletId = activeItem.result.default_wallet_id ?? ''
        const currentNote = (activeItem.result as any).note ?? ''

        const hasChanged =
          bAmount !== (ex.amount ?? undefined) ||
          bType !== (ex.type ?? 'EXPENSE') ||
          bDate !== (ex.transaction_date ?? '') ||
          bCat !== currentCatId ||
          bWallet !== currentWalletId ||
          bMerchant !== (ex.merchant ?? '') ||
          bNote !== currentNote

        if (hasChanged) {
          setStates((state) => {
            const updatedQueue = state.bulkQueue.map((item) => {
              if (item.id === confirmingItemId) {
                return {
                  ...item,
                  result: item.result ? {
                    ...item.result,
                    suggested_category_id: bCat,
                    default_wallet_id: bWallet,
                    extracted: {
                      ...item.result.extracted,
                      amount: bAmount,
                      type: bType,
                      transaction_date: bDate,
                      merchant: bMerchant,
                    },
                    note: bNote,
                  } : undefined
                }
              }
              return item
            })
            return { bulkQueue: updatedQueue }
          })
        }
      }
    }
  }, [bAmount, bType, bDate, bCat, bWallet, bMerchant, bNote, activeTab, confirmingItemId, bulkQueue, setStates])

  // ── Reset ─────────────────────────────────────────────────────────────────
  function resetToUpload() {
    if (previewUrl) URL.revokeObjectURL(previewUrl)
    setStates({ previewUrl: null, currentFile: null, scanResult: null, scanPhase: 'upload' })
    form.reset()
  }

  // ── Bulk handlers ──────────────────────────────────────────────────────────

  function moveToNextPendingItem(queue: QueueItem[]) {
    const next = queue.find((i) => !i.confirmed && !i.skipped && i.status !== 'error')
    setStates({ confirmingItemId: next?.id ?? null })
  }

  async function handleBulkFileSelect(files: FileList | null) {
    if (!files || files.length === 0) return
    const arr = Array.from(files)
    if (arr.length > MAX_BULK_FILES) {
      toast.warning(`Max ${MAX_BULK_FILES} files at a time. Only first ${MAX_BULK_FILES} will be used.`)
    }
    const limited = arr.slice(0, MAX_BULK_FILES)
    const queue: QueueItem[] = limited.map((f) => ({
      id: crypto.randomUUID(),
      file: f,
      previewUrl: URL.createObjectURL(f),
      status: 'queued' as QueueStatus,
      confirmed: false,
      skipped: false,
    }))
    setStates({ bulkQueue: queue })
    setStates({ bulkPhase: 'scanning' })
    await handleBulkScan(limited, queue)
  }

  async function handleBulkScan(files: File[], initialQueue: QueueItem[]) {
    try {
      const response = await bulkScanMutation.mutateAsync({ files, scanContext: globalScanContext })
      const updated = initialQueue.map((item, idx) => {
        const res = response.results[idx]
        if (!res || res.status === 'error') {
          return { ...item, status: 'error' as QueueStatus, result: res ? { extracted: res.extracted, extracted_text: res.extracted_text, suggested_category_id: res.suggested_category_id, default_wallet_id: res.default_wallet_id, error: res.error } : undefined }
        }
        const confidence = res.extracted.confidence ?? 0
        const autoReady = confidence >= 0.85 && !!res.suggested_category_id
        return {
          ...item,
          status: (autoReady ? 'ready' : 'needs_review') as QueueStatus,
          result: { extracted: res.extracted, extracted_text: res.extracted_text, suggested_category_id: res.suggested_category_id, default_wallet_id: res.default_wallet_id },
        }
      })
      setStates({ bulkQueue: updated })
      setStates({ bulkPhase: 'review' })
      moveToNextPendingItem(updated)
    } catch {
      toast.error('Bulk scan failed. Please try again.')
      setStates({ bulkPhase: 'upload' })
    }
  }

  async function handleConfirmItem(values: ConfirmFormValues) {
    if (!confirmingItemId) return
    const item = bulkQueue.find((i) => i.id === confirmingItemId)
    if (!item) return
    await confirmMutation.mutateAsync({
      amount: values.amount,
      transactionDate: values.transactionDate,
      type: values.type,
      categoryId: values.categoryId,
      walletId: values.walletId,
      merchant: values.merchant,
      note: values.note,
      extractedText: item.result?.extracted_text ?? '',
    })
    const updated = bulkQueue.map((i) => i.id === confirmingItemId ? { ...i, confirmed: true } : i)
    setStates({ bulkQueue: updated })
    moveToNextPendingItem(updated)
  }

  function handleSkipItem(itemId: string) {
    const updated = bulkQueue.map((i) => i.id === itemId ? { ...i, skipped: true } : i)
    setStates({ bulkQueue: updated })
    moveToNextPendingItem(updated)
  }

  async function handleConfirmAll() {
    const autoConfirmable = bulkQueue.filter(
      (i) => i.status === 'ready' && (i.result?.extracted.confidence ?? 0) >= 0.85 && !!i.result?.suggested_category_id && !i.confirmed && !i.skipped
    )
    if (autoConfirmable.length === 0) { toast.info('No items eligible for auto-confirm.'); return }
    let updated = [...bulkQueue]
    for (const item of autoConfirmable) {
      if (!item.result) continue
      const ex = item.result.extracted
      await confirmMutation.mutateAsync({
        amount: ex.amount ?? 0,
        transactionDate: ex.transaction_date ?? new Date().toISOString().split('T')[0],
        type: ex.type ?? 'EXPENSE',
        categoryId: item.result.suggested_category_id ?? '',
        walletId: item.result.default_wallet_id ?? '',
        extractedText: item.result.extracted_text,
      })
      updated = updated.map((i) => i.id === item.id ? { ...i, confirmed: true } : i)
    }
    setStates({ bulkQueue: updated })
    toast.success(`${autoConfirmable.length} transaction(s) confirmed!`)
    const focusOrder: QueueStatus[] = ['needs_review', 'error', 'queued']
    for (const s of focusOrder) {
      const next = updated.find((i) => i.status === s && !i.confirmed && !i.skipped)
      if (next) { setStates({ confirmingItemId: next.id }); break }
    }
  }

  async function handleReuploadItem(itemId: string, newFile: File) {
    const item = bulkQueue.find((i) => i.id === itemId)
    if (item?.previewUrl) {
      URL.revokeObjectURL(item.previewUrl)
    }
    const previewUrl = URL.createObjectURL(newFile)
    setStates((prev) => ({ bulkQueue: prev.bulkQueue.map((i) => i.id === itemId ? { ...i, file: newFile, previewUrl, status: 'queued' as QueueStatus, result: undefined } : i) }))
    try {
      const res = await scanMutation.mutateAsync({ file: newFile, scanContext: globalScanContext })
      const confidence = res.extracted.confidence ?? 0
      const autoReady = confidence >= 0.85 && !!res.suggested_category_id
      setStates((prev) => ({ bulkQueue: prev.bulkQueue.map((i) => i.id === itemId ? {
        ...i, status: (autoReady ? 'ready' : 'needs_review') as QueueStatus,
        result: { extracted: res.extracted, extracted_text: res.extracted_text, suggested_category_id: res.suggested_category_id, default_wallet_id: res.default_wallet_id },
      } : i) }))
      setStates({ confirmingItemId: itemId })
    } catch {
      setStates((prev) => ({ bulkQueue: prev.bulkQueue.map((i) => i.id === itemId ? { ...i, status: 'error' as QueueStatus } : i) }))
    }
  }

  // ── handleScan ────────────────────────────────────────────────────────────
  const handleScan = useCallback(
    async (file: File) => {
      setStates({ currentFile: file })
      const url = URL.createObjectURL(file)
      setStates({ previewUrl: url })
      setStates({ scanPhase: 'scanning' })

      try {
        const result = await scanMutation.mutateAsync({ file, scanContext })

        // Soft-error: confidence 0 or error string from Python
        if (result.extracted.confidence === 0 || result.extracted.error) {
          toast.warning(
            result.extracted.error
              ? `Scan issue: ${result.extracted.error}`
              : 'Could not extract data. Please fill in manually.',
          )
        }

        // Pre-fill form with AI results
        const ex = result.extracted
        const today = new Date().toISOString().split('T')[0]

        form.reset({
          type: ex.type ?? (scanContext.toUpperCase() as 'INCOME' | 'EXPENSE'),
          amount: ex.amount ?? undefined,
          transactionDate: ex.transaction_date ?? today,
          categoryId: result.suggested_category_id ?? '',
          walletId: result.default_wallet_id ?? '',
          merchant: ex.merchant ?? '',
          note: '',
        })

        setStates({ scanResult: result })
        setStates({ scanPhase: 'confirm' })
      } catch {
        toast.error('Failed to scan the file. Please try again.')
        setStates({ scanPhase: 'upload' })
      }
    },
    [scanContext, scanMutation, form],
  )

  // ── handleConfirm ─────────────────────────────────────────────────────────
  const handleConfirm = async (values: ConfirmFormValues) => {
    await confirmMutation.mutateAsync({
      amount: values.amount,
      transactionDate: values.transactionDate,
      type: values.type,
      categoryId: values.categoryId,
      walletId: values.walletId,
      merchant: values.merchant,
      note: values.note,
      extractedText: scanResult?.extracted_text ?? '',
    })
    // Giải phóng tài nguyên và xóa trạng thái store trước khi chuyển hướng
    useScanStore.getState().resetStore()
    navigate(ROUTES.TRANSACTIONS)
  }

  // ── Dropzone ──────────────────────────────────────────────────────────────
  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    accept: { 'image/*': [], 'application/pdf': [] },
    multiple: false,
    disabled: scanPhase !== 'upload',
    onDropAccepted: ([file]) => handleScan(file),
    onDropRejected: () => toast.error('Unsupported file type. Use images or PDF.'),
  })

  // ─────────────────────────────────────────────────────────────────────────
  // RENDER
  // ─────────────────────────────────────────────────────────────────────────

  return (
    <div className="min-h-full">
      <div className="max-w-[1400px] mx-auto px-4 md:px-8 pb-4 md:pb-8">

        {/* ── Header ── */}
        <div className="mb-4">
          <h1 className="text-3xl font-bold text-[#0f1f3d] tracking-tight">Scan Transfer</h1>
          <p className="text-slate-500 text-sm mt-1">
            Upload a bank transfer screenshot to auto-extract transaction details
          </p>
        </div>

        {/* ── Tabs (Single / Bulk) ── */}
        {/* ════════════════════════════════ CONTROL BAR ════════════════════════════════ */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
          {/* Left: Mode Toggle */}
          <div className="flex w-full sm:w-auto gap-1 p-1 bg-slate-100/50 rounded-xl sm:rounded-full border border-slate-200/50 shrink-0">
            <button
              onClick={() => setStates({ activeTab: 'single' })}
              className={`flex-1 sm:flex-none text-center justify-center rounded-lg sm:rounded-full px-5 py-2 text-sm font-bold transition-all duration-200 ${activeTab === 'single'
                ? 'bg-[#0f1f3d] text-white shadow-sm'
                : 'text-slate-500 hover:text-[#0f1f3d]'
                }`}
            >
              Single Scan
            </button>
            <button
              onClick={() => setStates({ activeTab: 'bulk' })}
              className={`flex-1 sm:flex-none text-center justify-center rounded-lg sm:rounded-full px-5 py-2 text-sm font-bold transition-all duration-200 ${activeTab === 'bulk'
                ? 'bg-[#0f1f3d] text-white shadow-sm'
                : 'text-slate-500 hover:text-[#0f1f3d]'
                }`}
            >
              Multiple Scans
            </button>
          </div>

          {/* Right: Type Toggle */}
          <div className="flex w-full sm:w-auto gap-2 p-1 bg-white rounded-xl border border-slate-100 shadow-sm shrink-0">
            {(['expense', 'income'] as const).map((ctx) => {
              const isActive = activeTab === 'single' ? scanContext === ctx : globalScanContext === ctx;
              return (
                <button
                  key={ctx}
                  type="button"
                  onClick={() => {
                    if (activeTab === 'single') setStates({ scanContext: ctx });
                    else setStates({ globalScanContext: ctx });
                  }}
                  className={`flex-1 sm:flex-none text-center justify-center px-4 py-1.5 rounded-lg text-sm font-bold capitalize transition-all duration-200 ${isActive
                    ? ctx === 'income'
                      ? 'bg-emerald-500 text-white'
                      : 'bg-red-500 text-white'
                    : 'text-slate-500 hover:text-slate-800'
                    }`}
                >
                  {ctx}
                </button>
              );
            })}
          </div>
        </div>

        {/* ═══════════════════════════════════════ SINGLE MODE ══════════════════════════════════════════ */}
        {activeTab === 'single' && (
          <>
            {/* ════════════════════════════════ UPLOAD PHASE ══════════════════════ */}
            {scanPhase === 'upload' && (
              <div className="max-w-2xl mx-auto">
                {/* Drop zone */}
                <Card className="bg-white rounded-[2rem] shadow-sm border border-slate-100">
                  <CardContent className="p-0">
                    <div
                      {...getRootProps()}
                      className={`min-h-[360px] flex flex-col items-center justify-center gap-5 py-20 px-8 rounded-[2rem] cursor-pointer transition-all duration-200 border-2 border-dashed ${isDragActive
                        ? 'border-[#10b981] bg-emerald-50/40'
                        : 'border-slate-200 hover:border-[#0f1f3d]/40 hover:bg-slate-50/50'
                        }`}
                    >
                      <input {...getInputProps()} />

                      <div
                        className={`w-20 h-20 rounded-2xl flex items-center justify-center transition-colors ${isDragActive ? 'bg-emerald-100' : 'bg-slate-100'
                          }`}
                      >
                        <Upload
                          size={36}
                          className={isDragActive ? 'text-emerald-600' : 'text-slate-400'}
                        />
                      </div>

                      <div className="text-center">
                        <p className="text-xl font-bold text-[#0f1f3d]">
                          {isDragActive
                            ? 'Drop it here!'
                            : 'Drop your bank transfer screenshot here'}
                        </p>
                        <p className="text-sm text-slate-400 mt-2">
                          Supports JPEG, PNG, WebP and PDF — max 10 MB
                        </p>
                      </div>

                      <div className="flex items-center gap-3">
                        <div className="h-px w-16 bg-slate-200" />
                        <span className="text-xs text-slate-400 font-medium">or</span>
                        <div className="h-px w-16 bg-slate-200" />
                      </div>

                      <span className="px-6 py-2.5 bg-[#0f1f3d] text-white text-sm font-bold rounded-xl hover:bg-[#1a2f57] transition-colors inline-block cursor-pointer">Choose from Library</span>
                    </div>
                  </CardContent>
                </Card>
              </div>
            )}

            {/* ═════════════════════════════ SCANNING PHASE ══════════════════════ */}
            {scanPhase === 'scanning' && (
              <div className="flex flex-col items-center justify-center py-32 gap-6">
                <div className="w-16 h-16 rounded-2xl bg-[#0f1f3d]/5 flex items-center justify-center">
                  <Loader2 size={32} className="text-[#0f1f3d] animate-spin" />
                </div>
                <div className="text-center">
                  <p className="text-lg font-bold text-[#0f1f3d]">Analyzing transfer receipt...</p>
                  <p className="text-sm text-slate-400 mt-1">AI is extracting transaction details</p>
                </div>
              </div>
            )}

            {/* ══════════════════════════════ CONFIRM PHASE ══════════════════════ */}
            {scanPhase === 'confirm' && scanResult && currentFile && previewUrl && (
              <form onSubmit={form.handleSubmit(handleConfirm)}>
                {/* 3-panel grid: [thumbnail | preview | form] */}
                <div className="grid grid-cols-1 lg:grid-cols-[280px_1fr_380px] gap-6">

                  {/* ── Panel 1 (mobile: order 3, desktop: order 1) — Documents ── */}
                  <div className="order-3 lg:order-1 flex flex-col gap-4">
                    <Card className="bg-white rounded-[2rem] shadow-sm border border-slate-100">
                      <CardContent className="p-5">
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-4">
                          Documents
                        </p>
                        <SingleThumbnailItem file={currentFile} previewUrl={previewUrl} />

                        <button
                          type="button"
                          onClick={resetToUpload}
                          className="mt-4 w-full flex items-center justify-center gap-2 py-2.5 text-sm font-semibold text-slate-500 hover:text-[#0f1f3d] rounded-xl border border-slate-200 hover:border-[#0f1f3d]/30 transition-all"
                        >
                          <RotateCcw size={14} />
                          Scan Another
                        </button>
                      </CardContent>
                    </Card>
                  </div>

                  {/* ── Panel 2 (mobile: order 1, desktop: order 2) — Preview ── */}
                  <div className="order-1 lg:order-2">
                    <Card className="bg-white rounded-[2rem] shadow-sm border border-slate-100 h-full">
                      <CardContent className="p-4 flex items-center justify-center h-full min-h-[400px]">
                        {currentFile.type.startsWith('image/') ? (
                          <img
                            src={previewUrl}
                            alt="Scanned document"
                            className="max-h-[600px] w-full object-contain rounded-2xl"
                          />
                        ) : (
                          <div className="flex flex-col items-center gap-3 text-slate-400">
                            <ImageIcon size={48} />
                            <p className="text-sm font-medium">PDF Document</p>
                            <p className="text-xs">{currentFile.name}</p>
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  </div>

                  {/* ── Panel 3 (mobile: order 2, desktop: order 3) — Confirm Form ── */}
                  <div className="order-2 lg:order-3 flex flex-col gap-4">
                    <Card className="bg-white rounded-[2rem] shadow-sm border border-slate-100">
                      <CardContent className="p-6 flex flex-col gap-5">

                        {/* Title */}
                        <div>
                          <p className="text-xl font-bold text-[#0f1f3d]">Confirm Details</p>
                          <p className="text-xs text-slate-400 mt-0.5">Review AI extraction and link to wallet</p>
                        </div>

                        {/* Amount */}
                        <VndCurrencyInput
                          control={form.control}
                          name="amount"
                          label="Total Amount (VND)"
                          placeholder="0"
                          error={form.formState.errors.amount}
                        />

                        {/* Date + Category */}
                        <div className="grid grid-cols-2 gap-3">
                          <div>
                            <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5">
                              Date
                            </label>
                            <Input
                              type="date"
                              className="h-11 bg-white border-slate-200 text-slate-800 rounded-xl focus-visible:ring-1 focus-visible:ring-[#0f1f3d] w-full px-3"
                              {...form.register('transactionDate')}
                            />
                            {form.formState.errors.transactionDate && (
                              <p className="text-red-500 text-xs mt-1">
                                {form.formState.errors.transactionDate.message}
                              </p>
                            )}
                          </div>
                          <div>
                            <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5">
                              Category
                            </label>
                            <Select
                              value={form.watch('categoryId')}
                              onValueChange={(v) =>
                                form.setValue('categoryId', v, { shouldValidate: true })
                              }
                            >
                              <SelectTrigger className="h-11 bg-white border-slate-200 text-slate-800 rounded-xl focus:ring-1 focus:ring-[#0f1f3d] w-full [&>span]:text-slate-800">
                                <SelectValue placeholder="Pick..." />
                              </SelectTrigger>
                              <SelectContent>
                                {categories.map((cat) => (
                                  <SelectItem key={cat.id} value={cat.id}>
                                    {cat.name}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                            {form.formState.errors.categoryId && (
                              <p className="text-red-500 text-xs mt-1">
                                {form.formState.errors.categoryId.message}
                              </p>
                            )}
                          </div>
                        </div>

                        {/* Merchant */}
                        <div>
                          <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5">
                            Merchant
                          </label>
                          <Input
                            type="text"
                            placeholder="e.g. Grab, Netflix..."
                            className="h-11 bg-white border-slate-200 text-slate-800 rounded-xl focus-visible:ring-1 focus-visible:ring-[#0f1f3d] w-full px-3"
                            {...form.register('merchant')}
                          />
                        </div>

                        {/* Source Wallet — card radio list (no <Select>) */}
                        <div>
                          <div className="flex items-center justify-between mb-2">
                            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                              Source Wallet
                            </label>
                            {scanResult.extracted.bank_detected && (
                              <span className="text-[10px] text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full font-medium">
                                ✦ Auto-detected
                              </span>
                            )}
                          </div>

                          <div className="flex flex-col gap-2 max-h-[200px] overflow-y-auto pr-1">
                            {wallets.map((wallet) => {
                              const isSelected = wallet.id === watchedWalletId
                              const isDetected =
                                wallet.id === scanResult.default_wallet_id &&
                                !!scanResult.extracted.bank_detected

                              return (
                                <button
                                  key={wallet.id}
                                  type="button"
                                  onClick={() =>
                                    form.setValue('walletId', wallet.id, { shouldValidate: true })
                                  }
                                  className={`w-full text-left flex items-center justify-between p-3 rounded-xl border-2 transition-all duration-150 ${isSelected
                                    ? 'border-[#0f1f3d] bg-[#0f1f3d]/5 ring-1 ring-[#0f1f3d]/20'
                                    : 'border-slate-200 hover:border-slate-300 bg-white'
                                    }`}
                                >
                                  <div className="min-w-0">
                                    <p
                                      className={`text-sm font-semibold truncate ${isSelected ? 'text-[#0f1f3d]' : 'text-slate-700'
                                        }`}
                                    >
                                      {wallet.name}
                                    </p>
                                    {isDetected && (
                                      <span className="text-[10px] text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full font-bold mt-1 inline-block">
                                        ✓ DETECTED: {scanResult.extracted.bank_detected}
                                      </span>
                                    )}
                                  </div>
                                  {isSelected && (
                                    <CheckCircle2 size={18} className="flex-shrink-0 text-[#0f1f3d]" />
                                  )}
                                </button>
                              )
                            })}
                          </div>

                          {form.formState.errors.walletId && (
                            <p className="text-red-500 text-xs mt-1">
                              {form.formState.errors.walletId.message}
                            </p>
                          )}
                        </div>

                        {/* Note */}
                        <div>
                          <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5">
                            Note{' '}
                            <span className="text-slate-300 normal-case font-normal">(optional)</span>
                          </label>
                          <textarea
                            rows={2}
                            placeholder="Add a note..."
                            className="w-full bg-white border border-slate-200 text-slate-800 rounded-xl focus:outline-none focus:ring-1 focus:ring-[#0f1f3d] focus:ring-offset-0 px-3 py-2 resize-none"
                            {...form.register('note')}
                          />
                        </div>

                        {/* Confidence badge */}
                        <div className="flex items-center justify-between pt-1 border-t border-slate-100">
                          <span className="text-[10px] text-slate-400 font-medium uppercase tracking-widest">
                            AI Confidence
                          </span>
                          <ConfidenceBadge score={scanResult.extracted.confidence} />
                        </div>

                        {/* Actions */}
                        <div className="flex gap-3 pt-1">
                          <Button
                            type="button"
                            variant="ghost"
                            className="flex-1 rounded-xl text-slate-500 hover:text-[#0f1f3d]"
                            onClick={resetToUpload}
                          >
                            Discard
                          </Button>
                          <Button
                            type="submit"
                            disabled={confirmMutation.isPending}
                            className="flex-1 bg-[#0f1f3d] text-white rounded-xl hover:bg-[#1a2f57] disabled:opacity-60"
                          >
                            {confirmMutation.isPending ? (
                              <span className="flex items-center gap-2">
                                <Loader2 size={14} className="animate-spin" />
                                Saving...
                              </span>
                            ) : (
                              'Confirm & Save'
                            )}
                          </Button>
                        </div>

                      </CardContent>
                    </Card>
                  </div>

                </div>
              </form>
            )}
          </>
        )}

        {/* ═══════════════════════════════════════ BULK MODE ════════════════════════════════════════════ */}
        {activeTab === 'bulk' && (
          <div>
            {/* ── Upload phase ── */}
            {bulkPhase === 'upload' && (
              <div className="max-w-2xl mx-auto">

                <Card className="bg-white rounded-[2rem] shadow-sm border border-slate-100">
                  <CardContent className="p-0">
                    <label htmlFor="bulk-file-input" className="min-h-[360px] flex flex-col items-center justify-center gap-5 py-20 px-8 rounded-[2rem] cursor-pointer transition-all duration-200 border-2 border-dashed border-slate-200 hover:border-[#0f1f3d]/40 hover:bg-slate-50/50">
                      <div className="w-20 h-20 rounded-2xl bg-slate-100 flex items-center justify-center">
                        <Upload size={36} className="text-slate-400" />
                      </div>
                      <div className="text-center">
                        <p className="text-xl font-bold text-[#0f1f3d]">Drop multiple receipts here</p>
                        <p className="text-sm text-slate-400 mt-2">Supports JPEG, PNG, WebP and PDF — max {MAX_BULK_FILES} files</p>
                      </div>

                      <div className="flex items-center gap-3">
                        <div className="h-px w-16 bg-slate-200" />
                        <span className="text-xs text-slate-400 font-medium">or</span>
                        <div className="h-px w-16 bg-slate-200" />
                      </div>

                      <span className="px-6 py-2.5 bg-[#0f1f3d] text-white text-sm font-bold rounded-xl hover:bg-[#1a2f57] transition-colors">
                        Choose Files
                      </span>
                    </label>
                    <input id="bulk-file-input" ref={bulkFileInputRef} type="file" accept="image/*,application/pdf" multiple className="hidden"
                      onChange={(e) => handleBulkFileSelect(e.target.files)} />
                  </CardContent>
                </Card>
              </div>
            )}

            {/* ── Scanning phase ── */}
            {bulkPhase === 'scanning' && (
              <div className="flex flex-col items-center justify-center py-32 gap-6">
                <div className="w-16 h-16 rounded-2xl bg-[#0f1f3d]/5 flex items-center justify-center">
                  <Loader2 size={32} className="text-[#0f1f3d] animate-spin" />
                </div>
                <div className="text-center">
                  <p className="text-lg font-bold text-[#0f1f3d]">Analyzing {bulkQueue.length} receipts...</p>
                  <p className="text-sm text-slate-400 mt-1">This may take up to 2 minutes</p>
                </div>
              </div>
            )}

            {/* ── Review phase — 3-column layout ── */}
            {bulkPhase === 'review' && (() => {
              const activeItem = bulkQueue.find((i) => i.id === confirmingItemId) ?? null
              const doneCount = bulkQueue.filter((i) => i.confirmed || i.skipped).length
              const autoConfirmCount = bulkQueue.filter((i) => i.status === 'ready' && (i.result?.extracted.confidence ?? 0) >= 0.85 && !!i.result?.suggested_category_id && !i.confirmed && !i.skipped).length
              return (
                <div className="grid grid-cols-1 lg:grid-cols-[280px_1fr_380px] gap-6">

                  {/* ── Col 1: Queue ── */}
                  <div className="flex flex-col gap-3">
                    <div className="text-xs font-bold text-slate-400 uppercase tracking-widest">
                      {doneCount}/{bulkQueue.length} processed
                    </div>
                    <div className="flex flex-col gap-2 max-h-[600px] overflow-y-auto pr-1">
                      {bulkQueue.map((item) => (
                        <ThumbnailItem key={item.id} item={item} isSelected={item.id === confirmingItemId} onClick={() => setStates({ confirmingItemId: item.id })} />
                      ))}
                    </div>
                    {doneCount === bulkQueue.length && bulkQueue.length > 0 ? (
                      <Button
                        onClick={() => {
                          // Dọn dẹp store để tránh rò rỉ bộ nhớ trước khi rời khỏi trang
                          useScanStore.getState().resetStore()
                          navigate(ROUTES.TRANSACTIONS)
                        }}
                        className="w-full bg-[#10b981] text-white rounded-xl hover:bg-[#0ea572] shadow-md"
                      >
                        <CheckCircle2 size={16} className="mr-2" /> Finish & View Transactions
                      </Button>
                    ) : (
                      <Button
                        onClick={handleConfirmAll}
                        disabled={autoConfirmCount === 0 || confirmMutation.isPending}
                        className="w-full bg-[#0f1f3d] text-white rounded-xl hover:bg-[#1a2f57] disabled:opacity-50"
                      >
                        <Check size={14} className="mr-1" /> Auto-Confirm Ready ({autoConfirmCount})
                      </Button>
                    )}
                    <Button variant="outline" onClick={() => { bulkQueue.forEach((i) => URL.revokeObjectURL(i.previewUrl)); setStates({ bulkQueue: [], bulkPhase: 'upload', confirmingItemId: null }) }}
                      className="w-full rounded-xl border-slate-200 text-slate-500 hover:text-[#0f1f3d]">
                      <RefreshCw size={14} className="mr-1" /> Reset Batch
                    </Button>
                  </div>

                  {/* ── Col 2: Image Viewer ── */}
                  <div>
                    <Card className="bg-white rounded-[2rem] shadow-sm border border-slate-100 h-full">
                      <CardContent className="p-3 flex flex-col h-full min-h-[480px]">
                        {activeItem ? (
                          <>
                            <TransformWrapper initialScale={1} minScale={0.3} maxScale={5}>
                              {({ zoomIn, zoomOut, resetTransform }) => (
                                <>
                                  <div className="flex items-center justify-end gap-2 mb-2">
                                    <button onClick={() => zoomOut()} className="p-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-600"><ZoomOut size={16} /></button>
                                    <button onClick={() => zoomIn()} className="p-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-600"><ZoomIn size={16} /></button>
                                    <button onClick={() => resetTransform()} className="p-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-600"><RotateCw size={16} /></button>
                                  </div>
                                  <TransformComponent wrapperClass="!w-full !flex-1 rounded-2xl overflow-hidden bg-slate-50" contentClass="!w-full !h-full flex items-center justify-center">
                                    <img src={activeItem.previewUrl} alt={activeItem.file.name} className="max-w-full max-h-[520px] object-contain rounded-xl" />
                                  </TransformComponent>
                                </>
                              )}
                            </TransformWrapper>
                            <p className="text-xs text-slate-400 text-center mt-2 truncate">{activeItem.file.name}</p>
                          </>
                        ) : (
                          <div className="flex-1 flex flex-col items-center justify-center gap-3 text-slate-400">
                            <ImageIcon size={48} />
                            <p className="text-sm font-medium">Select an item from the queue</p>
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  </div>

                  {/* ── Col 3: Right Panel ── */}
                  <div className="h-full flex flex-col">
                    {(() => {
                      // 1. Chưa chọn item -> Render Batch Summary
                      if (!activeItem) {
                        return (
                          <Card className="bg-white rounded-[2rem] shadow-sm border border-slate-100">
                            <CardContent className="p-6 flex flex-col gap-4">
                              <p className="text-lg font-bold text-[#0f1f3d]">Batch Summary</p>
                              {[
                                { label: 'Confirmed', count: bulkQueue.filter((i) => i.confirmed).length, color: 'text-emerald-600' },
                                { label: 'Needs Review', count: bulkQueue.filter((i) => i.status === 'needs_review' && !i.confirmed && !i.skipped).length, color: 'text-amber-600' },
                                { label: 'Errors', count: bulkQueue.filter((i) => i.status === 'error').length, color: 'text-red-500' },
                                { label: 'Skipped', count: bulkQueue.filter((i) => i.skipped).length, color: 'text-slate-400' },
                              ].map(({ label, count, color }) => (
                                <div key={label} className="flex items-center justify-between">
                                  <span className="text-sm text-slate-500">{label}</span>
                                  <span className={`text-sm font-bold ${color}`}>{count}</span>
                                </div>
                              ))}
                            </CardContent>
                          </Card>
                        )
                      }

                      // 2. Lỗi -> Render Error Panel
                      if (activeItem.status === 'error') {
                        return (
                          <Card className="bg-white rounded-[2rem] shadow-sm border border-slate-100">
                            <CardContent className="p-6 flex flex-col gap-4">
                              <div className="flex items-start gap-3 p-4 bg-red-50 rounded-2xl border border-red-100">
                                <AlertTriangle size={20} className="text-red-500 flex-shrink-0 mt-0.5" />
                                <div>
                                  <p className="text-sm font-bold text-red-700">Scan Failed</p>
                                  <p className="text-xs text-red-500 mt-1">{activeItem.result?.error ?? 'Unknown error occurred'}</p>
                                </div>
                              </div>
                              <label className="flex flex-col items-center gap-2 p-4 border-2 border-dashed border-slate-200 rounded-2xl cursor-pointer hover:border-slate-400 transition-colors">
                                <RefreshCw size={18} className="text-slate-400" />
                                <span className="text-sm font-semibold text-slate-500">Replace with new image</span>
                                <input type="file" accept="image/*,application/pdf" className="hidden"
                                  onChange={(e) => { const f = e.target.files?.[0]; if (f && activeItem) handleReuploadItem(activeItem.id, f); e.target.value = '' }} />
                              </label>
                            </CardContent>
                          </Card>
                        )
                      }

                      // 3. Đang chờ/Đang quét -> Render Loading (Thêm mới để chống trắng màn hình)
                      if (activeItem.status === 'queued' || activeItem.status === 'scanning') {
                        return (
                          <Card className="bg-white rounded-[2rem] shadow-sm border border-slate-100 h-full flex items-center justify-center">
                            <CardContent className="p-6 flex flex-col items-center gap-3 text-slate-400">
                              <Loader2 size={32} className="animate-spin text-[#0f1f3d]/40" />
                              <p className="text-sm font-medium">Processing image data...</p>
                            </CardContent>
                          </Card>
                        )
                      }

                      // 4. Ready / Needs Review -> Render Confirm Form
                      return (
                        <Card className="bg-white rounded-[2rem] shadow-sm border border-slate-100">
                          <CardContent className="p-6">
                            <form onSubmit={bulkForm.handleSubmit(handleConfirmItem)} className="flex flex-col gap-5">
                              <div>
                                <p className="text-lg font-bold text-[#0f1f3d]">Confirm Details</p>
                                <p className="text-xs text-slate-400 mt-0.5">Review AI extraction and save transaction</p>
                              </div>
                              {/* Amount */}
                              <VndCurrencyInput
                                control={bulkForm.control}
                                name="amount"
                                label="Total Amount (VND)"
                                placeholder="0"
                                error={bulkForm.formState.errors.amount}
                              />
                              {/* Date + Category */}
                              <div className="grid grid-cols-2 gap-3">
                                <div>
                                  <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5">Date</label>
                                  <input type="date" className="flex h-11 w-full rounded-xl border border-slate-200 bg-white text-slate-800 px-3 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[#0f1f3d]" {...bulkForm.register('transactionDate')} />
                                </div>
                                <div>
                                  <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5">Category</label>
                                  <Select value={bulkForm.watch('categoryId')} onValueChange={(v) => bulkForm.setValue('categoryId', v, { shouldValidate: true })}>
                                    <SelectTrigger className="h-11 bg-white border-slate-200 text-slate-800 rounded-xl focus:ring-1 focus:ring-[#0f1f3d] w-full [&>span]:text-slate-800"><SelectValue placeholder="Pick..." /></SelectTrigger>
                                    <SelectContent>{bulkCategories.map((cat) => <SelectItem key={cat.id} value={cat.id}>{cat.name}</SelectItem>)}</SelectContent>
                                  </Select>
                                </div>
                              </div>
                              {/* Merchant */}
                              <div>
                                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5">Merchant</label>
                                <input type="text" placeholder="e.g. Grab, Netflix..." className="flex h-11 w-full rounded-xl border border-slate-200 bg-white text-slate-800 px-3 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[#0f1f3d]" {...bulkForm.register('merchant')} />
                              </div>
                              {/* Wallet */}
                              <div>
                                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">Source Wallet</label>
                                <div className="flex flex-col gap-2 max-h-[160px] overflow-y-auto pr-1">
                                  {wallets.map((wallet) => {
                                    const isSel = wallet.id === bulkWatchedWalletId
                                    return (
                                      <button key={wallet.id} type="button" onClick={() => bulkForm.setValue('walletId', wallet.id, { shouldValidate: true })}
                                        className={`w-full text-left flex items-center justify-between p-3 rounded-xl border-2 transition-all duration-150 ${isSel ? 'border-[#0f1f3d] bg-[#0f1f3d]/5' : 'border-slate-200 hover:border-slate-300 bg-white'}`}>
                                        <p className={`text-sm font-semibold truncate ${isSel ? 'text-[#0f1f3d]' : 'text-slate-700'}`}>{wallet.name}</p>
                                        {isSel && <CheckCircle2 size={16} className="flex-shrink-0 text-[#0f1f3d]" />}
                                      </button>
                                    )
                                  })}
                                </div>
                              </div>
                              {/* Confidence */}
                              {activeItem.result && (
                                <div className="flex items-center justify-between pt-1 border-t border-slate-100">
                                  <span className="text-[10px] text-slate-400 font-medium uppercase tracking-widest">AI Confidence</span>
                                  <ConfidenceBadge score={activeItem.result.extracted.confidence} />
                                </div>
                              )}
                              {/* Actions */}
                              <div className="flex gap-3 pt-1">
                                <Button type="button" variant="outline" className="flex-1 rounded-xl border-slate-200 text-slate-500 hover:text-[#0f1f3d]" onClick={() => handleSkipItem(activeItem.id)}>Skip</Button>
                                <Button type="submit" disabled={confirmMutation.isPending} className="flex-1 bg-[#0f1f3d] text-white rounded-xl hover:bg-[#1a2f57] disabled:opacity-60">
                                  {confirmMutation.isPending ? <span className="flex items-center gap-2"><Loader2 size={14} className="animate-spin" />Saving...</span> : 'Confirm & Save'}
                                </Button>
                              </div>
                            </form>
                          </CardContent>
                        </Card>
                      )
                    })()}
                  </div>
                </div>
              )
            })()}
          </div>
        )}

      </div>
    </div>
  )
}
