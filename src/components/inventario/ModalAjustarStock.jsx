import { useState } from 'react'
import { supabase } from '@/supabase/client'
import { useAuth } from '@/context/AuthContext'

const inputCls = 'w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent'
const labelCls = 'block text-xs font-medium text-gray-600 mb-1'

const TIPOS = [
  { value: 'entrada', label: 'Entrada', desc: 'Ingreso de mercadería a bodega', color: 'text-green-700 bg-green-50 border-green-200' },
  { value: 'salida',  label: 'Salida',  desc: 'Despacho o retiro manual',       color: 'text-red-700 bg-red-50 border-red-200' },
  { value: 'ajuste',  label: 'Ajuste',  desc: 'Corrección de inventario',       color: 'text-yellow-700 bg-yellow-50 border-yellow-200' },
]

export default function ModalAjustarStock({ open, onClose, producto, onSaved }) {
  const { perfil } = useAuth()
  const [form, setForm] = useState({ tipo: 'entrada', cantidad: '', notas: '' })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const set = e => setForm(f => ({ ...f, [e.target.name]: e.target.value }))

  const cantNum = parseInt(form.cantidad) || 0
  const stockNuevo = form.cantidad
    ? form.tipo === 'entrada'
      ? (producto?.cantidad ?? 0) + cantNum
      : Math.max((producto?.cantidad ?? 0) - cantNum, 0)
    : null

  async function submit(e) {
    e.preventDefault()
    if (cantNum <= 0) { setError('La cantidad debe ser mayor a 0'); return }
    setSaving(true)
    setError('')

    const { error: err } = await supabase
      .from('movimientos_inventario')
      .insert({
        producto_id: producto.producto_id,
        tipo:        form.tipo,
        cantidad:    cantNum,
        notas:       form.notas || null,
        operador_id: perfil?.id,
      })

    setSaving(false)
    if (err) { setError(err.message); return }
    setForm({ tipo: 'entrada', cantidad: '', notas: '' })
    onSaved()
  }

  if (!open) return null

  const tipoActual = TIPOS.find(t => t.value === form.tipo)

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
          <div>
            <h2 className="font-semibold text-gray-900">Ajustar stock</h2>
            <p className="text-xs text-gray-400 mt-0.5">{producto?.nombre} · <span className="font-mono">{producto?.sku}</span></p>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-2xl leading-none">&times;</button>
        </div>

        <form onSubmit={submit} className="p-6 space-y-4">
          <div className="flex items-center justify-between bg-gray-50 rounded-xl px-4 py-3">
            <span className="text-sm text-gray-500">Stock actual</span>
            <span className="text-2xl font-bold text-gray-900">{producto?.cantidad ?? '—'}</span>
          </div>

          <div>
            <label className={labelCls}>Tipo de movimiento</label>
            <div className="grid grid-cols-3 gap-2 mt-1">
              {TIPOS.map(t => (
                <button
                  key={t.value}
                  type="button"
                  onClick={() => setForm(f => ({ ...f, tipo: t.value }))}
                  className={`px-3 py-2 rounded-lg text-xs font-medium border transition-colors ${
                    form.tipo === t.value ? t.color + ' border' : 'text-gray-500 bg-white border-gray-200 hover:bg-gray-50'
                  }`}
                >
                  {t.label}
                </button>
              ))}
            </div>
            <p className="text-xs text-gray-400 mt-1">{tipoActual.desc}</p>
          </div>

          <div>
            <label className={labelCls}>Cantidad</label>
            <input name="cantidad" type="number" min="1" value={form.cantidad}
              onChange={set} required className={inputCls} placeholder="0" />
          </div>

          {stockNuevo !== null && (
            <div className={`flex items-center justify-between rounded-xl px-4 py-3 ${
              stockNuevo <= (producto?.stock_minimo ?? 0)
                ? 'bg-red-50 text-red-700'
                : 'bg-brand-50 text-brand-700'
            }`}>
              <span className="text-sm">Stock resultante</span>
              <span className="text-2xl font-bold">{stockNuevo}</span>
            </div>
          )}

          <div>
            <label className={labelCls}>Notas (opcional)</label>
            <input name="notas" value={form.notas} onChange={set}
              className={inputCls} placeholder="Ej: Recepción OC #234" />
          </div>

          {error && <p className="text-sm text-red-600 bg-red-50 px-3 py-2 rounded-lg">{error}</p>}

          <div className="flex justify-end gap-2 pt-2">
            <button type="button" onClick={onClose}
              className="px-4 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded-lg transition-colors">
              Cancelar
            </button>
            <button type="submit" disabled={saving}
              className="px-4 py-2 text-sm bg-brand-600 text-white rounded-lg hover:bg-brand-700 disabled:opacity-50 transition-colors">
              {saving ? 'Guardando…' : 'Confirmar'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
