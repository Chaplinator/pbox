export function Modal({ children, isOpen, onClose, maxWidth = 'lg' }) {
  if (!isOpen) return null

  const widths = {
    sm: 'max-w-sm',
    md: 'max-w-md',
    lg: 'max-w-lg',
    xl: 'max-w-xl',
    '2xl': 'max-w-2xl',
  }

  const widthClass = widths[maxWidth] || widths.lg

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
      <div className={`bg-white rounded-2xl shadow-xl w-full ${widthClass} max-h-[90vh] overflow-y-auto`}>
        {children}
      </div>
    </div>
  )
}

export function ModalHeader({ title, subtitle, onClose }) {
  return (
    <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
      <div>
        {subtitle && <p className="text-xs text-gray-400">{subtitle}</p>}
        <h2 className="font-semibold text-gray-900">{title}</h2>
      </div>
      {onClose && (
        <button
          onClick={onClose}
          className="text-gray-400 hover:text-gray-600 text-2xl leading-none transition-colors"
        >
          ×
        </button>
      )}
    </div>
  )
}

export function ModalBody({ children, className = '' }) {
  return <div className={`p-6 space-y-5 ${className}`}>{children}</div>
}

export function ModalFooter({ children, className = '' }) {
  return (
    <div className={`flex justify-end gap-2 px-6 py-4 border-t border-gray-100 bg-gray-50 ${className}`}>
      {children}
    </div>
  )
}
