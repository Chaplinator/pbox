export function LoadingSpinner() {
  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-50">
      <div className="text-center">
        <div className="inline-block">
          <div className="w-12 h-12 border-4 border-gray-200 border-t-brand-600 rounded-full animate-spin"></div>
        </div>
        <p className="mt-4 text-gray-600 text-sm">Cargando...</p>
      </div>
    </div>
  )
}

export function LoadingOverlay() {
  return (
    <div className="fixed inset-0 bg-white/80 flex items-center justify-center z-40">
      <div className="w-8 h-8 border-4 border-gray-200 border-t-brand-600 rounded-full animate-spin"></div>
    </div>
  )
}
