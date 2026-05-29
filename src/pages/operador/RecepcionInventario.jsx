import { useState, useEffect, useCallback } from 'react'
import { useAuth } from '@/context/AuthContext'
import { supabase } from '@/supabase/client'
import { alertaM2 } from '@/utils/alertas'
import { useModalState } from '@/hooks/useModalState'

const ESTADO_STYLE = {
  pendiente: { bg: 'bg-yellow-100', text: 'text-yellow-700', label: 'Pendiente' },
  recibido:  { bg: 'bg-green-100',  text: 'text-green-700',  label: 'Recibido'  },
  parcial:   { bg: 'bg-orange-100', text: 'text-orange-600', label: 'Parcial'   },
  rechazado: { bg: 'bg-red-100',    text: 'text-red-600',    label: 'Rechazado' },
}

function EstadoBadge({ estado }) {
  const s = ESTADO_STYLE[estado] ?? { bg:'bg-gray-100', text:'text-gray-500', label: estado }
  return <span className={`inline-flex px-2.5 py-0.5 rounded-full text-xs font-semibold ${s.bg} ${s.text}`}>{s.label}</span>
}

function ModalConfirmar({ ingreso, onClose, onConfirmado }) {
  const [cantidades, setCantidades] = useState({})
  const [saving, setSaving]         = useState(false)
  const [error, setError]           = useState('')

  useEffect(() => {
    if (!ingreso) return
    const init = {}
    ingreso.items_ingreso?.forEach(it => {
      init[it.producto_id] = it.cantidad_enviada
    })
    setCantidades(init)
    setError('')
  }, [ingreso])

  async function confirmar() {
    setSaving(true); setError('')
    const items = Object.entries(cantidades).map(([producto_id, cantidad_recibida]) => ({
      producto_id,
      cantidad_recibida: Number(cantidad_recibida),
    }))

    const { error: err } = await supabase.rpc('confirmar_ingreso', {
      p_ingreso_id: ingreso.id,
      p_items:      items,
    })

    setSaving(false)
    if (err) { setError(err.message); return }
    alertaM2(ingreso.cliente_id)
    onConfirmado()
  }

  if (!ingreso) return null

  const cliente = '—'
  const fecha   = new Date(ingreso.created_at).toLocaleDateString('es-EC', { day:'2-digit', month:'short', year:'numeric' })

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
          <div>
            <p className="text-xs text-gray-400">{cliente} · {fecha}</p>
            <h2 className="font-semibold text-gray-900">{ingreso.numero}</h2>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-2xl leading-none">&times;</button>
        </div>

        <div className="p-6 space-y-5">
          <p className="text-sm text-gray-500">
            Verifica las cantidades recibidas físicamente. Ajusta si difieren de lo declarado por el cliente.
          </p>

          <table className="w-full text-sm">
            <thead>
              <tr className="text-xs text-gray-400 border-b border-gray-100">
                <th className="text-left pb-2">Producto</th>
                <th className="text-right pb-2">Declarado</th>
                <th className="text-right pb-2 text-brand-700">Recibido</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {ingreso.items_ingreso?.map(it => (
                <tr key={it.producto_id}>
                  <td className="py-3">
                    <p className="font-medium text-gray-800">{it.productos?.nombre}</p>
                    <p className="text-xs text-gray-400 font-mono">{it.productos?.sku}</p>
                  </td>
                  <td className="py-3 text-right text-gray-500">{it.cantidad_enviada}</td>
                  <td className="py-3 text-right">
                    <input
                      type="number"
                      min="0"
                      value={cantidades[it.producto_id] ?? ''}
                      onChange={e => setCantidades(c => ({ ...c, [it.producto_id]: e.target.value }))}
                      className="w-20 px-2 py-1 border border-brand-300 rounded-lg text-sm text-right focus:outline-none focus:ring-2 focus:ring-brand-500"
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {ingreso.notas && (
            <div className="bg-yellow-50 rounded-lg px-4 py-3 text-sm text-yellow-800">
              <span className="font-medium">Nota del cliente:</span> {ingreso.notas}
            </div>
          )}

          {error && <p className="text-sm text-red-600 bg-red-50 px-3 py-2 rounded-lg">{error}</p>}

          <div className="flex justify-end gap-2 pt-1">
            <button onClick={onClose}
              className="px-4 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded-lg transition-colors">
              Cancelar
            </button>
            <button onClick={confirmar} disabled={saving}
              className="px-4 py-2 text-sm bg-brand-600 text-white rounded-lg hover:bg-brand-700 disabled:opacity-50 transition-colors font-medium">
              {saving ? 'Confirmando…' : 'Confirmar recepción'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

function ModalEditar({ ingreso, onClose, onActualizado }) {
  const [notas, setNotas] = useState('')
  const { saving, setSaving, error, setError, reset } = useModalState()

  useEffect(() => {
    if (!ingreso) return
    setNotas(ingreso.notas ?? '')
    reset()
  }, [ingreso])

  async function actualizar() {
    setSaving(true); setError('')
    const { error: err } = await supabase
      .from('ingresos_inventario')
      .update({ notas })
      .eq('id', ingreso.id)

    setSaving(false)
    if (err) { setError(err.message); return }
    onActualizado()
  }

  if (!ingreso) return null

  const fecha = new Date(ingreso.created_at).toLocaleDateString('es-EC', { day:'2-digit', month:'short', year:'numeric' })

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
          <div>
            <p className="text-xs text-gray-400">{fecha}</p>
            <h2 className="font-semibold text-gray-900">Editar ingreso {ingreso.numero}</h2>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-2xl leading-none">&times;</button>
        </div>

        <div className="p-6 space-y-5">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Notas internas</label>
            <textarea
              value={notas}
              onChange={e => setNotas(e.target.value)}
              placeholder="Agregar notas sobre este ingreso..."
              rows="4"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent"
            />
          </div>

          {error && <p className="text-sm text-red-600 bg-red-50 px-3 py-2 rounded-lg">{error}</p>}

          <div className="flex justify-end gap-2">
            <button onClick={onClose}
              className="px-4 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded-lg transition-colors">
              Cancelar
            </button>
            <button onClick={actualizar} disabled={saving}
              className="px-4 py-2 text-sm bg-brand-600 text-white rounded-lg hover:bg-brand-700 disabled:opacity-50 transition-colors font-medium">
              {saving ? 'Guardando…' : 'Guardar cambios'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

function ModalCancelar({ ingreso, onClose, onCancelado }) {
  const [explicacion, setExplicacion] = useState('')
  const { saving, setSaving, error, setError } = useModalState()

  async function cancelar() {
    if (!explicacion.trim()) {
      setError('La explicación es requerida')
      return
    }
    setSaving(true); setError('')
    const { error: err } = await supabase
      .from('ingresos_inventario')
      .update({ estado: 'rechazado', explicacion_rechazo: explicacion })
      .eq('id', ingreso.id)

    setSaving(false)
    if (err) { setError(err.message); return }
    onCancelado()
  }

  if (!ingreso) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
          <h2 className="font-semibold text-gray-900">Cancelar ingreso {ingreso.numero}</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-2xl leading-none">&times;</button>
        </div>

        <div className="p-6 space-y-5">
          <div className="bg-red-50 border border-red-200 rounded-lg px-4 py-3 text-sm text-red-700">
            Se notificará al cliente con la explicación proporcionada.
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Explicación para el cliente</label>
            <textarea
              value={explicacion}
              onChange={e => setExplicacion(e.target.value)}
              placeholder="Explicar al cliente por qué se rechaza este ingreso..."
              rows="4"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent"
            />
          </div>

          {error && <p className="text-sm text-red-600 bg-red-50 px-3 py-2 rounded-lg">{error}</p>}

          <div className="flex justify-end gap-2">
            <button onClick={onClose}
              className="px-4 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded-lg transition-colors">
              No, mantener
            </button>
            <button onClick={cancelar} disabled={saving}
              className="px-4 py-2 text-sm bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 transition-colors font-medium">
              {saving ? 'Cancelando…' : 'Cancelar ingreso'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

export default function RecepcionInventario() {
  const { perfil } = useAuth()
  const [ingresos, setIngresos]   = useState([])
  const [loading, setLoading]     = useState(true)
  const [filtro, setFiltro]       = useState('pendiente')
  const [modal, setModal]         = useState(null)
  const [editando, setEditando]   = useState(null)
  const [cancelando, setCancelando] = useState(null)
  const [saving, setSaving]       = useState(null)

  const cargar = useCallback(async () => {
    if (!perfil?.bodega_id) return
    setLoading(true)
    const q = supabase
      .from('ingresos_inventario')
      .select(`
        *,
        items_ingreso ( producto_id, cantidad_enviada, cantidad_recibida, productos ( nombre, sku ) )
      `)
      .eq('bodega_id', perfil.bodega_id)
      .order('created_at', { ascending: false })

    if (filtro !== 'todos') q.eq('estado', filtro)

    const { data } = await q
    setIngresos(data ?? [])
    setLoading(false)
  }, [filtro, perfil?.bodega_id])

  useEffect(() => { cargar() }, [cargar])

  async function eliminarIngreso(ingreso) {
    if (!confirm(`¿Eliminar ingreso ${ingreso.numero}? Esta acción no se puede deshacer.`)) return
    setSaving(ingreso.id)
    const { error } = await supabase.from('ingresos_inventario').delete().eq('id', ingreso.id)
    setSaving(null)
    if (error) { alert(error.message); return }
    cargar()
  }

  const pendientesCount = ingresos.filter(i => i.estado === 'pendiente').length

  return (
    <div className="p-8">
      <div className="mb-6 flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Recepción de ingresos</h1>
          <p className="text-gray-500 text-sm mt-0.5">Ingresos notificados por los clientes</p>
        </div>
        {pendientesCount > 0 && (
          <span className="px-3 py-1 bg-yellow-100 text-yellow-700 text-sm font-semibold rounded-full">
            {pendientesCount} pendiente{pendientesCount > 1 ? 's' : ''}
          </span>
        )}
      </div>

      {/* Filtros */}
      <div className="flex gap-2 mb-5">
        {[
          { key: 'pendiente', label: 'Pendientes' },
          { key: 'recibido',  label: 'Recibidos'  },
          { key: 'todos',     label: 'Todos'       },
        ].map(f => (
          <button key={f.key} onClick={() => setFiltro(f.key)}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
              filtro === f.key
                ? 'bg-brand-700 text-white'
                : 'bg-white border border-gray-200 text-gray-500 hover:border-gray-300'
            }`}>
            {f.label}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="text-center py-16 text-gray-400 text-sm">Cargando…</div>
      ) : ingresos.length === 0 ? (
        <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
          <p className="text-gray-400 text-sm">No hay ingresos {filtro !== 'todos' ? `en estado "${filtro}"` : ''}.</p>
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-200">
                {['N° Ingreso','Cliente','Productos','Fecha','Estado',''].map(h => (
                  <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {ingresos.map(ing => {
                const cliente = '—'
                const fecha   = new Date(ing.created_at).toLocaleDateString('es-EC', { day:'2-digit', month:'short' })
                const total   = ing.items_ingreso?.reduce((s, i) => s + i.cantidad_enviada, 0) ?? 0
                return (
                  <tr key={ing.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-4 py-3 font-mono text-xs text-gray-400">{ing.numero}</td>
                    <td className="px-4 py-3 font-medium text-gray-900">{cliente}</td>
                    <td className="px-4 py-3 text-gray-500">
                      {ing.items_ingreso?.length} SKU · {total} u.
                    </td>
                    <td className="px-4 py-3 text-xs text-gray-400">{fecha}</td>
                    <td className="px-4 py-3"><EstadoBadge estado={ing.estado} /></td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center justify-end gap-2">
                        {ing.estado === 'pendiente' && (
                          <>
                            <button onClick={() => setModal(ing)}
                              disabled={saving === ing.id}
                              className="px-2 py-1 text-xs text-brand-600 hover:bg-brand-50 rounded-lg font-medium transition-colors disabled:opacity-50">
                              Confirmar →
                            </button>
                            <button onClick={() => setCancelando(ing)}
                              disabled={saving === ing.id}
                              className="px-2 py-1 text-xs text-red-600 hover:bg-red-50 rounded-lg transition-colors disabled:opacity-50">
                              Cancelar
                            </button>
                          </>
                        )}
                        <button onClick={() => setEditando(ing)}
                          disabled={saving === ing.id}
                          className="px-2 py-1 text-xs text-gray-600 hover:bg-gray-100 rounded-lg transition-colors disabled:opacity-50">
                          Editar
                        </button>
                        <button onClick={() => eliminarIngreso(ing)}
                          disabled={saving === ing.id}
                          className="px-2 py-1 text-xs text-red-600 hover:bg-red-50 rounded-lg transition-colors disabled:opacity-50">
                          Eliminar
                        </button>
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}

      <ModalConfirmar
        ingreso={modal}
        onClose={() => setModal(null)}
        onConfirmado={() => { setModal(null); cargar() }}
      />

      <ModalEditar
        ingreso={editando}
        onClose={() => setEditando(null)}
        onActualizado={() => { setEditando(null); cargar() }}
      />

      <ModalCancelar
        ingreso={cancelando}
        onClose={() => setCancelando(null)}
        onCancelado={() => { setCancelando(null); cargar() }}
      />
    </div>
  )
}
