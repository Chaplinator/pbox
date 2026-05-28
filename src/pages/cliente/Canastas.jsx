import { useState, useEffect, useCallback } from 'react'
import { useAuth } from '@/context/AuthContext'
import { supabase } from '@/supabase/client'

const inp = 'w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent'
const lbl = 'block text-xs font-medium text-gray-600 mb-1'

function ModalCanasta({ open, onClose, clienteId, editando, onSaved }) {
  const [nombre, setNombre]       = useState('')
  const [descripcion, setDesc]    = useState('')
  const [items, setItems]         = useState([{ producto_id: '', cantidad: 1 }])
  const [productos, setProductos] = useState([])
  const [saving, setSaving]       = useState(false)
  const [error, setError]         = useState('')

  useEffect(() => {
    if (!open || !clienteId) return
    setError('')
    supabase.from('vista_inventario').select('producto_id, sku, nombre, cantidad')
      .eq('cliente_id', clienteId).eq('activo', true).order('nombre')
      .then(({ data }) => setProductos(data ?? []))

    if (editando) {
      setNombre(editando.nombre)
      setDesc(editando.descripcion ?? '')
      supabase.from('items_canasta')
        .select('producto_id, cantidad')
        .eq('canasta_id', editando.id)
        .then(({ data }) => setItems(data?.length ? data : [{ producto_id: '', cantidad: 1 }]))
    } else {
      setNombre(''); setDesc(''); setItems([{ producto_id: '', cantidad: 1 }])
    }
  }, [open, clienteId, editando])

  function setItem(i, field, val) {
    setItems(p => p.map((it, idx) => idx === i ? { ...it, [field]: val } : it))
  }

  async function guardar(e) {
    e.preventDefault()
    const validItems = items.filter(it => it.producto_id && Number(it.cantidad) > 0)
    if (!validItems.length) { setError('Agrega al menos un componente.'); return }

    const ids = validItems.map(it => it.producto_id)
    if (new Set(ids).size !== ids.length) { setError('No puedes repetir el mismo producto en una canasta.'); return }

    setSaving(true); setError('')

    if (editando) {
      const { error: e1 } = await supabase.from('canastas')
        .update({ nombre, descripcion: descripcion || null }).eq('id', editando.id)
      if (e1) { setError(e1.message); setSaving(false); return }

      await supabase.from('items_canasta').delete().eq('canasta_id', editando.id)
      const { error: e2 } = await supabase.from('items_canasta').insert(
        validItems.map(it => ({ canasta_id: editando.id, producto_id: it.producto_id, cantidad: Number(it.cantidad) }))
      )
      if (e2) { setError(e2.message); setSaving(false); return }
    } else {
      const { data: canasta, error: e1 } = await supabase.from('canastas')
        .insert({ cliente_id: clienteId, nombre, descripcion: descripcion || null })
        .select('id').single()
      if (e1) { setError(e1.message); setSaving(false); return }

      const { error: e2 } = await supabase.from('items_canasta').insert(
        validItems.map(it => ({ canasta_id: canasta.id, producto_id: it.producto_id, cantidad: Number(it.cantidad) }))
      )
      if (e2) { setError(e2.message); setSaving(false); return }
    }

    setSaving(false); onSaved()
  }

  if (!open) return null
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
          <h2 className="font-semibold text-gray-900">{editando ? 'Editar canasta' : 'Nueva canasta'}</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-2xl leading-none">&times;</button>
        </div>
        <form onSubmit={guardar} className="p-6 space-y-4">
          <div>
            <label className={lbl}>Nombre *</label>
            <input value={nombre} onChange={e => setNombre(e.target.value)} required className={inp} placeholder="Kit Navidad, Starter Pack…" />
          </div>
          <div>
            <label className={lbl}>Descripción</label>
            <input value={descripcion} onChange={e => setDesc(e.target.value)} className={inp} placeholder="Opcional" />
          </div>

          <div>
            <label className={lbl}>Componentes *</label>
            <div className="space-y-2">
              {items.map((it, i) => (
                <div key={i} className="flex gap-2 items-center">
                  <div className="flex-1">
                    <select value={it.producto_id}
                      onChange={e => setItem(i, 'producto_id', e.target.value)}
                      className={inp}>
                      <option value="">Seleccionar producto…</option>
                      {productos.map(p => (
                        <option key={p.producto_id} value={p.producto_id}>
                          {p.sku} — {p.nombre} ({p.cantidad} en stock)
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="w-20">
                    <input type="number" min="1" value={it.cantidad}
                      onChange={e => setItem(i, 'cantidad', e.target.value)}
                      className={inp + ' text-center'} placeholder="Cant." />
                  </div>
                  {items.length > 1 && (
                    <button type="button" onClick={() => setItems(p => p.filter((_, idx) => idx !== i))}
                      className="text-gray-300 hover:text-red-400 text-xl leading-none">×</button>
                  )}
                </div>
              ))}
            </div>
            <button type="button"
              onClick={() => setItems(p => [...p, { producto_id: '', cantidad: 1 }])}
              className="mt-2 text-xs text-brand-600 hover:underline font-medium">
              + Agregar componente
            </button>
          </div>

          {error && <p className="text-sm text-red-600 bg-red-50 px-3 py-2 rounded-lg">{error}</p>}

          <div className="flex justify-end gap-2 pt-1">
            <button type="button" onClick={onClose}
              className="px-4 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded-lg transition-colors">
              Cancelar
            </button>
            <button type="submit" disabled={saving}
              className="px-4 py-2 text-sm bg-brand-600 text-white rounded-lg hover:bg-brand-700 disabled:opacity-50 transition-colors">
              {saving ? 'Guardando…' : 'Guardar'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

export default function Canastas() {
  const { perfil } = useAuth()
  const [clienteId, setClienteId]   = useState(null)
  const [canastas, setCanastas]     = useState([])
  const [loading, setLoading]       = useState(true)
  const [expandido, setExpandido]   = useState(null)
  const [detalles, setDetalles]     = useState({})
  const [modal, setModal]           = useState({ open: false, editando: null })
  const [eliminando, setEliminando] = useState(null)

  useEffect(() => {
    if (!perfil) return
    supabase.from('clientes').select('id').eq('usuario_id', perfil.id).single()
      .then(({ data }) => { if (data) setClienteId(data.id) })
  }, [perfil])

  const cargar = useCallback(async () => {
    if (!clienteId) return
    setLoading(true)
    const { data } = await supabase
      .from('vista_canastas')
      .select('*')
      .eq('cliente_id', clienteId)
      .order('nombre')
    setCanastas(data ?? [])
    setLoading(false)
  }, [clienteId])

  useEffect(() => { cargar() }, [cargar])

  async function cargarDetalle(canastaId) {
    if (detalles[canastaId]) return
    const { data } = await supabase
      .from('items_canasta')
      .select('cantidad, productos(nombre, sku)')
      .eq('canasta_id', canastaId)
    setDetalles(d => ({ ...d, [canastaId]: data ?? [] }))
  }

  async function toggleActivo(c) {
    await supabase.from('canastas').update({ activo: !c.activo }).eq('id', c.id)
    cargar()
  }

  async function eliminar(id) {
    await supabase.from('canastas').delete().eq('id', id)
    setEliminando(null)
    cargar()
  }

  function abrir(id) {
    const next = expandido === id ? null : id
    setExpandido(next)
    if (next) cargarDetalle(next)
  }

  return (
    <div className="p-8">
      <div className="mb-6 flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Canastas</h1>
          <p className="text-gray-500 text-sm mt-0.5">Kits y combos de productos para despachar juntos</p>
        </div>
        <button onClick={() => setModal({ open: true, editando: null })}
          className="px-4 py-2 text-sm bg-brand-600 text-white rounded-lg hover:bg-brand-700 transition-colors font-medium">
          + Nueva canasta
        </button>
      </div>

      {loading ? (
        <div className="text-center py-16 text-gray-400 text-sm">Cargando…</div>
      ) : canastas.length === 0 ? (
        <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
          <p className="text-gray-400 text-sm mb-4">Aún no tienes canastas. Crea tu primer kit de productos.</p>
          <button onClick={() => setModal({ open: true, editando: null })}
            className="px-4 py-2 text-sm bg-brand-600 text-white rounded-lg hover:bg-brand-700 transition-colors">
            Crear canasta
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          {canastas.map(c => {
            const open = expandido === c.id
            const items = detalles[c.id] ?? []
            return (
              <div key={c.id} className={`bg-white rounded-xl border transition-colors ${!c.activo ? 'opacity-60 border-gray-100' : 'border-gray-200'}`}>
                <button onClick={() => abrir(c.id)}
                  className="w-full flex items-center justify-between px-5 py-4 hover:bg-gray-50 transition-colors text-left rounded-xl">
                  <div className="flex items-center gap-4">
                    <div>
                      <p className="font-semibold text-gray-900 text-sm">{c.nombre}</p>
                      {c.descripcion && <p className="text-xs text-gray-400 mt-0.5">{c.descripcion}</p>}
                    </div>
                    <span className="text-xs text-gray-400">{c.num_componentes} componente{c.num_componentes !== 1 ? 's' : ''}</span>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="text-right">
                      <p className={`text-lg font-bold ${c.kits_disponibles === 0 ? 'text-red-500' : 'text-brand-700'}`}>
                        {c.kits_disponibles}
                      </p>
                      <p className="text-xs text-gray-400">kits disponibles</p>
                    </div>
                    <span className="text-gray-300">{open ? '▲' : '▼'}</span>
                  </div>
                </button>

                {open && (
                  <div className="border-t border-gray-100 px-5 pb-4">
                    <table className="w-full text-sm mt-3 mb-4">
                      <thead>
                        <tr className="text-xs text-gray-400">
                          <th className="text-left pb-2">Producto</th>
                          <th className="text-left pb-2">SKU</th>
                          <th className="text-right pb-2">Unidades por kit</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-50">
                        {items.map((it, i) => (
                          <tr key={i}>
                            <td className="py-2 text-gray-700">{it.productos?.nombre}</td>
                            <td className="py-2 font-mono text-xs text-gray-400">{it.productos?.sku}</td>
                            <td className="py-2 text-right font-semibold text-gray-800">{it.cantidad}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>

                    <div className="flex items-center gap-3 justify-end">
                      <button onClick={() => toggleActivo(c)}
                        className={`text-xs hover:underline ${c.activo ? 'text-gray-400' : 'text-green-600'}`}>
                        {c.activo ? 'Desactivar' : 'Activar'}
                      </button>
                      <button onClick={() => setModal({ open: true, editando: c })}
                        className="text-xs text-brand-600 hover:underline font-medium">
                        Editar
                      </button>
                      {eliminando === c.id ? (
                        <>
                          <button onClick={() => eliminar(c.id)} className="text-xs text-red-600 hover:underline font-medium">Confirmar</button>
                          <button onClick={() => setEliminando(null)} className="text-xs text-gray-400 hover:underline">Cancelar</button>
                        </>
                      ) : (
                        <button onClick={() => setEliminando(c.id)} className="text-xs text-gray-400 hover:text-red-500 transition-colors">Eliminar</button>
                      )}
                    </div>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}

      <ModalCanasta
        open={modal.open}
        onClose={() => setModal({ open: false, editando: null })}
        clienteId={clienteId}
        editando={modal.editando}
        onSaved={() => { setModal({ open: false, editando: null }); setDetalles({}); cargar() }}
      />
    </div>
  )
}
