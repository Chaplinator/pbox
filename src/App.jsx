import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { lazy, Suspense } from 'react'
import { AuthProvider } from '@/context/AuthContext'
import ProtectedRoute from '@/components/layout/ProtectedRoute'
import AppShell from '@/components/layout/AppShell'
import { LoadingSpinner } from '@/components/ui/LoadingSpinner'

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
const AdminGM = lazy(() => import('@/pages/admin/AdminGM'))
const AdminCuenta = lazy(() => import('@/pages/admin/AdminCuenta'))

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

          {/* Rutas protegidas — administrador_gm */}
          <Route element={<ProtectedRoute requiredRol="administrador_gm" />}>
            <Route element={<AppShell />}>
              <Route path="/admin" element={<Suspense fallback={<LoadingSpinner />}><AdminGM /></Suspense>} />
              <Route path="/admin/administrators" element={<Suspense fallback={<LoadingSpinner />}><AdminGM /></Suspense>} />
              <Route path="/admin/m2" element={<Suspense fallback={<LoadingSpinner />}><AdminGM /></Suspense>} />
              <Route path="/admin/settings" element={<Suspense fallback={<LoadingSpinner />}><AdminGM /></Suspense>} />
            </Route>
          </Route>

          {/* Rutas protegidas — administrador_cuenta */}
          <Route element={<ProtectedRoute requiredRol="administrador_cuenta" />}>
            <Route element={<AppShell />}>
              <Route path="/admin-cuenta/usuarios" element={<Suspense fallback={<LoadingSpinner />}><AdminCuenta /></Suspense>} />
              <Route path="/admin-cuenta/operaciones" element={<Suspense fallback={<LoadingSpinner />}><AdminCuenta /></Suspense>} />
              <Route path="/admin-cuenta/bodegas" element={<Suspense fallback={<LoadingSpinner />}><AdminCuenta /></Suspense>} />
            </Route>
          </Route>

          {/* Fallback */}
          <Route path="*" element={<Navigate to="/inventario" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  )
}
