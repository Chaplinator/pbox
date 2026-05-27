import { Navigate, Outlet } from 'react-router-dom'
import { useAuth } from '@/context/AuthContext'

export default function ProtectedRoute({ requiredRol }) {
  const { session, perfil, loading } = useAuth()

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <span className="text-gray-400 text-sm">Cargando…</span>
      </div>
    )
  }

  if (!session) return <Navigate to="/login" replace />

  if (requiredRol) {
    const rol = perfil?.rol
    // master tiene acceso a todo; operador solo a rutas de operador
    const permitido = rol === 'master' || rol === requiredRol
    if (!permitido) return <Navigate to="/inventario" replace />
  }

  return <Outlet />
}
