export function Badge({ children, variant = 'default', className = '' }) {
  const variants = {
    default: 'bg-gray-100 text-gray-700',
    primary: 'bg-brand-100 text-brand-700',
    success: 'bg-green-100 text-green-700',
    warning: 'bg-yellow-100 text-yellow-700',
    danger: 'bg-red-100 text-red-700',
    info: 'bg-blue-100 text-blue-700',
    orange: 'bg-orange-100 text-orange-700',
    purple: 'bg-purple-100 text-purple-700',
  }

  const variantStyles = variants[variant] || variants.default

  return (
    <span className={`inline-flex px-2.5 py-0.5 rounded-full text-xs font-semibold ${variantStyles} ${className}`}>
      {children}
    </span>
  )
}

export function StatusBadge({ status, labelMap = {} }) {
  const defaultMap = {
    pendiente: { variant: 'warning', label: 'Pendiente' },
    recibido: { variant: 'success', label: 'Recibido' },
    parcial: { variant: 'orange', label: 'Parcial' },
    rechazado: { variant: 'danger', label: 'Rechazado' },
    activo: { variant: 'success', label: 'Activo' },
    inactivo: { variant: 'danger', label: 'Inactivo' },
  }

  const map = { ...defaultMap, ...labelMap }
  const config = map[status] || { variant: 'default', label: status }

  return <Badge variant={config.variant}>{config.label}</Badge>
}
