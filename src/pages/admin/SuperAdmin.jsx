import { useState, useEffect, useCallback } from 'react'
import { supabase } from '@/supabase/client'

function KpiCard({ label, value, variant = 'default' }) {
  const colors = { default: 'text-gray-900', blue: 'text-brand-700', green: 'text-green-700', red: 'text-red-600' }
  return (
    <div className="bg-white rounded-xl border border-gray-200 p-5">
      <p className="text-sm text-gray-500">{label}</p>
      <p className={`text-3xl font-bold mt-1 ${colors[variant]}`}>{value ?? '—'}</p>
    </div>
  )
}

export default function SuperAdmin() {
  const [bodegas, setBodegas]   = useState([])
  const [stats, setStats]       = useState({})
  const [loading, setLoading]   = useState(true)
  const [expandido, setExpandido] = useState(null)
  const [usuarios, setUsuarios] = useState({})

  const cargar = useCallback(async () => {
    setLoading(true)
    const { data: bs } = await supabase
      .from('bodegas')
      .select('*')
      .order('created_at')
    setBodegas(bs ?? [])

    // Stats por bodega
    if (bs?.length) {
      const statsMap = {}
      await Promise.all(bs.map(async b => {
        const [c, p, u] = await Promise.all([
          supabase.from('clientes').select('id', { count: 'exact', head: true }).eq('bodega_id', b.id),
          supabase.from('pedidos').select('id', { count: 'exact', head: true }).eq('bodega_id', b.id),
          supabase.from('usuarios').select('id', { count: 'exact', head: true }).eq('bodega_id', b.id),
        ])
        statsMap[b.id] = { clientes: c.count ?? 0, pedidos: p.count ?? 0, usuarios: u.count ?? 0 }
      }))
      setStats(statsMap)
    }
    setLoading(false)
  }, [])

  useEffect(() => { cargar() }, [cargar])

  async function cargarUsuariosBodega(bodegaId) {
    if (usuarios[bodegaId]) return
    const { data } = await supabase
      .from('usuarios')
      .select('id, nombre, apellido, email, rol, activo, created_at')
      .eq('bodega_id', bodegaId)
      .order('rol')
    setUsuarios(u => ({ ...u, [bodegaId]: data ?? [] }))
  }

  async function toggleBodega(b) {
    await supabase.from('bodegas').update({ activo: !b.activo }).eq('id', b.id)
    cargar()
  }

  function abrir(id) {
    const next = expandido === id ? null : id
    setExpandido(next)
    if (next) cargarUsuariosBodega(next)
  }

  const totalStats = {
    bodegas:  bodegas.length,
    clientes: Object.values(stats).reduce((s, v) => s + v.clientes, 0),
    pedidos:  Object.values(stats).reduce((s, v) => s + v.pedidos,  0),
    usuarios: Object.values(stats).reduce((s, v) => s + v.usuarios, 0),
  }

  return (
    <div className="p-8">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Super Admin</h1>
        <p className="text-gray-500 text-sm mt-0.5">Vista global de todas las bodegas de P-Box</p>
      </div>

      {/* KPIs globales */}
      <div className="grid grid-cols-4 gap-4 mb-8">
        <KpiCard label="Bodegas activas"  value={bodegas.filter(b => b.activo).length} variant="blue" />
        <KpiCard label="Total clientes"   value={totalStats.clientes} />
        <KpiCard label="Total pedidos"    value={totalStats.pedidos} />
        <KpiCard label="Total usuarios"   value={totalStats.usuarios} />
      </div>

      {/* Lista de bodegas */}
      {loading ? (
        <div className="text-center py-16 text-gray-400 text-sm">Cargando…</div>
      ) : (
        <div className="space-y-3">
          {bodegas.map(b => {
            const s    = stats[b.id] ?? {}
            const open = expandido === b.id
            const us   = usuarios[b.id] ?? []

            return (
              <div key={b.id} className={`bg-white rounded-xl border overflow-hidden transition-colors ${!b.activo ? 'opacity-60 border-gray-100' : 'border-gray-200'}`}>
                <button onClick={() => abrir(b.id)}
                  className="w-full flex items-center justify-between px-5 py-4 hover:bg-gray-50 transition-colors text-left">
                  <div className="flex items-center gap-4">
                    <div>
                      <div className="flex items-center gap-2">
                        <p className="font-semibold text-gray-900">{b.nombre}</p>
                        <span className="text-xs font-mono text-gray-400">/{b.slug}</span>
                        {!b.activo && (
                          <span className="text-xs bg-red-100 text-red-600 px-2 py-0.5 rounded-full font-medium">Inactiva</span>
                        )}
                      </div>
                      <p className="text-xs text-gray-400 mt-0.5">
                        Plan: <span className="font-medium text-gray-600">{b.plan}</span>
                        {b.plan_vence_at && ` · Vence: ${new Date(b.plan_vence_at).toLocaleDateString('es-EC')}`}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-6">
                    <div className="text-center">
                      <p className="text-lg font-bold text-gray-800">{s.clientes ?? '—'}</p>
                      <p className="text-xs text-gray-400">Clientes</p>
                    </div>
                    <div className="text-center">
                      <p className="text-lg font-bold text-gray-800">{s.pedidos ?? '—'}</p>
                      <p className="text-xs text-gray-400">Pedidos</p>
                    </div>
                    <div className="text-center">
                      <p className="text-lg font-bold text-gray-800">{s.usuarios ?? '—'}</p>
                      <p className="text-xs text-gray-400">Usuarios</p>
                    </div>
                    <span className="text-gray-300 ml-2">{open ? '▲' : '▼'}</span>
                  </div>
                </button>

                {open && (
                  <div className="border-t border-gray-100 px-5 pb-5">
                    <div className="flex items-center justify-between mt-4 mb-3">
                      <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide">Usuarios</p>
                      <button onClick={() => toggleBodega(b)}
                        className={`text-xs px-2 py-1 rounded-lg transition-colors ${b.activo ? 'text-red-500 hover:bg-red-50' : 'text-green-600 hover:bg-green-50'}`}>
                        {b.activo ? 'Desactivar bodega' : 'Activar bodega'}
                      </button>
                    </div>

                    {us.length === 0 ? (
                      <p className="text-xs text-gray-400">Sin usuarios registrados.</p>
                    ) : (
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="text-xs text-gray-400 border-b border-gray-100">
                            <th className="text-left pb-2">Nombre</th>
                            <th className="text-left pb-2">Email</th>
                            <th className="text-left pb-2">Rol</th>
                            <th className="text-left pb-2">Estado</th>
                            <th className="text-left pb-2">Registro</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-50">
                          {us.map(u => (
                            <tr key={u.id}>
                              <td className="py-2 font-medium text-gray-800">{[u.nombre, u.apellido].filter(Boolean).join(' ')}</td>
                              <td className="py-2 text-gray-500 text-xs">{u.email}</td>
                              <td className="py-2">
                                <span className={`text-xs px-2 py-0.5 rounded-full font-semibold ${
                                  u.rol === 'master'   ? 'bg-brand-100 text-brand-700' :
                                  u.rol === 'operador' ? 'bg-blue-100 text-blue-700' :
                                                         'bg-gray-100 text-gray-600'
                                }`}>{u.rol}</span>
                              </td>
                              <td className="py-2">
                                {u.activo
                                  ? <span className="text-xs text-green-600">Activo</span>
                                  : <span className="text-xs text-red-500">Inactivo</span>
                                }
                              </td>
                              <td className="py-2 text-xs text-gray-400">
                                {new Date(u.created_at).toLocaleDateString('es-EC', { day: '2-digit', month: 'short', year: 'numeric' })}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    )}

                    <div className="mt-4 pt-3 border-t border-gray-50 grid grid-cols-3 gap-3 text-xs text-gray-400">
                      <div>ID: <span className="font-mono text-gray-500">{b.id.slice(0, 8)}…</span></div>
                      <div>Color: <span className="font-mono" style={{ color: b.color_marca }}>{b.color_marca}</span></div>
                      <div>Creada: {new Date(b.created_at).toLocaleDateString('es-EC')}</div>
                    </div>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
