import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useCreateTransaction } from '@/hooks/useTransactions'
import { X } from 'lucide-react'

const schema = z.object({
  description: z.string().min(1, 'Description is required'),
  amount: z.coerce.number().positive('Amount must be positive'),
  type: z.enum(['income', 'expense', 'transfer']),
  date: z.string().min(1, 'Date is required'),
  category: z.string().optional(),
})

type FormData = z.infer<typeof schema>

interface Props {
  onClose: () => void
}

const CATEGORIES = [
  'food', 'groceries', 'transport', 'fuel', 'shopping', 'entertainment',
  'utilities', 'telecom', 'health', 'finance', 'travel', 'education', 'housing', 'salary', 'transfer',
]

export default function AddTransactionModal({ onClose }: Props) {
  const createTx = useCreateTransaction()

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: {
      type: 'expense',
      date: new Date().toISOString().split('T')[0],
    },
  })

  const onSubmit = async (data: FormData) => {
    await createTx.mutateAsync({
      description: data.description,
      amount: data.amount,
      type: data.type,
      date: new Date(data.date).toISOString(),
      category: data.category || undefined,
    })
    onClose()
  }

  return (
    <div className="fixed inset-0 bg-black/20 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl border border-gray-100 w-full max-w-sm shadow-lg">
        <div className="flex items-center justify-between px-5 pt-5 pb-4 border-b border-gray-50">
          <h2 className="text-sm font-medium text-gray-900">Add transaction</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X size={16} />
          </button>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="p-5 space-y-4">
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1.5">Description</label>
            <input
              {...register('description')}
              className="w-full border border-gray-200 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary"
              placeholder="e.g. Swiggy order"
            />
            {errors.description && <p className="text-2xs text-danger-dark mt-1">{errors.description.message}</p>}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1.5">Amount (₹)</label>
              <input
                type="number"
                step="0.01"
                {...register('amount')}
                className="w-full border border-gray-200 rounded-md px-3 py-2 text-sm font-mono focus:outline-none focus:ring-1 focus:ring-primary"
                placeholder="0.00"
              />
              {errors.amount && <p className="text-2xs text-danger-dark mt-1">{errors.amount.message}</p>}
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1.5">Type</label>
              <select
                {...register('type')}
                className="w-full border border-gray-200 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary"
              >
                <option value="expense">Expense</option>
                <option value="income">Income</option>
                <option value="transfer">Transfer</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1.5">Date</label>
              <input
                type="date"
                {...register('date')}
                className="w-full border border-gray-200 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary"
              />
              {errors.date && <p className="text-2xs text-danger-dark mt-1">{errors.date.message}</p>}
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1.5">Category</label>
              <select
                {...register('category')}
                className="w-full border border-gray-200 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary"
              >
                <option value="">Auto-detect</option>
                {CATEGORIES.map((cat) => (
                  <option key={cat} value={cat} className="capitalize">{cat.charAt(0).toUpperCase() + cat.slice(1)}</option>
                ))}
              </select>
            </div>
          </div>

          {createTx.isError && (
            <div className="text-xs text-danger-dark bg-red-50 border border-red-100 rounded-md px-3 py-2">
              Failed to add transaction. Please try again.
            </div>
          )}

          <div className="flex gap-2 pt-1">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 border border-gray-200 text-gray-600 text-sm font-medium py-2 rounded-md hover:bg-gray-50 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting || createTx.isPending}
              className="flex-1 bg-primary text-white text-sm font-medium py-2 rounded-md hover:bg-safe transition-colors disabled:opacity-60"
            >
              {isSubmitting || createTx.isPending ? 'Adding…' : 'Add'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
