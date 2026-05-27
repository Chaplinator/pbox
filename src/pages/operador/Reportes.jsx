import { useEffect, useState, useCallback } from 'react'
import { supabase } from '@/supabase/client'
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  Cell, CartesianGrid, Legend,
} from 'recharts'
import { exportarMovimientos } from '@/utils/exportExcel'
import * as XLSX from 'xlsx'

const PERIODOS = [
  { key: 7,   label: '7 días'   },
  { key: 30,  label: '30 días'  },
  { key: 90,  label: '90 días'  },
  { key: 365, label: 'Este año' },
]

const ESTADO_COLOR = {
  recibido:   '#93c5fd',
  en_proceso: '#fde68a',
  despachado: '#c4b5fd',
  entregado:  '#86efac',
  devuelto:   '#fed7aa',
  cancelado:  '#fca5a5',
}

const TIPO_COLOR = { entrada: '#86efac', salida: '#fca5a5', ajuste: '#fde68a' }

const AZULES = ['#1e3a5f','#1d4ed8','#2563eb','#3b82f6','#60a5fa','#93c5fd','#a5b4fc','#bae6fd','#dbeafe','#eff6ff']

function KpiCard({ label, value, sub, variant = 'default' }) {
  const colors = { default: 'text-gray-900', blue: 'text-brand-700', red: 'text-red-600', green: 'text-green-700' }
  return (
    <div className="bg-white rounded-xl border border-gray-200 p-5">
      <p className="text-sm text-gray-500">{label}</p>
      <p className={`text-3xl font-bold mt-1 ${colors[variant]}`}>{value ?? '—'}</p>
      {sub && <p className="text-xs text-gray-400 mt-0.5">{sub}</p>}
    </div>
  )
}

function CustomTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null
  return (
    <div className="bg-white border border-gray-200 rounded-lg px-3 py-2 text-xs shadow">
      <p className="font-medium text-gray-700 mb-1">{label}</p>
      {payload.map(p => (
        <p key={p.dataKey} style={{ color: p.color }}>{p.name}: <b>{p.value}</b></p>
      ))}
    </div>
  )
}

function exportarTrazabilidad(historial) {
  const filas = historial.map(h => ({
    'Fecha':          new Date(h.created_at).toLocaleDateString('es-EC'),
    'Hora':           new Date(h.created_at).toLocaleTimeString('es-EC'),
    'N° Pedido':      h.pedidos?.numero_pedido ?? '',
    'Cliente':        h.pedidos?.clientes?.nombre_negocio ?? '',
    'Estado anterior': h.estado_anterior ?? 'Nuevo',
    'Estado nuevo':    h.estado_nuevo,
    'Realizado por':  h.usuarios?.nombre ?? 'Sistema',
  }))
  const ws = XLSX.utils.json_to_sheet(filas)
  const wb = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(wb, ws, 'Trazabilidad')
  const fecha = new Date().toISOString().slice(0, 10)
  XLSX.writeFile(wb, `trazabilidad_${fecha}.xlsx`)
}

// Agrupa pedidos por semana para el gráfico
function agruparPorSemana(pedidos) {
  const map = {}
  pedidos.forEach(p => {
    const d = new Date(p.created_at)
    d.setHours(0,0,0,0)
    d.setDate(d.getDate() - d.getDay() + 1) // lunes
    const key = d.toLocaleDateString('es-EC', { day: '2-digit', month: 'short' })
    if (!map[key]) map[key] = { semana: key, total: 0, entregado: 0, cancelado: 0 }
    map[key].total++
    if (p.estado === 'entregado') map[key].entregado++
    if (p.estado === 'cancelado') map[key].cancelado++
  })
  return Object.values(map).slice(-12)
}

export default function Reportes() {
  const [dias, setDias]             = useState(30)
  const [kpis, setKpis]             = useState(null)
  const [pedidos, setPedidos]       = useState([])
  const [topProductos, setTop]      = useState([])
  const [movimientos, setMovimientos] = useState([])
  const [historial, setHistorial]   = useState([])
  const [tab, setTab]               = useState('general')
  const [loading, setLoading]       = useState(true)

  const cargar = useCallback(async () => {
    setLoading(true)
    const desde = new Date(Date.now() - dias * 86400000).toISOString()

    const [pedRes, movRes, histRes] = await Promise.all([
      supabase.from('pedidos')
        .select(`
          id, estado, created_at, updated_at, cliente_id,
          clientes ( nombre_negocio ),
          items_pedido ( cantidad, productos ( sku, nombre, categoria ) )
        `)
        .gte('created_at', desde)
        .order('created_at', { ascending: false }),

      supabase.from('movimientos_inventario')
        .select(`
          id, tipo, cantidad, referencia, notas, created_at, pedido_id,
          productos ( sku, nombre, categoria ),
          usuarios ( nombre )
        `)
        .gte('created_at', desde)
        .order('created_at', { ascending: false }),

      supabase.from('historial_estados')
        .select(`
          id, estado_anterior, estado_nuevo, created_at,
          pedidos ( numero_pedido, clientes ( nombre_negocio ) ),
          usuarios ( nombre )
        `)
        .gte('created_at', desde)
        .order('created_at', { ascending: false }),
    ])

    const peds = pedRes.data ?? []
    const movs = movRes.data ?? []
    const hist = histRes.data ?? []

    // KPIs
    const totalPedidos    = peds.length
    const entregados      = peds.filter(p => p.estado === 'entregado').length
    const cancelados      = peds.filter(p => p.estado === 'cancelado').length
    const unidadesDesp    = peds
      .filter(p => ['despachado','entregado'].includes(p.estado))
      .flatMap(p => p.items_pedido ?? [])
      .reduce((s, i) => s + (i.cantidad ?? 0), 0)
    const clientesUnicos  = new Set(peds.map(p => p.cliente_id)).size

    setKpis({ totalPedidos, entregados, cancelados, unidadesDesp, clientesUnicos })
    setPedidos(peds)

    // Top productos despachados
    const conteo = {}
    peds.filter(p => ['despachado','entregado'].includes(p.estado))
      .flatMap(p => p.items_pedido ?? [])
      .forEach(it => {
        const k = it.productos?.sku ?? 'N/A'
        if (!conteo[k]) conteo[k] = { sku: k, nombre: it.productos?.nombre ?? k, unidades: 0 }
        conteo[k].unidades += it.cantidad ?? 0
      })
    setTop(Object.values(conteo).sort((a,b) => b.unidades - a.unidades).slice(0, 10))

    setMovimientos(movs)
    setHistorial(hist)
    setLoading(false)
  }, [dias])

  useEffect(() => { cargar() }, [cargar])

  const semanasData   = agruparPorSemana(pedidos)
  const movExport     = movimientos.map(m => ({ ...m, productos: m.productos }))

  const TABS = [
    { key: 'general',      label: 'Visión general'  },
    { key: 'movimientos',  label: `Movimientos (${movimientos.length})` },
    { key: 'trazabilidad', label: `Trazabilidad (${historial.length})` },
  ]

  return (
    <div className="p-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Reportes</h1>
          <p className="text-gray-500 text-sm">Análisis operativo y trazabilidad</p>
        </div>
        <div className="flex gap-2">
          {PERIODOS.map(p => (
            <button key={p.key} onClick={() => setDias(p.key)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                dias === p.key ? 'bg-brand-700 text-white' : 'bg-white border border-gray-200 text-gray-500 hover:border-gray-300'
              }`}>
              {p.label}
            </button>
          ))}
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 mb-6 bg-gray-100 rounded-xl p-1 w-fit">
        {TABS.map(t => (
          <button key={t.key} onClick={() => setTab(t.key)}
            className={`px-4 py-2 rounded-lg text-xs font-medium transition-colors ${
              tab === t.key ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'
            }`}>
            {t.label}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="text-center py-16 text-gray-400 text-sm">Cargando reportes…</div>
      ) : (
        <>
          {/* TAB: Visión general */}
          {tab === 'general' && (
            <div className="space-y-6">
              {/* KPIs */}
              <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
                <KpiCard label="Pedidos totales"      value={kpis?.totalPedidos}  variant="blue"  />
                <KpiCard label="Entregados"           value={kpis?.entregados}    variant="green" />
                <KpiCard label="Cancelados"           value={kpis?.cancelados}    variant="red"   />
                <KpiCard label="Unidades despachadas" value={kpis?.unidadesDesp}  variant="blue"  sub="pedidos despachados o entregados" />
                <KpiCard label="Clientes activos"     value={kpis?.clientesUnicos} />
              </div>

              {/* Gráficos */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                {/* Pedidos por semana */}
                <div className="bg-white rounded-xl border border-gray-200 p-5">
                  <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-4">Pedidos por semana</p>
                  {semanasData.length === 0 ? (
                    <div className="flex items-center justify-center h-48 text-gray-300 text-xs">Sin datos</div>
                  ) : (
                    <ResponsiveContainer width="100%" height={220}>
                      <BarChart data={semanasData} margin={{ left: -10 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
                        <XAxis dataKey="semana" tick={{ fontSize: 10 }} />
                        <YAxis tick={{ fontSize: 10 }} allowDecimals={false} />
                        <Tooltip content={<CustomTooltip />} />
                        <Legend wrapperStyle={{ fontSize: 10 }} />
                        <Bar dataKey="total"     name="Total"     fill="#3b82f6" radius={[3,3,0,0]} />
                        <Bar dataKey="entregado" name="Entregado" fill="#86efac" radius={[3,3,0,0]} />
                        <Bar dataKey="cancelado" name="Cancelado" fill="#fca5a5" radius={[3,3,0,0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  )}
                </div>

                {/* Top productos */}
                <div className="bg-white rounded-xl border border-gray-200 p-5">
                  <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-4">Top productos despachados</p>
                  {topProductos.length === 0 ? (
                    <div className="flex items-center justify-center h-48 text-gray-300 text-xs">Sin despachos en el período</div>
                  ) : (
                    <ResponsiveContainer width="100%" height={220}>
                      <BarChart data={topProductos} layout="vertical" margin={{ left: 0, right: 24 }}>
                        <XAxis type="number" tick={{ fontSize: 10 }} />
                        <YAxis type="category" dataKey="sku" tick={{ fontSize: 10 }} width={72} />
                        <Tooltip content={<CustomTooltip />} />
                        <Bar dataKey="unidades" name="Unidades" radius={[0,3,3,0]}>
                          {topProductos.map((_, i) => <Cell key={i} fill={AZULES[i % AZULES.length]} />)}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  )}
                </div>
              </div>

              {/* Distribución por estado */}
              <div className="bg-white rounded-xl border border-gray-200 p-5">
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-4">Distribución de pedidos por estado</p>
                <div className="flex flex-wrap gap-3">
                  {Object.entries(
                    pedidos.reduce((acc, p) => { acc[p.estado] = (acc[p.estado] ?? 0) + 1; return acc }, {})
                  ).sort((a,b) => b[1]-a[1]).map(([estado, count]) => (
                    <div key={estado} className="flex items-center gap-2 bg-gray-50 rounded-lg px-3 py-2">
                      <span className="w-2.5 h-2.5 rounded-full" style={{ background: ESTADO_COLOR[estado] ?? '#e5e7eb' }} />
                      <span className="text-xs text-gray-600 capitalize">{estado.replace('_',' ')}</span>
                      <span className="text-xs font-bold text-gray-900">{count}</span>
                      <span className="text-xs text-gray-400">({((count/pedidos.length)*100).toFixed(0)}%)</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* TAB: Movimientos */}
          {tab === 'movimientos' && (
            <div>
              <div className="flex justify-end mb-3">
                {movimientos.length > 0 && (
                  <button onClick={() => exportarMovimientos(movimientos)}
                    className="px-4 py-2 text-sm border border-gray-200 text-gray-600 rounded-lg hover:bg-gray-50 transition-colors">
                    ↓ Exportar Excel
                  </button>
                )}
              </div>
              {movimientos.length === 0 ? (
                <div className="bg-white rounded-xl border border-gray-200 p-12 text-center text-gray-400 text-sm">
                  Sin movimientos en este período.
                </div>
              ) : (
                <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-gray-200 bg-gray-50">
                        {['Fecha y hora','SKU','Producto','Categoría','Tipo','Cantidad','Referencia','Notas','Realizado por'].map(h => (
                          <th key={h} className="px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide text-left whitespace-nowrap">{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {movimientos.map(m => {
                        const tipo = m.tipo
                        const color = TIPO_COLOR[tipo] ?? '#e5e7eb'
                        return (
                          <tr key={m.id} className="hover:bg-gray-50">
                            <td className="px-4 py-2.5 text-xs text-gray-400 whitespace-nowrap">
                              {new Date(m.created_at).toLocaleDateString('es-EC')}{' '}
                              <span className="text-gray-300">{new Date(m.created_at).toLocaleTimeString('es-EC', { hour: '2-digit', minute: '2-digit' })}</span>
                            </td>
                            <td className="px-4 py-2.5 font-mono text-xs text-gray-400">{m.productos?.sku ?? '—'}</td>
                            <td className="px-4 py-2.5 text-gray-700">{m.productos?.nombre ?? '—'}</td>
                            <td className="px-4 py-2.5 text-xs text-gray-400">{m.productos?.categoria ?? '—'}</td>
                            <td className="px-4 py-2.5">
                              <span className="inline-flex items-center gap-1.5 text-xs font-medium">
                                <span className="w-2 h-2 rounded-full" style={{ background: color }} />
                                {tipo}
                              </span>
                            </td>
                            <td className="px-4 py-2.5 font-semibold text-gray-900 text-right">{m.cantidad}</td>
                            <td className="px-4 py-2.5 text-xs text-gray-400">{m.referencia ?? '—'}</td>
                            <td className="px-4 py-2.5 text-xs text-gray-400 max-w-[160px] truncate">{m.notas ?? '—'}</td>
                            <td className="px-4 py-2.5 text-xs text-gray-500">{m.usuarios?.nombre ?? 'Sistema'}</td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                  <div className="px-4 py-3 border-t border-gray-100 bg-gray-50 text-xs text-gray-400">
                    {movimientos.length} movimiento{movimientos.length !== 1 ? 's' : ''} en los últimos {dias} días
                  </div>
                </div>
              )}
            </div>
          )}

          {/* TAB: Trazabilidad */}
          {tab === 'trazabilidad' && (
            <div>
              <div className="flex justify-end mb-3">
                {historial.length > 0 && (
                  <button onClick={() => exportarTrazabilidad(historial)}
                    className="px-4 py-2 text-sm border border-gray-200 text-gray-600 rounded-lg hover:bg-gray-50 transition-colors">
                    ↓ Exportar Excel
                  </button>
                )}
              </div>
              {historial.length === 0 ? (
                <div className="bg-white rounded-xl border border-gray-200 p-12 text-center text-gray-400 text-sm">
                  Sin cambios de estado en este período.
                </div>
              ) : (
                <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-gray-200 bg-gray-50">
                        {['Fecha y hora','N° Pedido','Cliente','Estado anterior','Estado nuevo','Realizado por'].map(h => (
                          <th key={h} className="px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide text-left whitespace-nowrap">{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {historial.map(h => (
                        <tr key={h.id} className="hover:bg-gray-50">
                          <td className="px-4 py-2.5 text-xs text-gray-400 whitespace-nowrap">
                            {new Date(h.created_at).toLocaleDateString('es-EC')}{' '}
                            <span className="text-gray-300">{new Date(h.created_at).toLocaleTimeString('es-EC', { hour: '2-digit', minute: '2-digit' })}</span>
                          </td>
                          <td className="px-4 py-2.5 font-mono text-xs text-gray-500">{h.pedidos?.numero_pedido ?? '—'}</td>
                          <td className="px-4 py-2.5 text-gray-700">{h.pedidos?.clientes?.nombre_negocio ?? '—'}</td>
                          <td className="px-4 py-2.5">
                            {h.estado_anterior ? (
                              <span className="text-xs px-2 py-0.5 rounded-full font-medium"
                                style={{ background: ESTADO_COLOR[h.estado_anterior] + '40', color: '#374151' }}>
                                {h.estado_anterior.replace('_',' ')}
                              </span>
                            ) : <span className="text-gray-300 text-xs">Nuevo</span>}
                          </td>
                          <td className="px-4 py-2.5">
                            <span className="text-xs px-2 py-0.5 rounded-full font-medium"
                              style={{ background: ESTADO_COLOR[h.estado_nuevo] + '40', color: '#374151' }}>
                              {h.estado_nuevo.replace('_',' ')}
                            </span>
                          </td>
                          <td className="px-4 py-2.5 text-xs text-gray-500">{h.usuarios?.nombre ?? 'Sistema'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  <div className="px-4 py-3 border-t border-gray-100 bg-gray-50 text-xs text-gray-400">
                    {historial.length} cambio{historial.length !== 1 ? 's' : ''} de estado en los últimos {dias} días
                  </div>
                </div>
              )}
            </div>
          )}
        </>
      )}
    </div>
  )
}
