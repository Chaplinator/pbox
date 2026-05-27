import { useEffect, useState, useCallback } from 'react'
import { supabase } from '@/supabase/client'
import { useAuth } from '@/context/AuthContext'
import { exportarUsuarios } from '@/utils/exportExcel'

const ROL_STYLE = {
  master:   { bg: 'bg-brand-100', text: 'text-brand-800', label: 'Master'   },
  operador: { bg: 'bg-blue-100',  text: 'text-blue-700',  label: 'Operador' },
  cliente:  { bg: 'bg-gray-100',  text: 'text-gray-600',  label: 'Cliente'  },
}

function RolBadge({ rol }) {
  const s = ROL_STYLE[rol] ?? { bg: 'bg-gray-100', text: 'text-gray-500', label: rol }
  return (
    <span className={`inline-flex px-2.5 py-0.5 rounded-full text-xs font-semibold ${s.bg} ${s.text}`}>
      {s.label}
    </span>
  )
}

function ActivoBadge({ activo }) {
  return activo
    ? <span className="inline-flex px-2.5 py-0.5 rounded-full text-xs font-semibold bg-green-100 text-green-700">Activo</span>
    : <span className="inline-flex px-2.5 py-0.5 rounded-full text-xs font-semibold bg-red-100 text-red-600">Inactivo</span>
}

export default function Usuarios() {
  const { perfil: yo }        = useAuth()
  const [usuarios, setUsuarios] = useState([])
  const [loading, setLoading]   = useState(true)
  const [saving, setSaving]     = useState(null)
  const [resetOk, setResetOk]   = useState(null)

  const esMaster = yo?.rol === 'master'

  const cargar = useCallback(async () => {
    setLoading(true)
    const { data } = await supabase
      .from('usuarios')
      .select('id, nombre, email, rol, activo, created_at, clientes ( nombre_negocio )')
      .order('created_at', { ascending: false })
    setUsuarios(data ?? [])
    setLoading(false)
  }, [])

  useEffect(() => { cargar() }, [cargar])

  async function cambiarRol(usuario, nuevoRol) {
    if (nuevoRol === usuario.rol) return
    if (!confirm(`¿Cambiar el rol de ${usuario.nombre} a "${ROL_STYLE[nuevoRol]?.label ?? nuevoRol}"?`)) return
    setSaving(usuario.id)
    await supabase.from('usuarios').update({ rol: nuevoRol }).eq('id', usuario.id)
    setSaving(null)
    cargar()
  }

  async function resetPassword(usuario) {
    if (!confirm(`Se enviará un correo de recuperación a ${usuario.email}. ¿Continuar?`)) return
    setSaving(usuario.id)
    const { error } = await supabase.auth.resetPasswordForEmail(usuario.email)
    setSaving(null)
    if (error) { alert(error.message); return }
    setResetOk(usuario.id)
    setTimeout(() => setResetOk(null), 4000)
  }

  async function toggleActivo(usuario) {
    if (!confirm(`¿${usuario.activo ? 'Desactivar' : 'Activar'} la cuenta de ${usuario.nombre}?`)) return
    setSaving(usuario.id)
    await supabase.from('usuarios').update({ activo: !usuario.activo }).eq('id', usuario.id)
    setSaving(null)
    cargar()
  }

  const counts = {
    total:    usuarios.length,
    clientes: usuarios.filter(u => u.rol === 'cliente').length,
    operadores: usuarios.filter(u => u.rol === 'operador').length,
    masters:  usuarios.filter(u => u.rol === 'master').length,
  }

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Usuarios</h1>
          <p className="text-gray-500 text-sm">Gestión de accesos y permisos</p>
        </div>
        {usuarios.length > 0 && (
          <button
            onClick={() => exportarUsuarios(usuarios)}
            className="px-4 py-2 text-sm border border-gray-200 text-gray-600 rounded-lg hover:bg-gray-50 transition-colors"
          >
            ↓ Exportar Excel
          </button>
        )}
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-4 gap-4 mb-8">
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <p className="text-sm text-gray-500">Total</p>
          <p className="text-3xl font-bold text-gray-900 mt-1">{counts.total}</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <p className="text-sm text-gray-500">Clientes</p>
          <p className="text-3xl font-bold text-gray-600 mt-1">{counts.clientes}</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <p className="text-sm text-gray-500">Operadores</p>
          <p className="text-3xl font-bold text-blue-700 mt-1">{counts.operadores}</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <p className="text-sm text-gray-500">Masters</p>
          <p className="text-3xl font-bold text-brand-700 mt-1">{counts.masters}</p>
        </div>
      </div>

      {!esMaster && (
        <div className="mb-4 bg-yellow-50 border border-yellow-200 rounded-xl px-4 py-3 text-sm text-yellow-700">
          Solo el operador master puede modificar roles y permisos.
        </div>
      )}

      {/* Tabla */}
      {loading ? (
        <div className="text-center py-16 text-gray-400 text-sm">Cargando usuarios…</div>
      ) : (
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-200 bg-gray-50">
                {['Nombre', 'Email', 'Negocio', 'Rol', 'Estado', 'Registro', 'Acciones'].map(h => (
                  <th key={h} className="px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide text-left">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {usuarios.map(u => {
                const fecha = new Date(u.created_at).toLocaleDateString('es-EC', {
                  day: '2-digit', month: 'short', year: 'numeric',
                })
                const isSaving  = saving === u.id
                const esYoMismo = u.id === yo?.id

                return (
                  <tr key={u.id} className={`hover:bg-gray-50 transition-colors ${!u.activo ? 'opacity-50' : ''}`}>
                    <td className="px-4 py-3">
                      <p className="font-medium text-gray-900">{u.nombre}</p>
                      {esYoMismo && <p className="text-xs text-gray-400">tú</p>}
                    </td>
                    <td className="px-4 py-3 text-gray-500 text-xs">{u.email}</td>
                    <td className="px-4 py-3 text-gray-400 text-xs">{u.clientes?.nombre_negocio ?? '—'}</td>
                    <td className="px-4 py-3">
                      {esMaster && !esYoMismo ? (
                        <select
                          value={u.rol}
                          onChange={e => cambiarRol(u, e.target.value)}
                          disabled={isSaving}
                          className="text-xs border border-gray-200 rounded-lg px-2 py-1 focus:outline-none focus:ring-2 focus:ring-brand-500 disabled:opacity-50"
                        >
                          <option value="cliente">Cliente</option>
                          <option value="operador">Operador</option>
                          <option value="master">Master</option>
                        </select>
                      ) : (
                        <RolBadge rol={u.rol} />
                      )}
                    </td>
                    <td className="px-4 py-3"><ActivoBadge activo={u.activo} /></td>
                    <td className="px-4 py-3 text-xs text-gray-400 whitespace-nowrap">{fecha}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        {(esMaster || yo?.rol === 'operador') && !esYoMismo && (
                          resetOk === u.id ? (
                            <span className="text-xs text-green-600 font-medium">Correo enviado</span>
                          ) : (
                            <button
                              onClick={() => resetPassword(u)}
                              disabled={isSaving}
                              className="text-xs text-brand-600 hover:underline disabled:opacity-50"
                            >
                              Resetear contraseña
                            </button>
                          )
                        )}
                        {esMaster && !esYoMismo && (
                          <button
                            onClick={() => toggleActivo(u)}
                            disabled={isSaving}
                            className={`px-2 py-1 text-xs rounded-md transition-colors disabled:opacity-50 ${
                              u.activo
                                ? 'text-red-500 hover:bg-red-50'
                                : 'text-green-600 hover:bg-green-50'
                            }`}
                          >
                            {u.activo ? 'Desactivar' : 'Activar'}
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
          <div className="px-4 py-3 border-t border-gray-100 bg-gray-50 text-xs text-gray-400">
            {usuarios.length} usuario{usuarios.length !== 1 ? 's' : ''} registrados
          </div>
        </div>
      )}
    </div>
  )
}
