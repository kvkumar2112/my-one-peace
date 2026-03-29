import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { z } from 'zod'
import { zodResolver } from '@hookform/resolvers/zod'
import { Plus, Trash2, Pencil, X } from 'lucide-react'
import { useBudgets, useCreateBudget, useUpdateBudget, useDeleteBudget } from '@/hooks/useBudgets'
import { formatINR, getCategoryMeta, getCurrentMonthLabel } from '@/utils/format'
import EmptyState from '@/components/EmptyState'
import LoadingSpinner from '@/components/LoadingSpinner'
import type { Budget } from '@/types'

const CATEGORIES = [
  'food', 'groceries', 'transport', 'fuel', 'shopping', 'entertainment',
  'utilities', 'telecom', 'health', 'finance', 'travel', 'education', 'housing',
]

const schema = z.object({
  label: z.string().min(1, 'Label is required'),
  category: z.string().min(1, 'Category is required'),
  limit_amount: z.coerce.number().min(1, 'Must be greater than 0'),
  period: z.enum(['monthly', 'weekly']),
})

type FormData = z.infer<typeof schema>

function BudgetCard({ budget, onEdit, onDelete }: { budget: Budget; onEdit: () => void; onDelete: () => void }) {
  const meta = getCategoryMeta(budget.category)
  const pct = budget.limit_amount > 0 ? Math.min((budget.spent_amount / budget.limit_amount) * 100, 100) : 0
  const isOver = budget.spent_amount > budget.limit_amount
  const remaining = budget.limit_amount - budget.spent_amount

  return (
    <div className="bg-white border border-gray-100 rounded-lg p-4">
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-2">
          <span className="text-xl">{meta.emoji}</span>
          <div>
            <div className="text-sm font-medium text-gray-900">{budget.label}</div>
            <div className="text-xs text-gray-400">{meta.label} · {budget.period}</div>
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

      <div className="mb-2">
        <div className="flex justify-between text-xs text-gray-500 mb-1">
          <span className="font-mono">{formatINR(budget.spent_amount)} spent</span>
          <span className="font-mono">{formatINR(budget.limit_amount)}</span>
        </div>
        <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
          <div
            className={`h-full rounded-full transition-all ${isOver ? 'bg-red-400' : pct > 80 ? 'bg-amber-400' : 'bg-primary'}`}
            style={{ width: `${pct}%` }}
          />
        </div>
      </div>

      <div className={`text-xs font-mono ${isOver ? 'text-red-500' : 'text-gray-400'}`}>
        {isOver
          ? `${formatINR(Math.abs(remaining))} over budget`
          : `${formatINR(remaining)} remaining`}
      </div>
    </div>
  )
}

function BudgetModal({
  budget,
  onClose,
  onSave,
  loading,
}: {
  budget?: Budget
  onClose: () => void
  onSave: (data: FormData) => void
  loading: boolean
}) {
  const { register, handleSubmit, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: {
      label: budget?.label ?? '',
      category: budget?.category ?? 'food',
      limit_amount: budget?.limit_amount ?? 0,
      period: budget?.period ?? 'monthly',
    },
  })

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl w-full max-w-md shadow-xl">
        <div className="flex items-center justify-between p-5 border-b border-gray-100">
          <h2 className="text-sm font-medium text-gray-900">{budget ? 'Edit budget' : 'Add budget'}</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600"><X size={16} /></button>
        </div>
        <form onSubmit={handleSubmit(onSave)} className="p-5 space-y-4">
          <div>
            <label className="text-xs text-gray-500 block mb-1">Label</label>
            <input {...register('label')} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-primary" placeholder="e.g. Dining out" />
            {errors.label && <p className="text-xs text-red-500 mt-1">{errors.label.message}</p>}
          </div>

          <div>
            <label className="text-xs text-gray-500 block mb-1">Category</label>
            <select {...register('category')} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-primary bg-white">
              {CATEGORIES.map(c => {
                const m = getCategoryMeta(c)
                return <option key={c} value={c}>{m.emoji} {m.label}</option>
              })}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-gray-500 block mb-1">Limit (₹)</label>
              <input {...register('limit_amount')} type="number" step="100" className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm font-mono focus:outline-none focus:border-primary" placeholder="5000" />
              {errors.limit_amount && <p className="text-xs text-red-500 mt-1">{errors.limit_amount.message}</p>}
            </div>
            <div>
              <label className="text-xs text-gray-500 block mb-1">Period</label>
              <select {...register('period')} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-primary bg-white">
                <option value="monthly">Monthly</option>
                <option value="weekly">Weekly</option>
              </select>
            </div>
          </div>

          <div className="flex gap-2 pt-1">
            <button type="button" onClick={onClose} className="flex-1 border border-gray-200 rounded-lg py-2 text-sm text-gray-600 hover:bg-gray-50">Cancel</button>
            <button type="submit" disabled={loading} className="flex-1 bg-primary text-white rounded-lg py-2 text-sm font-medium hover:bg-safe disabled:opacity-50">
              {loading ? 'Saving…' : budget ? 'Save changes' : 'Add budget'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

export default function BudgetsPage() {
  const { data: budgets, isLoading } = useBudgets()
  const createBudget = useCreateBudget()
  const updateBudget = useUpdateBudget()
  const deleteBudget = useDeleteBudget()

  const [showModal, setShowModal] = useState(false)
  const [editing, setEditing] = useState<Budget | null>(null)

  const totalLimit = budgets?.reduce((s, b) => s + b.limit_amount, 0) ?? 0
  const totalSpent = budgets?.reduce((s, b) => s + b.spent_amount, 0) ?? 0

  const handleSave = async (data: FormData) => {
    if (editing) {
      await updateBudget.mutateAsync({ id: editing.id, data })
    } else {
      await createBudget.mutateAsync(data)
    }
    setShowModal(false)
    setEditing(null)
  }

  const handleDelete = async (id: string) => {
    if (confirm('Delete this budget?')) {
      await deleteBudget.mutateAsync(id)
    }
  }

  return (
    <div className="p-7">
      <div className="flex items-center justify-between mb-1">
        <div>
          <h1 className="text-xl font-medium text-gray-900">Budgets</h1>
          <p className="text-sm text-gray-400">{getCurrentMonthLabel()}</p>
        </div>
        <button
          onClick={() => { setEditing(null); setShowModal(true) }}
          className="flex items-center gap-1.5 bg-primary text-white text-sm px-3 py-1.5 rounded-lg hover:bg-safe"
        >
          <Plus size={14} /> Add budget
        </button>
      </div>

      {budgets && budgets.length > 0 && (
        <div className="grid grid-cols-3 gap-4 mt-6 mb-6">
          <div className="bg-white border border-gray-100 rounded-lg p-4">
            <div className="text-xs text-gray-400 mb-1">Total budgeted</div>
            <div className="font-mono text-xl font-medium text-gray-900">{formatINR(totalLimit)}</div>
          </div>
          <div className="bg-white border border-gray-100 rounded-lg p-4">
            <div className="text-xs text-gray-400 mb-1">Total spent</div>
            <div className="font-mono text-xl font-medium text-gray-900">{formatINR(totalSpent)}</div>
          </div>
          <div className="bg-white border border-gray-100 rounded-lg p-4">
            <div className="text-xs text-gray-400 mb-1">Remaining</div>
            <div className={`font-mono text-xl font-medium ${totalSpent > totalLimit ? 'text-red-500' : 'text-gray-900'}`}>
              {formatINR(Math.abs(totalLimit - totalSpent))}
              {totalSpent > totalLimit && <span className="text-xs ml-1">over</span>}
            </div>
          </div>
        </div>
      )}

      {isLoading ? (
        <LoadingSpinner />
      ) : budgets?.length === 0 ? (
        <EmptyState
          emoji="🎯"
          title="No budgets yet"
          description="Set spending limits by category to keep your finances on track."
          action={
            <button onClick={() => setShowModal(true)} className="bg-primary text-white text-sm px-4 py-2 rounded-lg hover:bg-safe">
              Create your first budget
            </button>
          }
        />
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {budgets?.map(budget => (
            <BudgetCard
              key={budget.id}
              budget={budget}
              onEdit={() => { setEditing(budget); setShowModal(true) }}
              onDelete={() => handleDelete(budget.id)}
            />
          ))}
        </div>
      )}

      {showModal && (
        <BudgetModal
          budget={editing ?? undefined}
          onClose={() => { setShowModal(false); setEditing(null) }}
          onSave={handleSave}
          loading={createBudget.isPending || updateBudget.isPending}
        />
      )}
    </div>
  )
}
