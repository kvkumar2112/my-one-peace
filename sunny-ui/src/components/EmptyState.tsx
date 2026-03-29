interface Props {
  emoji?: string
  title: string
  description?: string
  action?: React.ReactNode
}

export default function EmptyState({ emoji = '📭', title, description, action }: Props) {
  return (
    <div className="flex flex-col items-center justify-center py-12 text-center">
      <div className="text-3xl mb-3">{emoji}</div>
      <div className="text-sm font-medium text-gray-700 mb-1">{title}</div>
      {description && <div className="text-xs text-gray-400 max-w-xs">{description}</div>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  )
}
