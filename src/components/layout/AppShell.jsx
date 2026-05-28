import { NavLink, Outlet, useNavigate } from 'react-router-dom'
import { useAuth } from '@/context/AuthContext'

const navCliente = [
  { to: '/inventario',    label: 'Inventario'    },
  { to: '/pedidos',       label: 'Mis Pedidos'   },
  { to: '/canastas',      label: 'Canastas'      },
  { to: '/ingresos',      label: 'Ingresos'      },
  { to: '/destinatarios', label: 'Destinatarios' },
  { to: '/perfil',        label: 'Mi Perfil'     },
]

const navOperador = [
  { to: '/operador',            label: 'Panel Operativo' },
  { to: '/operador/recepcion',  label: 'Recepción'       },
  { to: '/operador/reportes',   label: 'Reportes'        },
  { to: '/operador/usuarios',   label: 'Usuarios'        },
]

function NavSection({ items }) {
  return items.map(({ to, label }) => (
    <NavLink
      key={to}
      to={to}
      className={({ isActive }) =>
        `flex items-center px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
          isActive
            ? 'bg-brand-50 text-brand-700'
            : 'text-gray-600 hover:bg-gray-100'
        }`
      }
    >
      {label}
    </NavLink>
  ))
}

export default function AppShell() {
  const { perfil, signOut } = useAuth()
  const navigate = useNavigate()
  const esOperador = perfil?.rol === 'operador' || perfil?.rol === 'master'

  async function handleSignOut() {
    await signOut()
    navigate('/login')
  }

  return (
    <div className="min-h-screen flex bg-gray-50">
      {/* Sidebar */}
      <aside className="w-60 bg-white border-r border-gray-200 flex flex-col">
        <div className="px-6 py-5 border-b border-gray-200">
          <span className="text-xl font-bold text-brand-700">P-Box</span>
          {perfil && (
            <p className="text-xs text-gray-400 mt-0.5 truncate">{perfil.email}</p>
          )}
        </div>

        <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
          {esOperador ? (
            <>
              <p className="px-3 pt-1 pb-2 text-xs font-semibold text-gray-400 uppercase tracking-wide">
                Operador
              </p>
              <NavSection items={navOperador} />
              <div className="my-3 border-t border-gray-100" />
              <p className="px-3 pt-1 pb-2 text-xs font-semibold text-gray-400 uppercase tracking-wide">
                Vista cliente
              </p>
              <NavSection items={navCliente} />
            </>
          ) : (
            <NavSection items={navCliente} />
          )}
        </nav>

        <div className="px-3 py-4 border-t border-gray-200">
          {perfil && (
            <span className="block px-3 mb-2 text-xs font-semibold uppercase tracking-wide text-gray-400">
              {perfil.rol}
            </span>
          )}
          {perfil?.rol === 'master' && (
            <NavLink to="/admin"
              className={({ isActive }) =>
                `flex items-center px-3 py-2 rounded-lg text-sm font-medium transition-colors mb-1 ${
                  isActive ? 'bg-brand-50 text-brand-700' : 'text-gray-500 hover:bg-gray-100'
                }`
              }
            >
              Super Admin
            </NavLink>
          )}
          <button
            onClick={handleSignOut}
            className="w-full text-left px-3 py-2 rounded-lg text-sm text-gray-600 hover:bg-red-50 hover:text-red-600 transition-colors"
          >
            Cerrar sesión
          </button>
        </div>
      </aside>

      {/* Contenido principal */}
      <main className="flex-1 overflow-auto">
        <Outlet />
      </main>
    </div>
  )
}
