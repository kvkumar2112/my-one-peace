import { getCategoryMeta, formatINR, formatDateShort } from '@/utils/format'
import type { Transaction } from '@/types'

interface Props {
  transaction: Transaction
  onClick?: () => void
}

export default function TransactionRow({ transaction, onClick }: Props) {
  const meta = getCategoryMeta(transaction.category)
  const isExpense = transaction.type === 'expense'

  return (
    <div
      className="flex items-center gap-3 py-2.5 border-b border-gray-50 last:border-0 cursor-pointer hover:bg-gray-50 -mx-2 px-2 rounded-md transition-colors"
      onClick={onClick}
    >
      {/* Icon */}
      <div
        className="w-9 h-9 rounded-[10px] flex items-center justify-center text-sm flex-shrink-0"
        style={{ backgroundColor: `${meta.color}18` }}
      >
        <span>{meta.emoji}</span>
      </div>

      {/* Details */}
      <div className="flex-1 min-w-0">
        <div className="text-sm font-medium text-gray-900 truncate">{transaction.description}</div>
        <div className="text-2xs text-gray-400">{meta.label}</div>
      </div>

      {/* Amount + date */}
      <div className="text-right flex-shrink-0">
        <div
          className={`text-sm font-medium font-mono ${isExpense ? 'text-danger-dark' : 'text-safe'}`}
        >
          {isExpense ? '-' : '+'}{formatINR(transaction.amount)}
        </div>
        <div className="text-2xs text-gray-400">{formatDateShort(transaction.date)}</div>
      </div>
    </div>
  )
}
