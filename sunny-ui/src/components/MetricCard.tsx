interface Props {
  label: string
  value: string
  delta?: string
  deltaPositive?: boolean
  deltaText?: string
}

export default function MetricCard({ label, value, delta, deltaPositive, deltaText }: Props) {
  return (
    <div className="bg-white border border-gray-100 rounded-lg p-4">
      <div className="text-xs text-gray-400 mb-2 tracking-wide">{label}</div>
      <div className="font-mono text-2xl font-medium text-gray-900">{value}</div>
      {(delta || deltaText) && (
        <div className={`text-xs mt-1.5 ${deltaPositive ? 'text-safe' : 'text-danger-dark'}`}>
          {delta} {deltaText}
        </div>
      )}
    </div>
  )
}
