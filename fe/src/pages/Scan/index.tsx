import { useCallback, useEffect, useRef, useState } from 'react'
import { useDropzone } from 'react-dropzone'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useNavigate } from 'react-router-dom'
import { toast } from 'sonner'
import {
  Upload,
  ImageIcon,
  RotateCcw,
  CheckCircle2,
  Loader2,
} from 'lucide-react'

import { Button } from '../../components/ui/button'
import { Input } from '../../components/ui/input'
import { Card, CardContent } from '../../components/ui/card'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../components/ui/select'
import ConfidenceBadge from '../../components/shared/ConfidenceBadge'
import PageSkeleton from '../../components/shared/PageSkeleton'

import { useWallets } from '../../features/wallets/api/wallet.api'
import { useCategories } from '../../features/categories/api/category.api'
import { useScanImage, useConfirmOCR, type ScanResponse } from '../../features/ocr/api/ocr.api'
import { ROUTES } from '../../lib/constants'

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

// ─── ThumbnailItem (inline sub-component) ────────────────────────────────────

function ThumbnailItem({ file, previewUrl }: { file: File; previewUrl: string }) {
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

type ScanPhase = 'upload' | 'scanning' | 'confirm'
type ScanContext = 'expense' | 'income'

export default function ScanPage() {
  const navigate = useNavigate()

  // ── State ────────────────────────────────────────────────────────────────
  const [scanContext, setScanContext] = useState<ScanContext>('expense')
  const [scanPhase, setScanPhase] = useState<ScanPhase>('upload')
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const [scanResult, setScanResult] = useState<ScanResponse | null>(null)
  const [currentFile, setCurrentFile] = useState<File | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [isLockClick, setIsLockClick] = useState(false)

  // Revoke object URL on unmount to prevent memory leaks
  useEffect(() => {
    return () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl)
    }
  }, [previewUrl])

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

  // ── Reset ─────────────────────────────────────────────────────────────────
  function resetToUpload() {
    if (previewUrl) URL.revokeObjectURL(previewUrl)
    setPreviewUrl(null)
    setCurrentFile(null)
    setScanResult(null)
    setScanPhase('upload')
    form.reset()
  }

  // ── handleScan ────────────────────────────────────────────────────────────
  const handleScan = useCallback(
    async (file: File) => {
      setCurrentFile(file)
      const url = URL.createObjectURL(file)
      setPreviewUrl(url)
      setScanPhase('scanning')

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

        setScanResult(result)
        setScanPhase('confirm')
      } catch {
        toast.error('Failed to scan the file. Please try again.')
        setScanPhase('upload')
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
    navigate(ROUTES.TRANSACTIONS)
  }

  // ── Dropzone ──────────────────────────────────────────────────────────────
  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    accept: { 'image/*': [], 'application/pdf': [] },
    multiple: false,
    disabled: scanPhase !== 'upload' || isLockClick,
    onDropAccepted: ([file]) => handleScan(file),
    onDropRejected: () => toast.error('Unsupported file type. Use images or PDF.'),
  })

  // ─────────────────────────────────────────────────────────────────────────
  // RENDER
  // ─────────────────────────────────────────────────────────────────────────

  return (
    <div className="min-h-full bg-[#f0f4f8]">
      <div className="max-w-[1400px] mx-auto p-8">

        {/* ── Header ── */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-[#0f1f3d] tracking-tight">Scan Transfer</h1>
          <p className="text-slate-500 text-sm mt-1">
            Upload a bank transfer screenshot to auto-extract transaction details
          </p>
        </div>

        {/* ── Tabs (Single / Bulk) ── */}
        <div className="flex gap-1 p-1 bg-white rounded-2xl border border-slate-100 shadow-sm w-fit mb-8">
          <button
            className="px-5 py-2 rounded-xl text-sm font-bold bg-[#0f1f3d] text-white"
          >
            Single Scan
          </button>
          <button
            className="px-5 py-2 rounded-xl text-sm font-bold text-slate-500 hover:text-[#0f1f3d] transition-colors"
            onClick={() => toast.info('Bulk mode coming soon!')}
          >
            Bulk Mode
          </button>
        </div>

        {/* ════════════════════════════════ UPLOAD PHASE ══════════════════════ */}
        {scanPhase === 'upload' && (
          <div className="max-w-2xl mx-auto">
            {/* Context toggle */}
            <div className="flex gap-2 mb-6 p-1 bg-white rounded-xl border border-slate-100 shadow-sm w-fit">
              {(['expense', 'income'] as ScanContext[]).map((ctx) => (
                <button
                  key={ctx}
                  type="button"
                  onClick={() => setScanContext(ctx)}
                  className={`px-4 py-1.5 rounded-lg text-sm font-bold capitalize transition-all duration-200 ${
                    scanContext === ctx
                      ? ctx === 'income'
                        ? 'bg-emerald-500 text-white'
                        : 'bg-red-500 text-white'
                      : 'text-slate-500 hover:text-slate-800'
                  }`}
                >
                  {ctx}
                </button>
              ))}
            </div>

            {/* Drop zone */}
            <Card className="bg-white rounded-[2rem] shadow-sm border border-slate-100">
              <CardContent className="p-0">
                <div
                  {...getRootProps()}
                  className={`flex flex-col items-center justify-center gap-5 py-20 px-8 rounded-[2rem] cursor-pointer transition-all duration-200 border-2 border-dashed ${
                    isDragActive
                      ? 'border-[#10b981] bg-emerald-50/40'
                      : 'border-slate-200 hover:border-[#0f1f3d]/40 hover:bg-slate-50/50'
                  }`}
                >
                  <input {...getInputProps()} />

                  <div
                    className={`w-20 h-20 rounded-2xl flex items-center justify-center transition-colors ${
                      isDragActive ? 'bg-emerald-100' : 'bg-slate-100'
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

                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation()
                      if (isLockClick) return // Nếu đang khóa thì bỏ qua click 
                      
                      setIsLockClick(true) // Bật khóa
                      fileInputRef.current?.click() // Mở cửa sổ chọn file
                      
                      // Tự động mở khóa sau 1 giây (1000ms) để chống bấm đúp
                      setTimeout(() => setIsLockClick(false), 1000)
                    }}
                    // Thêm disabled để UI mờ đi nếu dính spam click
                    disabled={isLockClick || scanPhase !== 'upload'}
                    className="px-6 py-2.5 bg-[#0f1f3d] text-white text-sm font-bold rounded-xl hover:bg-[#1a2f57] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Choose from Library
                  </button>

                  {/* Hidden native file input for "Choose from Library" */}
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*,application/pdf"
                    className="hidden"
                    onChange={(e) => {
                      const file = e.target.files?.[0]
                      if (file) handleScan(file)
                      e.target.value = ''
                    }}
                  />
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
            <PageSkeleton />
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
                    <ThumbnailItem file={currentFile} previewUrl={previewUrl} />

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

                    {/* Type Toggle */}
                    <div className="flex gap-2 p-1 bg-slate-100 rounded-xl">
                      {(['EXPENSE', 'INCOME'] as const).map((t) => (
                        <button
                          key={t}
                          type="button"
                          onClick={() => form.setValue('type', t)}
                          className={`flex-1 py-1.5 px-3 rounded-lg text-xs font-bold transition-all duration-200 ${
                            watchedType === t
                              ? t === 'INCOME'
                                ? 'bg-emerald-500 text-white shadow-sm'
                                : 'bg-red-500 text-white shadow-sm'
                              : 'bg-transparent text-slate-500'
                          }`}
                        >
                          {t === 'INCOME' ? '↑ Income' : '↓ Expense'}
                        </button>
                      ))}
                    </div>

                    {/* Amount — large text input */}
                    <div>
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">
                        Total Amount
                      </p>
                      <div className="flex items-baseline gap-1">
                        <span className="text-2xl font-bold text-slate-400">₫</span>
                        <input
                          type="number"
                          min="0"
                          step="any"
                          placeholder="0"
                          className="text-4xl font-bold text-[#0f1f3d] w-full bg-transparent border-none outline-none focus:ring-0 placeholder:text-slate-200"
                          {...form.register('amount', { valueAsNumber: true })}
                        />
                      </div>
                      {form.formState.errors.amount && (
                        <p className="text-red-500 text-xs mt-1">
                          {form.formState.errors.amount.message}
                        </p>
                      )}
                    </div>

                    {/* Date + Category */}
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5">
                          Date
                        </label>
                        <Input
                          type="date"
                          className="rounded-xl border-slate-200 text-sm"
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
                          <SelectTrigger className="rounded-xl border-slate-200 text-sm">
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
                        className="rounded-xl border-slate-200 text-sm"
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
                              className={`w-full text-left flex items-center justify-between p-3 rounded-xl border-2 transition-all duration-150 ${
                                isSelected
                                  ? 'border-[#0f1f3d] bg-[#0f1f3d]/5 ring-1 ring-[#0f1f3d]/20'
                                  : 'border-slate-200 hover:border-slate-300 bg-white'
                              }`}
                            >
                              <div className="min-w-0">
                                <p
                                  className={`text-sm font-semibold truncate ${
                                    isSelected ? 'text-[#0f1f3d]' : 'text-slate-700'
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
                        className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#0f1f3d] focus:ring-offset-2 resize-none"
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

      </div>
    </div>
  )
}