import { NavLink, Outlet, useNavigate } from 'react-router-dom'
import { useAuth } from '@/context/AuthContext'
import { useTranslation } from 'react-i18next'
import { ErrorBoundary } from '@/components/ui/ErrorBoundary'
import { useEffect } from 'react'

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

function NavMasterGM({ t }) {
  return (
    <>
      <p className="px-3 pt-1 pb-2 text-xs font-semibold text-gray-400 uppercase tracking-wide">
        {t('permissions', { ns: 'admin' })}
      </p>
      <NavSection items={[
        { to: '/master-gm', label: t('dashboard', { ns: 'master_gm' }) },
        { to: '/master-gm/usuarios', label: t('usuarios', { ns: 'master_gm' }) },
        { to: '/master-gm/admins', label: t('admins', { ns: 'master_gm' }) },
        { to: '/master-gm/accesos', label: t('accesos', { ns: 'master_gm' }) },
      ]} />
    </>
  )
}

function NavAdmin({ t, bodegas }) {
  const navItems = [
    { to: '/admin/dashboard', label: 'Dashboard' },
    { to: '/admin/bodegas', label: 'Bodegas & m²' },
    { to: '/admin/usuarios', label: 'Usuarios' },
    { to: '/admin/inventario', label: 'Inventario' },
    { to: '/admin/pedidos', label: 'Pedidos' },
    { to: '/admin/ingresos', label: 'Ingresos' },
    { to: '/admin/reportes', label: 'Reportes' },
  ]

  return (
    <>
      {bodegas.length > 1 && (
        <>
          <p className="px-3 pt-1 pb-2 text-xs font-semibold text-gray-400 uppercase tracking-wide">
            Bodega Actual
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
        Panel de Admin
      </p>
      <NavSection items={navItems} />
    </>
  )
}

function NavOperador({ t }) {
  const navItems = [
    { to: '/operador', label: 'Panel Operativo' },
    { to: '/operador/recepcion', label: 'Recepción' },
    { to: '/operador/usuarios', label: 'Usuarios (Vista)' },
    { to: '/operador/reportes', label: 'Reportes' },
    { to: '/operador/inventario', label: 'Inventario Compartido' },
    { to: '/operador/pedidos', label: 'Pedidos Compartidos' },
  ]

  return (
    <>
      <p className="px-3 pt-1 pb-2 text-xs font-semibold text-gray-400 uppercase tracking-wide">
        Panel Operador
      </p>
      <NavSection items={navItems} />
      <div className="my-3 border-t border-gray-100" />
      <p className="px-3 pt-1 pb-2 text-xs font-semibold text-gray-400 uppercase tracking-wide">
        Perfil
      </p>
      <NavSection items={[
        { to: '/perfil', label: 'Mi Perfil' },
      ]} />
    </>
  )
}

function NavCliente({ t }) {
  const navItems = [
    { to: '/inventario', label: t('inventario', { ns: 'nav' }) },
    { to: '/pedidos', label: t('pedidos', { ns: 'nav' }) },
    { to: '/canastas', label: t('canastas', { ns: 'nav' }) },
    { to: '/ingresos', label: t('ingresos', { ns: 'nav' }) },
    { to: '/destinatarios', label: t('destinatarios', { ns: 'nav' }) },
    { to: '/planes', label: t('planes', { ns: 'nav' }) },
    { to: '/perfil', label: t('perfil', { ns: 'nav' }) },
  ]

  return <NavSection items={navItems} />
}

export default function AppShell() {
  const { perfil, signOut, bodegas, changeLanguage } = useAuth()
  const navigate = useNavigate()
  const { t, i18n } = useTranslation()

  // Sincronizar idioma de perfil con i18n
  useEffect(() => {
    if (perfil?.idioma && perfil.idioma !== i18n.language) {
      i18n.changeLanguage(perfil.idioma)
    }
  }, [perfil?.idioma, i18n])

  const role = perfil?.rol

  async function handleSignOut() {
    await signOut()
    navigate('/login')
  }

  async function handleLanguageChange(e) {
    const newLanguage = e.target.value
    if (newLanguage === perfil?.idioma) return
    // changeLanguage already calls i18n.changeLanguage internally
    await changeLanguage(newLanguage)
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
          {role === 'administrador_gm' && <NavMasterGM t={t} />}
          {role === 'administrador_cuenta' && <NavAdmin t={t} bodegas={bodegas} />}
          {role === 'operador' && <NavOperador t={t} />}
          {role === 'cliente' && <NavCliente t={t} />}
        </nav>

        <div className="px-3 py-4 border-t border-gray-200 space-y-2">
          {perfil && (
            <div>
              <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide block mb-1">
                {t('language', { ns: 'common' })}
              </label>
              <select
                value={perfil.idioma || i18n.language}
                onChange={handleLanguageChange}
                className="w-full px-2 py-1 text-xs border border-gray-300 rounded bg-white"
              >
                <option value="es">{t('language_es', { ns: 'perfil' })}</option>
                <option value="en">{t('language_en', { ns: 'perfil' })}</option>
              </select>
            </div>
          )}
          <button
            onClick={handleSignOut}
            className="w-full text-left px-3 py-2 rounded-lg text-sm text-gray-600 hover:bg-red-50 hover:text-red-600 transition-colors"
          >
            {t('logout', { ns: 'common' })}
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
