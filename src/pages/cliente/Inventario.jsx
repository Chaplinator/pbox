import { useEffect, useState } from 'react'
import { useAuth } from '@/context/AuthContext'
import { supabase } from '@/supabase/client'
import { useInventario } from '@/hooks/useInventario'
import ModalProducto from '@/components/inventario/ModalProducto'
import ModalAjustarStock from '@/components/inventario/ModalAjustarStock'
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell,
  PieChart, Pie,
} from 'recharts'

const COLORS = ['#1e3a5f','#1d4ed8','#2563eb','#3b82f6','#60a5fa','#93c5fd','#a5b4fc','#bae6fd']

function MiniTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null
  return (
    <div className="bg-white border border-gray-200 rounded-lg px-3 py-2 text-xs shadow">
      <p className="font-medium text-gray-700">{label}</p>
      <p className="text-gray-500">{payload[0].name}: <span className="font-semibold text-gray-800">{payload[0].value}</span></p>
    </div>
  )
}

function StatCard({ label, value, sub, variant = 'default' }) {
  const colors = {
    default: 'text-gray-900',
    blue:    'text-blue-700',
    red:     'text-red-600',
    green:   'text-brand-700',
  }
  return (
    <div className="bg-white rounded-xl border border-gray-200 p-5">
      <p className="text-sm text-gray-500">{label}</p>
      <p className={`text-2xl font-bold mt-1 ${colors[variant]}`}>{value}</p>
      {sub && <p className="text-xs text-gray-400 mt-0.5">{sub}</p>}
    </div>
  )
}

function Badge({ stockBajo }) {
  return stockBajo
    ? <span className="inline-flex px-2 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-700">Bajo mínimo</span>
    : <span className="inline-flex px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-700">OK</span>
}

function RotacionBadge({ unidades }) {
  if (!unidades) return <span className="text-gray-300 text-xs">—</span>
  if (unidades >= 50) return <span className="text-xs font-medium text-brand-600">{unidades}u ↑↑</span>
  if (unidades >= 10) return <span className="text-xs font-medium text-yellow-600">{unidades}u ↑</span>
  return <span className="text-xs text-gray-400">{unidades}u</span>
}

export default function Inventario() {
  const { perfil } = useAuth()
  const [clienteId, setClienteId] = useState(null)
  const [loadingCliente, setLoadingCliente] = useState(true)
  const [busqueda, setBusqueda] = useState('')
  const [modalProducto, setModalProducto] = useState({ open: false, producto: null })
  const [modalStock, setModalStock] = useState({ open: false, producto: null })

  const { productos, rotacion, stats, enviosMes, loading, refetch } = useInventario(clienteId)

  useEffect(() => {
    if (!perfil) return
    supabase.from('clientes').select('id').eq('usuario_id', perfil.id).single()
      .then(({ data }) => { setClienteId(data?.id ?? null); setLoadingCliente(false) })
  }, [perfil])

  const productosFiltrados = productos.filter(p =>
    p.nombre.toLowerCase().includes(busqueda.toLowerCase()) ||
    p.sku.toLowerCase().includes(busqueda.toLowerCase())
  )

  function onProductoGuardado() { setModalProducto({ open: false, producto: null }); refetch() }
  function onStockGuardado()    { setModalStock({ open: false, producto: null });    refetch() }

  async function eliminarProducto(p) {
    if (!confirm(`¿Eliminar "${p.nombre}"? Esta acción no se puede deshacer.`)) return
    await supabase.from('productos').delete().eq('id', p.producto_id)
    refetch()
  }

  if (loadingCliente) return (
    <div className="p-8 text-center text-gray-400 text-sm">Cargando…</div>
  )

  if (!clienteId) return (
    <div className="p-8">
      <h1 className="text-2xl font-bold text-gray-900 mb-4">Inventario</h1>
      <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-6 max-w-md">
        <p className="font-medium text-yellow-800 mb-1">Perfil de negocio incompleto</p>
        <p className="text-sm text-yellow-700">
          Completa tu perfil de negocio en Configuración para empezar a gestionar tu inventario.
        </p>
      </div>
    </div>
  )

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Inventario</h1>
          <p className="text-gray-500 text-sm">Productos y stock en bodega P-Box</p>
        </div>
        <button
          onClick={() => setModalProducto({ open: true, producto: null })}
          className="bg-brand-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-brand-700 transition-colors"
        >
          + Agregar producto
        </button>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4 mb-8">
        <StatCard label="Productos activos" value={stats.totalProductos} />
        <StatCard label="Unidades en stock" value={stats.totalUnidades.toLocaleString()} />
        <StatCard label="m² ocupados" value={`${stats.totalM2} m²`} sub="pisada en bodega" variant="blue" />
        <StatCard
          label="Bajo mínimo"
          value={stats.bajoMinimo}
          variant={stats.bajoMinimo > 0 ? 'red' : 'default'}
          sub={stats.bajoMinimo > 0 ? 'Requieren atención' : 'Todo en orden'}
        />
        <StatCard label="Envíos este mes" value={enviosMes} variant="green" />
      </div>

      {/* Mini dashboard */}
      {!loading && productos.length > 0 && (() => {
        const top = [...productos]
          .sort((a, b) => parseFloat(b.m2_total) - parseFloat(a.m2_total))
          .slice(0, 8)

        const totalM2 = parseFloat(stats.totalM2) || 1
        const totalUnidades = stats.totalUnidades || 1

        const dataM2 = top.map(p => ({
          sku: p.sku,
          'm² total': parseFloat(p.m2_total),
          pct: ((parseFloat(p.m2_total) / totalM2) * 100).toFixed(1),
        }))

        const dataUnidades = [...productos]
          .sort((a, b) => b.cantidad - a.cantidad)
          .slice(0, 8)
          .map(p => ({
            sku: p.sku,
            unidades: p.cantidad,
            pct: ((p.cantidad / totalUnidades) * 100).toFixed(1),
          }))

        const dataEnvios = [...productos]
          .map(p => ({ sku: p.sku, envíos: rotacion[p.producto_id]?.unidades_30d ?? 0 }))
          .filter(p => p.envíos > 0)
          .sort((a, b) => b.envíos - a.envíos)
          .slice(0, 8)

        return (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-8">
            {/* m² por SKU — pie */}
            <div className="bg-white rounded-xl border border-gray-200 p-5">
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">m² ocupados por SKU</p>
              <p className="text-xs text-gray-400 mb-2">{totalM2.toFixed(2)} m² totales</p>
              <div className="flex gap-4 items-center">
                <ResponsiveContainer width="55%" height={170}>
                  <PieChart>
                    <Pie
                      data={dataM2}
                      dataKey="m² total"
                      nameKey="sku"
                      cx="50%" cy="50%"
                      innerRadius={42}
                      outerRadius={72}
                      paddingAngle={2}
                    >
                      {dataM2.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                    </Pie>
                    <Tooltip formatter={(v) => [`${v} m²`, 'm²']} />
                  </PieChart>
                </ResponsiveContainer>
                <ul className="flex-1 space-y-1 min-w-0">
                  {dataM2.map((d, i) => (
                    <li key={d.sku} className="flex items-center gap-1.5 min-w-0">
                      <span className="w-2 h-2 rounded-full shrink-0" style={{ background: COLORS[i % COLORS.length] }} />
                      <span className="text-xs text-gray-600 truncate flex-1">{d.sku}</span>
                      <span className="text-xs font-medium text-gray-800 shrink-0">{d.pct}%</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>

            {/* Share de unidades */}
            <div className="bg-white rounded-xl border border-gray-200 p-5">
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-4">Share de unidades en stock</p>
              <ResponsiveContainer width="100%" height={180}>
                <BarChart data={dataUnidades} layout="vertical" margin={{ left: 0, right: 24, top: 0, bottom: 0 }}>
                  <XAxis type="number" tick={{ fontSize: 10 }} />
                  <YAxis type="category" dataKey="sku" tick={{ fontSize: 10 }} width={64} />
                  <Tooltip content={<MiniTooltip />} />
                  <Bar dataKey="unidades" radius={[0,3,3,0]}>
                    {dataUnidades.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>

            {/* Envíos por SKU (últimos 30d) */}
            <div className="bg-white rounded-xl border border-gray-200 p-5">
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">Envíos por SKU</p>
              <p className="text-xs text-gray-400 mb-4">últimos 30 días</p>
              {dataEnvios.length === 0 ? (
                <div className="flex items-center justify-center h-[180px]">
                  <p className="text-xs text-gray-300">Sin envíos en este período</p>
                </div>
              ) : (
                <ResponsiveContainer width="100%" height={180}>
                  <BarChart data={dataEnvios} layout="vertical" margin={{ left: 0, right: 24, top: 0, bottom: 0 }}>
                    <XAxis type="number" tick={{ fontSize: 10 }} />
                    <YAxis type="category" dataKey="sku" tick={{ fontSize: 10 }} width={64} />
                    <Tooltip content={<MiniTooltip />} />
                    <Bar dataKey="envíos" radius={[0,3,3,0]}>
                      {dataEnvios.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              )}
            </div>
          </div>
        )
      })()}

      {/* Buscador */}
      <div className="mb-4">
        <input
          type="text"
          placeholder="Buscar por nombre o SKU…"
          value={busqueda}
          onChange={e => setBusqueda(e.target.value)}
          className="w-full max-w-sm px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent"
        />
      </div>

      {/* Tabla */}
      {loading ? (
        <div className="text-center py-16 text-gray-400 text-sm">Cargando inventario…</div>
      ) : productosFiltrados.length === 0 ? (
        <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
          {productos.length === 0 ? (
            <>
              <p className="text-gray-700 font-medium mb-1">Aún no tienes productos</p>
              <p className="text-gray-400 text-sm mb-4">Agrega tu primer producto para comenzar.</p>
              <button
                onClick={() => setModalProducto({ open: true, producto: null })}
                className="bg-brand-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-brand-700 transition-colors"
              >
                + Agregar primer producto
              </button>
            </>
          ) : (
            <p className="text-gray-400 text-sm">Sin resultados para "{busqueda}"</p>
          )}
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-200 bg-gray-50">
                {[
                  { label: 'SKU',       align: 'left'  },
                  { label: 'Nombre',    align: 'left'  },
                  { label: 'Stock',     align: 'right' },
                  { label: 'Mínimo',   align: 'right' },
                  { label: 'm² total', align: 'right' },
                  { label: 'Rot. 30d', align: 'right' },
                  { label: 'Estado',   align: 'left'  },
                  { label: '',          align: 'right' },
                ].map(({ label, align }) => (
                  <th key={label} className={`px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide text-${align}`}>
                    {label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {productosFiltrados.map(p => {
                const rot = rotacion[p.producto_id]
                return (
                  <tr key={p.producto_id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-4 py-3 font-mono text-xs text-gray-400">{p.sku}</td>
                    <td className="px-4 py-3">
                      <p className="font-medium text-gray-900">{p.nombre}</p>
                      {p.descripcion && (
                        <p className="text-xs text-gray-400 truncate max-w-[180px]">{p.descripcion}</p>
                      )}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <span className={`font-bold ${p.stock_bajo ? 'text-red-600' : 'text-gray-900'}`}>
                        {p.cantidad}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right text-gray-400">{p.stock_minimo}</td>
                    <td className="px-4 py-3 text-right text-gray-500 text-xs">
                      {parseFloat(p.m2_total) > 0 ? `${p.m2_total} m²` : '—'}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <RotacionBadge unidades={rot?.unidades_30d} />
                    </td>
                    <td className="px-4 py-3"><Badge stockBajo={p.stock_bajo} /></td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1 justify-end whitespace-nowrap">
                        <button
                          onClick={() => setModalStock({ open: true, producto: p })}
                          className="px-2 py-1 text-xs text-brand-600 hover:bg-brand-50 rounded-md transition-colors font-medium"
                        >
                          Stock
                        </button>
                        <button
                          onClick={() => setModalProducto({ open: true, producto: p })}
                          className="px-2 py-1 text-xs text-gray-500 hover:bg-gray-100 rounded-md transition-colors"
                        >
                          Editar
                        </button>
                        <button
                          onClick={() => eliminarProducto(p)}
                          className="px-2 py-1 text-xs text-red-500 hover:bg-red-50 rounded-md transition-colors"
                        >
                          Eliminar
                        </button>
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>

          <div className="px-4 py-3 border-t border-gray-100 bg-gray-50 text-xs text-gray-400">
            {productosFiltrados.length} producto{productosFiltrados.length !== 1 ? 's' : ''}
            {busqueda && ` (filtrado de ${productos.length})`}
            {parseFloat(stats.totalM2) > 0 && ` · ${stats.totalM2} m² ocupados en bodega`}
          </div>
        </div>
      )}

      <ModalProducto
        open={modalProducto.open}
        onClose={() => setModalProducto({ open: false, producto: null })}
        clienteId={clienteId}
        producto={modalProducto.producto}
        onSaved={onProductoGuardado}
      />

      <ModalAjustarStock
        open={modalStock.open}
        onClose={() => setModalStock({ open: false, producto: null })}
        producto={modalStock.producto}
        onSaved={onStockGuardado}
      />
    </div>
  )
}
