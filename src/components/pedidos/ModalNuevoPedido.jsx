import { useState, useEffect } from 'react'
import { useAuth } from '@/context/AuthContext'
import { supabase } from '@/supabase/client'

const inp = 'w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent'
const lbl = 'block text-xs font-medium text-gray-600 mb-1'
const sec = 'text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3'

const VACIO_DEST = {
  destinatario_nombre:   '',
  destinatario_apellido: '',
  destinatario_cedula:   '',
  destinatario_telefono: '',
  destinatario_telefono2:'',
  destinatario_email:    '',
  persona_recibe:        '',
  direccion_entrega:     '',
  numero_casa:           '',
  referencias_entrega:   '',
  ciudad_entrega:        '',
  provincia_entrega:     '',
  notas:                 '',
}

export default function ModalNuevoPedido({ open, onClose, clienteId, onSaved }) {
  const { perfil } = useAuth()
  const [productos, setProductos]         = useState([])
  const [destinatarios, setDestinatarios] = useState([])
  const [items, setItems]                 = useState([{ producto_id: '', cantidad: 1 }])
  const [dest, setDest]                   = useState(VACIO_DEST)
  const [guardarDest, setGuardarDest]     = useState(false)
  const [saving, setSaving]               = useState(false)
  const [error, setError]                 = useState('')
  const [busqDest, setBusqDest]           = useState('')
  const [mostrarLista, setMostrarLista]   = useState(false)

  useEffect(() => {
    if (!open || !clienteId) return
    setError('')
    setItems([{ producto_id: '', cantidad: 1 }])
    setDest(VACIO_DEST)
    setGuardarDest(false)
    setBusqDest('')
    setMostrarLista(false)

    supabase
      .from('vista_inventario')
      .select('producto_id, sku, nombre, cantidad')
      .eq('cliente_id', clienteId)
      .eq('activo', true)
      .gt('cantidad', 0)
      .order('nombre')
      .then(({ data }) => setProductos(data ?? []))

    supabase
      .from('destinatarios')
      .select('*')
      .eq('cliente_id', clienteId)
      .order('apellidos')
      .then(({ data }) => setDestinatarios(data ?? []))
  }, [open, clienteId])

  function setItem(i, field, val) {
    setItems(prev => prev.map((it, idx) => idx === i ? { ...it, [field]: val } : it))
  }
  function addItem()     { setItems(p => [...p, { producto_id: '', cantidad: 1 }]) }
  function removeItem(i) { setItems(p => p.filter((_, idx) => idx !== i)) }
  function setD(e)       { setDest(d => ({ ...d, [e.target.name]: e.target.value })) }

  function cargarDestinatario(d) {
    setDest(prev => ({
      ...prev,
      destinatario_nombre:   d.nombres,
      destinatario_apellido: d.apellidos,
      destinatario_cedula:   d.cedula     ?? '',
      destinatario_telefono: d.telefono1,
      destinatario_telefono2:d.telefono2  ?? '',
      destinatario_email:    d.email      ?? '',
      direccion_entrega:     d.direccion  ?? '',
      numero_casa:           d.numero_casa?? '',
      ciudad_entrega:        d.ciudad     ?? '',
      provincia_entrega:     d.provincia  ?? '',
      referencias_entrega:   d.referencias?? '',
    }))
    setBusqDest(`${d.nombres} ${d.apellidos}`)
    setMostrarLista(false)
    setGuardarDest(false)
  }

  const destFiltrados = destinatarios.filter(d => {
    const q = busqDest.toLowerCase()
    if (!q) return true
    return (
      d.nombres.toLowerCase().includes(q) ||
      d.apellidos.toLowerCase().includes(q) ||
      (d.cedula ?? '').includes(q)
    )
  })

  async function submit(e) {
    e.preventDefault()
    if (items.some(it => !it.producto_id)) { setError('Selecciona un producto en cada fila.'); return }
    setSaving(true); setError('')

    const numero = `PB-${Date.now().toString().slice(-6)}`
    const { persona_recibe, ...destDB } = dest

    const { data: pedido, error: e1 } = await supabase
      .from('pedidos')
      .insert({
        cliente_id:    clienteId,
        numero_pedido: numero,
        estado:        'recibido',
        ...destDB,
        notas: [dest.notas, persona_recibe ? `Recibe: ${persona_recibe}` : null]
          .filter(Boolean).join(' | ') || null,
      })
      .select('id')
      .single()

    if (e1) { setError(e1.message); setSaving(false); return }

    const { error: e2 } = await supabase
      .from('items_pedido')
      .insert(items.map(it => ({
        pedido_id:   pedido.id,
        producto_id: it.producto_id,
        cantidad:    Number(it.cantidad),
      })))

    if (e2) { setError(e2.message); setSaving(false); return }

    // Guardar destinatario si el usuario lo pidió
    if (guardarDest && dest.destinatario_nombre && dest.destinatario_telefono) {
      await supabase.from('destinatarios').insert({
        cliente_id:  clienteId,
        nombres:     dest.destinatario_nombre,
        apellidos:   dest.destinatario_apellido,
        cedula:      dest.destinatario_cedula     || null,
        telefono1:   dest.destinatario_telefono,
        telefono2:   dest.destinatario_telefono2  || null,
        email:       dest.destinatario_email      || null,
        direccion:   dest.direccion_entrega       || null,
        numero_casa: dest.numero_casa             || null,
        ciudad:      dest.ciudad_entrega          || null,
        provincia:   dest.provincia_entrega       || null,
        referencias: dest.referencias_entrega     || null,
      })
    }

    setSaving(false)
    onSaved()
  }

  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
          <h2 className="font-semibold text-gray-900">Nuevo pedido</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-2xl leading-none">&times;</button>
        </div>

        <form onSubmit={submit} className="p-6 space-y-6">

          {/* Productos */}
          <div>
            <p className={sec}>Productos</p>
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
                          {p.sku} — {p.nombre} ({p.cantidad} en stock)
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="w-24">
                    <input type="number" min="1" value={it.cantidad}
                      onChange={e => setItem(i, 'cantidad', e.target.value)}
                      className={inp} placeholder="Cant." required />
                  </div>
                  {items.length > 1 && (
                    <button type="button" onClick={() => removeItem(i)}
                      className="mt-1 text-gray-300 hover:text-red-400 text-xl leading-none">×</button>
                  )}
                </div>
              ))}
            </div>
            <button type="button" onClick={addItem}
              className="mt-2 text-xs text-brand-600 hover:underline font-medium">
              + Agregar otro producto
            </button>
          </div>

          {/* Datos del destinatario */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <p className={sec} style={{ marginBottom: 0 }}>Datos del destinatario</p>
            </div>

            {/* Buscador de destinatarios guardados */}
            {destinatarios.length > 0 && (
              <div className="relative mb-4">
                <input
                  type="text"
                  value={busqDest}
                  onChange={e => { setBusqDest(e.target.value); setMostrarLista(true) }}
                  onFocus={() => setMostrarLista(true)}
                  placeholder="Buscar destinatario guardado…"
                  className="w-full px-3 py-2 border border-brand-300 bg-brand-50 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent placeholder-brand-400"
                />
                {mostrarLista && destFiltrados.length > 0 && (
                  <div className="absolute z-10 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-48 overflow-y-auto">
                    {destFiltrados.map(d => (
                      <button
                        key={d.id}
                        type="button"
                        onMouseDown={() => cargarDestinatario(d)}
                        className="w-full text-left px-4 py-2.5 hover:bg-brand-50 text-sm transition-colors border-b border-gray-50 last:border-0"
                      >
                        <span className="font-medium text-gray-900">{d.nombres} {d.apellidos}</span>
                        {d.cedula && <span className="text-gray-400 ml-2 text-xs">{d.cedula}</span>}
                        {d.ciudad && <span className="text-gray-400 ml-2 text-xs">· {d.ciudad}</span>}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className={lbl}>Nombres *</label>
                <input name="destinatario_nombre" value={dest.destinatario_nombre} onChange={setD}
                  required className={inp} placeholder="Ana" />
              </div>
              <div>
                <label className={lbl}>Apellidos *</label>
                <input name="destinatario_apellido" value={dest.destinatario_apellido} onChange={setD}
                  required className={inp} placeholder="Torres Mora" />
              </div>
              <div>
                <label className={lbl}>Cédula *</label>
                <input name="destinatario_cedula" value={dest.destinatario_cedula} onChange={setD}
                  required className={inp} placeholder="0912345678" />
              </div>
              <div>
                <label className={lbl}>Persona que recibe</label>
                <input name="persona_recibe" value={dest.persona_recibe} onChange={setD}
                  className={inp} placeholder="Si es distinto al destinatario" />
              </div>
              <div>
                <label className={lbl}>Teléfono 1 *</label>
                <input name="destinatario_telefono" value={dest.destinatario_telefono} onChange={setD}
                  required className={inp} placeholder="0999123456" />
              </div>
              <div>
                <label className={lbl}>Teléfono 2</label>
                <input name="destinatario_telefono2" value={dest.destinatario_telefono2} onChange={setD}
                  className={inp} placeholder="Opcional" />
              </div>
              <div className="col-span-2">
                <label className={lbl}>Correo electrónico</label>
                <input name="destinatario_email" type="email" value={dest.destinatario_email} onChange={setD}
                  className={inp} placeholder="ana@correo.com (opcional)" />
              </div>
            </div>
          </div>

          {/* Dirección de entrega */}
          <div>
            <p className={sec}>Dirección de entrega</p>
            <div className="grid grid-cols-2 gap-3">
              <div className="col-span-2">
                <label className={lbl}>Dirección (calle principal y secundaria) *</label>
                <input name="direccion_entrega" value={dest.direccion_entrega} onChange={setD}
                  required className={inp} placeholder="Av. Principal 123 y Calle Secundaria" />
              </div>
              <div>
                <label className={lbl}>N° casa / dpto</label>
                <input name="numero_casa" value={dest.numero_casa} onChange={setD}
                  className={inp} placeholder="Dpto 4B / Casa 12" />
              </div>
              <div>
                <label className={lbl}>Ciudad *</label>
                <input name="ciudad_entrega" value={dest.ciudad_entrega} onChange={setD}
                  required className={inp} placeholder="Guayaquil" />
              </div>
              <div>
                <label className={lbl}>Provincia *</label>
                <input name="provincia_entrega" value={dest.provincia_entrega} onChange={setD}
                  required className={inp} placeholder="Guayas" />
              </div>
              <div>
                <label className={lbl}>Referencias</label>
                <input name="referencias_entrega" value={dest.referencias_entrega} onChange={setD}
                  className={inp} placeholder="Frente al parque, portón azul…" />
              </div>
            </div>
          </div>

          {/* Notas */}
          <div>
            <label className={lbl}>Notas para P-Box</label>
            <textarea name="notas" value={dest.notas} onChange={setD} rows={2}
              className={inp + ' resize-none'} placeholder="Empaque especial, instrucciones de despacho, etc." />
          </div>

          {/* Guardar destinatario */}
          <label className="flex items-center gap-2 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={guardarDest}
              onChange={e => setGuardarDest(e.target.checked)}
              className="w-4 h-4 rounded border-gray-300 text-brand-600 focus:ring-brand-500"
            />
            <span className="text-sm text-gray-600">Guardar este destinatario para futuros pedidos</span>
          </label>

          {error && <p className="text-sm text-red-600 bg-red-50 px-3 py-2 rounded-lg">{error}</p>}

          <div className="flex justify-end gap-2 pt-1">
            <button type="button" onClick={onClose}
              className="px-4 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded-lg transition-colors">
              Cancelar
            </button>
            <button type="submit" disabled={saving}
              className="px-4 py-2 text-sm bg-brand-600 text-white rounded-lg hover:bg-brand-700 disabled:opacity-50 transition-colors">
              {saving ? 'Creando…' : 'Crear pedido'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
