'use client'

export default function PrintButton({
  label = 'Print 🖨️',
  className = 'btn btn-primary'
}: {
  label?: string
  className?: string
}) {
  return (
    <button onClick={() => window.print()} className={className}>
      {label}
    </button>
  )
}
