import { useEffect, useState, useCallback } from 'react'
import { supabase } from '@/supabase/client'
import ModalGestionPedido from '@/components/operador/ModalGestionPedido'
import { exportarPedidos } from '@/utils/exportExcel'

const FILTROS = [
  { key: 'activos',    label: 'Activos'     },
  { key: 'todos',      label: 'Todos'       },
  { key: 'recibido',   label: 'Recibido'    },
  { key: 'en_proceso', label: 'En proceso'  },
  { key: 'despachado', label: 'Despachado'  },
  { key: 'entregado',  label: 'Entregado'   },
  { key: 'devuelto',   label: 'Devuelto'    },
  { key: 'cancelado',  label: 'Cancelado'   },
]

const ESTADO_STYLE = {
  recibido:   { bg: 'bg-blue-100',   text: 'text-blue-700'   },
  en_proceso: { bg: 'bg-yellow-100', text: 'text-yellow-700' },
  despachado: { bg: 'bg-purple-100', text: 'text-purple-700' },
  entregado:  { bg: 'bg-green-100',  text: 'text-green-700'  },
  devuelto:   { bg: 'bg-orange-100', text: 'text-orange-700' },
  cancelado:  { bg: 'bg-red-100',    text: 'text-red-600'    },
}

const ESTADO_LABEL = {
  recibido: 'Recibido', en_proceso: 'En proceso', despachado: 'Despachado',
  entregado: 'Entregado', devuelto: 'Devuelto', cancelado: 'Cancelado',
}

function EstadoBadge({ estado }) {
  const s = ESTADO_STYLE[estado] ?? { bg: 'bg-gray-100', text: 'text-gray-600' }
  return (
    <span className={`inline-flex px-2.5 py-0.5 rounded-full text-xs font-semibold ${s.bg} ${s.text}`}>
      {ESTADO_LABEL[estado] ?? estado}
    </span>
  )
}

function KpiCard({ label, value, variant = 'default' }) {
  const colors = { default: 'text-gray-900', blue: 'text-brand-700', red: 'text-red-600', yellow: 'text-yellow-600' }
  return (
    <div className="bg-white rounded-xl border border-gray-200 p-5">
      <p className="text-sm text-gray-500">{label}</p>
      <p className={`text-3xl font-bold mt-1 ${colors[variant]}`}>{value ?? '—'}</p>
    </div>
  )
}

export default function PanelOperativo() {
  const [pedidos, setPedidos]   = useState([])
  const [loading, setLoading]   = useState(true)
  const [filtro, setFiltro]     = useState('activos')
  const [gestion, setGestion]   = useState(null)

  const cargar = useCallback(async () => {
    setLoading(true)
    const { data } = await supabase
      .from('pedidos')
      .select(`
        id, numero_pedido, estado, created_at, updated_at, notas,
        destinatario_nombre, destinatario_apellido, destinatario_cedula,
        destinatario_telefono, destinatario_telefono2, destinatario_email,
        direccion_entrega, numero_casa, referencias_entrega,
        ciudad_entrega, provincia_entrega,
        courrier, numero_guia, tracking_url, factura_url,
        clientes ( nombre_negocio, usuarios ( nombre ) ),
        items_pedido ( id, cantidad, productos ( sku, nombre ) )
      `)
      .order('created_at', { ascending: false })

    const enriched = (data ?? []).map(p => ({
      ...p,
      cliente_nombre: p.clientes?.nombre_negocio ?? p.clientes?.usuarios?.nombre ?? '—',
    }))

    setPedidos(enriched)
    setLoading(false)
  }, [])

  useEffect(() => { cargar() }, [cargar])

  function onActualizado() { setGestion(null); cargar() }

  const activos = ['recibido', 'en_proceso', 'despachado', 'devuelto']
  const pedidosFiltrados = pedidos.filter(p =>
    filtro === 'todos'    ? true :
    filtro === 'activos'  ? activos.includes(p.estado) :
    p.estado === filtro
  )

  const counts = {
    recibido:   pedidos.filter(p => p.estado === 'recibido').length,
    en_proceso: pedidos.filter(p => p.estado === 'en_proceso').length,
    despachado: pedidos.filter(p => p.estado === 'despachado').length,
    devuelto:   pedidos.filter(p => p.estado === 'devuelto').length,
  }

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Panel Operativo</h1>
          <p className="text-gray-500 text-sm">Gestión de pedidos P-Box</p>
        </div>
        {pedidos.length > 0 && (
          <button
            onClick={() => exportarPedidos(pedidosFiltrados)}
            className="px-4 py-2 text-sm border border-gray-200 text-gray-600 rounded-lg hover:bg-gray-50 transition-colors"
          >
            ↓ Exportar Excel
          </button>
        )}
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-4 gap-4 mb-8">
        <KpiCard label="Recibidos (pendientes)"  value={counts.recibido}   variant="blue"   />
        <KpiCard label="En proceso"              value={counts.en_proceso} variant="yellow" />
        <KpiCard label="Despachados (en ruta)"   value={counts.despachado} variant="default"/>
        <KpiCard label="Devueltos"               value={counts.devuelto}   variant="red"    />
      </div>

      {/* Filtros */}
      <div className="flex gap-2 flex-wrap mb-5">
        {FILTROS.map(f => {
          const count = f.key === 'activos'
            ? counts.recibido + counts.en_proceso + counts.despachado
            : f.key === 'todos' ? pedidos.length
            : pedidos.filter(p => p.estado === f.key).length
          return (
            <button
              key={f.key}
              onClick={() => setFiltro(f.key)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                filtro === f.key
                  ? 'bg-brand-700 text-white'
                  : 'bg-white border border-gray-200 text-gray-500 hover:border-gray-300'
              }`}
            >
              {f.label}
              {count > 0 && (
                <span className={`ml-1.5 ${filtro === f.key ? 'opacity-75' : 'text-gray-400'}`}>
                  {count}
                </span>
              )}
            </button>
          )
        })}
      </div>

      {/* Tabla */}
      {loading ? (
        <div className="text-center py-16 text-gray-400 text-sm">Cargando pedidos…</div>
      ) : pedidosFiltrados.length === 0 ? (
        <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
          <p className="text-gray-400 text-sm">No hay pedidos en esta categoría.</p>
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-200 bg-gray-50">
                {['N° Pedido', 'Cliente', 'Destinatario', 'Ciudad', 'Productos', 'Fecha', 'Estado', ''].map(h => (
                  <th key={h} className="px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide text-left">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {pedidosFiltrados.map(p => {
                const fecha = new Date(p.created_at).toLocaleDateString('es-EC', {
                  day: '2-digit', month: 'short',
                })
                const totalU = p.items_pedido?.reduce((s, i) => s + i.cantidad, 0) ?? 0
                const skus   = p.items_pedido?.map(i => i.productos?.sku).filter(Boolean).join(', ')
                const dest   = [p.destinatario_nombre, p.destinatario_apellido].filter(Boolean).join(' ')
                return (
                  <tr key={p.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-4 py-3 font-mono text-xs text-gray-500">{p.numero_pedido}</td>
                    <td className="px-4 py-3">
                      <p className="font-medium text-gray-900">{p.cliente_nombre}</p>
                    </td>
                    <td className="px-4 py-3">
                      <p className="text-gray-700">{dest || '—'}</p>
                      {p.destinatario_telefono && (
                        <p className="text-xs text-gray-400">{p.destinatario_telefono}</p>
                      )}
                    </td>
                    <td className="px-4 py-3 text-xs text-gray-500">{p.ciudad_entrega || '—'}</td>
                    <td className="px-4 py-3">
                      <p className="text-gray-700">{totalU} u.</p>
                      {skus && <p className="text-xs text-gray-400 truncate max-w-[120px]">{skus}</p>}
                    </td>
                    <td className="px-4 py-3 text-xs text-gray-400 whitespace-nowrap">{fecha}</td>
                    <td className="px-4 py-3"><EstadoBadge estado={p.estado} /></td>
                    <td className="px-4 py-3 text-right">
                      <button
                        onClick={() => setGestion(p)}
                        className="px-3 py-1 text-xs text-brand-600 hover:bg-brand-50 rounded-lg transition-colors font-medium"
                      >
                        Gestionar →
                      </button>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
          <div className="px-4 py-3 border-t border-gray-100 bg-gray-50 text-xs text-gray-400">
            {pedidosFiltrados.length} pedido{pedidosFiltrados.length !== 1 ? 's' : ''}
          </div>
        </div>
      )}

      {gestion && (
        <ModalGestionPedido
          pedido={gestion}
          onClose={() => setGestion(null)}
          onActualizado={onActualizado}
        />
      )}
    </div>
  )
}
