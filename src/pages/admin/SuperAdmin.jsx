import { useState, useEffect, useCallback } from 'react'
import { supabase } from '@/supabase/client'

const PLANES = [
  { value: 'basico',     label: 'Básico'      },
  { value: 'pro',        label: 'Pro'         },
  { value: 'enterprise', label: 'Enterprise'  },
]

const PLAN_STYLE = {
  basico:     'bg-gray-100 text-gray-600',
  pro:        'bg-blue-100 text-blue-700',
  enterprise: 'bg-brand-100 text-brand-800',
}

function KpiCard({ label, value, sub, variant = 'default' }) {
  const colors = { default: 'text-gray-900', blue: 'text-brand-700', green: 'text-green-700', red: 'text-red-600' }
  return (
    <div className="bg-white rounded-xl border border-gray-200 p-5">
      <p className="text-sm text-gray-500">{label}</p>
      <p className={`text-3xl font-bold mt-1 ${colors[variant]}`}>{value ?? '—'}</p>
      {sub && <p className="text-xs text-gray-400 mt-0.5">{sub}</p>}
    </div>
  )
}

function EditableNumber({ value, onSave, suffix = '' }) {
  const [editing, setEditing] = useState(false)
  const [val, setVal]         = useState(value)

  function handleKey(e) {
    if (e.key === 'Enter') { onSave(Number(val)); setEditing(false) }
    if (e.key === 'Escape') { setVal(value); setEditing(false) }
  }

  if (editing) {
    return (
      <input
        autoFocus
        type="number" min="0" value={val}
        onChange={e => setVal(e.target.value)}
        onBlur={() => { onSave(Number(val)); setEditing(false) }}
        onKeyDown={handleKey}
        className="w-24 px-2 py-1 border border-brand-400 rounded-lg text-sm text-right focus:outline-none focus:ring-2 focus:ring-brand-500"
      />
    )
  }

  return (
    <button onClick={() => setEditing(true)}
      className="text-sm text-gray-700 hover:text-brand-600 hover:underline cursor-pointer transition-colors"
      title="Click para editar">
      {value} {suffix}
    </button>
  )
}

function ModalNuevaBodega({ open, onClose, onSaved }) {
  const [form, setForm]     = useState({ nombre: '', slug: '', plan: 'basico', color_marca: '#1d4ed8' })
  const [saving, setSaving] = useState(false)
  const [error, setError]   = useState('')

  useEffect(() => { if (open) { setForm({ nombre: '', slug: '', plan: 'basico', color_marca: '#1d4ed8' }); setError('') } }, [open])

  function setF(e) { setForm(f => ({ ...f, [e.target.name]: e.target.value })) }

  // Auto-generar slug desde nombre
  function handleNombre(e) {
    const nombre = e.target.value
    const slug   = nombre.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '').slice(0, 30)
    setForm(f => ({ ...f, nombre, slug }))
  }

  async function guardar(e) {
    e.preventDefault(); setSaving(true); setError('')
    const { error: err } = await supabase.from('bodegas').insert({
      nombre: form.nombre, slug: form.slug, plan: form.plan, color_marca: form.color_marca,
    })
    setSaving(false)
    if (err) { setError(err.message.includes('unique') ? 'Ese slug ya existe, elige otro.' : err.message); return }
    onSaved()
  }

  if (!open) return null
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
          <h2 className="font-semibold text-gray-900">Nueva bodega</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-2xl leading-none">&times;</button>
        </div>
        <form onSubmit={guardar} className="p-6 space-y-4">
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Nombre *</label>
            <input name="nombre" value={form.nombre} onChange={handleNombre} required
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
              placeholder="Tramaco Quito" />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Slug (URL único) *</label>
            <div className="flex items-center gap-1">
              <span className="text-sm text-gray-400">pbox.ec/</span>
              <input name="slug" value={form.slug} onChange={setF} required
                pattern="[a-z0-9\-]+" title="Solo letras minúsculas, números y guiones"
                className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm font-mono focus:outline-none focus:ring-2 focus:ring-brand-500"
                placeholder="tramaco-quito" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Plan inicial</label>
              <select name="plan" value={form.plan} onChange={setF}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-500">
                {PLANES.map(p => <option key={p.value} value={p.value}>{p.label}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Color de marca</label>
              <div className="flex items-center gap-2">
                <input type="color" name="color_marca" value={form.color_marca} onChange={setF}
                  className="w-10 h-9 rounded-lg border border-gray-300 cursor-pointer p-0.5" />
                <input name="color_marca" value={form.color_marca} onChange={setF}
                  className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-xs font-mono focus:outline-none focus:ring-2 focus:ring-brand-500"
                  placeholder="#1d4ed8" />
              </div>
            </div>
          </div>
          {error && <p className="text-sm text-red-600 bg-red-50 px-3 py-2 rounded-lg">{error}</p>}
          <div className="flex justify-end gap-2 pt-1">
            <button type="button" onClick={onClose}
              className="px-4 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded-lg transition-colors">
              Cancelar
            </button>
            <button type="submit" disabled={saving}
              className="px-4 py-2 text-sm bg-brand-600 text-white rounded-lg hover:bg-brand-700 disabled:opacity-50 transition-colors">
              {saving ? 'Creando…' : 'Crear bodega'}
            </button>
          </div>
        </form>
      </div>
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
  const [modalBodega, setModalBodega] = useState(false)

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
      .select('id, nombre_negocio, m2_contratados, m2_precio_adicional, plan, plan_limite_pedidos_mes, plan_vence_at, created_at, usuario_id')
      .eq('bodega_id', bodegaId)
      .order('created_at')

    if (!cs?.length) { setClientes(c => ({ ...c, [bodegaId]: [] })); return }

    const ids = cs.map(c => c.usuario_id).filter(Boolean)
    const inicioMes = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString()

    const [usersRes, pedidosTotalRes, pedidosMesRes] = await Promise.all([
      supabase.from('usuarios').select('id, nombre, apellido, email, activo').in('id', ids),
      // Total de pedidos por cliente
      supabase.from('pedidos').select('cliente_id', { count: 'exact' })
        .in('cliente_id', cs.map(c => c.id)).neq('estado', 'cancelado'),
      // Pedidos este mes por cliente
      supabase.from('pedidos').select('cliente_id')
        .in('cliente_id', cs.map(c => c.id))
        .neq('estado', 'cancelado')
        .gte('created_at', inicioMes),
    ])

    const userMap = Object.fromEntries((usersRes.data ?? []).map(u => [u.id, u]))

    // Contar por cliente
    const totalPorCliente = {}
    const mesPorCliente   = {}
    for (const p of (pedidosTotalRes.data ?? [])) totalPorCliente[p.cliente_id] = (totalPorCliente[p.cliente_id] ?? 0) + 1
    for (const p of (pedidosMesRes.data  ?? [])) mesPorCliente[p.cliente_id]   = (mesPorCliente[p.cliente_id]   ?? 0) + 1

    const merged = cs.map(c => ({
      ...c,
      dueno:           userMap[c.usuario_id] ?? null,
      pedidos_total:   totalPorCliente[c.id] ?? 0,
      pedidos_mes:     mesPorCliente[c.id]   ?? 0,
    }))
    setClientes(c => ({ ...c, [bodegaId]: merged }))
  }

  function abrir(id) {
    const next = expandido === id ? null : id
    setExpandido(next)
    if (next) cargarClientesBodega(next)
  }

  async function toggleCliente(bodegaId, clienteId, usuarioId, activo) {
    setSaving(`toggle-${clienteId}`)
    await supabase.from('usuarios').update({ activo: !activo })
      .or(`id.eq.${usuarioId},cliente_id.eq.${clienteId}`)
    setSaving(null)
    cargarClientesBodega(bodegaId); cargar()
  }

  async function actualizarCliente(bodegaId, clienteId, campo, valor) {
    setSaving(`${campo}-${clienteId}`)
    await supabase.from('clientes').update({ [campo]: valor }).eq('id', clienteId)
    setSaving(null)
    setClientes(prev => ({
      ...prev,
      [bodegaId]: (prev[bodegaId] ?? []).map(c =>
        c.id === clienteId ? { ...c, [campo]: valor } : c
      ),
    }))
  }

  const totalStats = {
    bodegas:  bodegas.filter(b => b.activo).length,
    clientes: Object.values(stats).reduce((s, v) => s + v.clientes, 0),
    pedidos:  Object.values(stats).reduce((s, v) => s + v.pedidos,  0),
    usuarios: Object.values(stats).reduce((s, v) => s + v.usuarios, 0),
  }

  return (
    <div className="p-8">
      <div className="mb-6 flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Super Admin</h1>
          <p className="text-gray-500 text-sm mt-0.5">Vista global de todas las bodegas de P-Box</p>
        </div>
        <button onClick={() => setModalBodega(true)}
          className="px-4 py-2 text-sm bg-brand-600 text-white rounded-lg hover:bg-brand-700 transition-colors font-medium">
          + Nueva bodega
        </button>
      </div>

      <div className="grid grid-cols-4 gap-4 mb-8">
        <KpiCard label="Bodegas activas"  value={totalStats.bodegas}  variant="blue" />
        <KpiCard label="Total clientes"   value={totalStats.clientes} />
        <KpiCard label="Total pedidos"    value={totalStats.pedidos}  />
        <KpiCard label="Total usuarios"   value={totalStats.usuarios} />
      </div>

      <ModalNuevaBodega
        open={modalBodega}
        onClose={() => setModalBodega(false)}
        onSaved={() => { setModalBodega(false); cargar() }}
      />

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
                <button onClick={() => abrir(b.id)}
                  className="w-full flex items-center justify-between px-5 py-4 hover:bg-gray-50 transition-colors text-left">
                  <div>
                    <div className="flex items-center gap-2">
                      <p className="font-semibold text-gray-900">{b.nombre}</p>
                      <span className="text-xs font-mono text-gray-400">/{b.slug}</span>
                      {!b.activo && (
                        <span className="text-xs bg-red-100 text-red-600 px-2 py-0.5 rounded-full font-medium">Inactiva</span>
                      )}
                    </div>
                    <p className="text-xs text-gray-400 mt-0.5">Creada: {new Date(b.created_at).toLocaleDateString('es-EC')}</p>
                  </div>
                  <div className="flex items-center gap-6">
                    <div className="text-center"><p className="text-lg font-bold text-gray-800">{s.clientes ?? '—'}</p><p className="text-xs text-gray-400">Empresas</p></div>
                    <div className="text-center"><p className="text-lg font-bold text-gray-800">{s.pedidos ?? '—'}</p><p className="text-xs text-gray-400">Pedidos</p></div>
                    <div className="text-center"><p className="text-lg font-bold text-gray-800">{s.usuarios ?? '—'}</p><p className="text-xs text-gray-400">Usuarios</p></div>
                    <span className="text-gray-300 ml-2">{open ? '▲' : '▼'}</span>
                  </div>
                </button>

                {open && (
                  <div className="border-t border-gray-100">
                    {cs.length === 0 ? (
                      <p className="px-5 py-4 text-sm text-gray-400">Sin clientes registrados.</p>
                    ) : (
                      <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                          <thead className="bg-gray-50 border-b border-gray-100">
                            <tr className="text-xs text-gray-400 font-semibold uppercase tracking-wide">
                              <th className="text-left px-5 py-3">Empresa</th>
                              <th className="text-left px-4 py-3">Dueño / Email</th>
                              <th className="text-center px-4 py-3">Plan</th>
                              <th className="text-center px-4 py-3">m² contratados</th>
                              <th className="text-center px-4 py-3">Pedidos / mes</th>
                              <th className="text-center px-4 py-3">Total pedidos</th>
                              <th className="text-center px-4 py-3">Estado</th>
                              <th className="px-4 py-3" />
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-gray-50">
                            {cs.map(c => {
                              const dueno  = c.dueno
                              const activo = dueno?.activo ?? true
                              const limPed = c.plan_limite_pedidos_mes
                              const pctPed = limPed ? Math.round((c.pedidos_mes / limPed) * 100) : null

                              return (
                                <tr key={c.id} className={`hover:bg-gray-50 transition-colors ${!activo ? 'opacity-50' : ''}`}>
                                  <td className="px-5 py-3">
                                    <p className="font-semibold text-gray-900">{c.nombre_negocio ?? '—'}</p>
                                    <p className="text-xs text-gray-400">{new Date(c.created_at).toLocaleDateString('es-EC')}</p>
                                  </td>
                                  <td className="px-4 py-3">
                                    <p className="text-gray-700">{[dueno?.nombre, dueno?.apellido].filter(Boolean).join(' ') || '—'}</p>
                                    <p className="text-xs text-gray-400">{dueno?.email}</p>
                                  </td>

                                  {/* Plan — editable */}
                                  <td className="px-4 py-3 text-center">
                                    <select
                                      value={c.plan}
                                      onChange={e => actualizarCliente(b.id, c.id, 'plan', e.target.value)}
                                      disabled={saving === `plan-${c.id}`}
                                      className={`text-xs px-2 py-1 rounded-lg font-semibold border-0 cursor-pointer focus:ring-2 focus:ring-brand-500 focus:outline-none ${PLAN_STYLE[c.plan] ?? PLAN_STYLE.basico}`}
                                    >
                                      {PLANES.map(p => (
                                        <option key={p.value} value={p.value}>{p.label}</option>
                                      ))}
                                    </select>
                                  </td>

                                  {/* m² — editable */}
                                  <td className="px-4 py-3 text-center">
                                    <EditableNumber
                                      value={c.m2_contratados}
                                      suffix="m²"
                                      onSave={v => actualizarCliente(b.id, c.id, 'm2_contratados', v)}
                                    />
                                  </td>

                                  {/* Pedidos este mes */}
                                  <td className="px-4 py-3 text-center">
                                    <div>
                                      <p className={`font-semibold ${pctPed >= 90 ? 'text-red-500' : pctPed >= 70 ? 'text-yellow-600' : 'text-gray-800'}`}>
                                        {c.pedidos_mes}
                                        {limPed && <span className="text-gray-400 font-normal text-xs"> / {limPed}</span>}
                                      </p>
                                      {pctPed !== null && (
                                        <div className="w-16 bg-gray-200 rounded-full h-1 mx-auto mt-1">
                                          <div
                                            className={`h-1 rounded-full ${pctPed >= 90 ? 'bg-red-400' : pctPed >= 70 ? 'bg-yellow-400' : 'bg-brand-500'}`}
                                            style={{ width: `${Math.min(pctPed, 100)}%` }}
                                          />
                                        </div>
                                      )}
                                      {/* Límite editable */}
                                      <p className="text-xs text-gray-400 mt-1">
                                        Límite:{' '}
                                        <EditableNumber
                                          value={limPed ?? 0}
                                          onSave={v => actualizarCliente(b.id, c.id, 'plan_limite_pedidos_mes', v === 0 ? null : v)}
                                        />
                                        {limPed ? '' : ' (sin límite)'}
                                      </p>
                                    </div>
                                  </td>

                                  {/* Total pedidos */}
                                  <td className="px-4 py-3 text-center">
                                    <p className="font-semibold text-gray-800">{c.pedidos_total}</p>
                                    <p className="text-xs text-gray-400">histórico</p>
                                  </td>

                                  {/* Estado */}
                                  <td className="px-4 py-3 text-center">
                                    {activo
                                      ? <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full font-semibold">Activo</span>
                                      : <span className="text-xs bg-red-100 text-red-600 px-2 py-0.5 rounded-full font-semibold">Suspendido</span>
                                    }
                                  </td>

                                  {/* Acciones */}
                                  <td className="px-4 py-3 text-right">
                                    <button
                                      disabled={saving === `toggle-${c.id}`}
                                      onClick={() => toggleCliente(b.id, c.id, dueno?.id, activo)}
                                      className={`text-xs px-3 py-1 rounded-lg transition-colors border disabled:opacity-50 ${
                                        activo
                                          ? 'text-red-500 hover:bg-red-50 border-red-200'
                                          : 'text-green-600 hover:bg-green-50 border-green-200'
                                      }`}
                                    >
                                      {saving === `toggle-${c.id}` ? '…' : activo ? 'Suspender' : 'Activar'}
                                    </button>
                                  </td>
                                </tr>
                              )
                            })}
                          </tbody>
                        </table>
                      </div>
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
