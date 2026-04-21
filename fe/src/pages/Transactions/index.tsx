import { useState, useMemo } from 'react'
import {
  useReactTable,
  getCoreRowModel,
  flexRender,
  createColumnHelper,
  type ColumnDef,
} from '@tanstack/react-table'
import { Plus, Search, RotateCcw, Pencil, Trash2, ChevronLeft, ChevronRight } from 'lucide-react'
import { Button } from '../../components/ui/button'
import { Input } from '../../components/ui/input'
import { Card, CardContent } from '../../components/ui/card'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../../components/ui/select'
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogCancel,
  AlertDialogAction,
} from '../../components/ui/alert-dialog'
import { useDebounce } from '../../hooks/useDebounce'
import { useWallets } from '../../features/wallets/api/wallet.api'
import { useCategories } from '../../features/categories/api/category.api'
import {
  useTransactions,
  useDeleteTransaction,
  type TransactionFilters,
} from '../../features/transactions/api/transaction.api'
import TransactionDialog from '../../features/transactions/components/TransactionDialog'
import { Transaction } from '../../types'

// ─── Helpers ─────────────────────────────────────────────────────────────────

const vndFormatter = new Intl.NumberFormat('vi-VN', {
  style: 'currency',
  currency: 'VND',
})

function formatDate(dateStr: string) {
  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: '2-digit',
    year: 'numeric',
  }).format(new Date(dateStr))
}

// ─── Default Filters ─────────────────────────────────────────────────────────

const DEFAULT_FILTERS: TransactionFilters = {
  page: 1,
  limit: 20,
}

// ─── Column Helper ───────────────────────────────────────────────────────────

const columnHelper = createColumnHelper<Transaction>()

// ─── Page Component ──────────────────────────────────────────────────────────

export default function TransactionsPage() {
  const [filters, setFilters] = useState<TransactionFilters>(DEFAULT_FILTERS)
  const [searchInput, setSearchInput] = useState('')
  const debouncedSearch = useDebounce(searchInput, 400)

  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingTransaction, setEditingTransaction] = useState<Transaction | undefined>(undefined)
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null)

  // Sync debounced search into filters
  const activeFilters = useMemo<TransactionFilters>(
    () => ({ ...filters, search: debouncedSearch || undefined }),
    [filters, debouncedSearch]
  )

  const { data, isLoading } = useTransactions(activeFilters)
  const { data: wallets = [] } = useWallets()
  const { data: allCategories = [] } = useCategories()
  const deleteMutation = useDeleteTransaction()

  const transactions = data?.transactions ?? []
  const pagination = data?.pagination

  // ─── Filter updater ───────────────────────────────────────────────────────

  function updateFilter<K extends keyof TransactionFilters>(key: K, value: TransactionFilters[K]) {
    setFilters((prev) => ({ ...prev, [key]: value, page: 1 }))
  }

  function resetFilters() {
    setFilters(DEFAULT_FILTERS)
    setSearchInput('')
  }

  // ─── Columns ─────────────────────────────────────────────────────────────

  const columns = useMemo<ColumnDef<Transaction, unknown>[]>(
    () => [
      columnHelper.accessor('transactionDate', {
        header: 'Date',
        cell: (info) => (
          <span className="text-slate-600 text-sm whitespace-nowrap">{formatDate(info.getValue())}</span>
        ),
      }),
      columnHelper.accessor('type', {
        header: 'Type',
        cell: (info) => {
          const type = info.getValue()
          return (
            <span
              className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold ${type === 'INCOME'
                  ? 'bg-emerald-100 text-emerald-700'
                  : 'bg-red-100 text-red-600'
                }`}
            >
              {type === 'INCOME' ? '↑' : '↓'} {type}
            </span>
          )
        },
      }),
      columnHelper.accessor('amount', {
        header: 'Amount',
        cell: (info) => {
          const row = info.row.original
          const formatted = vndFormatter.format(Number(info.getValue()))
          return (
            <span
              className={`font-bold text-sm ${row.type === 'INCOME' ? 'text-emerald-600' : 'text-red-500'
                }`}
            >
              {row.type === 'INCOME' ? '+' : '-'} {formatted}
            </span>
          )
        },
      }),
      columnHelper.accessor('category', {
        header: 'Category',
        cell: (info) => {
          const cat = info.getValue()
          if (!cat) return <span className="text-slate-400 text-sm">—</span>
          return (
            <span className="text-sm text-slate-700">{cat.name}</span>
          )
        },
      }),
      columnHelper.accessor('wallet', {
        header: 'Wallet',
        cell: (info) => {
          const wallet = info.getValue()
          return (
            <span className="text-sm text-slate-600">{wallet?.name ?? '—'}</span>
          )
        },
      }),
      columnHelper.accessor('merchant', {
        header: 'Merchant',
        cell: (info) => {
          const val = info.getValue()
          return (
            <span className="text-sm text-slate-500 truncate max-w-[120px] block">
              {val || '—'}
            </span>
          )
        },
      }),
      columnHelper.display({
        id: 'actions',
        header: '',
        cell: ({ row }) => (
          <div className="flex items-center gap-1">
            <button
              id={`edit-tx-${row.original.id}`}
              onClick={() => {
                setEditingTransaction(row.original)
                setDialogOpen(true)
              }}
              className="p-1.5 rounded-lg text-slate-400 hover:text-[#0f1f3d] hover:bg-slate-100 transition-colors"
              title="Edit"
            >
              <Pencil size={15} />
            </button>
            <button
              id={`delete-tx-${row.original.id}`}
              onClick={() => setDeleteConfirmId(row.original.id)}
              className="p-1.5 rounded-lg text-slate-400 hover:text-red-500 hover:bg-red-50 transition-colors"
              title="Delete"
            >
              <Trash2 size={15} />
            </button>
          </div>
        ),
      }),
    ],
    []
  )

  const table = useReactTable({
    data: transactions,
    columns,
    getCoreRowModel: getCoreRowModel(),
    manualPagination: true,
    pageCount: pagination?.totalPages ?? 0,
  })

  // ─── Delete handler ───────────────────────────────────────────────────────

  function handleDelete() {
    if (!deleteConfirmId) return
    deleteMutation.mutate(deleteConfirmId, {
      onSuccess: () => setDeleteConfirmId(null),
    })
  }

  // ─── Pagination bounds ────────────────────────────────────────────────────

  const currentPage = pagination?.page ?? 1
  const totalPages = pagination?.totalPages ?? 1
  const total = pagination?.total ?? 0
  const from = total === 0 ? 0 : (currentPage - 1) * activeFilters.limit + 1
  const to = Math.min(currentPage * activeFilters.limit, total)

  // ─── Render ───────────────────────────────────────────────────────────────

  return (
    <div className="min-h-full bg-[#f0f4f8]">
      <div className="max-w-[1400px] mx-auto p-8">

        {/* ── Header ── */}
        <div className="flex items-start justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-[#0f1f3d] tracking-tight">Transactions</h1>
            <p className="text-slate-500 text-sm mt-1">Track and manage all your financial activity</p>
          </div>
          <Button
            id="new-transaction-btn"
            onClick={() => {
              setEditingTransaction(undefined)
              setDialogOpen(true)
            }}
            className="bg-[#0f1f3d] text-white rounded-xl hover:bg-[#1a2f57] flex items-center gap-2 px-5"
          >
            <Plus size={18} />
            New Transaction
          </Button>
        </div>

        {/* ── Filter Bar ── */}
        <Card className="bg-white rounded-[2rem] shadow-sm border border-slate-100 mb-6">
          <CardContent className="p-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 xl:grid-cols-7 gap-3">

              {/* Search */}
              <div className="relative xl:col-span-2">
                <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <Input
                  id="transaction-search"
                  type="text"
                  placeholder="Search transactions..."
                  value={searchInput}
                  onChange={(e) => {
                    setSearchInput(e.target.value)
                    setFilters((f) => ({ ...f, page: 1 }))
                  }}
                  className="pl-9 rounded-xl border-slate-200 text-sm"
                />
              </div>

              {/* Type */}
              <Select
                value={filters.type ?? 'ALL'}
                onValueChange={(val) =>
                  updateFilter('type', val === 'ALL' ? undefined : (val as 'INCOME' | 'EXPENSE'))
                }
              >
                <SelectTrigger id="filter-type" className="rounded-xl border-slate-200 text-sm">
                  <SelectValue placeholder="All Types" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL">All Types</SelectItem>
                  <SelectItem value="INCOME">Income</SelectItem>
                  <SelectItem value="EXPENSE">Expense</SelectItem>
                </SelectContent>
              </Select>

              {/* Category */}
              <Select
                value={filters.category_id ?? 'ALL'}
                onValueChange={(val) =>
                  updateFilter('category_id', val === 'ALL' ? undefined : val)
                }
              >
                <SelectTrigger id="filter-category" className="rounded-xl border-slate-200 text-sm">
                  <SelectValue placeholder="All Categories" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL">All Categories</SelectItem>
                  {allCategories.map((cat) => (
                    <SelectItem key={cat.id} value={cat.id}>
                      {cat.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              {/* Wallet */}
              <Select
                value={filters.wallet_id ?? 'ALL'}
                onValueChange={(val) =>
                  updateFilter('wallet_id', val === 'ALL' ? undefined : val)
                }
              >
                <SelectTrigger id="filter-wallet" className="rounded-xl border-slate-200 text-sm">
                  <SelectValue placeholder="All Wallets" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL">All Wallets</SelectItem>
                  {wallets.map((w) => (
                    <SelectItem key={w.id} value={w.id}>
                      {w.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              {/* Date Range */}
              <Input
                id="filter-start-date"
                type="date"
                max={filters.end_date}
                value={filters.start_date ?? ''}
                onChange={(e) => updateFilter('start_date', e.target.value || undefined)}
                className="rounded-xl border-slate-200 text-sm text-slate-600"
                title="From date"
              />
              <Input
                id="filter-end-date"
                type="date"
                min={filters.start_date}
                value={filters.end_date ?? ''}
                onChange={(e) => updateFilter('end_date', e.target.value || undefined)}
                className="rounded-xl border-slate-200 text-sm text-slate-600"
                title="To date"
              />
            </div>

            {/* Reset */}
            <div className="mt-3 flex justify-end">
              <Button
                id="reset-filters-btn"
                variant="ghost"
                size="sm"
                onClick={resetFilters}
                className="text-slate-500 hover:text-[#0f1f3d] flex items-center gap-1.5 text-xs"
              >
                <RotateCcw size={13} />
                Reset Filters
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* ── Table Card ── */}
        <Card className="bg-white rounded-[2rem] shadow-sm border border-slate-100">
          <CardContent className="p-0">

            {/* Table */}
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead>
                  {table.getHeaderGroups().map((headerGroup) => (
                    <tr key={headerGroup.id} className="border-b border-slate-100">
                      {headerGroup.headers.map((header) => (
                        <th
                          key={header.id}
                          className="px-6 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest first:pl-6 last:pr-6"
                        >
                          {flexRender(header.column.columnDef.header, header.getContext())}
                        </th>
                      ))}
                    </tr>
                  ))}
                </thead>
                <tbody>
                  {isLoading ? (
                    <tr>
                      <td colSpan={columns.length} className="py-16 text-center">
                        <div className="flex flex-col items-center gap-3 text-slate-400">
                          <div className="w-8 h-8 border-2 border-slate-200 border-t-[#0f1f3d] rounded-full animate-spin" />
                          <span className="text-sm">Loading transactions...</span>
                        </div>
                      </td>
                    </tr>
                  ) : transactions.length === 0 ? (
                    <tr>
                      <td colSpan={columns.length} className="py-16 text-center">
                        <div className="flex flex-col items-center gap-2 text-slate-400">
                          <span className="text-4xl">📭</span>
                          <span className="text-sm font-medium">No transactions found</span>
                          <span className="text-xs">Try adjusting your filters or add a new transaction</span>
                        </div>
                      </td>
                    </tr>
                  ) : (
                    table.getRowModel().rows.map((row, i) => (
                      <tr
                        key={row.id}
                        className={`border-b border-slate-50 hover:bg-slate-50/60 transition-colors ${i % 2 === 0 ? '' : 'bg-slate-50/30'
                          }`}
                      >
                        {row.getVisibleCells().map((cell) => (
                          <td key={cell.id} className="px-6 py-3.5 first:pl-6 last:pr-6">
                            {flexRender(cell.column.columnDef.cell, cell.getContext())}
                          </td>
                        ))}
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            {/* Pagination Footer */}
            {!isLoading && total > 0 && (
              <div className="flex items-center justify-between px-6 py-4 border-t border-slate-100">
                <p className="text-sm text-slate-500">
                  Showing <span className="font-semibold text-slate-700">{from}–{to}</span> of{' '}
                  <span className="font-semibold text-slate-700">{total}</span> transactions
                </p>
                <div className="flex items-center gap-2">
                  <Button
                    id="prev-page-btn"
                    variant="outline"
                    size="sm"
                    onClick={() => setFilters((f) => ({ ...f, page: f.page - 1 }))}
                    disabled={currentPage <= 1}
                    className="rounded-xl border-slate-200 text-slate-600 hover:bg-slate-50 disabled:opacity-40"
                  >
                    <ChevronLeft size={16} />
                  </Button>
                  <span className="text-sm font-medium text-slate-600 px-2">
                    {currentPage} / {totalPages}
                  </span>
                  <Button
                    id="next-page-btn"
                    variant="outline"
                    size="sm"
                    onClick={() => setFilters((f) => ({ ...f, page: f.page + 1 }))}
                    disabled={currentPage >= totalPages}
                    className="rounded-xl border-slate-200 text-slate-600 hover:bg-slate-50 disabled:opacity-40"
                  >
                    <ChevronRight size={16} />
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

      </div>

      {/* ── Transaction Dialog (Create / Edit) ── */}
      <TransactionDialog
        open={dialogOpen}
        onOpenChange={(open) => {
          setDialogOpen(open)
          if (!open) setEditingTransaction(undefined)
        }}
        transaction={editingTransaction}
      />

      {/* ── Delete Confirmation AlertDialog ── */}
      <AlertDialog open={!!deleteConfirmId} onOpenChange={(open) => !open && setDeleteConfirmId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Transaction?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. The transaction and its effect on your wallet balance will
              be permanently removed.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel id="cancel-delete-btn">Cancel</AlertDialogCancel>
            <AlertDialogAction
              id="confirm-delete-btn"
              onClick={handleDelete}
              disabled={deleteMutation.isPending}
              className="bg-red-500 hover:bg-red-600 text-white rounded-xl"
            >
              {deleteMutation.isPending ? 'Deleting...' : 'Delete'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}