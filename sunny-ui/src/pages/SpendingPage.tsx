import { useState, useRef } from 'react'
import {
  AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer,
} from 'recharts'
import MetricCard from '@/components/MetricCard'
import TransactionRow from '@/components/TransactionRow'
import LoadingSpinner from '@/components/LoadingSpinner'
import EmptyState from '@/components/EmptyState'
import AddTransactionModal from '@/components/AddTransactionModal'
import { useTransactions } from '@/hooks/useTransactions'
import { useSpending, useDashboardSummary } from '@/hooks/useAnalytics'
import { useAccounts } from '@/hooks/useAccounts'
import { formatINR, getCategoryMeta } from '@/utils/format'
import type { TransactionFilters } from '@/types'
import api from '@/services/api'

const CATEGORY_COLORS: Record<string, string> = {
  food: '#F59E0B',
  groceries: '#10B981',
  transport: '#3B82F6',
  fuel: '#EF4444',
  shopping: '#8B5CF6',
  entertainment: '#EC4899',
  utilities: '#F97316',
  telecom: '#06B6D4',
  health: '#14B8A6',
  finance: '#1D9E75',
  travel: '#6366F1',
  education: '#F59E0B',
  housing: '#84CC16',
}

function getMonthRange(offset = 0) {
  const d = new Date()
  d.setMonth(d.getMonth() - offset)
  const year = d.getFullYear()
  const month = d.getMonth()
  const start = new Date(year, month, 1).toISOString()
  const end = new Date(year, month + 1, 0, 23, 59, 59).toISOString()
  const label = d.toLocaleDateString('en-IN', { month: 'long', year: 'numeric' })
  return { start, end, label }
}

const CATEGORY_OPTIONS = [
  'all', 'food', 'groceries', 'transport', 'fuel', 'shopping', 'entertainment',
  'utilities', 'telecom', 'health', 'finance', 'travel', 'education', 'housing',
]

export default function SpendingPage() {
  const [monthOffset, setMonthOffset] = useState(0)
  const [selectedCategory, setSelectedCategory] = useState('all')
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedType, setSelectedType] = useState('all')
  const [showAddTx, setShowAddTx] = useState(false)
  const [showImport, setShowImport] = useState(false)
  const [page, setPage] = useState(0)
  const PAGE_SIZE = 20

  const { start, end, label } = getMonthRange(monthOffset)

  const filters: TransactionFilters = {
    date_from: start,
    date_to: end,
    category: selectedCategory !== 'all' ? selectedCategory : undefined,
    type: selectedType !== 'all' ? selectedType : undefined,
    search: searchQuery || undefined,
    skip: page * PAGE_SIZE,
    limit: PAGE_SIZE,
  }

  const { data: txns, isLoading: txnsLoading } = useTransactions(filters)
  const { data: spending, isLoading: spendingLoading } = useSpending(start, end)
  const { data: summary, isLoading: summaryLoading } = useDashboardSummary()

  // Build daily spend data for the area chart (group by day)
  const dailyData = (() => {
    if (!txns) return []
    const byDay: Record<string, number> = {}
    for (const tx of txns.items) {
      if (tx.type !== 'expense') continue
      const day = tx.date.split('T')[0]
      byDay[day] = (byDay[day] ?? 0) + tx.amount
    }
    return Object.entries(byDay)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([day, amount]) => ({
        day: new Date(day).getDate().toString(),
        amount,
      }))
  })()

  const topCategory = spending && spending.length > 0 ? spending[0] : null

  return (
    <div className="p-7 flex flex-col gap-5 max-w-6xl">
      {/* Top bar */}
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-xl font-medium text-gray-900">Spending</h1>
          <div className="flex items-center gap-2 mt-1">
            <button
              onClick={() => { setMonthOffset((m) => m + 1); setPage(0) }}
              className="text-gray-400 hover:text-gray-700 px-1"
            >
              ‹
            </button>
            <span className="text-sm text-gray-400">{label}</span>
            <button
              onClick={() => { setMonthOffset((m) => Math.max(0, m - 1)); setPage(0) }}
              disabled={monthOffset === 0}
              className="text-gray-400 hover:text-gray-700 px-1 disabled:opacity-30"
            >
              ›
            </button>
          </div>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => setShowImport(true)}
            className="border border-gray-200 text-gray-600 text-sm font-medium px-4 py-2.5 rounded-md hover:bg-gray-50 transition-colors"
          >
            Import statement
          </button>
          <button
            onClick={() => setShowAddTx(true)}
            className="bg-primary text-white text-sm font-medium px-4 py-2.5 rounded-md hover:bg-safe transition-colors"
          >
            + Add
          </button>
        </div>
      </div>

      {/* Metric cards */}
      {summaryLoading ? (
        <LoadingSpinner />
      ) : (
        <div className="grid grid-cols-3 gap-3">
          <MetricCard
            label="Total spend"
            value={formatINR(summary?.monthly_spend ?? 0)}
            delta={summary && summary.spend_change >= 0 ? `↑ ${formatINR(summary.spend_change)}` : `↓ ${formatINR(Math.abs(summary?.spend_change ?? 0))}`}
            deltaPositive={false}
            deltaText="vs last month"
          />
          <MetricCard
            label="Top category"
            value={topCategory ? getCategoryMeta(topCategory.category).label : '—'}
            deltaText={topCategory ? formatINR(topCategory.amount) : ''}
            deltaPositive={false}
          />
          <MetricCard
            label="Transactions"
            value={txns?.total?.toString() ?? '0'}
            deltaText="this month"
            deltaPositive={true}
          />
        </div>
      )}

      {/* Charts row */}
      <div className="grid grid-cols-[1.4fr_1fr] gap-5">
        {/* Daily spend area chart */}
        <div className="bg-white border border-gray-100 rounded-lg p-5">
          <div className="text-sm font-medium text-gray-900 mb-4">Daily spend</div>
          {txnsLoading ? (
            <LoadingSpinner />
          ) : dailyData.length > 0 ? (
            <ResponsiveContainer width="100%" height={140}>
              <AreaChart data={dailyData}>
                <defs>
                  <linearGradient id="spendGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#1D9E75" stopOpacity={0.15} />
                    <stop offset="95%" stopColor="#1D9E75" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <XAxis dataKey="day" tick={{ fontSize: 11, fill: '#9CA3AF' }} tickLine={false} axisLine={false} />
                <YAxis hide />
                <Tooltip
                  formatter={(v: number) => formatINR(v)}
                  contentStyle={{ fontSize: 12, border: '0.5px solid #E5E7EB', borderRadius: 8 }}
                />
                <Area type="monotone" dataKey="amount" stroke="#1D9E75" strokeWidth={1.5} fill="url(#spendGrad)" />
              </AreaChart>
            </ResponsiveContainer>
          ) : (
            <EmptyState emoji="📉" title="No spending data" description="Add expense transactions to see the daily chart" />
          )}
        </div>

        {/* Category bars */}
        <div className="bg-white border border-gray-100 rounded-lg p-5">
          <div className="text-sm font-medium text-gray-900 mb-4">By category</div>
          {spendingLoading ? (
            <LoadingSpinner />
          ) : spending && spending.length > 0 ? (
            <div className="flex flex-col gap-3">
              {spending.slice(0, 5).map((s) => {
                const meta = getCategoryMeta(s.category)
                const color = CATEGORY_COLORS[s.category] ?? '#94A3B8'
                return (
                  <div key={s.category}>
                    <div className="flex justify-between text-xs text-gray-500 mb-1">
                      <span>{meta.emoji} {meta.label}</span>
                      <span className="font-mono font-medium text-gray-900">{formatINR(s.amount)}</span>
                    </div>
                    <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                      <div
                        className="h-full rounded-full"
                        style={{ width: `${s.pct}%`, background: color }}
                      />
                    </div>
                  </div>
                )
              })}
            </div>
          ) : (
            <EmptyState emoji="📂" title="No category data" />
          )}
        </div>
      </div>

      {/* Transaction list */}
      <div className="bg-white border border-gray-100 rounded-lg p-5">
        {/* Filters */}
        <div className="flex flex-wrap gap-2 mb-4">
          <input
            type="text"
            placeholder="Search transactions…"
            value={searchQuery}
            onChange={(e) => { setSearchQuery(e.target.value); setPage(0) }}
            className="border border-gray-200 rounded-md px-3 py-2 text-sm flex-1 min-w-48 focus:outline-none focus:ring-1 focus:ring-primary"
          />
          <select
            value={selectedType}
            onChange={(e) => { setSelectedType(e.target.value); setPage(0) }}
            className="border border-gray-200 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary"
          >
            <option value="all">All types</option>
            <option value="expense">Expense</option>
            <option value="income">Income</option>
            <option value="transfer">Transfer</option>
          </select>
          <select
            value={selectedCategory}
            onChange={(e) => { setSelectedCategory(e.target.value); setPage(0) }}
            className="border border-gray-200 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary"
          >
            {CATEGORY_OPTIONS.map((cat) => (
              <option key={cat} value={cat}>
                {cat === 'all' ? 'All categories' : cat.charAt(0).toUpperCase() + cat.slice(1)}
              </option>
            ))}
          </select>
        </div>

        {/* List */}
        {txnsLoading ? (
          <LoadingSpinner />
        ) : txns && txns.items.length > 0 ? (
          <>
            {txns.items.map((tx) => (
              <TransactionRow key={tx.id} transaction={tx} />
            ))}
            {/* Pagination */}
            {txns.total > PAGE_SIZE && (
              <div className="flex justify-between items-center mt-4 pt-3 border-t border-gray-50">
                <span className="text-xs text-gray-400">
                  Showing {page * PAGE_SIZE + 1}–{Math.min((page + 1) * PAGE_SIZE, txns.total)} of {txns.total}
                </span>
                <div className="flex gap-2">
                  <button
                    disabled={page === 0}
                    onClick={() => setPage((p) => p - 1)}
                    className="text-xs border border-gray-200 px-3 py-1.5 rounded-md disabled:opacity-30 hover:bg-gray-50"
                  >
                    Previous
                  </button>
                  <button
                    disabled={(page + 1) * PAGE_SIZE >= txns.total}
                    onClick={() => setPage((p) => p + 1)}
                    className="text-xs border border-gray-200 px-3 py-1.5 rounded-md disabled:opacity-30 hover:bg-gray-50"
                  >
                    Next
                  </button>
                </div>
              </div>
            )}
          </>
        ) : (
          <EmptyState
            emoji="💸"
            title="No transactions"
            description="No transactions found for the selected filters"
            action={
              <button
                onClick={() => setShowAddTx(true)}
                className="text-xs text-primary font-medium border border-primary rounded-md px-3 py-1.5"
              >
                + Add transaction
              </button>
            }
          />
        )}
      </div>

      {showAddTx && <AddTransactionModal onClose={() => setShowAddTx(false)} />}
      {showImport && <ImportModal onClose={() => setShowImport(false)} />}
    </div>
  )
}

const IMPORT_CATEGORIES = [
  'food', 'groceries', 'transport', 'fuel', 'shopping', 'entertainment',
  'utilities', 'telecom', 'health', 'finance', 'travel', 'education',
  'housing', 'salary', 'dividend', 'transfer', 'self_transfer', 'investment',
  'emi', 'refund', 'bill_payment', 'uncategorized',
]

type ImportStep = 'upload' | 'parsing' | 'preview' | 'done'

interface PreviewRow {
  index: number
  date: string
  description: string
  amount: number
  type: string
  category: string
  confidence: number
  selected: boolean
}

function ConfidenceDot({ confidence }: { confidence: number }) {
  const cls = confidence >= 0.85 ? 'bg-primary' : confidence >= 0.6 ? 'bg-amber-400' : 'bg-red-400'
  return <span title={`${Math.round(confidence * 100)}% confidence`} className={`inline-block w-2 h-2 rounded-full flex-shrink-0 ${cls}`} />
}

function ImportModal({ onClose }: { onClose: () => void }) {
  const [step, setStep] = useState<ImportStep>('upload')
  const [file, setFile] = useState<File | null>(null)
  const [selectedAccountId, setSelectedAccountId] = useState<string>('')
  const [docId, setDocId] = useState<string | null>(null)
  const [rows, setRows] = useState<PreviewRow[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const { data: accounts } = useAccounts()

  const stopPoll = () => { if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null } }

  const handleUpload = async () => {
    if (!file) return
    setLoading(true)
    setError('')
    try {
      const fd = new FormData()
      fd.append('file', file)
      if (selectedAccountId) fd.append('account_id', selectedAccountId)
      const res = await api.post('/documents/upload', fd, { headers: { 'Content-Type': 'multipart/form-data' } })
      const id: string = res.data.id
      setDocId(id)
      setStep('parsing')
      timerRef.current = setInterval(async () => {
        try {
          const { data } = await api.get(`/documents/${id}`)
          if (data.status === 'parsed') {
            stopPoll()
            const preview = await api.get(`/documents/${id}/preview`)
            setRows(preview.data.map((p: any) => ({ ...p, selected: true })))
            setStep('preview')
          } else if (data.status === 'failed') {
            stopPoll()
            setError(data.error ?? 'Parsing failed. Please try a different file.')
            setStep('upload')
          }
        } catch { stopPoll(); setError('Could not check parse status.'); setStep('upload') }
      }, 2000)
    } catch {
      setError('Upload failed. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const handleConfirm = async () => {
    if (!docId) return
    setLoading(true)
    try {
      const selectedIndices = rows.filter(r => r.selected).map(r => r.index)
      const categoryOverrides: Record<string, string> = {}
      rows.forEach(r => { categoryOverrides[String(r.index)] = r.category })
      await api.post(`/documents/${docId}/confirm`, { selected_indices: selectedIndices, category_overrides: categoryOverrides })
      setStep('done')
    } catch {
      setError('Import failed. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const selectedCount = rows.filter(r => r.selected).length

  return (
    <div className="fixed inset-0 bg-black/20 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl border border-gray-100 w-full max-w-2xl shadow-lg">
        <div className="flex items-center justify-between px-5 pt-5 pb-4 border-b border-gray-50">
          <h2 className="text-sm font-medium text-gray-900">Import bank statement</h2>
          <button onClick={() => { stopPoll(); onClose() }} className="text-gray-400 hover:text-gray-700 text-lg">×</button>
        </div>

        <div className="p-5 space-y-4">
          {step === 'upload' && (
            <>
              <p className="text-xs text-gray-400">Upload a PDF bank statement. Supports ICICI Bank, HDFC Credit Card, ICICI Credit Card.</p>
              <div className="space-y-3">
                <div>
                  <label className="text-xs font-medium text-gray-600 block mb-1">Account <span className="text-gray-400 font-normal">(helps classify transactions correctly)</span></label>
                  <select
                    value={selectedAccountId}
                    onChange={e => setSelectedAccountId(e.target.value)}
                    className="w-full border border-gray-200 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary"
                  >
                    <option value="">— Select account —</option>
                    {accounts?.map(a => (
                      <option key={a.id} value={a.id}>
                        {a.nickname || a.bank_name} {a.last4 ? `••${a.last4}` : ''} ({a.account_type})
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="text-xs font-medium text-gray-600 block mb-1">Statement file</label>
                  <input type="file" accept=".pdf" onChange={e => { setFile(e.target.files?.[0] ?? null); setError('') }} className="text-sm text-gray-600" />
                </div>
              </div>
              {error && <p className="text-xs text-red-500">{error}</p>}
              <div className="flex gap-2 pt-1">
                <button onClick={onClose} className="flex-1 border border-gray-200 text-sm text-gray-600 py-2 rounded-md">Cancel</button>
                <button onClick={handleUpload} disabled={!file || loading} className="flex-1 bg-primary text-white text-sm py-2 rounded-md disabled:opacity-60">
                  {loading ? 'Uploading…' : 'Upload & Parse'}
                </button>
              </div>
            </>
          )}

          {step === 'parsing' && (
            <div className="flex flex-col items-center py-10 gap-3">
              <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
              <p className="text-sm text-gray-500">Extracting and categorising transactions…</p>
              <p className="text-xs text-gray-400">This usually takes 5–20 seconds</p>
            </div>
          )}

          {step === 'preview' && (
            <>
              <div className="flex items-center justify-between">
                <p className="text-xs text-gray-500"><span className="text-gray-900 font-medium">{selectedCount}</span> of {rows.length} selected</p>
                <div className="flex items-center gap-3 text-xs text-gray-400">
                  <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-primary inline-block" /> High</span>
                  <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-amber-400 inline-block" /> Medium</span>
                  <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-red-400 inline-block" /> Review</span>
                </div>
              </div>
              <div className="max-h-80 overflow-y-auto border border-gray-100 rounded-md">
                <table className="w-full text-xs">
                  <thead className="bg-gray-50 sticky top-0">
                    <tr>
                      <th className="px-3 py-2"><input type="checkbox" checked={selectedCount === rows.length} onChange={e => setRows(prev => prev.map(r => ({ ...r, selected: e.target.checked })))} /></th>
                      <th className="text-left px-3 py-2 text-gray-400 font-medium">Date</th>
                      <th className="text-left px-3 py-2 text-gray-400 font-medium">Description</th>
                      <th className="text-left px-3 py-2 text-gray-400 font-medium">Category</th>
                      <th className="text-right px-3 py-2 text-gray-400 font-medium">Amount</th>
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map((row, i) => (
                      <tr key={i} className={`border-t border-gray-50 ${!row.selected ? 'opacity-40' : ''}`}>
                        <td className="px-3 py-2 text-center">
                          <input type="checkbox" checked={row.selected} onChange={e => setRows(prev => prev.map((r, j) => j === i ? { ...r, selected: e.target.checked } : r))} />
                        </td>
                        <td className="px-3 py-2 text-gray-500 whitespace-nowrap">{new Date(row.date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })}</td>
                        <td className="px-3 py-2 text-gray-700 max-w-[200px]">
                          <div className="flex items-center gap-1.5">
                            <ConfidenceDot confidence={row.confidence} />
                            <span className="truncate">{row.description}</span>
                          </div>
                        </td>
                        <td className="px-3 py-1">
                          <select value={row.category} onChange={e => setRows(prev => prev.map((r, j) => j === i ? { ...r, category: e.target.value } : r))} className="text-xs border border-gray-200 rounded px-1.5 py-1 focus:outline-none focus:border-primary">
                            {IMPORT_CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                          </select>
                        </td>
                        <td className={`px-3 py-2 text-right font-mono ${row.type === 'credit' ? 'text-primary' : 'text-gray-900'}`}>
                          {row.type === 'credit' ? '+' : ''}{formatINR(row.amount)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {error && <p className="text-xs text-red-500">{error}</p>}
              <div className="flex gap-2 pt-1">
                <button onClick={() => setStep('upload')} className="flex-1 border border-gray-200 text-sm text-gray-600 py-2 rounded-md">Back</button>
                <button onClick={handleConfirm} disabled={loading || selectedCount === 0} className="flex-1 bg-primary text-white text-sm py-2 rounded-md disabled:opacity-60">
                  {loading ? 'Importing…' : `Import ${selectedCount} transactions`}
                </button>
              </div>
            </>
          )}

          {step === 'done' && (
            <div className="flex flex-col items-center py-10 gap-3">
              <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary text-xl">✓</div>
              <p className="text-sm font-medium text-gray-900">Import complete</p>
              <p className="text-xs text-gray-400">{selectedCount} transactions added to your history.</p>
              <button onClick={onClose} className="mt-2 bg-primary text-white text-sm px-6 py-2 rounded-md">Done</button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
