import { useEffect, useState, useCallback } from 'react'
import { useAuth } from '@/context/AuthContext'
import { supabase } from '@/supabase/client'
import ModalNuevoPedido from '@/components/pedidos/ModalNuevoPedido'
import ModalDetallePedido from '@/components/pedidos/ModalDetallePedido'

const ESTADOS = [
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

function EstadoBadge({ estado }) {
  const s = ESTADO_STYLE[estado] ?? { bg: 'bg-gray-100', text: 'text-gray-600' }
  const label = ESTADOS.find(e => e.key === estado)?.label ?? estado
  return (
    <span className={`inline-flex px-2.5 py-0.5 rounded-full text-xs font-semibold ${s.bg} ${s.text}`}>
      {label}
    </span>
  )
}

export default function Pedidos() {
  const { perfil } = useAuth()
  const [clienteId, setClienteId]     = useState(null)
  const [pedidos, setPedidos]         = useState([])
  const [loading, setLoading]         = useState(true)
  const [filtro, setFiltro]           = useState('todos')
  const [modalNuevo, setModalNuevo]   = useState(false)
  const [detalle, setDetalle]         = useState(null)

  useEffect(() => {
    if (!perfil) return
    supabase.from('clientes').select('id').eq('usuario_id', perfil.id).single()
      .then(({ data }) => setClienteId(data?.id ?? null))
  }, [perfil])

  const cargar = useCallback(async () => {
    if (!clienteId) return
    setLoading(true)
    const { data } = await supabase
      .from('pedidos')
      .select(`
        id, numero_pedido, estado, created_at, updated_at,
        destinatario_nombre, destinatario_apellido, destinatario_cedula,
        destinatario_telefono, destinatario_telefono2, destinatario_email,
        direccion_entrega, numero_casa, referencias_entrega,
        ciudad_entrega, provincia_entrega,
        courrier, numero_guia, tracking_url, factura_url, notas,
        items_pedido (
          id, cantidad,
          productos ( sku, nombre )
        )
      `)
      .eq('cliente_id', clienteId)
      .order('created_at', { ascending: false })

    setPedidos(data ?? [])
    setLoading(false)
  }, [clienteId])

  useEffect(() => { cargar() }, [cargar])

  function onNuevoGuardado() { setModalNuevo(false); cargar() }

  const pedidosFiltrados = filtro === 'todos'
    ? pedidos
    : pedidos.filter(p => p.estado === filtro)

  const counts = ESTADOS.reduce((acc, e) => {
    acc[e.key] = e.key === 'todos' ? pedidos.length : pedidos.filter(p => p.estado === e.key).length
    return acc
  }, {})

  if (!clienteId && !loading) return (
    <div className="p-8">
      <h1 className="text-2xl font-bold text-gray-900 mb-4">Mis Pedidos</h1>
      <p className="text-gray-500 text-sm">Completa tu perfil de negocio para gestionar pedidos.</p>
    </div>
  )

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Mis Pedidos</h1>
          <p className="text-gray-500 text-sm">Historial y estado de tus órdenes de despacho</p>
        </div>
        <button
          onClick={() => setModalNuevo(true)}
          className="bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-800 transition-colors"
        >
          + Nuevo pedido
        </button>
      </div>

      {/* Filtros por estado */}
      <div className="flex gap-2 flex-wrap mb-6">
        {ESTADOS.map(e => (
          <button
            key={e.key}
            onClick={() => setFiltro(e.key)}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
              filtro === e.key
                ? 'bg-blue-700 text-white'
                : 'bg-white border border-gray-200 text-gray-500 hover:border-gray-300'
            }`}
          >
            {e.label}
            {counts[e.key] > 0 && (
              <span className={`ml-1.5 ${filtro === e.key ? 'opacity-75' : 'text-gray-400'}`}>
                {counts[e.key]}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Lista */}
      {loading ? (
        <div className="text-center py-16 text-gray-400 text-sm">Cargando pedidos…</div>
      ) : pedidosFiltrados.length === 0 ? (
        <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
          {pedidos.length === 0 ? (
            <>
              <p className="text-gray-700 font-medium mb-1">Aún no tienes pedidos</p>
              <p className="text-gray-400 text-sm mb-4">Crea tu primer pedido de despacho.</p>
              <button
                onClick={() => setModalNuevo(true)}
                className="bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-800 transition-colors"
              >
                + Nuevo pedido
              </button>
            </>
          ) : (
            <p className="text-gray-400 text-sm">
              No hay pedidos con estado "{ESTADOS.find(e => e.key === filtro)?.label}".
            </p>
          )}
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-200 bg-gray-50">
                {['N° Pedido', 'Fecha', 'Destinatario', 'Ciudad', 'Productos', 'Estado', ''].map(h => (
                  <th key={h} className="px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide text-left">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {pedidosFiltrados.map(p => {
                const fecha = new Date(p.created_at).toLocaleDateString('es-EC', {
                  day: '2-digit', month: 'short', year: 'numeric',
                })
                const totalItems = p.items_pedido?.reduce((s, i) => s + i.cantidad, 0) ?? 0
                const skus = p.items_pedido?.map(i => i.productos?.sku).filter(Boolean).join(', ')
                return (
                  <tr key={p.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-4 py-3 font-mono text-xs text-gray-500">{p.numero_pedido}</td>
                    <td className="px-4 py-3 text-gray-500 text-xs whitespace-nowrap">{fecha}</td>
                    <td className="px-4 py-3">
                      <p className="font-medium text-gray-900">{p.destinatario_nombre}</p>
                      {p.destinatario_telefono && (
                        <p className="text-xs text-gray-400">{p.destinatario_telefono}</p>
                      )}
                    </td>
                    <td className="px-4 py-3 text-gray-500 text-xs">{p.ciudad_entrega || '—'}</td>
                    <td className="px-4 py-3">
                      <p className="text-gray-700">{totalItems} u.</p>
                      {skus && <p className="text-xs text-gray-400 truncate max-w-[140px]">{skus}</p>}
                    </td>
                    <td className="px-4 py-3"><EstadoBadge estado={p.estado} /></td>
                    <td className="px-4 py-3 text-right">
                      <button
                        onClick={() => setDetalle(p)}
                        className="px-3 py-1 text-xs text-blue-600 hover:bg-blue-50 rounded-lg transition-colors font-medium"
                      >
                        Ver detalle
                      </button>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
          <div className="px-4 py-3 border-t border-gray-100 bg-gray-50 text-xs text-gray-400">
            {pedidosFiltrados.length} pedido{pedidosFiltrados.length !== 1 ? 's' : ''}
            {filtro !== 'todos' && ` con estado "${ESTADOS.find(e => e.key === filtro)?.label}"`}
          </div>
        </div>
      )}

      <ModalNuevoPedido
        open={modalNuevo}
        onClose={() => setModalNuevo(false)}
        clienteId={clienteId}
        onSaved={onNuevoGuardado}
      />

      {detalle && (
        <ModalDetallePedido
          pedido={detalle}
          onClose={() => setDetalle(null)}
          onActualizado={cargar}
        />
      )}
    </div>
  )
}
