import { useState, useEffect } from 'react'
import { supabase } from '@/supabase/client'

const VACIO = {
  sku: '', nombre: '', descripcion: '', categoria: '',
  peso_kg: '', largo_cm: '', ancho_cm: '', alto_cm: '',
  stock_inicial: '0', stock_minimo: '5',
}

const input = 'w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent'
const label = 'block text-xs font-medium text-gray-600 mb-1'

export default function ModalProducto({ open, onClose, clienteId, producto, onSaved }) {
  const [form, setForm] = useState(VACIO)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const edicion = !!producto

  useEffect(() => {
    if (!open) return
    setError('')
    setForm(producto ? {
      sku:              producto.sku ?? '',
      nombre:           producto.nombre ?? '',
      descripcion:      producto.descripcion ?? '',
      peso_kg:          producto.peso_kg ?? '',
      largo_cm:         producto.largo_cm ?? '',
      ancho_cm:         producto.ancho_cm ?? '',
      alto_cm:          producto.alto_cm ?? '',
      categoria:     producto.categoria ?? '',
      stock_inicial: producto.cantidad ?? '0',
      stock_minimo:  producto.stock_minimo ?? '5',
    } : VACIO)
  }, [open, producto])

  const set = e => setForm(f => ({ ...f, [e.target.name]: e.target.value }))
  const num = v => v === '' || v === null ? null : parseFloat(v)
  const int = v => parseInt(v) || 0

  async function submit(e) {
    e.preventDefault()
    setSaving(true)
    setError('')

    if (edicion) {
      const [{ error: e1 }, { error: e2 }] = await Promise.all([
        supabase.from('productos').update({
          sku: form.sku, nombre: form.nombre,
          descripcion: form.descripcion || null,
          categoria:   form.categoria   || null,
          peso_kg: num(form.peso_kg),
          largo_cm: num(form.largo_cm),
          ancho_cm: num(form.ancho_cm),
          alto_cm:  num(form.alto_cm),
        }).eq('id', producto.producto_id),
        supabase.from('inventario').update({
          stock_minimo: int(form.stock_minimo),
        }).eq('id', producto.inventario_id),
      ])
      if (e1 || e2) { setError((e1 ?? e2).message); setSaving(false); return }
    } else {
      const { error: err } = await supabase.rpc('crear_producto_con_inventario', {
        p_cliente_id:    clienteId,
        p_sku:           form.sku,
        p_nombre:        form.nombre,
        p_descripcion:   form.descripcion || null,
        p_categoria:     form.categoria   || null,
        p_peso_kg:       num(form.peso_kg),
        p_largo_cm:      num(form.largo_cm),
        p_ancho_cm:      num(form.ancho_cm),
        p_alto_cm:       num(form.alto_cm),
        p_stock_inicial: int(form.stock_inicial),
        p_stock_minimo:  int(form.stock_minimo),
      })
      if (err) { setError(err.message); setSaving(false); return }
    }

    setSaving(false)
    onSaved()
  }

  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
          <h2 className="font-semibold text-gray-900">
            {edicion ? 'Editar producto' : 'Agregar producto'}
          </h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-2xl leading-none">&times;</button>
        </div>

        <form onSubmit={submit} className="p-6 space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={label}>SKU *</label>
              <input name="sku" value={form.sku} onChange={set} required className={input} placeholder="PROD-001" />
            </div>
            <div>
              <label className={label}>Nombre *</label>
              <input name="nombre" value={form.nombre} onChange={set} required className={input} placeholder="Camiseta talla M" />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={label}>Descripción</label>
              <input name="descripcion" value={form.descripcion} onChange={set} className={input} placeholder="Opcional" />
            </div>
            <div>
              <label className={label}>Categoría</label>
              <input name="categoria" value={form.categoria} onChange={set} className={input} placeholder="Ej: Ropa, Electrónica…" />
            </div>
          </div>

          <div>
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">Dimensiones y peso</p>
            <div className="grid grid-cols-4 gap-3">
              {[
                { name: 'peso_kg',  label: 'Peso (kg)', placeholder: '0.5' },
                { name: 'largo_cm', label: 'Largo (cm)', placeholder: '30' },
                { name: 'ancho_cm', label: 'Ancho (cm)', placeholder: '20' },
                { name: 'alto_cm',  label: 'Alto (cm)',  placeholder: '10' },
              ].map(f => (
                <div key={f.name}>
                  <label className={label}>{f.label}</label>
                  <input name={f.name} type="number" step="0.1" min="0"
                    value={form[f.name]} onChange={set}
                    className={input} placeholder={f.placeholder} />
                </div>
              ))}
            </div>
            {form.largo_cm && form.ancho_cm && (
              <p className="text-xs text-gray-400 mt-1">
                Pisada: {(parseFloat(form.largo_cm)/100 * parseFloat(form.ancho_cm)/100).toFixed(3)} m²/u
                {form.alto_cm && ` · Volumen: ${(parseFloat(form.largo_cm)/100 * parseFloat(form.ancho_cm)/100 * parseFloat(form.alto_cm)/100).toFixed(4)} m³/u`}
              </p>
            )}
          </div>

          <div>
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">Inventario</p>
            <div className="grid grid-cols-2 gap-3">
              {!edicion && (
                <div>
                  <label className={label}>Stock inicial</label>
                  <input name="stock_inicial" type="number" min="0" value={form.stock_inicial} onChange={set} className={input} />
                </div>
              )}
              <div className={edicion ? 'col-span-2' : ''}>
                <label className={label}>Stock mínimo</label>
                <input name="stock_minimo" type="number" min="0" value={form.stock_minimo} onChange={set} className={input} />
              </div>
            </div>
          </div>

          {error && <p className="text-sm text-red-600 bg-red-50 px-3 py-2 rounded-lg">{error}</p>}

          <div className="flex justify-end gap-2 pt-2">
            <button type="button" onClick={onClose}
              className="px-4 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded-lg transition-colors">
              Cancelar
            </button>
            <button type="submit" disabled={saving}
              className="px-4 py-2 text-sm bg-brand-600 text-white rounded-lg hover:bg-brand-700 disabled:opacity-50 transition-colors">
              {saving ? 'Guardando…' : edicion ? 'Guardar cambios' : 'Agregar producto'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
