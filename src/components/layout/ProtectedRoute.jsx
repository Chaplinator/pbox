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

    // administrador_gm has access to everything
    if (rol === 'administrador_gm') {
      return <Outlet />
    }

    // administrador_cuenta can access own routes and basic routes
    if (requiredRol === 'administrador_cuenta') {
      if (rol === 'administrador_cuenta') {
        return <Outlet />
      }
      return <Navigate to="/inventario" replace />
    }

    // operador can access operador routes and basic routes
    if (requiredRol === 'operador') {
      if (rol === 'operador' || rol === 'administrador_gm' || rol === 'administrador_cuenta') {
        return <Outlet />
      }
      return <Navigate to="/inventario" replace />
    }

    // Fallback: user must match the required role
    if (rol !== requiredRol) {
      return <Navigate to="/inventario" replace />
    }
  }

  return <Outlet />
}
