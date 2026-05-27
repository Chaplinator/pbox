import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider } from '@/context/AuthContext'
import ProtectedRoute from '@/components/layout/ProtectedRoute'
import AppShell from '@/components/layout/AppShell'

import Login from '@/pages/auth/Login'
import Registro from '@/pages/auth/Registro'
import Recovery from '@/pages/auth/Recovery'
import Dashboard from '@/pages/cliente/Dashboard'
import Inventario from '@/pages/cliente/Inventario'
import Pedidos from '@/pages/cliente/Pedidos'
import Perfil from '@/pages/cliente/Perfil'
import Destinatarios from '@/pages/cliente/Destinatarios'
import PanelOperativo from '@/pages/operador/PanelOperativo'
import Usuarios from '@/pages/operador/Usuarios'
import Reportes from '@/pages/operador/Reportes'

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          {/* Públicas */}
          <Route path="/login" element={<Login />} />
          <Route path="/registro" element={<Registro />} />
          <Route path="/recovery" element={<Recovery />} />

          {/* Rutas protegidas — cualquier usuario autenticado */}
          <Route element={<ProtectedRoute />}>
            <Route element={<AppShell />}>
              <Route path="/dashboard" element={<Dashboard />} />
              <Route path="/inventario" element={<Inventario />} />
              <Route path="/pedidos" element={<Pedidos />} />
              <Route path="/perfil" element={<Perfil />} />
              <Route path="/destinatarios" element={<Destinatarios />} />
            </Route>
          </Route>

          {/* Rutas protegidas — solo operador */}
          <Route element={<ProtectedRoute requiredRol="operador" />}>
            <Route element={<AppShell />}>
              <Route path="/operador" element={<PanelOperativo />} />
              <Route path="/operador/usuarios" element={<Usuarios />} />
              <Route path="/operador/reportes" element={<Reportes />} />
            </Route>
          </Route>

          {/* Fallback */}
          <Route path="*" element={<Navigate to="/inventario" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  )
}
