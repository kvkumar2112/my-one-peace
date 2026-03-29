import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { z } from 'zod'
import { zodResolver } from '@hookform/resolvers/zod'
import { Plus, Trash2, Pencil, X, IndianRupee } from 'lucide-react'
import { useGoals, useCreateGoal, useUpdateGoal, useDeleteGoal, useContributeGoal } from '@/hooks/useGoals'
import { formatINR, formatDate } from '@/utils/format'
import EmptyState from '@/components/EmptyState'
import LoadingSpinner from '@/components/LoadingSpinner'
import type { Goal } from '@/types'

const GOAL_ICONS = ['🏠', '✈️', '🚗', '💍', '📚', '🏥', '💻', '🎯', '🏦', '👶']
const GOAL_COLORS = [
  'from-emerald-400 to-teal-500',
  'from-blue-400 to-indigo-500',
  'from-violet-400 to-purple-500',
  'from-rose-400 to-pink-500',
  'from-amber-400 to-orange-500',
]

const schema = z.object({
  name: z.string().min(1, 'Goal name is required'),
  target_amount: z.coerce.number().min(1, 'Target must be greater than 0'),
  monthly_contribution: z.coerce.number().min(0).optional(),
  target_date: z.string().optional(),
  icon: z.string().optional(),
  color: z.string().optional(),
})

type FormData = z.infer<typeof schema>

const contributeSchema = z.object({
  amount: z.coerce.number().min(1, 'Amount must be greater than 0'),
})
type ContributeData = z.infer<typeof contributeSchema>

function GoalCard({
  goal,
  onEdit,
  onDelete,
  onContribute,
}: {
  goal: Goal
  onEdit: () => void
  onDelete: () => void
  onContribute: () => void
}) {
  const color = goal.color ?? GOAL_COLORS[0]
  return (
    <div className="bg-white border border-gray-100 rounded-lg overflow-hidden">
      <div className={`bg-gradient-to-br ${color} p-4 flex items-center gap-3`}>
        <span className="text-2xl">{goal.icon ?? '🎯'}</span>
        <div className="flex-1 min-w-0">
          <div className="text-white font-medium text-sm truncate">{goal.name}</div>
          {goal.target_date && (
            <div className="text-white/70 text-xs">by {formatDate(goal.target_date)}</div>
          )}
        </div>
        <span className={`text-xs px-2 py-0.5 rounded-full bg-white/20 text-white/90 capitalize`}>
          {goal.status}
        </span>
      </div>

      <div className="p-4">
        <div className="flex justify-between text-xs text-gray-500 mb-1.5">
          <span className="font-mono">{formatINR(goal.saved_amount)} saved</span>
          <span className="font-mono">{formatINR(goal.target_amount)}</span>
        </div>
        <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden mb-1">
          <div
            className="h-full rounded-full bg-primary transition-all"
            style={{ width: `${Math.min(goal.progress_pct, 100)}%` }}
          />
        </div>
        <div className="text-xs text-gray-400 mb-3">{goal.progress_pct.toFixed(0)}% complete</div>

        {goal.monthly_contribution && (
          <div className="text-xs text-gray-400 mb-3">
            <span className="font-mono">{formatINR(goal.monthly_contribution)}</span> / month
          </div>
        )}

        <div className="flex items-center gap-2">
          {goal.status !== 'completed' && (
            <button
              onClick={onContribute}
              className="flex-1 flex items-center justify-center gap-1 bg-primary/10 text-primary text-xs px-3 py-1.5 rounded-lg hover:bg-primary/20 font-medium"
            >
              <IndianRupee size={12} /> Contribute
            </button>
          )}
          <button onClick={onEdit} className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-50 rounded">
            <Pencil size={13} />
          </button>
          <button onClick={onDelete} className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded">
            <Trash2 size={13} />
          </button>
        </div>
      </div>
    </div>
  )
}

function GoalModal({ goal, onClose, onSave, loading }: { goal?: Goal; onClose: () => void; onSave: (data: FormData) => void; loading: boolean }) {
  const { register, handleSubmit, watch, setValue, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: {
      name: goal?.name ?? '',
      target_amount: goal?.target_amount ?? 0,
      monthly_contribution: goal?.monthly_contribution ?? undefined,
      target_date: goal?.target_date ? goal.target_date.slice(0, 10) : '',
      icon: goal?.icon ?? GOAL_ICONS[0],
      color: goal?.color ?? GOAL_COLORS[0],
    },
  })

  const selectedIcon = watch('icon')
  const selectedColor = watch('color')

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl w-full max-w-md shadow-xl max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-5 border-b border-gray-100">
          <h2 className="text-sm font-medium text-gray-900">{goal ? 'Edit goal' : 'New goal'}</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600"><X size={16} /></button>
        </div>
        <form onSubmit={handleSubmit(onSave)} className="p-5 space-y-4">
          <div>
            <label className="text-xs text-gray-500 block mb-1">Goal name</label>
            <input {...register('name')} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-primary" placeholder="e.g. Emergency fund" />
            {errors.name && <p className="text-xs text-red-500 mt-1">{errors.name.message}</p>}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-gray-500 block mb-1">Target amount (₹)</label>
              <input {...register('target_amount')} type="number" step="1000" className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm font-mono focus:outline-none focus:border-primary" placeholder="100000" />
              {errors.target_amount && <p className="text-xs text-red-500 mt-1">{errors.target_amount.message}</p>}
            </div>
            <div>
              <label className="text-xs text-gray-500 block mb-1">Monthly contribution (₹)</label>
              <input {...register('monthly_contribution')} type="number" step="500" className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm font-mono focus:outline-none focus:border-primary" placeholder="Optional" />
            </div>
          </div>

          <div>
            <label className="text-xs text-gray-500 block mb-1">Target date (optional)</label>
            <input {...register('target_date')} type="date" className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-primary" />
          </div>

          <div>
            <label className="text-xs text-gray-500 block mb-2">Icon</label>
            <div className="flex flex-wrap gap-2">
              {GOAL_ICONS.map(icon => (
                <button key={icon} type="button" onClick={() => setValue('icon', icon)}
                  className={`w-9 h-9 rounded-lg text-lg flex items-center justify-center border-2 ${selectedIcon === icon ? 'border-primary bg-primary/5' : 'border-gray-100 hover:border-gray-200'}`}>
                  {icon}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="text-xs text-gray-500 block mb-2">Colour</label>
            <div className="flex gap-2">
              {GOAL_COLORS.map(c => (
                <button key={c} type="button" onClick={() => setValue('color', c)}
                  className={`w-8 h-8 rounded-full bg-gradient-to-br ${c} ring-2 ring-offset-1 ${selectedColor === c ? 'ring-gray-900' : 'ring-transparent'}`} />
              ))}
            </div>
          </div>

          <div className="flex gap-2 pt-1">
            <button type="button" onClick={onClose} className="flex-1 border border-gray-200 rounded-lg py-2 text-sm text-gray-600 hover:bg-gray-50">Cancel</button>
            <button type="submit" disabled={loading} className="flex-1 bg-primary text-white rounded-lg py-2 text-sm font-medium hover:bg-safe disabled:opacity-50">
              {loading ? 'Saving…' : goal ? 'Save changes' : 'Create goal'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

function ContributeModal({ goal, onClose, onSave, loading }: { goal: Goal; onClose: () => void; onSave: (data: ContributeData) => void; loading: boolean }) {
  const { register, handleSubmit, formState: { errors } } = useForm<ContributeData>({
    resolver: zodResolver(contributeSchema),
    defaultValues: { amount: goal.monthly_contribution ?? 0 },
  })

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl w-full max-w-sm shadow-xl">
        <div className="flex items-center justify-between p-5 border-b border-gray-100">
          <h2 className="text-sm font-medium text-gray-900">Contribute to {goal.name}</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600"><X size={16} /></button>
        </div>
        <form onSubmit={handleSubmit(onSave)} className="p-5 space-y-4">
          <div className="text-xs text-gray-400">
            {formatINR(goal.saved_amount)} saved · {formatINR(goal.target_amount - goal.saved_amount)} remaining
          </div>
          <div>
            <label className="text-xs text-gray-500 block mb-1">Amount (₹)</label>
            <input {...register('amount')} type="number" step="100" autoFocus
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm font-mono focus:outline-none focus:border-primary" />
            {errors.amount && <p className="text-xs text-red-500 mt-1">{errors.amount.message}</p>}
          </div>
          <div className="flex gap-2">
            <button type="button" onClick={onClose} className="flex-1 border border-gray-200 rounded-lg py-2 text-sm text-gray-600 hover:bg-gray-50">Cancel</button>
            <button type="submit" disabled={loading} className="flex-1 bg-primary text-white rounded-lg py-2 text-sm font-medium hover:bg-safe disabled:opacity-50">
              {loading ? 'Adding…' : 'Add contribution'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

export default function GoalsPage() {
  const { data: goals, isLoading } = useGoals()
  const createGoal = useCreateGoal()
  const updateGoal = useUpdateGoal()
  const deleteGoal = useDeleteGoal()
  const contributeGoal = useContributeGoal()

  const [showModal, setShowModal] = useState(false)
  const [showContribute, setShowContribute] = useState(false)
  const [editing, setEditing] = useState<Goal | null>(null)
  const [contributing, setContributing] = useState<Goal | null>(null)

  const totalSaved = goals?.reduce((s, g) => s + g.saved_amount, 0) ?? 0
  const totalTarget = goals?.reduce((s, g) => s + g.target_amount, 0) ?? 0

  const handleSave = async (data: FormData) => {
    const payload = {
      ...data,
      target_date: data.target_date || undefined,
      monthly_contribution: data.monthly_contribution || undefined,
    }
    if (editing) {
      await updateGoal.mutateAsync({ id: editing.id, data: payload })
    } else {
      await createGoal.mutateAsync(payload)
    }
    setShowModal(false)
    setEditing(null)
  }

  const handleContribute = async (data: ContributeData) => {
    if (!contributing) return
    await contributeGoal.mutateAsync({ id: contributing.id, amount: data.amount })
    setShowContribute(false)
    setContributing(null)
  }

  const handleDelete = async (id: string) => {
    if (confirm('Delete this goal?')) {
      await deleteGoal.mutateAsync(id)
    }
  }

  const active = goals?.filter(g => g.status !== 'completed') ?? []
  const completed = goals?.filter(g => g.status === 'completed') ?? []

  return (
    <div className="p-7">
      <div className="flex items-center justify-between mb-1">
        <h1 className="text-xl font-medium text-gray-900">Goals</h1>
        <button
          onClick={() => { setEditing(null); setShowModal(true) }}
          className="flex items-center gap-1.5 bg-primary text-white text-sm px-3 py-1.5 rounded-lg hover:bg-safe"
        >
          <Plus size={14} /> Add goal
        </button>
      </div>
      <p className="text-sm text-gray-400 mb-6">Your savings goals</p>

      {goals && goals.length > 0 && (
        <div className="grid grid-cols-3 gap-4 mb-6">
          <div className="bg-white border border-gray-100 rounded-lg p-4">
            <div className="text-xs text-gray-400 mb-1">Total saved</div>
            <div className="font-mono text-xl font-medium text-gray-900">{formatINR(totalSaved)}</div>
          </div>
          <div className="bg-white border border-gray-100 rounded-lg p-4">
            <div className="text-xs text-gray-400 mb-1">Total target</div>
            <div className="font-mono text-xl font-medium text-gray-900">{formatINR(totalTarget)}</div>
          </div>
          <div className="bg-white border border-gray-100 rounded-lg p-4">
            <div className="text-xs text-gray-400 mb-1">Goals completed</div>
            <div className="font-mono text-xl font-medium text-gray-900">{completed.length} / {goals.length}</div>
          </div>
        </div>
      )}

      {isLoading ? (
        <LoadingSpinner />
      ) : goals?.length === 0 ? (
        <EmptyState
          emoji="🏆"
          title="No goals yet"
          description="Set targets for your emergency fund, vacation, home purchase and more."
          action={
            <button onClick={() => setShowModal(true)} className="bg-primary text-white text-sm px-4 py-2 rounded-lg hover:bg-safe">
              Create your first goal
            </button>
          }
        />
      ) : (
        <>
          {active.length > 0 && (
            <div className="mb-6">
              <h2 className="text-xs font-medium text-gray-400 uppercase tracking-wide mb-3">Active</h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {active.map(goal => (
                  <GoalCard
                    key={goal.id}
                    goal={goal}
                    onEdit={() => { setEditing(goal); setShowModal(true) }}
                    onDelete={() => handleDelete(goal.id)}
                    onContribute={() => { setContributing(goal); setShowContribute(true) }}
                  />
                ))}
              </div>
            </div>
          )}
          {completed.length > 0 && (
            <div>
              <h2 className="text-xs font-medium text-gray-400 uppercase tracking-wide mb-3">Completed</h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {completed.map(goal => (
                  <GoalCard
                    key={goal.id}
                    goal={goal}
                    onEdit={() => { setEditing(goal); setShowModal(true) }}
                    onDelete={() => handleDelete(goal.id)}
                    onContribute={() => { setContributing(goal); setShowContribute(true) }}
                  />
                ))}
              </div>
            </div>
          )}
        </>
      )}

      {showModal && (
        <GoalModal
          goal={editing ?? undefined}
          onClose={() => { setShowModal(false); setEditing(null) }}
          onSave={handleSave}
          loading={createGoal.isPending || updateGoal.isPending}
        />
      )}

      {showContribute && contributing && (
        <ContributeModal
          goal={contributing}
          onClose={() => { setShowContribute(false); setContributing(null) }}
          onSave={handleContribute}
          loading={contributeGoal.isPending}
        />
      )}
    </div>
  )
}
