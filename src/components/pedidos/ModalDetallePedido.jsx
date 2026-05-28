import { useState } from 'react'
import { supabase } from '@/supabase/client'

const ESTADO_LABEL = {
  recibido:   { label: 'Recibido',    bg: 'bg-blue-100',   text: 'text-blue-700'   },
  en_proceso: { label: 'En proceso',  bg: 'bg-yellow-100', text: 'text-yellow-700' },
  despachado: { label: 'Despachado',  bg: 'bg-purple-100', text: 'text-purple-700' },
  entregado:  { label: 'Entregado',   bg: 'bg-green-100',  text: 'text-green-700'  },
  cancelado:  { label: 'Cancelado',   bg: 'bg-red-100',    text: 'text-red-600'    },
}

function EstadoBadge({ estado }) {
  const s = ESTADO_LABEL[estado] ?? { label: estado, bg: 'bg-gray-100', text: 'text-gray-600' }
  return (
    <span className={`inline-flex px-2.5 py-1 rounded-full text-xs font-semibold ${s.bg} ${s.text}`}>
      {s.label}
    </span>
  )
}

function Row({ label, value }) {
  if (!value) return null
  return (
    <div className="flex gap-2">
      <span className="text-gray-400 text-xs w-28 shrink-0 pt-0.5">{label}</span>
      <span className="text-sm text-gray-700">{value}</span>
    </div>
  )
}

export default function ModalDetallePedido({ pedido, onClose, onActualizado }) {
  const [uploading, setUploading]   = useState(false)
  const [canceling, setCanceling]   = useState(false)
  const [facturaUrl, setFacturaUrl] = useState(pedido?.factura_url ?? null)

  const puedeCancelar = ['recibido', 'en_proceso'].includes(pedido?.estado)

  async function cancelarPedido() {
    if (!confirm('¿Cancelar este pedido? El stock será restaurado automáticamente.')) return
    setCanceling(true)
    const { error } = await supabase.from('pedidos').update({ estado: 'cancelado' }).eq('id', pedido.id)
    setCanceling(false)
    if (error) { alert(error.message); return }
    onActualizado?.()
    onClose()
  }

  if (!pedido) return null

  const fecha = new Date(pedido.created_at).toLocaleDateString('es-EC', {
    day: '2-digit', month: 'short', year: 'numeric',
  })

  const nombreCompleto = [pedido.destinatario_nombre, pedido.destinatario_apellido]
    .filter(Boolean).join(' ')

  const direccionCompleta = [
    pedido.direccion_entrega,
    pedido.numero_casa,
    pedido.ciudad_entrega,
    pedido.provincia_entrega,
  ].filter(Boolean).join(', ')

  async function subirFactura(e) {
    const file = e.target.files?.[0]
    if (!file) return
    setUploading(true)
    const path = `facturas/${pedido.id}/${file.name}`
    const { error: upErr } = await supabase.storage
      .from('pedidos-docs')
      .upload(path, file, { upsert: true })

    if (upErr) { alert('Error al subir: ' + upErr.message); setUploading(false); return }

    const { data: { publicUrl } } = supabase.storage.from('pedidos-docs').getPublicUrl(path)
    await supabase.from('pedidos').update({ factura_url: publicUrl }).eq('id', pedido.id)
    setFacturaUrl(publicUrl)
    setUploading(false)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-start justify-between px-6 py-4 border-b border-gray-200">
          <div>
            <p className="text-xs text-gray-400 mb-0.5">{fecha}</p>
            <h2 className="font-bold text-gray-900 text-lg">{pedido.numero_pedido}</h2>
            <a
              href={`/track/${pedido.numero_pedido}`}
              target="_blank"
              rel="noreferrer"
              className="text-xs text-brand-500 hover:underline"
            >
              Compartir link de tracking →
            </a>
          </div>
          <div className="flex items-center gap-3">
            <EstadoBadge estado={pedido.estado} />
            <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-2xl leading-none">&times;</button>
          </div>
        </div>

        <div className="p-6 space-y-5">
          {/* Productos */}
          <div>
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">Productos</p>
            {pedido.items_pedido?.length > 0 ? (
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-100">
                    <th className="text-left text-xs text-gray-400 font-medium pb-1">SKU</th>
                    <th className="text-left text-xs text-gray-400 font-medium pb-1">Nombre</th>
                    <th className="text-right text-xs text-gray-400 font-medium pb-1">Cant.</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {pedido.items_pedido.map(it => (
                    <tr key={it.id}>
                      <td className="py-2 font-mono text-xs text-gray-400">{it.productos?.sku ?? '—'}</td>
                      <td className="py-2 text-gray-700">{it.productos?.nombre ?? '—'}</td>
                      <td className="py-2 text-right font-semibold text-gray-900">{it.cantidad}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <p className="text-xs text-gray-400">Sin productos registrados.</p>
            )}
          </div>

          {/* Destinatario */}
          <div>
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">Destinatario</p>
            <div className="bg-gray-50 rounded-xl px-4 py-3 space-y-1.5">
              <Row label="Nombre"        value={nombreCompleto} />
              <Row label="Cédula"        value={pedido.destinatario_cedula} />
              <Row label="Teléfono 1"    value={pedido.destinatario_telefono} />
              <Row label="Teléfono 2"    value={pedido.destinatario_telefono2} />
              <Row label="Email"         value={pedido.destinatario_email} />
              <Row label="Persona recibe" value={
                pedido.notas?.startsWith('Recibe:')
                  ? pedido.notas.split('Recibe: ')[1]?.split(' | ')[0]
                  : null
              } />
            </div>
          </div>

          {/* Dirección */}
          <div>
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">Dirección de entrega</p>
            <div className="bg-gray-50 rounded-xl px-4 py-3 space-y-1.5">
              <Row label="Dirección"    value={pedido.direccion_entrega} />
              <Row label="N° casa/dpto" value={pedido.numero_casa} />
              <Row label="Ciudad"       value={pedido.ciudad_entrega} />
              <Row label="Provincia"    value={pedido.provincia_entrega} />
              <Row label="Referencias"  value={pedido.referencias_entrega} />
            </div>
          </div>

          {/* Tracking */}
          {(pedido.numero_guia || pedido.tracking_url) && (
            <div>
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">Tracking</p>
              <div className="bg-gray-50 rounded-xl px-4 py-3 space-y-1">
                {pedido.courrier    && <p className="text-xs text-gray-400">{pedido.courrier}</p>}
                {pedido.numero_guia && <p className="font-mono text-sm text-gray-700">{pedido.numero_guia}</p>}
                {pedido.tracking_url && (
                  <a href={pedido.tracking_url} target="_blank" rel="noreferrer"
                    className="text-brand-600 hover:underline text-xs block">
                    Ver tracking →
                  </a>
                )}
              </div>
            </div>
          )}

          {/* Notas */}
          {pedido.notas && !pedido.notas.startsWith('Recibe:') && (
            <div>
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-1">Notas</p>
              <p className="text-sm text-gray-600">
                {pedido.notas.includes(' | ') ? pedido.notas.split(' | ').find(n => !n.startsWith('Recibe:')) : pedido.notas}
              </p>
            </div>
          )}

          {/* Cancelar pedido */}
          {puedeCancelar && (
            <div className="pt-2 border-t border-gray-100">
              <button onClick={cancelarPedido} disabled={canceling}
                className="px-3 py-2 text-sm text-red-500 border border-red-200 hover:bg-red-50 rounded-lg transition-colors disabled:opacity-50">
                {canceling ? 'Cancelando…' : 'Cancelar pedido'}
              </button>
              <p className="text-xs text-gray-400 mt-1">
                Solo disponible mientras el pedido no haya sido despachado.
              </p>
            </div>
          )}

          {/* Factura */}
          <div>
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">Factura</p>
            {facturaUrl ? (
              <div className="flex items-center justify-between bg-gray-50 rounded-xl px-4 py-3">
                <a href={facturaUrl} target="_blank" rel="noreferrer"
                  className="text-brand-600 hover:underline text-sm">Ver factura →</a>
                <label className="text-xs text-gray-400 cursor-pointer hover:text-gray-600">
                  Cambiar
                  <input type="file" accept=".pdf,.jpg,.jpeg,.png" className="hidden" onChange={subirFactura} />
                </label>
              </div>
            ) : (
              <label className={`flex items-center justify-center gap-2 border-2 border-dashed border-gray-200 rounded-xl px-4 py-4 cursor-pointer hover:border-brand-300 transition-colors ${uploading ? 'opacity-50 pointer-events-none' : ''}`}>
                <span className="text-sm text-gray-400">
                  {uploading ? 'Subiendo…' : '+ Subir factura (PDF o imagen)'}
                </span>
                <input type="file" accept=".pdf,.jpg,.jpeg,.png" className="hidden" onChange={subirFactura} />
              </label>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
