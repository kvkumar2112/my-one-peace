import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { z } from 'zod'
import { zodResolver } from '@hookform/resolvers/zod'
import { Plus, Trash2, Pencil, X, TrendingUp, TrendingDown, Upload } from 'lucide-react'
import { usePortfolioSummary, useHoldings, useCreateHolding, useUpdateHolding, useDeleteHolding } from '@/hooks/useHoldings'
import { formatINR, formatCompact, formatPct } from '@/utils/format'
import EmptyState from '@/components/EmptyState'
import LoadingSpinner from '@/components/LoadingSpinner'
import type { Holding } from '@/types'
import api from '@/services/api'

const HOLDING_TYPES = [
  { value: 'mutual_fund', label: 'Mutual Fund' },
  { value: 'stock', label: 'Stock' },
  { value: 'etf', label: 'ETF' },
  { value: 'ppf_epf', label: 'PPF / EPF' },
  { value: 'fd', label: 'Fixed Deposit' },
  { value: 'gold', label: 'Gold' },
  { value: 'fno', label: 'F&O' },
]

const TYPE_COLORS: Record<string, string> = {
  mutual_fund: 'bg-blue-100 text-blue-700',
  stock: 'bg-violet-100 text-violet-700',
  etf: 'bg-cyan-100 text-cyan-700',
  ppf_epf: 'bg-green-100 text-green-700',
  fd: 'bg-amber-100 text-amber-700',
  gold: 'bg-yellow-100 text-yellow-700',
  fno: 'bg-orange-100 text-orange-700',
}

const schema = z.object({
  name: z.string().min(1, 'Name is required'),
  type: z.string().min(1),
  ticker: z.string().optional(),
  platform: z.string().optional(),
  quantity: z.coerce.number().min(0),
  avg_buy_price: z.coerce.number().min(0),
  current_price: z.coerce.number().min(0),
  invested_amount: z.coerce.number().min(0),
  current_value: z.coerce.number().min(0),
})

type FormData = z.infer<typeof schema>

function HoldingRow({ holding, onEdit, onDelete }: { holding: Holding; onEdit: () => void; onDelete: () => void }) {
  const typeMeta = HOLDING_TYPES.find(t => t.value === holding.type)
  const isPositive = holding.pnl >= 0

  return (
    <div className="flex items-center gap-4 py-3 border-b border-gray-50 last:border-0">
      <div className="flex-1 min-w-0">
        <div className="text-sm font-medium text-gray-900 truncate">{holding.name}</div>
        <div className="flex items-center gap-2 mt-0.5">
          <span className={`text-xs px-1.5 py-0.5 rounded ${TYPE_COLORS[holding.type] ?? 'bg-gray-100 text-gray-600'}`}>
            {typeMeta?.label ?? holding.type}
          </span>
          {holding.platform && <span className="text-xs text-gray-400">{holding.platform}</span>}
          {holding.ticker && <span className="text-xs text-gray-400 font-mono">{holding.ticker}</span>}
        </div>
      </div>
      <div className="text-right hidden sm:block">
        <div className="text-xs text-gray-400">Invested</div>
        <div className="text-sm font-mono text-gray-700">{formatINR(holding.invested_amount)}</div>
      </div>
      <div className="text-right">
        <div className="text-xs text-gray-400">Current</div>
        <div className="text-sm font-mono font-medium text-gray-900">{formatINR(holding.current_value)}</div>
      </div>
      <div className="text-right w-24">
        <div className={`flex items-center justify-end gap-0.5 text-sm font-mono ${isPositive ? 'text-safe' : 'text-red-500'}`}>
          {isPositive ? <TrendingUp size={12} /> : <TrendingDown size={12} />}
          {formatPct(holding.pnl_pct)}
        </div>
        <div className={`text-xs font-mono ${isPositive ? 'text-safe' : 'text-red-500'}`}>
          {isPositive ? '+' : ''}{formatINR(holding.pnl)}
        </div>
      </div>
      <div className="flex gap-1">
        <button onClick={onEdit} className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-50 rounded">
          <Pencil size={13} />
        </button>
        <button onClick={onDelete} className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded">
          <Trash2 size={13} />
        </button>
      </div>
    </div>
  )
}

function HoldingModal({ holding, onClose, onSave, loading }: { holding?: Holding; onClose: () => void; onSave: (data: FormData) => void; loading: boolean }) {
  const { register, handleSubmit, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: {
      name: holding?.name ?? '',
      type: holding?.type ?? 'mutual_fund',
      ticker: holding?.ticker ?? '',
      platform: holding?.platform ?? '',
      quantity: holding?.quantity ?? 0,
      avg_buy_price: holding?.avg_buy_price ?? 0,
      current_price: holding?.current_price ?? 0,
      invested_amount: holding?.invested_amount ?? 0,
      current_value: holding?.current_value ?? 0,
    },
  })

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl w-full max-w-lg shadow-xl max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-5 border-b border-gray-100">
          <h2 className="text-sm font-medium text-gray-900">{holding ? 'Edit holding' : 'Add holding'}</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600"><X size={16} /></button>
        </div>
        <form onSubmit={handleSubmit(onSave)} className="p-5 space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div className="col-span-2">
              <label className="text-xs text-gray-500 block mb-1">Name</label>
              <input {...register('name')} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-primary" placeholder="e.g. Mirae Asset Large Cap Fund" />
              {errors.name && <p className="text-xs text-red-500 mt-1">{errors.name.message}</p>}
            </div>
            <div>
              <label className="text-xs text-gray-500 block mb-1">Type</label>
              <select {...register('type')} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-primary bg-white">
                {HOLDING_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs text-gray-500 block mb-1">Platform</label>
              <input {...register('platform')} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-primary" placeholder="e.g. Groww, Zerodha" />
            </div>
            <div>
              <label className="text-xs text-gray-500 block mb-1">Ticker / ISIN (optional)</label>
              <input {...register('ticker')} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm font-mono focus:outline-none focus:border-primary" placeholder="e.g. RELIANCE" />
            </div>
            <div>
              <label className="text-xs text-gray-500 block mb-1">Quantity / Units</label>
              <input {...register('quantity')} type="number" step="0.001" className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm font-mono focus:outline-none focus:border-primary" placeholder="0" />
            </div>
            <div>
              <label className="text-xs text-gray-500 block mb-1">Avg buy price (₹)</label>
              <input {...register('avg_buy_price')} type="number" step="0.01" className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm font-mono focus:outline-none focus:border-primary" placeholder="0" />
            </div>
            <div>
              <label className="text-xs text-gray-500 block mb-1">Current price (₹)</label>
              <input {...register('current_price')} type="number" step="0.01" className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm font-mono focus:outline-none focus:border-primary" placeholder="0" />
            </div>
            <div>
              <label className="text-xs text-gray-500 block mb-1">Invested amount (₹)</label>
              <input {...register('invested_amount')} type="number" step="0.01" className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm font-mono focus:outline-none focus:border-primary" placeholder="0" />
            </div>
            <div>
              <label className="text-xs text-gray-500 block mb-1">Current value (₹)</label>
              <input {...register('current_value')} type="number" step="0.01" className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm font-mono focus:outline-none focus:border-primary" placeholder="0" />
            </div>
          </div>

          <div className="flex gap-2 pt-1">
            <button type="button" onClick={onClose} className="flex-1 border border-gray-200 rounded-lg py-2 text-sm text-gray-600 hover:bg-gray-50">Cancel</button>
            <button type="submit" disabled={loading} className="flex-1 bg-primary text-white rounded-lg py-2 text-sm font-medium hover:bg-safe disabled:opacity-50">
              {loading ? 'Saving…' : holding ? 'Save changes' : 'Add holding'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

export default function InvestmentsPage() {
  const { data: summary, isLoading: summaryLoading } = usePortfolioSummary()
  const { data: holdings, isLoading: holdingsLoading } = useHoldings()
  const createHolding = useCreateHolding()
  const updateHolding = useUpdateHolding()
  const deleteHolding = useDeleteHolding()

  const [showModal, setShowModal] = useState(false)
  const [editing, setEditing] = useState<Holding | null>(null)
  const [showImport, setShowImport] = useState(false)

  const isLoading = summaryLoading || holdingsLoading
  const isPositive = (summary?.total_pnl ?? 0) >= 0

  const handleSave = async (data: FormData) => {
    const payload = { ...data, ticker: data.ticker || undefined, platform: data.platform || undefined }
    if (editing) {
      await updateHolding.mutateAsync({ id: editing.id, data: payload })
    } else {
      await createHolding.mutateAsync(payload)
    }
    setShowModal(false)
    setEditing(null)
  }

  const handleDelete = async (id: string) => {
    if (confirm('Remove this holding?')) {
      await deleteHolding.mutateAsync(id)
    }
  }

  return (
    <div className="p-7">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-medium text-gray-900">Investments</h1>
          <p className="text-sm text-gray-400">Your portfolio overview</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => setShowImport(true)}
            className="flex items-center gap-1.5 border border-gray-200 text-gray-600 text-sm px-3 py-1.5 rounded-lg hover:bg-gray-50"
          >
            <Upload size={14} /> Import Zerodha
          </button>
          <button
            onClick={() => { setEditing(null); setShowModal(true) }}
            className="flex items-center gap-1.5 bg-primary text-white text-sm px-3 py-1.5 rounded-lg hover:bg-safe"
          >
            <Plus size={14} /> Add holding
          </button>
        </div>
      </div>

      {isLoading ? (
        <LoadingSpinner />
      ) : holdings?.length === 0 ? (
        <EmptyState
          emoji="📈"
          title="No holdings yet"
          description="Track mutual funds, stocks, ETFs, PPF, FDs and gold in one place."
          action={
            <button onClick={() => setShowModal(true)} className="bg-primary text-white text-sm px-4 py-2 rounded-lg hover:bg-safe">
              Add your first holding
            </button>
          }
        />
      ) : (
        <>
          {/* Summary cards */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            <div className="bg-white border border-gray-100 rounded-lg p-4">
              <div className="text-xs text-gray-400 mb-1">Portfolio value</div>
              <div className="font-mono text-xl font-medium text-gray-900">{formatCompact(summary?.total_value ?? 0)}</div>
              <div className="text-xs text-gray-400 font-mono mt-0.5">{formatINR(summary?.total_value ?? 0)}</div>
            </div>
            <div className="bg-white border border-gray-100 rounded-lg p-4">
              <div className="text-xs text-gray-400 mb-1">Invested</div>
              <div className="font-mono text-xl font-medium text-gray-900">{formatCompact(summary?.total_invested ?? 0)}</div>
              <div className="text-xs text-gray-400 font-mono mt-0.5">{formatINR(summary?.total_invested ?? 0)}</div>
            </div>
            <div className="bg-white border border-gray-100 rounded-lg p-4">
              <div className="text-xs text-gray-400 mb-1">Total P&L</div>
              <div className={`font-mono text-xl font-medium ${isPositive ? 'text-safe' : 'text-red-500'}`}>
                {isPositive ? '+' : ''}{formatCompact(summary?.total_pnl ?? 0)}
              </div>
              <div className={`text-xs font-mono mt-0.5 ${isPositive ? 'text-safe' : 'text-red-500'}`}>
                {formatPct(summary?.total_pnl_pct ?? 0)}
              </div>
            </div>
            <div className="bg-white border border-gray-100 rounded-lg p-4">
              <div className="text-xs text-gray-400 mb-1">Holdings</div>
              <div className="font-mono text-xl font-medium text-gray-900">{holdings?.length ?? 0}</div>
            </div>
          </div>

          {/* Allocation */}
          {summary && summary.allocation.length > 0 && (
            <div className="bg-white border border-gray-100 rounded-lg p-4 mb-6">
              <div className="text-xs font-medium text-gray-500 mb-3">Allocation by type</div>
              <div className="space-y-2">
                {summary.allocation.map(item => {
                  const typeMeta = HOLDING_TYPES.find(t => t.value === item.type)
                  return (
                    <div key={item.type} className="flex items-center gap-3">
                      <div className="text-xs text-gray-600 w-28 shrink-0">{typeMeta?.label ?? item.type}</div>
                      <div className="flex-1 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                        <div className="h-full rounded-full bg-primary" style={{ width: `${item.pct}%` }} />
                      </div>
                      <div className="text-xs font-mono text-gray-500 w-12 text-right">{item.pct.toFixed(0)}%</div>
                      <div className="text-xs font-mono text-gray-400 w-20 text-right">{formatCompact(item.value)}</div>
                    </div>
                  )
                })}
              </div>
            </div>
          )}

          {/* Holdings list */}
          <div className="bg-white border border-gray-100 rounded-lg p-4">
            <div className="text-xs font-medium text-gray-500 mb-2">Holdings</div>
            {holdings?.map(h => (
              <HoldingRow
                key={h.id}
                holding={h}
                onEdit={() => { setEditing(h); setShowModal(true) }}
                onDelete={() => handleDelete(h.id)}
              />
            ))}
          </div>
        </>
      )}

      {showModal && (
        <HoldingModal
          holding={editing ?? undefined}
          onClose={() => { setShowModal(false); setEditing(null) }}
          onSave={handleSave}
          loading={createHolding.isPending || updateHolding.isPending}
        />
      )}
      {showImport && <ZerodhImportModal onClose={() => setShowImport(false)} />}
    </div>
  )
}

interface ZerodhPreview {
  index: number
  name: string
  ticker: string | null
  type: string
  platform: string | null
  quantity: number
  avg_buy_price: number
  invested_amount: number
  current_value: number
  pnl: number
  pnl_pct: number
  selected: boolean
}

function ZerodhImportModal({ onClose }: { onClose: () => void }) {
  const [file, setFile] = useState<File | null>(null)
  const [rows, setRows] = useState<ZerodhPreview[]>([])
  const [rawHoldings, setRawHoldings] = useState<any[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [done, setDone] = useState(false)
  const { refetch } = useHoldings()
  const { refetch: refetchSummary } = usePortfolioSummary()

  const handleUpload = async () => {
    if (!file) return
    setLoading(true)
    setError('')
    try {
      const fd = new FormData()
      fd.append('file', file)
      const res = await api.post('/holdings/import', fd, { headers: { 'Content-Type': 'multipart/form-data' } })
      const data: any[] = res.data
      setRawHoldings(data)
      setRows(data.map((h: any) => ({ ...h, selected: true })))
    } catch {
      setError('Could not parse file. Make sure it is a Zerodha P&L Excel export.')
    } finally {
      setLoading(false)
    }
  }

  const handleConfirm = async () => {
    setLoading(true)
    try {
      const selectedIndices = rows.filter(r => r.selected).map(r => r.index)
      await api.post('/holdings/import/confirm', { selected_indices: selectedIndices, holdings: rawHoldings })
      await Promise.all([refetch(), refetchSummary()])
      setDone(true)
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
          <h2 className="text-sm font-medium text-gray-900">Import from Zerodha</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-700 text-lg">×</button>
        </div>
        <div className="p-5 space-y-4">
          {done ? (
            <div className="flex flex-col items-center py-10 gap-3">
              <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary text-xl">✓</div>
              <p className="text-sm font-medium text-gray-900">Import complete</p>
              <p className="text-xs text-gray-400">{selectedCount} holdings added to your portfolio.</p>
              <button onClick={onClose} className="mt-2 bg-primary text-white text-sm px-6 py-2 rounded-md">Done</button>
            </div>
          ) : rows.length === 0 ? (
            <>
              <p className="text-xs text-gray-400">Upload a Zerodha P&L Excel report (.xlsx). Download it from Console → Reports → P&L.</p>
              <input type="file" accept=".xlsx,.xls" onChange={e => { setFile(e.target.files?.[0] ?? null); setError('') }} className="text-sm text-gray-600" />
              {error && <p className="text-xs text-red-500">{error}</p>}
              <div className="flex gap-2 pt-1">
                <button onClick={onClose} className="flex-1 border border-gray-200 text-sm text-gray-600 py-2 rounded-md">Cancel</button>
                <button onClick={handleUpload} disabled={!file || loading} className="flex-1 bg-primary text-white text-sm py-2 rounded-md disabled:opacity-60">
                  {loading ? 'Parsing…' : 'Parse'}
                </button>
              </div>
            </>
          ) : (
            <>
              <p className="text-xs text-gray-500"><span className="text-gray-900 font-medium">{selectedCount}</span> of {rows.length} holdings selected</p>
              <div className="max-h-80 overflow-y-auto border border-gray-100 rounded-md">
                <table className="w-full text-xs">
                  <thead className="bg-gray-50 sticky top-0">
                    <tr>
                      <th className="px-3 py-2"><input type="checkbox" checked={selectedCount === rows.length} onChange={e => setRows(prev => prev.map(r => ({ ...r, selected: e.target.checked })))} /></th>
                      <th className="text-left px-3 py-2 text-gray-400 font-medium">Symbol</th>
                      <th className="text-left px-3 py-2 text-gray-400 font-medium">Type</th>
                      <th className="text-right px-3 py-2 text-gray-400 font-medium">Qty</th>
                      <th className="text-right px-3 py-2 text-gray-400 font-medium">Invested</th>
                      <th className="text-right px-3 py-2 text-gray-400 font-medium">Current</th>
                      <th className="text-right px-3 py-2 text-gray-400 font-medium">P&L</th>
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map((row, i) => {
                      const isPos = row.pnl >= 0
                      const typeMeta = HOLDING_TYPES.find(t => t.value === row.type)
                      return (
                        <tr key={i} className={`border-t border-gray-50 ${!row.selected ? 'opacity-40' : ''}`}>
                          <td className="px-3 py-2 text-center">
                            <input type="checkbox" checked={row.selected} onChange={e => setRows(prev => prev.map((r, j) => j === i ? { ...r, selected: e.target.checked } : r))} />
                          </td>
                          <td className="px-3 py-2 font-mono text-gray-900">{row.name}</td>
                          <td className="px-3 py-2">
                            <span className={`text-xs px-1.5 py-0.5 rounded ${TYPE_COLORS[row.type] ?? 'bg-gray-100 text-gray-600'}`}>{typeMeta?.label ?? row.type}</span>
                          </td>
                          <td className="px-3 py-2 text-right font-mono text-gray-600">{row.quantity.toLocaleString('en-IN')}</td>
                          <td className="px-3 py-2 text-right font-mono text-gray-600">{formatINR(row.invested_amount)}</td>
                          <td className="px-3 py-2 text-right font-mono text-gray-900">{formatINR(row.current_value)}</td>
                          <td className={`px-3 py-2 text-right font-mono ${isPos ? 'text-safe' : 'text-red-500'}`}>{isPos ? '+' : ''}{formatPct(row.pnl_pct)}</td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
              {error && <p className="text-xs text-red-500">{error}</p>}
              <div className="flex gap-2 pt-1">
                <button onClick={() => setRows([])} className="flex-1 border border-gray-200 text-sm text-gray-600 py-2 rounded-md">Back</button>
                <button onClick={handleConfirm} disabled={loading || selectedCount === 0} className="flex-1 bg-primary text-white text-sm py-2 rounded-md disabled:opacity-60">
                  {loading ? 'Importing…' : `Import ${selectedCount} holdings`}
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
