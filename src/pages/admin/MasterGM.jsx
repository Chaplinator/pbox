import { useEffect, useMemo, useState } from 'react'
import { useLocation } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useAuth } from '@/context/AuthContext'
import { supabase } from '@/supabase/client'
import { exportarLibro } from '@/utils/exportExcel'

const ROL_BADGE = {
  administrador_cuenta: 'bg-blue-100 text-blue-700',
  administrador_gm: 'bg-purple-100 text-purple-700',
  operador: 'bg-orange-100 text-orange-700',
  cliente: 'bg-gray-100 text-gray-700',
}

function tabFromPath(pathname) {
  if (pathname.endsWith('/usuarios')) return 'usuarios'
  if (pathname.endsWith('/admins')) return 'admins'
  if (pathname.endsWith('/accesos')) return 'accesos'
  return 'dashboard'
}

export default function MasterGM() {
  const { perfil } = useAuth()
  const { t } = useTranslation('master_gm')
  const location = useLocation()
  const activeTab = tabFromPath(location.pathname)

  const rolLabel = {
    administrador_gm: t('rol_master'),
    administrador_cuenta: t('rol_admin'),
    operador: t('rol_operador'),
    cliente: t('rol_cliente'),
  }

  const [allUsers, setAllUsers] = useState([])
  const [deletedUsers, setDeletedUsers] = useState([])
  const [bodegas, setBodegas] = useState([])
  const [clientes, setClientes] = useState([])
  const [planes, setPlanes] = useState([])
  const [loading, setLoading] = useState(true)
  const [selectedUser, setSelectedUser] = useState(null)
  const [search, setSearch] = useState('')
  const [expanded, setExpanded] = useState({})
  const [showCrear, setShowCrear] = useState(false)
  const [showPapelera, setShowPapelera] = useState(false)

  useEffect(() => { cargarDatos() }, [])
  useEffect(() => { setSelectedUser(null) }, [activeTab])

  const toggleExpand = (id) => setExpanded(e => ({ ...e, [id]: !e[id] }))

  async function cargarDatos() {
    setLoading(true)
    try {
      const [u, b, c, p] = await Promise.all([
        supabase.from('usuarios').select('id, nombre, apellido, email, telefono, rol, created_at, activo, bodega_id, deleted_at').order('created_at', { ascending: false }),
        supabase.from('bodegas').select('id, nombre, plan, activo, admin_id'),
        supabase.from('clientes').select('id, usuario_id, nombre_negocio, telefono, bodega_id, activo, plan, plan_id, m2_contratados, plan_limite_pedidos_mes'),
        supabase.from('planes').select('*'),
      ])
      if (u.error) console.error('usuarios:', u.error)
      if (b.error) console.error('bodegas:', b.error)
      if (c.error) console.error('clientes:', c.error)
      if (p.error) console.error('planes:', p.error)
      const todos = u.data || []
      setAllUsers(todos.filter(x => !x.deleted_at))
      setDeletedUsers(todos.filter(x => x.deleted_at))
      setBodegas(b.data || [])
      setClientes(c.data || [])
      setPlanes(p.data || [])
      // Refrescar el usuario seleccionado con datos nuevos (si fue borrado, cerrar)
      setSelectedUser(prev => prev ? todos.find(x => x.id === prev.id && !x.deleted_at) || null : null)
    } catch (err) {
      console.error(err)
    }
    setLoading(false)
  }

  const clientesByUsuario = useMemo(
    () => Object.fromEntries(clientes.map(c => [c.usuario_id, c])),
    [clientes]
  )

  // ---- Acciones ----
  async function updateUsuario(userId, patch, okMsg) {
    const { data, error } = await supabase.from('usuarios').update(patch).eq('id', userId).select('id')
    if (error) { alert(error.message); return false }
    if (!data || data.length === 0) { alert(t('rls_bloqueado_rol')); return false }
    if (okMsg) {/* silencioso por defecto */}
    await cargarDatos()
    return true
  }

  async function cambiarRol(userId, nuevoRol) {
    await updateUsuario(userId, { rol: nuevoRol })
  }
  async function cambiarEstado(userId, activo) {
    await updateUsuario(userId, { activo })
  }
  async function moverUsuario(userId, bodegaId) {
    const ok = await updateUsuario(userId, { bodega_id: bodegaId || null })
    // Mover también el registro de cliente si existe
    if (ok && clientesByUsuario[userId]) {
      await supabase.from('clientes').update({ bodega_id: bodegaId || null }).eq('usuario_id', userId)
      await cargarDatos()
    }
  }
  async function guardarEdicion(userId, usuarioPatch, clientePatch) {
    const okMsg = t('guardado_ok')
    const { error: e1 } = await supabase.from('usuarios').update(usuarioPatch).eq('id', userId)
    if (e1) { alert(e1.message); return }
    if (clientesByUsuario[userId] && clientePatch) {
      const { error: e2 } = await supabase.from('clientes').update(clientePatch).eq('usuario_id', userId)
      if (e2) { alert(e2.message); return }
    }
    await cargarDatos()
    alert(okMsg)
  }
  async function asignarBodega(bodegaId, adminId) {
    const { data, error } = await supabase.from('bodegas').update({ admin_id: adminId || null }).eq('id', bodegaId).select('id')
    if (error) { alert(error.message); return }
    if (!data || data.length === 0) { alert(t('rls_bloqueado_rol')); return }
    await cargarDatos()
  }
  async function invokeAction(action, userId, extra = {}) {
    const { data, error } = await supabase.functions.invoke('admin-user-actions', {
      body: { action, userId, ...extra },
    })
    if (error) {
      let msg = error.message
      try { const j = await error.context.json(); if (j?.error) msg = j.error } catch { /* noop */ }
      alert(msg)
      return false
    }
    if (data?.error) { alert(data.error); return false }
    return true
  }
  async function setPasswordUsuario(userId, password) {
    const ok = await invokeAction('set_password', userId, { password })
    if (ok) alert(t('password_ok'))
    return ok
  }
  async function eliminarUsuario(userId) {
    const ok = await invokeAction('delete_user', userId)
    if (ok) {
      setSelectedUser(null)
      await cargarDatos()
      alert(t('eliminado_ok'))
    }
  }
  async function restaurarUsuario(userId) {
    const ok = await invokeAction('restore_user', userId)
    if (ok) { await cargarDatos(); alert(t('restaurado_ok')) }
  }
  async function purgarUsuario(userId) {
    const ok = await invokeAction('purge_user', userId)
    if (ok) { await cargarDatos(); alert(t('purgado_ok')) }
  }
  async function descargarRespaldo() {
    try {
      const [u, b, c, pl, pr, inv, ped, ip, ing, ii, mov] = await Promise.all([
        supabase.from('usuarios').select('*'),
        supabase.from('bodegas').select('*'),
        supabase.from('clientes').select('*'),
        supabase.from('planes').select('*'),
        supabase.from('productos').select('*'),
        supabase.from('vista_inventario').select('*'),
        supabase.from('pedidos').select('*'),
        supabase.from('items_pedido').select('*'),
        supabase.from('ingresos_inventario').select('*'),
        supabase.from('items_ingreso').select('*'),
        supabase.from('movimientos_inventario').select('*'),
      ])
      exportarLibro({
        Usuarios: u.data || [],
        Bodegas: b.data || [],
        Clientes: c.data || [],
        Planes: pl.data || [],
        Productos_SKUs: pr.data || [],
        Inventario: inv.data || [],
        Pedidos: ped.data || [],
        Items_Pedido: ip.data || [],
        Ingresos: ing.data || [],
        Items_Ingreso: ii.data || [],
        Movimientos: mov.data || [],
      }, 'respaldo_pbox_completo')
    } catch (e) {
      alert('Error generando respaldo: ' + e.message)
    }
  }

  async function asignarPlanCliente(usuarioId, planId) {
    const plan = planes.find(p => p.id === planId)
    const { error } = await supabase.from('clientes').update({
      plan_id: planId || null,
      plan: plan?.nombre || null,
      plan_limite_pedidos_mes: plan?.limite_pedidos_mes ?? null,
    }).eq('usuario_id', usuarioId)
    if (error) { alert(error.message); return }
    await cargarDatos()
  }
  async function crearUsuario(form) {
    const { data, error } = await supabase.functions.invoke('admin-user-actions', {
      body: { action: 'create_user', ...form },
    })
    if (error) {
      let m = error.message
      try { const j = await error.context.json(); if (j?.error) m = j.error } catch { /* noop */ }
      alert(m); return false
    }
    if (data?.error) { alert(data.error); return false }
    await cargarDatos()
    alert(t('crear_ok'))
    return true
  }

  if (perfil?.rol !== 'administrador_gm') {
    return <div className="p-8 text-center"><p className="text-red-600">{t('acceso_denegado')}</p></div>
  }

  // ---- Derivados ----
  const admins = allUsers.filter(u => u.rol === 'administrador_cuenta')
  const gms = allUsers.filter(u => u.rol === 'administrador_gm')

  const operadoresEnBodega = (bid) => allUsers.filter(u => u.bodega_id === bid && u.rol === 'operador').length
  const subcuentasEnBodega = (bid) => clientes.filter(c => c.bodega_id === bid).length

  const bodegasDeAdmin = (adminId) => bodegas.filter(b => b.admin_id === adminId)
  const subUsuariosDeAdmin = (admin) => {
    const ids = bodegasDeAdmin(admin.id).map(b => b.id)
    // Solo operadores/clientes; GM y otros admins no son subusuarios de un admin
    return allUsers.filter(u =>
      ids.includes(u.bodega_id) && u.id !== admin.id &&
      u.rol !== 'administrador_gm' && u.rol !== 'administrador_cuenta')
  }

  const adminGroups = admins.map(a => {
    const bs = bodegasDeAdmin(a.id)
    return {
      admin: a,
      bodegas: bs,
      totalBodegas: bs.length,
      totalOperadores: bs.reduce((acc, b) => acc + operadoresEnBodega(b.id), 0),
      totalSubcuentas: bs.reduce((acc, b) => acc + subcuentasEnBodega(b.id), 0),
    }
  }).sort((x, y) => y.totalBodegas - x.totalBodegas)

  const bodegasSinAdmin = bodegas.filter(b => !b.admin_id)

  const nombreBodega = (id) => bodegas.find(b => b.id === id)?.nombre || t('sin_bodega')

  // Búsqueda (aplana cuando hay texto)
  const q = search.trim().toLowerCase()
  const usuariosFiltrados = q
    ? allUsers.filter(u =>
        `${u.nombre || ''} ${u.apellido || ''}`.toLowerCase().includes(q) ||
        (u.email || '').toLowerCase().includes(q))
    : null

  const headers = {
    dashboard: { h1: t('dashboard'), sub: t('dashboard_sub') },
    usuarios: { h1: t('usuarios'), sub: t('usuarios_sub') },
    admins: { h1: t('admins'), sub: t('admins_sub') },
    accesos: { h1: t('accesos'), sub: t('accesos_sub') },
  }
  const head = headers[activeTab]

  function UserRow({ user, indent = false }) {
    const cli = clientesByUsuario[user.id]
    return (
      <div
        onClick={() => setSelectedUser(user)}
        className={`flex justify-between items-center p-2.5 border rounded-lg cursor-pointer transition ${indent ? 'ml-4' : ''} ${
          selectedUser?.id === user.id ? 'border-brand-500 bg-brand-50' : 'border-gray-200 hover:border-gray-300'
        }`}
      >
        <div className="min-w-0">
          <p className="font-medium text-gray-900 truncate">
            {user.nombre} {user.apellido || ''}
            {!user.activo && <span className="ml-2 text-xs text-red-600">({t('inactivo')})</span>}
          </p>
          <p className="text-xs text-gray-600 truncate">{cli?.nombre_negocio ? `${cli.nombre_negocio} · ` : ''}{user.email}</p>
        </div>
        <span className={`shrink-0 px-2 py-1 rounded text-xs font-medium ${ROL_BADGE[user.rol] || 'bg-gray-100 text-gray-700'}`}>
          {rolLabel[user.rol] || user.rol}
        </span>
      </div>
    )
  }

  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">{head.h1}</h1>
        <p className="text-gray-600 mt-1">{head.sub}</p>
      </div>

      <div className="bg-white rounded-lg shadow p-6">
        {/* DASHBOARD */}
        {activeTab === 'dashboard' && (
          loading ? <p className="text-gray-600">{t('loading', { ns: 'common' })}</p> : (
            <div className="space-y-8">
              <RespaldosPanel onDescargarExcel={descargarRespaldo} onRestaurado={cargarDatos} />
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <StatCard label={t('stat_usuarios')} value={allUsers.length} color="text-gray-900" />
                <StatCard label={t('stat_bodegas')} value={bodegas.length} color="text-brand-700" />
                <StatCard label={t('stat_admins')} value={admins.length} color="text-blue-700" />
                <StatCard label={t('stat_subcuentas')} value={clientes.length} color="text-orange-700" />
              </div>

              <div>
                <h2 className="text-lg font-bold mb-3 text-gray-900">{t('admins')}</h2>
                {adminGroups.length === 0 ? (
                  <p className="text-gray-600">{t('dashboard_no_admins')}</p>
                ) : (
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                    {adminGroups.map(g => (
                      <div key={g.admin.id} className="border border-gray-200 rounded-lg p-4">
                        <button onClick={() => setSelectedUser(g.admin)} className="text-left w-full mb-3">
                          <h3 className="font-semibold text-gray-900 hover:text-brand-700">{g.admin.nombre} {g.admin.apellido || ''}</h3>
                          <p className="text-sm text-gray-600">{g.admin.email}</p>
                        </button>
                        <div className="grid grid-cols-3 gap-2 mb-3">
                          <MiniStat label={t('admin_bodegas')} value={g.totalBodegas} />
                          <MiniStat label={t('admin_operadores')} value={g.totalOperadores} />
                          <MiniStat label={t('admin_subcuentas')} value={g.totalSubcuentas} />
                        </div>
                        {g.bodegas.length === 0 ? (
                          <p className="text-sm text-gray-400">{t('sin_bodegas')}</p>
                        ) : (
                          <ul className="space-y-1">
                            {g.bodegas.map(b => (
                              <li key={b.id} className="flex justify-between items-center text-sm border-t border-gray-100 pt-1.5">
                                <span className="text-gray-900">{b.nombre}</span>
                                <select
                                  value={b.admin_id || ''}
                                  onChange={(e) => asignarBodega(b.id, e.target.value)}
                                  className="text-xs border border-gray-300 rounded px-1.5 py-1 bg-white"
                                >
                                  <option value="">{t('quitar_bodega')}</option>
                                  {admins.map(a => (
                                    <option key={a.id} value={a.id}>{a.nombre} {a.apellido || ''}</option>
                                  ))}
                                </select>
                              </li>
                            ))}
                          </ul>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div>
                <h2 className="text-lg font-bold mb-3 text-gray-900">{t('sin_admin')}</h2>
                {bodegasSinAdmin.length === 0 ? (
                  <p className="text-sm text-gray-500">{t('todas_asignadas')}</p>
                ) : (
                  <div className="space-y-2">
                    {bodegasSinAdmin.map(b => (
                      <div key={b.id} className="flex items-center justify-between gap-3 border border-gray-200 rounded-lg p-3">
                        <div>
                          <p className="font-medium text-gray-900">{b.nombre}</p>
                          <p className="text-xs text-gray-500">{operadoresEnBodega(b.id)} {t('admin_operadores').toLowerCase()} · {subcuentasEnBodega(b.id)} {t('admin_subcuentas').toLowerCase()}</p>
                        </div>
                        <select
                          defaultValue=""
                          onChange={(e) => asignarBodega(b.id, e.target.value)}
                          disabled={admins.length === 0}
                          className="px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white disabled:opacity-50"
                        >
                          <option value="" disabled>{t('asignar_admin')}</option>
                          {admins.map(a => <option key={a.id} value={a.id}>{a.nombre} {a.apellido || ''}</option>)}
                        </select>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )
        )}

        {/* USUARIOS (jerárquico + buscador) */}
        {activeTab === 'usuarios' && (
          loading ? <p className="text-gray-600">{t('loading', { ns: 'common' })}</p> : (
            <div>
              <div className="flex gap-3 mb-5">
                <input
                  type="text"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder={t('buscar')}
                  className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-sm"
                />
                <button
                  onClick={() => setShowCrear(v => !v)}
                  className="px-4 py-2 bg-brand-600 text-white rounded-lg text-sm font-medium hover:bg-brand-700 whitespace-nowrap"
                >
                  {showCrear ? t('close', { ns: 'common' }) : t('agregar_usuario')}
                </button>
              </div>

              {showCrear && (
                <CrearUsuarioForm
                  bodegas={bodegas}
                  permitirRoles={['cliente', 'operador', 'administrador_cuenta']}
                  t={t}
                  onCreated={async (form) => { const ok = await crearUsuario(form); if (ok) setShowCrear(false) }}
                />
              )}

              {usuariosFiltrados ? (
                usuariosFiltrados.length === 0 ? (
                  <p className="text-gray-600">{t('sin_resultados')}</p>
                ) : (
                  <div className="space-y-2">
                    {usuariosFiltrados.map(u => <UserRow key={u.id} user={u} />)}
                  </div>
                )
              ) : (
                <div className="space-y-6">
                  {/* Master GM */}
                  {gms.length > 0 && (
                    <div>
                      <p className="text-xs font-semibold text-purple-700 uppercase tracking-wide mb-2">{t('sistema_gm')}</p>
                      <div className="space-y-2">{gms.map(u => <UserRow key={u.id} user={u} />)}</div>
                    </div>
                  )}

                  {/* Por administrador (desplegable) */}
                  {adminGroups.map(g => {
                    const subs = subUsuariosDeAdmin(g.admin)
                    const isOpen = !!expanded[g.admin.id]
                    return (
                      <div key={g.admin.id} className="border border-gray-200 rounded-lg p-3">
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => toggleExpand(g.admin.id)}
                            className="shrink-0 w-6 h-6 flex items-center justify-center rounded hover:bg-gray-100 text-gray-500"
                            aria-label="toggle"
                          >
                            <span className={`transition-transform ${isOpen ? 'rotate-90' : ''}`}>▶</span>
                          </button>
                          <span className="text-xs text-gray-400 shrink-0">{subs.length}</span>
                          <div className="flex-1 min-w-0"><UserRow user={g.admin} /></div>
                        </div>
                        {isOpen && (
                          subs.length === 0 ? (
                            <p className="text-xs text-gray-400 ml-8 mt-2">{t('sin_bodegas')}</p>
                          ) : (
                            <div className="space-y-2 mt-2 ml-8">{subs.map(u => <UserRow key={u.id} user={u} />)}</div>
                          )
                        )}
                      </div>
                    )
                  })}

                  {/* Sin administrador */}
                  {(() => {
                    const sinAdminIds = bodegasSinAdmin.map(b => b.id)
                    const huerfanos = allUsers.filter(u =>
                      u.rol !== 'administrador_gm' && u.rol !== 'administrador_cuenta' &&
                      (!u.bodega_id || sinAdminIds.includes(u.bodega_id)))
                    if (huerfanos.length === 0) return null
                    return (
                      <div>
                        <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">{t('sin_admin_grupo')}</p>
                        <div className="space-y-2">{huerfanos.map(u => <UserRow key={u.id} user={u} />)}</div>
                      </div>
                    )
                  })()}
                </div>
              )}

              {/* Papelera */}
              {deletedUsers.length > 0 && (
                <div className="mt-8 border-t border-gray-200 pt-4">
                  <button
                    onClick={() => setShowPapelera(v => !v)}
                    className="flex items-center gap-2 text-sm font-semibold text-gray-700"
                  >
                    <span className={`transition-transform ${showPapelera ? 'rotate-90' : ''}`}>▶</span>
                    🗑 {t('papelera')} ({deletedUsers.length})
                  </button>
                  {showPapelera && (
                    <div className="mt-3">
                      <p className="text-xs text-gray-500 mb-3">{t('papelera_info')}</p>
                      <div className="space-y-2">
                        {deletedUsers.map(u => {
                          const dias = Math.max(0, 3 - Math.floor((Date.now() - new Date(u.deleted_at).getTime()) / 86400000))
                          return (
                            <div key={u.id} className="flex justify-between items-center p-3 border border-gray-200 rounded-lg">
                              <div className="min-w-0">
                                <p className="font-medium text-gray-700 truncate">{u.nombre} {u.apellido || ''}</p>
                                <p className="text-xs text-gray-500 truncate">
                                  {u.email} · {t('borrado_el')} {new Date(u.deleted_at).toLocaleDateString()} ·{' '}
                                  <span className={dias === 0 ? 'text-red-600' : 'text-gray-500'}>
                                    {dias === 0 ? t('expira_pronto') : t('dias_restantes', { dias })}
                                  </span>
                                </p>
                              </div>
                              <div className="flex gap-2 shrink-0">
                                <button
                                  onClick={() => restaurarUsuario(u.id)}
                                  className="px-3 py-1.5 text-sm border border-green-300 text-green-700 rounded-lg hover:bg-green-50"
                                >
                                  {t('restaurar')}
                                </button>
                                <button
                                  onClick={() => { if (confirm(t('confirmar_purgar', { nombre: `${u.nombre} ${u.apellido || ''}` }))) purgarUsuario(u.id) }}
                                  className="px-3 py-1.5 text-sm border border-red-300 text-red-600 rounded-lg hover:bg-red-50"
                                >
                                  {t('eliminar_definitivo')}
                                </button>
                              </div>
                            </div>
                          )
                        })}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          )
        )}

        {/* ADMINISTRADORES — gestión de planes de sus clientes */}
        {activeTab === 'admins' && (
          loading ? <p className="text-gray-600">{t('loading', { ns: 'common' })}</p> :
          admins.length === 0 ? <p className="text-gray-600">{t('no_admins')}</p> : (
            <div className="space-y-4">
              {admins.map(admin => {
                const bIds = bodegasDeAdmin(admin.id).map(b => b.id)
                const clientesAdmin = clientes.filter(c => bIds.includes(c.bodega_id))
                return (
                  <div key={admin.id} className="border border-gray-200 rounded-lg p-4">
                    <div className="flex justify-between items-start mb-3">
                      <button onClick={() => setSelectedUser(admin)} className="text-left">
                        <h3 className="font-semibold text-gray-900 hover:text-brand-700">{admin.nombre} {admin.apellido || ''}</h3>
                        <p className="text-sm text-gray-600">{admin.email}</p>
                      </button>
                      <span className={admin.activo ? 'text-green-600 text-sm font-medium' : 'text-red-600 text-sm font-medium'}>
                        {admin.activo ? t('activo') : t('inactivo')}
                      </span>
                    </div>

                    <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
                      {t('subcuentas_titulo')} ({clientesAdmin.length})
                    </p>
                    {clientesAdmin.length === 0 ? (
                      <p className="text-xs text-gray-400">{t('sin_bodegas')}</p>
                    ) : (
                      <div className="space-y-2">
                        {clientesAdmin.map(c => {
                          const planesBodega = planes.filter(p => p.bodega_id === c.bodega_id && p.activo)
                          const u = allUsers.find(x => x.id === c.usuario_id)
                          return (
                            <div key={c.id} className="flex justify-between items-center gap-3 border border-gray-100 rounded-lg px-3 py-2">
                              <div className="min-w-0">
                                <button onClick={() => u && setSelectedUser(u)} className="text-left">
                                  <p className="font-medium text-gray-900 truncate hover:text-brand-700">{c.nombre_negocio || (u ? `${u.nombre} ${u.apellido || ''}` : '—')}</p>
                                </button>
                                <p className="text-xs text-gray-500 truncate">{nombreBodega(c.bodega_id)}</p>
                              </div>
                              <select
                                value={c.plan_id || ''}
                                onChange={(e) => asignarPlanCliente(c.usuario_id, e.target.value)}
                                disabled={planesBodega.length === 0}
                                className="text-sm border border-gray-300 rounded-lg px-2 py-1.5 bg-white disabled:opacity-50 shrink-0"
                              >
                                <option value="">{t('asignar_plan')}</option>
                                {planesBodega.map(p => <option key={p.id} value={p.id}>{p.nombre}</option>)}
                              </select>
                            </div>
                          )
                        })}
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          )
        )}

        {/* ACCESOS */}
        {activeTab === 'accesos' && (
          <div>
            <p className="text-gray-600">{t('accesos_proximamente')}</p>
            <div className="mt-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
              <p className="text-sm text-blue-900">{t('accesos_info')}</p>
            </div>
          </div>
        )}
      </div>

      {/* MODAL DE PERFIL */}
      {selectedUser && (
        <UserDetailModal
          key={selectedUser.id}
          user={selectedUser}
          esYo={selectedUser.id === perfil.id}
          cliente={clientesByUsuario[selectedUser.id]}
          bodegas={bodegas}
          planes={planes}
          admins={admins}
          subUsuarios={selectedUser.rol === 'administrador_cuenta' ? subUsuariosDeAdmin(selectedUser) : []}
          bodegasDelAdmin={selectedUser.rol === 'administrador_cuenta' ? bodegasDeAdmin(selectedUser.id) : []}
          clientesByUsuario={clientesByUsuario}
          rolLabel={rolLabel}
          nombreBodega={nombreBodega}
          t={t}
          onClose={() => setSelectedUser(null)}
          onSelectUser={setSelectedUser}
          actions={{ cambiarRol, cambiarEstado, moverUsuario, guardarEdicion, setPasswordUsuario, eliminarUsuario, asignarBodega }}
        />
      )}
    </div>
  )
}

function UserDetailModal({ user, esYo, cliente, bodegas, planes, admins, subUsuarios, bodegasDelAdmin, clientesByUsuario, rolLabel, nombreBodega, t, onClose, onSelectUser, actions }) {
  const [nombre, setNombre] = useState(user.nombre || '')
  const [apellido, setApellido] = useState(user.apellido || '')
  const [negocio, setNegocio] = useState(cliente?.nombre_negocio || '')
  const [telefono, setTelefono] = useState(user.telefono || cliente?.telefono || '')
  const [planId, setPlanId] = useState(cliente?.plan_id || '')
  const [m2, setM2] = useState(cliente?.m2_contratados ?? '')
  const [pwd, setPwd] = useState('')
  const [busy, setBusy] = useState(false)

  // Planes del catálogo de la bodega del cliente
  const planesBodega = (planes || []).filter(p => p.bodega_id === user.bodega_id && p.activo)
  const planSel = planesBodega.find(p => p.id === planId)

  const clientePatch = () => cliente ? {
    nombre_negocio: negocio,
    telefono,
    plan_id: planId || null,
    // plan es NOT NULL en BD — nunca enviar null
    plan: planSel?.nombre ?? (cliente?.plan || 'basico'),
    m2_contratados: m2 === '' ? null : Number(m2),
    plan_limite_pedidos_mes: planSel?.limite_pedidos_mes ?? null,
  } : null

  async function withBusy(fn) { setBusy(true); try { await fn() } finally { setBusy(false) } }

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div className="bg-white rounded-xl shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
        <div className="flex justify-between items-start p-5 border-b border-gray-200 sticky top-0 bg-white">
          <div>
            <h3 className="text-lg font-bold text-gray-900">{user.nombre} {user.apellido || ''}</h3>
            <p className="text-sm text-gray-600">{user.email}</p>
            <span className={`inline-block mt-1 px-2 py-0.5 rounded text-xs font-medium ${ROL_BADGE[user.rol] || 'bg-gray-100 text-gray-700'}`}>
              {rolLabel[user.rol] || user.rol}
            </span>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-700 text-xl leading-none">×</button>
        </div>

        <div className="p-5 space-y-5">
          {/* Editar datos */}
          <div className="grid grid-cols-2 gap-3">
            <Field label={t('nombre')}><input value={nombre} onChange={e => setNombre(e.target.value)} className="inp" /></Field>
            <Field label={t('apellido')}><input value={apellido} onChange={e => setApellido(e.target.value)} className="inp" /></Field>
            {cliente && <Field label={t('negocio')}><input value={negocio} onChange={e => setNegocio(e.target.value)} className="inp" /></Field>}
            <Field label={t('telefono')}><input value={telefono} onChange={e => setTelefono(e.target.value)} className="inp" /></Field>
          </div>
          {/* Plan del cliente (catálogo de su bodega) */}
          {cliente && (
            <div className="border-t border-gray-100 pt-4">
              <p className="text-sm font-semibold text-gray-900 mb-2">{t('plan_seccion')}</p>
              <div className="grid grid-cols-2 gap-3">
                <Field label={t('plan')}>
                  <select value={planId} onChange={e => setPlanId(e.target.value)} className="inp">
                    <option value="">—</option>
                    {planesBodega.map(p => <option key={p.id} value={p.id}>{p.nombre}</option>)}
                  </select>
                </Field>
                <Field label={t('m2_contratados')}>
                  <input type="number" value={m2} onChange={e => setM2(e.target.value)} className="inp" />
                </Field>
              </div>
              {planSel && (
                <p className="text-xs text-gray-500 mt-2">
                  {planSel.m2_incluidos ?? 0} m² · {planSel.limite_pedidos_mes ?? '∞'} {t('limite_pedidos').toLowerCase()} · {planSel.limite_skus ?? '∞'} SKUs · ${planSel.precio ?? 0}
                </p>
              )}
              {planesBodega.length === 0 && (
                <p className="text-xs text-gray-400 mt-1">El admin de esta bodega aún no creó planes.</p>
              )}
            </div>
          )}

          <button
            disabled={busy}
            onClick={() => withBusy(() => actions.guardarEdicion(user.id, { nombre, apellido, telefono }, clientePatch()))}
            className="px-4 py-2 bg-brand-600 text-white rounded-lg text-sm font-medium hover:bg-brand-700 disabled:opacity-50"
          >
            {t('save', { ns: 'common' })}
          </button>

          <div className="border-t border-gray-100 pt-4 grid grid-cols-1 gap-4">
            {/* Rol */}
            <Field label={t('rol')}>
              <select
                value={user.rol}
                disabled={busy || esYo}
                onChange={e => withBusy(() => actions.cambiarRol(user.id, e.target.value))}
                className="inp disabled:opacity-50"
              >
                <option value="cliente">{t('rol_cliente')}</option>
                <option value="operador">{t('rol_operador')}</option>
                <option value="administrador_cuenta">{t('rol_admin')}</option>
                <option value="administrador_gm">{t('rol_master')}</option>
              </select>
              {esYo && <span className="text-xs text-purple-700">{t('no_self_rol')}</span>}
            </Field>

            {/* Bodega del usuario */}
            <Field label={t('bodega_usuario')}>
              <select
                value={user.bodega_id || ''}
                disabled={busy}
                onChange={e => withBusy(() => actions.moverUsuario(user.id, e.target.value))}
                className="inp"
              >
                <option value="">{t('quitar_bodega')}</option>
                {bodegas.map(b => <option key={b.id} value={b.id}>{b.nombre}</option>)}
              </select>
            </Field>

            {/* Estado */}
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={user.activo}
                disabled={busy || esYo}
                onChange={e => withBusy(() => actions.cambiarEstado(user.id, e.target.checked))}
                className="w-4 h-4 rounded border-gray-300"
              />
              <span className={user.activo ? 'text-green-600 font-medium' : 'text-red-600 font-medium'}>
                {user.activo ? t('activo') : t('inactivo')}
              </span>
            </label>
          </div>

          {/* Subcuentas (si es admin) */}
          {user.rol === 'administrador_cuenta' && (
            <div className="border-t border-gray-100 pt-4">
              <p className="text-sm font-semibold text-gray-900 mb-2">{t('subcuentas_titulo')} ({subUsuarios.length})</p>
              {subUsuarios.length === 0 ? (
                <p className="text-xs text-gray-400">{t('sin_bodegas')}</p>
              ) : (
                <div className="space-y-1.5">
                  {subUsuarios.map(su => (
                    <button key={su.id} onClick={() => onSelectUser(su)} className="w-full text-left flex justify-between items-center p-2 border border-gray-200 rounded-lg hover:border-brand-400 text-sm">
                      <span className="truncate">{su.nombre} {su.apellido || ''} <span className="text-gray-400">· {nombreBodega(su.bodega_id)}</span></span>
                      <span className={`shrink-0 px-2 py-0.5 rounded text-xs ${ROL_BADGE[su.rol] || ''}`}>{rolLabel[su.rol]}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Contraseña */}
          <div className="border-t border-gray-100 pt-4">
            <p className="text-sm font-semibold text-gray-900 mb-2">{t('cambiar_password')}</p>
            <div className="flex gap-2">
              <input
                type="text"
                value={pwd}
                onChange={e => setPwd(e.target.value)}
                placeholder={t('nueva_password')}
                disabled={esYo}
                className="inp flex-1 disabled:opacity-50"
              />
              <button
                disabled={busy || esYo || pwd.length < 6}
                onClick={() => withBusy(async () => { const ok = await actions.setPasswordUsuario(user.id, pwd); if (ok) setPwd('') })}
                className="px-4 py-2 bg-gray-800 text-white rounded-lg text-sm font-medium disabled:opacity-50"
              >
                {t('aplicar')}
              </button>
            </div>
            {esYo && <span className="text-xs text-purple-700">{t('no_self_accion')}</span>}
          </div>

          {/* Eliminar */}
          <div className="border-t border-gray-100 pt-4">
            <button
              disabled={busy || esYo}
              onClick={() => {
                if (confirm(t('confirmar_eliminar', { nombre: `${user.nombre} ${user.apellido || ''}` }))) {
                  withBusy(() => actions.eliminarUsuario(user.id))
                }
              }}
              className="px-4 py-2 border border-red-300 text-red-600 rounded-lg text-sm font-medium hover:bg-red-50 disabled:opacity-50"
            >
              {t('eliminar_usuario')}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

function CrearUsuarioForm({ bodegas, permitirRoles, t, onCreated }) {
  const [form, setForm] = useState({
    nombre: '', apellido: '', email: '', password: '',
    rol: permitirRoles[0], bodega_id: bodegas[0]?.id || '',
  })
  const [busy, setBusy] = useState(false)
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))

  const rolOpt = { cliente: t('rol_cliente'), operador: t('rol_operador'), administrador_cuenta: t('rol_admin') }

  async function crear() {
    setBusy(true)
    await onCreated(form)
    setBusy(false)
  }

  return (
    <div className="border border-brand-200 bg-brand-50/40 rounded-lg p-4 mb-5">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <Field label={t('nombre')}><input value={form.nombre} onChange={e => set('nombre', e.target.value)} className="inp" /></Field>
        <Field label={t('apellido')}><input value={form.apellido} onChange={e => set('apellido', e.target.value)} className="inp" /></Field>
        <Field label={t('email')}><input type="email" value={form.email} onChange={e => set('email', e.target.value)} className="inp" /></Field>
        <Field label={t('contrasena')}><input type="text" value={form.password} onChange={e => set('password', e.target.value)} className="inp" placeholder={t('min_password')} /></Field>
        <Field label={t('rol')}>
          <select value={form.rol} onChange={e => set('rol', e.target.value)} className="inp">
            {permitirRoles.map(r => <option key={r} value={r}>{rolOpt[r] || r}</option>)}
          </select>
        </Field>
        <Field label={t('bodega_usuario')}>
          <select value={form.bodega_id} onChange={e => set('bodega_id', e.target.value)} className="inp">
            <option value="">{t('quitar_bodega')}</option>
            {bodegas.map(b => <option key={b.id} value={b.id}>{b.nombre}</option>)}
          </select>
        </Field>
      </div>
      <button
        onClick={crear}
        disabled={busy || !form.email || form.password.length < 6}
        className="mt-4 px-4 py-2 bg-brand-600 text-white rounded-lg text-sm font-medium hover:bg-brand-700 disabled:opacity-50"
      >
        {busy ? t('creando') : t('crear')}
      </button>
    </div>
  )
}

function Field({ label, children }) {
  return (
    <div>
      <p className="text-xs text-gray-600 mb-1">{label}</p>
      {children}
    </div>
  )
}

function RespaldosPanel({ onDescargarExcel, onRestaurado }) {
  const [lista, setLista] = useState([])
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(false)

  async function cargar() {
    setLoading(true)
    const { data, error } = await supabase.rpc('listar_respaldos')
    if (error) console.error('listar_respaldos:', error)
    setLista(data || [])
    setLoading(false)
  }
  useEffect(() => { cargar() }, [])

  async function crear() {
    setBusy(true)
    const { error } = await supabase.rpc('crear_respaldo', { p_tipo: 'manual' })
    setBusy(false)
    if (error) { alert(error.message); return }
    alert('✅ Respaldo creado')
    cargar()
  }

  async function restaurar(id) {
    if (!confirm('¿Restaurar este respaldo? Se recrearán registros borrados y se actualizarán los existentes. Esta acción modifica la base de datos.')) return
    setBusy(true)
    const { data, error } = await supabase.rpc('restaurar_respaldo', { p_id: id })
    setBusy(false)
    if (error) { alert('Error: ' + error.message); return }
    alert('✅ Respaldo restaurado:\n' + JSON.stringify(data, null, 1))
    onRestaurado?.()
  }

  async function descargarUno(id) {
    const { data, error } = await supabase.from('respaldos').select('datos, created_at').eq('id', id).single()
    if (error || !data) { alert('No se pudo descargar'); return }
    const sheets = {}
    for (const [tabla, filas] of Object.entries(data.datos)) {
      sheets[tabla.slice(0, 31)] = Array.isArray(filas) ? filas : []
    }
    exportarLibro(sheets, 'respaldo_' + new Date(data.created_at).toISOString().slice(0, 10))
  }

  return (
    <div className="border border-gray-200 rounded-lg p-5">
      <div className="flex justify-between items-start mb-4 flex-wrap gap-3">
        <div>
          <h2 className="text-lg font-bold text-gray-900">Respaldos</h2>
          <p className="text-sm text-gray-500">Copias completas de la plataforma. Se genera uno automático cada día; conservamos los últimos 30.</p>
        </div>
        <div className="flex gap-2">
          <button onClick={crear} disabled={busy} className="px-4 py-2 bg-brand-600 text-white rounded-lg text-sm font-medium hover:bg-brand-700 disabled:opacity-50">
            {busy ? 'Procesando…' : '+ Crear respaldo ahora'}
          </button>
          <button onClick={onDescargarExcel} className="px-4 py-2 bg-green-600 text-white rounded-lg text-sm font-medium hover:bg-green-700">
            ⬇ Excel (en vivo)
          </button>
        </div>
      </div>

      {loading ? (
        <p className="text-gray-500 text-sm">Cargando…</p>
      ) : lista.length === 0 ? (
        <p className="text-gray-500 text-sm">Aún no hay respaldos guardados. Crea el primero o espera al respaldo diario.</p>
      ) : (
        <div className="overflow-x-auto border border-gray-100 rounded-lg">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-gray-600">
              <tr>{['Fecha','Tipo','Registros','Acciones'].map(h => <th key={h} className="px-3 py-2 text-left font-medium">{h}</th>)}</tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {lista.map(r => (
                <tr key={r.id} className="hover:bg-gray-50">
                  <td className="px-3 py-2 text-gray-900">{new Date(r.created_at).toLocaleString('es-EC')}</td>
                  <td className="px-3 py-2">
                    <span className={`px-2 py-0.5 rounded text-xs ${r.tipo === 'automatico' ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-700'}`}>{r.tipo}</span>
                  </td>
                  <td className="px-3 py-2 text-gray-600">{r.total} filas</td>
                  <td className="px-3 py-2">
                    <div className="flex gap-3">
                      <button onClick={() => descargarUno(r.id)} className="text-xs text-green-700 hover:text-green-900">⬇ Excel</button>
                      <button onClick={() => restaurar(r.id)} disabled={busy} className="text-xs text-brand-600 hover:text-brand-800 disabled:opacity-50">↺ Restaurar</button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}

function StatCard({ label, value, color }) {
  return (
    <div className="border border-gray-200 rounded-lg p-4">
      <p className="text-xs text-gray-500 uppercase tracking-wide">{label}</p>
      <p className={`text-3xl font-bold mt-1 ${color}`}>{value}</p>
    </div>
  )
}

function MiniStat({ label, value }) {
  return (
    <div className="bg-gray-50 rounded-lg px-2 py-2 text-center">
      <p className="text-lg font-bold text-gray-900 leading-none">{value}</p>
      <p className="text-[11px] text-gray-500 mt-1">{label}</p>
    </div>
  )
}
