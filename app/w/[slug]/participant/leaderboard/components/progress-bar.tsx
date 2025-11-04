interface ProgressBarProps {
  value: number // 0-100
  className?: string
}

export function ProgressBar({ value, className = '' }: ProgressBarProps) {
  const percentage = Math.min(100, Math.max(0, value))

  return (
    <div className={`w-full bg-slate-200 rounded-full h-2 overflow-hidden ${className}`}>
      <div
        className="bg-coral-500 h-full transition-all duration-500 ease-out"
        style={{ width: `${percentage}%` }}
      />
    </div>
  )
}
