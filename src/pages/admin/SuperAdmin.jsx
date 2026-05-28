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
  const [clientes, setClientes] = useState({})
  const [saving, setSaving]     = useState(null)

  const cargar = useCallback(async () => {
    setLoading(true)
    const { data: bs } = await supabase.from('bodegas').select('*').order('created_at')
    setBodegas(bs ?? [])

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

  async function cargarClientesBodega(bodegaId) {
    const { data: cs } = await supabase
      .from('clientes')
      .select('id, nombre_negocio, m2_contratados, created_at, usuario_id')
      .eq('bodega_id', bodegaId)
      .order('created_at')

    if (!cs?.length) { setClientes(c => ({ ...c, [bodegaId]: [] })); return }

    const ids = cs.map(c => c.usuario_id).filter(Boolean)
    const { data: users } = await supabase
      .from('usuarios')
      .select('id, nombre, apellido, email, activo')
      .in('id', ids)

    const userMap = Object.fromEntries((users ?? []).map(u => [u.id, u]))
    const merged = cs.map(c => ({ ...c, dueno: userMap[c.usuario_id] ?? null }))
    setClientes(c => ({ ...c, [bodegaId]: merged }))
  }

  function abrir(id) {
    const next = expandido === id ? null : id
    setExpandido(next)
    if (next) cargarClientesBodega(next)
  }

  async function toggleCliente(bodegaId, clienteId, usuarioId, activo) {
    setSaving(clienteId)
    // Desactivar/activar el usuario dueño + todos sus sub-usuarios
    await supabase
      .from('usuarios')
      .update({ activo: !activo })
      .or(`id.eq.${usuarioId},cliente_id.eq.${clienteId}`)
    setSaving(null)
    cargarClientesBodega(bodegaId)
    cargar()
  }

  const totalStats = {
    bodegas:  bodegas.filter(b => b.activo).length,
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

      <div className="grid grid-cols-4 gap-4 mb-8">
        <KpiCard label="Bodegas activas"  value={totalStats.bodegas}  variant="blue" />
        <KpiCard label="Total clientes"   value={totalStats.clientes} />
        <KpiCard label="Total pedidos"    value={totalStats.pedidos}  />
        <KpiCard label="Total usuarios"   value={totalStats.usuarios} />
      </div>

      {loading ? (
        <div className="text-center py-16 text-gray-400 text-sm">Cargando…</div>
      ) : (
        <div className="space-y-3">
          {bodegas.map(b => {
            const s    = stats[b.id] ?? {}
            const open = expandido === b.id
            const cs   = clientes[b.id] ?? []

            return (
              <div key={b.id} className="bg-white rounded-xl border border-gray-200 overflow-hidden">
                {/* Cabecera bodega */}
                <button onClick={() => abrir(b.id)}
                  className="w-full flex items-center justify-between px-5 py-4 hover:bg-gray-50 transition-colors text-left">
                  <div>
                    <div className="flex items-center gap-2">
                      <p className="font-semibold text-gray-900">{b.nombre}</p>
                      <span className="text-xs font-mono text-gray-400">/{b.slug}</span>
                      <span className="text-xs bg-gray-100 text-gray-500 px-2 py-0.5 rounded-full">{b.plan}</span>
                      {!b.activo && (
                        <span className="text-xs bg-red-100 text-red-600 px-2 py-0.5 rounded-full font-medium">Inactiva</span>
                      )}
                    </div>
                    <p className="text-xs text-gray-400 mt-0.5">
                      Creada: {new Date(b.created_at).toLocaleDateString('es-EC')}
                    </p>
                  </div>
                  <div className="flex items-center gap-6">
                    <div className="text-center">
                      <p className="text-lg font-bold text-gray-800">{s.clientes ?? '—'}</p>
                      <p className="text-xs text-gray-400">Empresas</p>
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

                {/* Tabla de clientes (empresas) */}
                {open && (
                  <div className="border-t border-gray-100">
                    {cs.length === 0 ? (
                      <p className="px-5 py-4 text-sm text-gray-400">Sin clientes registrados.</p>
                    ) : (
                      <table className="w-full text-sm">
                        <thead className="bg-gray-50 border-b border-gray-100">
                          <tr className="text-xs text-gray-400">
                            <th className="text-left px-5 py-3 font-semibold uppercase tracking-wide">Empresa</th>
                            <th className="text-left px-4 py-3 font-semibold uppercase tracking-wide">Dueño</th>
                            <th className="text-left px-4 py-3 font-semibold uppercase tracking-wide">Email</th>
                            <th className="text-right px-4 py-3 font-semibold uppercase tracking-wide">m² contratados</th>
                            <th className="text-left px-4 py-3 font-semibold uppercase tracking-wide">Estado</th>
                            <th className="px-4 py-3" />
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-50">
                          {cs.map(c => {
                            const dueno  = c.dueno
                            const activo = dueno?.activo ?? true
                            return (
                              <tr key={c.id} className={`hover:bg-gray-50 transition-colors ${!activo ? 'opacity-50' : ''}`}>
                                <td className="px-5 py-3 font-medium text-gray-900">
                                  {c.nombre_negocio ?? '—'}
                                </td>
                                <td className="px-4 py-3 text-gray-600">
                                  {[dueno?.nombre, dueno?.apellido].filter(Boolean).join(' ') || '—'}
                                </td>
                                <td className="px-4 py-3 text-gray-400 text-xs">{dueno?.email}</td>
                                <td className="px-4 py-3 text-right text-gray-600">{c.m2_contratados} m²</td>
                                <td className="px-4 py-3">
                                  {activo
                                    ? <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full font-semibold">Activo</span>
                                    : <span className="text-xs bg-red-100 text-red-600 px-2 py-0.5 rounded-full font-semibold">Suspendido</span>
                                  }
                                </td>
                                <td className="px-4 py-3 text-right">
                                  <button
                                    disabled={saving === c.id}
                                    onClick={() => toggleCliente(b.id, c.id, dueno?.id, activo)}
                                    className={`text-xs px-3 py-1 rounded-lg transition-colors disabled:opacity-50 ${
                                      activo
                                        ? 'text-red-500 hover:bg-red-50 border border-red-200'
                                        : 'text-green-600 hover:bg-green-50 border border-green-200'
                                    }`}
                                  >
                                    {saving === c.id ? '…' : activo ? 'Suspender' : 'Activar'}
                                  </button>
                                </td>
                              </tr>
                            )
                          })}
                        </tbody>
                      </table>
                    )}
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
