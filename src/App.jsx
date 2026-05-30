import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { lazy, Suspense } from 'react'
import { AuthProvider, useAuth } from '@/context/AuthContext'
import ProtectedRoute from '@/components/layout/ProtectedRoute'
import AppShell from '@/components/layout/AppShell'
import { LoadingSpinner } from '@/components/ui/LoadingSpinner'

// Redirige a la vista inicial según el rol
function RoleHome() {
  const { perfil, loading } = useAuth()
  // Esperar a que el perfil esté cargado, no solo la sesión —
  // si no, rol=undefined y caería al default (/dashboard de cliente).
  if (loading || !perfil) return <LoadingSpinner />
  const rol = perfil?.rol
  if (rol === 'administrador_gm') return <Navigate to="/master-gm" replace />
  if (rol === 'administrador_cuenta') return <Navigate to="/admin/dashboard" replace />
  if (rol === 'operador') return <Navigate to="/operador" replace />
  return <Navigate to="/dashboard" replace />
}

// Public pages - load on demand
const Login = lazy(() => import('@/pages/auth/Login'))
const Registro = lazy(() => import('@/pages/auth/Registro'))
const Recovery = lazy(() => import('@/pages/auth/Recovery'))
const Track = lazy(() => import('@/pages/public/Track'))

// Cliente pages - load on demand
const Dashboard = lazy(() => import('@/pages/cliente/Dashboard'))
const Inventario = lazy(() => import('@/pages/cliente/Inventario'))
const Pedidos = lazy(() => import('@/pages/cliente/Pedidos'))
const Perfil = lazy(() => import('@/pages/cliente/Perfil'))
const Destinatarios = lazy(() => import('@/pages/cliente/Destinatarios'))
const Ingresos = lazy(() => import('@/pages/cliente/Ingresos'))
const Canastas = lazy(() => import('@/pages/cliente/Canastas'))
const Planes = lazy(() => import('@/pages/cliente/Planes'))

// Operador pages - load on demand
const PanelOperativo = lazy(() => import('@/pages/operador/PanelOperativo'))
const RecepcionInventario = lazy(() => import('@/pages/operador/RecepcionInventario'))
const Usuarios = lazy(() => import('@/pages/operador/Usuarios'))
const Reportes = lazy(() => import('@/pages/operador/Reportes'))

// Admin pages - load on demand
const SuperAdmin = lazy(() => import('@/pages/admin/SuperAdmin'))
const MasterGM = lazy(() => import('@/pages/admin/MasterGM'))
const Admin = lazy(() => import('@/pages/admin/Admin'))

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          {/* Públicas */}
          <Route path="/login" element={<Suspense fallback={<LoadingSpinner />}><Login /></Suspense>} />
          <Route path="/registro" element={<Suspense fallback={<LoadingSpinner />}><Registro /></Suspense>} />
          <Route path="/recovery" element={<Suspense fallback={<LoadingSpinner />}><Recovery /></Suspense>} />
          <Route path="/track" element={<Suspense fallback={<LoadingSpinner />}><Track /></Suspense>} />
          <Route path="/track/:numero" element={<Suspense fallback={<LoadingSpinner />}><Track /></Suspense>} />

          {/* Redirector por rol */}
          <Route element={<ProtectedRoute />}>
            <Route path="/" element={<RoleHome />} />
          </Route>

          {/* Rutas protegidas — cualquier usuario autenticado */}
          <Route element={<ProtectedRoute />}>
            <Route element={<AppShell />}>
              <Route path="/dashboard" element={<Suspense fallback={<LoadingSpinner />}><Dashboard /></Suspense>} />
              <Route path="/inventario" element={<Suspense fallback={<LoadingSpinner />}><Inventario /></Suspense>} />
              <Route path="/pedidos" element={<Suspense fallback={<LoadingSpinner />}><Pedidos /></Suspense>} />
              <Route path="/perfil" element={<Suspense fallback={<LoadingSpinner />}><Perfil /></Suspense>} />
              <Route path="/destinatarios" element={<Suspense fallback={<LoadingSpinner />}><Destinatarios /></Suspense>} />
              <Route path="/ingresos" element={<Suspense fallback={<LoadingSpinner />}><Ingresos /></Suspense>} />
              <Route path="/canastas" element={<Suspense fallback={<LoadingSpinner />}><Canastas /></Suspense>} />
              <Route path="/planes" element={<Suspense fallback={<LoadingSpinner />}><Planes /></Suspense>} />
            </Route>
          </Route>

          {/* Rutas protegidas — solo operador/admin */}
          <Route element={<ProtectedRoute requiredRol="operador" />}>
            <Route element={<AppShell />}>
              <Route path="/operador" element={<Suspense fallback={<LoadingSpinner />}><PanelOperativo /></Suspense>} />
              <Route path="/operador/usuarios" element={<Suspense fallback={<LoadingSpinner />}><Usuarios /></Suspense>} />
              <Route path="/operador/reportes" element={<Suspense fallback={<LoadingSpinner />}><Reportes /></Suspense>} />
              <Route path="/operador/recepcion" element={<Suspense fallback={<LoadingSpinner />}><RecepcionInventario /></Suspense>} />
              <Route path="/admin" element={<Suspense fallback={<LoadingSpinner />}><SuperAdmin /></Suspense>} />
            </Route>
          </Route>

          {/* Rutas protegidas — Master GM (administrador_gm) */}
          <Route element={<ProtectedRoute requiredRol="administrador_gm" />}>
            <Route element={<AppShell />}>
              <Route path="/master-gm" element={<Suspense fallback={<LoadingSpinner />}><MasterGM /></Suspense>} />
              <Route path="/master-gm/usuarios" element={<Suspense fallback={<LoadingSpinner />}><MasterGM /></Suspense>} />
              <Route path="/master-gm/admins" element={<Suspense fallback={<LoadingSpinner />}><MasterGM /></Suspense>} />
              <Route path="/master-gm/accesos" element={<Suspense fallback={<LoadingSpinner />}><MasterGM /></Suspense>} />
            </Route>
          </Route>

          {/* Rutas protegidas — Admin (administrador_cuenta) */}
          <Route element={<ProtectedRoute requiredRol="administrador_cuenta" />}>
            <Route element={<AppShell />}>
              <Route path="/admin" element={<Suspense fallback={<LoadingSpinner />}><Admin /></Suspense>} />
              <Route path="/admin/dashboard" element={<Suspense fallback={<LoadingSpinner />}><Admin /></Suspense>} />
              <Route path="/admin/bodegas" element={<Suspense fallback={<LoadingSpinner />}><Admin /></Suspense>} />
              <Route path="/admin/usuarios" element={<Suspense fallback={<LoadingSpinner />}><Admin /></Suspense>} />
              <Route path="/admin/inventario" element={<Suspense fallback={<LoadingSpinner />}><Admin /></Suspense>} />
              <Route path="/admin/pedidos" element={<Suspense fallback={<LoadingSpinner />}><Admin /></Suspense>} />
              <Route path="/admin/ingresos" element={<Suspense fallback={<LoadingSpinner />}><Admin /></Suspense>} />
              <Route path="/admin/reportes" element={<Suspense fallback={<LoadingSpinner />}><Admin /></Suspense>} />
            </Route>
          </Route>

          {/* Fallback — el redirector por rol decide */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  )
}
