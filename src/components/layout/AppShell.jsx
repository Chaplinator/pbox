import { NavLink, Outlet, useNavigate } from 'react-router-dom'
import { useAuth } from '@/context/AuthContext'
import { useTranslation } from 'react-i18next'
import { ErrorBoundary } from '@/components/ui/ErrorBoundary'

function NavSection({ items }) {
  return items.map(({ to, label }) => (
    <NavLink
      key={to}
      to={to}
      end
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

function NavGM({ t }) {
  return (
    <>
      <p className="px-3 pt-1 pb-2 text-xs font-semibold text-gray-400 uppercase tracking-wide">
        {t('nav.administradores')}
      </p>
      <NavSection items={[
        { to: '/admin', label: t('admin.bodegas') },
        { to: '/admin/administrators', label: t('admin.administrators') },
        { to: '/admin/m2', label: t('admin.m2_management') },
        { to: '/admin/settings', label: t('admin.system_settings') },
      ]} />
    </>
  )
}

function NavAdminCuenta({ t, bodegas }) {
  const navItems = [
    { to: '/admin-cuenta/usuarios', label: t('nav.usuarios') },
    { to: '/admin-cuenta/operaciones', label: 'Operaciones' },
    { to: '/admin-cuenta/bodegas', label: t('nav.bodegas') },
  ]

  return (
    <>
      {bodegas.length > 1 && (
        <>
          <p className="px-3 pt-1 pb-2 text-xs font-semibold text-gray-400 uppercase tracking-wide">
            {t('nav.bodegas')}
          </p>
          <div className="px-3 mb-3">
            <select className="w-full px-2 py-1 text-sm border border-gray-300 rounded">
              {bodegas.map(b => (
                <option key={b.id} value={b.id}>{b.nombre}</option>
              ))}
            </select>
          </div>
          <div className="my-2 border-t border-gray-100" />
        </>
      )}
      <p className="px-3 pt-1 pb-2 text-xs font-semibold text-gray-400 uppercase tracking-wide">
        {t('admin.title')}
      </p>
      <NavSection items={navItems} />
    </>
  )
}

function NavOperador({ t }) {
  const navItems = [
    { to: '/operador', label: t('nav.operador') },
    { to: '/operador/recepcion', label: t('nav.recepcion') },
    { to: '/operador/usuarios', label: t('nav.usuarios') },
    { to: '/operador/reportes', label: t('nav.reportes') },
  ]

  return (
    <>
      <p className="px-3 pt-1 pb-2 text-xs font-semibold text-gray-400 uppercase tracking-wide">
        {t('nav.operador')}
      </p>
      <NavSection items={navItems} />
      <div className="my-3 border-t border-gray-100" />
      <p className="px-3 pt-1 pb-2 text-xs font-semibold text-gray-400 uppercase tracking-wide">
        {t('nav.dashboard')}
      </p>
      <NavSection items={[
        { to: '/inventario', label: t('nav.inventario') },
        { to: '/pedidos', label: t('nav.pedidos') },
        { to: '/ingresos', label: t('nav.ingresos') },
        { to: '/perfil', label: t('nav.perfil') },
      ]} />
    </>
  )
}

function NavCliente({ t }) {
  const navItems = [
    { to: '/inventario', label: t('nav.inventario') },
    { to: '/pedidos', label: t('nav.pedidos') },
    { to: '/canastas', label: t('nav.canastas') },
    { to: '/ingresos', label: t('nav.ingresos') },
    { to: '/destinatarios', label: t('nav.destinatarios') },
    { to: '/planes', label: t('nav.planes') },
    { to: '/perfil', label: t('nav.perfil') },
  ]

  return <NavSection items={navItems} />
}

export default function AppShell() {
  const { perfil, signOut, bodegas } = useAuth()
  const navigate = useNavigate()
  const { t, i18n } = useTranslation()

  const role = perfil?.rol

  async function handleSignOut() {
    await signOut()
    navigate('/login')
  }

  function handleLanguageChange(e) {
    i18n.changeLanguage(e.target.value)
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
          {role === 'administrador_gm' && <NavGM t={t} />}
          {role === 'administrador_cuenta' && <NavAdminCuenta t={t} bodegas={bodegas} />}
          {role === 'operador' && <NavOperador t={t} />}
          {role === 'cliente' && <NavCliente t={t} />}
        </nav>

        <div className="px-3 py-4 border-t border-gray-200 space-y-2">
          {perfil && (
            <div>
              <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide block mb-1">
                {t('common.language')}
              </label>
              <select
                value={i18n.language}
                onChange={handleLanguageChange}
                className="w-full px-2 py-1 text-xs border border-gray-300 rounded bg-white"
              >
                <option value="es">{t('perfil.language_es')}</option>
                <option value="en">{t('perfil.language_en')}</option>
              </select>
            </div>
          )}
          <button
            onClick={handleSignOut}
            className="w-full text-left px-3 py-2 rounded-lg text-sm text-gray-600 hover:bg-red-50 hover:text-red-600 transition-colors"
          >
            {t('common.logout')}
          </button>
        </div>
      </aside>

      {/* Main content */}
      <main className="flex-1 overflow-auto">
        <ErrorBoundary>
          <Outlet />
        </ErrorBoundary>
      </main>
    </div>
  )
}
