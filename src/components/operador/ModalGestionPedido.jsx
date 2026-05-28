import { useState } from 'react'
import { supabase } from '@/supabase/client'
import { alertaPedido } from '@/utils/alertas'

const ESTADOS = {
  recibido:   { label: 'Recibido',   bg: 'bg-blue-100',   text: 'text-blue-700'   },
  en_proceso: { label: 'En proceso', bg: 'bg-yellow-100', text: 'text-yellow-700' },
  despachado: { label: 'Despachado', bg: 'bg-purple-100', text: 'text-purple-700' },
  entregado:  { label: 'Entregado',  bg: 'bg-green-100',  text: 'text-green-700'  },
  devuelto:   { label: 'Devuelto',   bg: 'bg-orange-100', text: 'text-orange-700' },
  cancelado:  { label: 'Cancelado',  bg: 'bg-red-100',    text: 'text-red-600'    },
}

// Avance normal del flujo
const AVANCE = {
  recibido:   { siguiente: 'en_proceso', btnLabel: 'Marcar en proceso'  },
  en_proceso: { siguiente: 'despachado', btnLabel: 'Registrar despacho' },
  despachado: { siguiente: 'entregado',  btnLabel: 'Confirmar entrega'  },
}

// Retroceso posible por estado
const RETROCESO = {
  en_proceso: { anterior: 'recibido',   btnLabel: 'Volver a Recibido'    },
  despachado: { anterior: 'en_proceso', btnLabel: 'Volver a En proceso'  },
}

function EstadoBadge({ estado }) {
  const s = ESTADOS[estado] ?? { label: estado, bg: 'bg-gray-100', text: 'text-gray-600' }
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

const inp = 'w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent'
const lbl = 'block text-xs font-medium text-gray-600 mb-1'

export default function ModalGestionPedido({ pedido, onClose, onActualizado }) {
  const [saving, setSaving]     = useState(false)
  const [despachoForm, setDespachoForm] = useState({
    courrier: pedido?.courrier ?? '',
    numero_guia: pedido?.numero_guia ?? '',
    tracking_url: pedido?.tracking_url ?? '',
  })

  if (!pedido) return null

  const accion    = AVANCE[pedido.estado]
  const retroceso = RETROCESO[pedido.estado]
  const puedeDevolver  = pedido.estado === 'despachado'
  const puedeCancelar  = !['entregado', 'cancelado', 'devuelto'].includes(pedido.estado)

  const nombreCompleto = [pedido.destinatario_nombre, pedido.destinatario_apellido].filter(Boolean).join(' ')
  const fecha = new Date(pedido.created_at).toLocaleDateString('es-EC', {
    day: '2-digit', month: 'short', year: 'numeric',
  })

  async function cambiarEstado(nuevoEstado) {
    setSaving(true)
    const updates = { estado: nuevoEstado }

    if (nuevoEstado === 'despachado') {
      if (!despachoForm.courrier || !despachoForm.numero_guia) {
        alert('Ingresa el courrier y número de guía antes de despachar.')
        setSaving(false)
        return
      }
      Object.assign(updates, despachoForm)
    }

    const estadoAnterior = pedido.estado
    const { error } = await supabase
      .from('pedidos')
      .update(updates)
      .eq('id', pedido.id)

    setSaving(false)
    if (error) { alert(error.message); return }

    // Alerta de cambio de estado en background — no bloquea el flujo
    alertaPedido(pedido.id, estadoAnterior, nuevoEstado)

    onActualizado()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-start justify-between px-6 py-4 border-b border-gray-200">
          <div>
            <p className="text-xs text-gray-400 mb-0.5">{pedido.cliente_nombre} · {fecha}</p>
            <h2 className="font-bold text-gray-900 text-lg">{pedido.numero_pedido}</h2>
            <a
              href={`/track/${pedido.numero_pedido}`}
              target="_blank"
              rel="noreferrer"
              className="text-xs text-brand-500 hover:underline"
            >
              Ver tracking público →
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
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100">
                  <th className="text-left text-xs text-gray-400 font-medium pb-1">SKU</th>
                  <th className="text-left text-xs text-gray-400 font-medium pb-1">Nombre</th>
                  <th className="text-right text-xs text-gray-400 font-medium pb-1">Cant.</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {pedido.items_pedido?.map(it => (
                  <tr key={it.id}>
                    <td className="py-2 font-mono text-xs text-gray-400">{it.productos?.sku}</td>
                    <td className="py-2 text-gray-700">{it.productos?.nombre}</td>
                    <td className="py-2 text-right font-semibold text-gray-900">{it.cantidad}</td>
                  </tr>
                ))}
              </tbody>
            </table>
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
              <Row label="Dirección"     value={pedido.direccion_entrega} />
              <Row label="N° casa/dpto"  value={pedido.numero_casa} />
              <Row label="Ciudad"        value={[pedido.ciudad_entrega, pedido.provincia_entrega].filter(Boolean).join(', ')} />
              <Row label="Referencias"   value={pedido.referencias_entrega} />
            </div>
          </div>

          {/* Notas */}
          {pedido.notas && (
            <div>
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-1">Notas del cliente</p>
              <p className="text-sm text-gray-600">{pedido.notas}</p>
            </div>
          )}

          {/* Tracking existente (solo lectura si ya está despachado/entregado) */}
          {pedido.estado === 'despachado' || pedido.estado === 'entregado' || pedido.estado === 'devuelto' ? (
            (pedido.numero_guia || pedido.tracking_url) && (
              <div>
                <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">Tracking</p>
                <div className="bg-gray-50 rounded-xl px-4 py-3 space-y-1">
                  <Row label="Courrier" value={pedido.courrier} />
                  <Row label="Guía"     value={pedido.numero_guia} />
                  {pedido.tracking_url && (
                    <a href={pedido.tracking_url} target="_blank" rel="noreferrer"
                      className="text-brand-600 hover:underline text-xs block ml-[7.5rem]">
                      Ver tracking →
                    </a>
                  )}
                </div>
              </div>
            )
          ) : null}

          {/* Formulario de despacho (solo cuando está en_proceso) */}
          {pedido.estado === 'en_proceso' && (
            <div>
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3">Datos de despacho</p>
              <div className="space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className={lbl}>Courrier *</label>
                    <select value={despachoForm.courrier}
                      onChange={e => setDespachoForm(f => ({ ...f, courrier: e.target.value }))}
                      className={inp}>
                      <option value="">Seleccionar…</option>
                      <option>Servientrega</option>
                      <option>Tramaco</option>
                      <option>Speed</option>
                      <option>Laar Courier</option>
                      <option>Correos del Ecuador</option>
                      <option>Otro</option>
                    </select>
                  </div>
                  <div>
                    <label className={lbl}>N° de guía *</label>
                    <input value={despachoForm.numero_guia}
                      onChange={e => setDespachoForm(f => ({ ...f, numero_guia: e.target.value }))}
                      className={inp} placeholder="123456789" />
                  </div>
                </div>
                <div>
                  <label className={lbl}>URL de tracking</label>
                  <input value={despachoForm.tracking_url}
                    onChange={e => setDespachoForm(f => ({ ...f, tracking_url: e.target.value }))}
                    className={inp} placeholder="https://… (opcional)" />
                </div>
              </div>
            </div>
          )}

          {/* Acciones */}
          {(accion || retroceso || puedeDevolver || puedeCancelar) && (
            <div className="pt-2 border-t border-gray-100 space-y-2">
              {/* Fila principal: retroceder + avanzar */}
              <div className="flex items-center justify-between gap-2">
                <div className="flex gap-2">
                  {retroceso && (
                    <button onClick={() => cambiarEstado(retroceso.anterior)} disabled={saving}
                      className="px-3 py-2 text-xs text-gray-500 border border-gray-200 hover:bg-gray-50 rounded-lg transition-colors disabled:opacity-50">
                      ← {retroceso.btnLabel}
                    </button>
                  )}
                </div>
                {accion && (
                  <button onClick={() => cambiarEstado(accion.siguiente)} disabled={saving}
                    className="px-4 py-2 text-sm bg-brand-600 text-white rounded-lg hover:bg-brand-700 disabled:opacity-50 transition-colors font-medium">
                    {saving ? 'Guardando…' : accion.btnLabel}
                  </button>
                )}
              </div>

              {/* Fila secundaria: devolución + cancelación */}
              {(puedeDevolver || puedeCancelar) && (
                <div className="flex gap-2 pt-1">
                  {puedeDevolver && (
                    <button onClick={() => cambiarEstado('devuelto')} disabled={saving}
                      className="px-3 py-2 text-xs text-orange-600 border border-orange-200 hover:bg-orange-50 rounded-lg transition-colors disabled:opacity-50">
                      Devuelto por courier
                    </button>
                  )}
                  {puedeCancelar && (
                    <button onClick={() => {
                      if (!confirm('¿Cancelar este pedido?')) return
                      cambiarEstado('cancelado')
                    }} disabled={saving}
                      className="px-3 py-2 text-xs text-red-500 border border-red-200 hover:bg-red-50 rounded-lg transition-colors disabled:opacity-50">
                      Cancelar pedido
                    </button>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
