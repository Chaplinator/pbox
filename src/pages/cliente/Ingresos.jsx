import { useState, useEffect, useCallback } from 'react'
import { useAuth } from '@/context/AuthContext'
import { supabase } from '@/supabase/client'

const ESTADO_STYLE = {
  pendiente:  { bg: 'bg-yellow-100', text: 'text-yellow-700', label: 'Pendiente'  },
  recibido:   { bg: 'bg-green-100',  text: 'text-green-700',  label: 'Recibido'   },
  parcial:    { bg: 'bg-orange-100', text: 'text-orange-600', label: 'Parcial'    },
  rechazado:  { bg: 'bg-red-100',    text: 'text-red-600',    label: 'Rechazado'  },
}

const inp = 'w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent'

function EstadoBadge({ estado }) {
  const s = ESTADO_STYLE[estado] ?? { bg:'bg-gray-100', text:'text-gray-500', label: estado }
  return <span className={`inline-flex px-2.5 py-0.5 rounded-full text-xs font-semibold ${s.bg} ${s.text}`}>{s.label}</span>
}

function ModalNuevoIngreso({ open, onClose, clienteId, onSaved }) {
  const [productos, setProductos]   = useState([])
  const [items, setItems]           = useState([{ producto_id: '', cantidad_enviada: 1 }])
  const [notas, setNotas]           = useState('')
  const [saving, setSaving]         = useState(false)
  const [error, setError]           = useState('')

  useEffect(() => {
    if (!open || !clienteId) return
    setItems([{ producto_id: '', cantidad_enviada: 1 }])
    setNotas(''); setError('')
    supabase.from('vista_inventario').select('producto_id, sku, nombre')
      .eq('cliente_id', clienteId).eq('activo', true).order('nombre')
      .then(({ data }) => setProductos(data ?? []))
  }, [open, clienteId])

  function setItem(i, field, val) {
    setItems(p => p.map((it, idx) => idx === i ? { ...it, [field]: val } : it))
  }

  async function guardar(e) {
    e.preventDefault()
    if (items.some(it => !it.producto_id)) { setError('Selecciona un producto en cada fila.'); return }
    setSaving(true); setError('')

    const numero = `ING-${Date.now().toString(36).toUpperCase()}`

    const { data: ingreso, error: e1 } = await supabase
      .from('ingresos_inventario')
      .insert({ cliente_id: clienteId, numero, notas: notas || null })
      .select('id').single()

    if (e1) { setError(e1.message); setSaving(false); return }

    const { error: e2 } = await supabase.from('items_ingreso').insert(
      items.map(it => ({
        ingreso_id:       ingreso.id,
        producto_id:      it.producto_id,
        cantidad_enviada: Number(it.cantidad_enviada),
      }))
    )

    setSaving(false)
    if (e2) { setError(e2.message); return }
    onSaved()
  }

  if (!open) return null
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
          <h2 className="font-semibold text-gray-900">Notificar ingreso de productos</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-2xl leading-none">&times;</button>
        </div>
        <form onSubmit={guardar} className="p-6 space-y-4">
          <p className="text-sm text-gray-500">
            Indica los productos y cantidades que estás enviando a P-Box. El equipo confirmará la recepción física.
          </p>
          <div className="space-y-2">
            {items.map((it, i) => (
              <div key={i} className="flex gap-2 items-start">
                <div className="flex-1">
                  <select value={it.producto_id}
                    onChange={e => setItem(i, 'producto_id', e.target.value)}
                    className={inp} required>
                    <option value="">Seleccionar producto…</option>
                    {productos.map(p => (
                      <option key={p.producto_id} value={p.producto_id}>
                        {p.sku} — {p.nombre}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="w-24">
                  <input type="number" min="1" value={it.cantidad_enviada}
                    onChange={e => setItem(i, 'cantidad_enviada', e.target.value)}
                    className={inp} required />
                </div>
                {items.length > 1 && (
                  <button type="button"
                    onClick={() => setItems(p => p.filter((_, idx) => idx !== i))}
                    className="mt-1 text-gray-300 hover:text-red-400 text-xl leading-none">×</button>
                )}
              </div>
            ))}
          </div>
          <button type="button"
            onClick={() => setItems(p => [...p, { producto_id: '', cantidad_enviada: 1 }])}
            className="text-xs text-brand-600 hover:underline font-medium">
            + Agregar otro producto
          </button>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Notas para P-Box</label>
            <textarea value={notas} onChange={e => setNotas(e.target.value)} rows={2}
              className={inp + ' resize-none'} placeholder="Embalaje, fecha estimada de envío, etc." />
          </div>
          {error && <p className="text-sm text-red-600 bg-red-50 px-3 py-2 rounded-lg">{error}</p>}
          <div className="flex justify-end gap-2 pt-1">
            <button type="button" onClick={onClose}
              className="px-4 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded-lg transition-colors">
              Cancelar
            </button>
            <button type="submit" disabled={saving}
              className="px-4 py-2 text-sm bg-brand-600 text-white rounded-lg hover:bg-brand-700 disabled:opacity-50 transition-colors">
              {saving ? 'Enviando…' : 'Notificar ingreso'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

export default function Ingresos() {
  const { perfil } = useAuth()
  const [clienteId, setClienteId]   = useState(null)
  const [ingresos, setIngresos]     = useState([])
  const [loading, setLoading]       = useState(true)
  const [modalOpen, setModalOpen]   = useState(false)
  const [expandido, setExpandido]   = useState(null)

  useEffect(() => {
    if (!perfil) return
    supabase.from('clientes').select('id').eq('usuario_id', perfil.id).single()
      .then(({ data }) => { if (data) setClienteId(data.id) })
  }, [perfil])

  const cargar = useCallback(async () => {
    if (!clienteId) return
    setLoading(true)
    const { data } = await supabase
      .from('ingresos_inventario')
      .select(`*, items_ingreso(cantidad_enviada, cantidad_recibida, productos(nombre, sku))`)
      .eq('cliente_id', clienteId)
      .order('created_at', { ascending: false })
    setIngresos(data ?? [])
    setLoading(false)
  }, [clienteId])

  useEffect(() => { cargar() }, [cargar])

  return (
    <div className="p-8">
      <div className="mb-6 flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Ingreso de inventario</h1>
          <p className="text-gray-500 text-sm mt-0.5">Notifica a P-Box cuando envíes productos para almacenamiento</p>
        </div>
        <button onClick={() => setModalOpen(true)}
          className="px-4 py-2 text-sm bg-brand-600 text-white rounded-lg hover:bg-brand-700 transition-colors font-medium">
          + Notificar ingreso
        </button>
      </div>

      {loading ? (
        <div className="text-center py-16 text-gray-400 text-sm">Cargando…</div>
      ) : ingresos.length === 0 ? (
        <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
          <p className="text-gray-400 text-sm">Aún no has notificado ningún ingreso.</p>
          <button onClick={() => setModalOpen(true)}
            className="mt-4 px-4 py-2 text-sm bg-brand-600 text-white rounded-lg hover:bg-brand-700 transition-colors">
            Notificar mi primer ingreso
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          {ingresos.map(ing => {
            const fecha = new Date(ing.created_at).toLocaleDateString('es-EC', { day:'2-digit', month:'short', year:'numeric' })
            const open  = expandido === ing.id
            return (
              <div key={ing.id} className="bg-white rounded-xl border border-gray-200 overflow-hidden">
                <button
                  onClick={() => setExpandido(open ? null : ing.id)}
                  className="w-full flex items-center justify-between px-5 py-4 hover:bg-gray-50 transition-colors text-left"
                >
                  <div className="flex items-center gap-4">
                    <span className="font-mono text-xs text-gray-400">{ing.numero}</span>
                    <EstadoBadge estado={ing.estado} />
                    <span className="text-sm text-gray-600">{ing.items_ingreso?.length} producto(s)</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-xs text-gray-400">{fecha}</span>
                    <span className="text-gray-300">{open ? '▲' : '▼'}</span>
                  </div>
                </button>
                {open && (
                  <div className="px-5 pb-4 border-t border-gray-100">
                    <table className="w-full text-sm mt-3">
                      <thead>
                        <tr className="text-xs text-gray-400">
                          <th className="text-left pb-2">Producto</th>
                          <th className="text-left pb-2">SKU</th>
                          <th className="text-right pb-2">Enviado</th>
                          <th className="text-right pb-2">Recibido</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-50">
                        {ing.items_ingreso?.map((it, i) => (
                          <tr key={i}>
                            <td className="py-2 text-gray-700">{it.productos?.nombre}</td>
                            <td className="py-2 font-mono text-xs text-gray-400">{it.productos?.sku}</td>
                            <td className="py-2 text-right text-gray-600">{it.cantidad_enviada}</td>
                            <td className="py-2 text-right font-semibold">
                              {it.cantidad_recibida != null
                                ? <span className="text-green-600">{it.cantidad_recibida}</span>
                                : <span className="text-gray-300">—</span>
                              }
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                    {ing.notas && (
                      <p className="mt-3 text-xs text-gray-500 bg-gray-50 rounded-lg px-3 py-2">{ing.notas}</p>
                    )}
                    {ing.recibido_at && (
                      <p className="mt-2 text-xs text-gray-400">
                        Confirmado el {new Date(ing.recibido_at).toLocaleDateString('es-EC', { day:'2-digit', month:'short', year:'numeric' })}
                      </p>
                    )}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}

      <ModalNuevoIngreso
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        clienteId={clienteId}
        onSaved={() => { setModalOpen(false); cargar() }}
      />
    </div>
  )
}
