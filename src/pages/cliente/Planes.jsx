import { useState, useEffect } from 'react'
import { useAuth } from '@/context/AuthContext'
import { supabase } from '@/supabase/client'

const PLANES = {
  basico: {
    nombre: 'Básico',
    precio: '$0/mes',
    descripcion: 'Para empezar',
    limites: {
      pedidos: 'Sin límite',
      usuarios: '1 usuario',
      m2_base: '10 m²',
      reportes: 'Básicos',
      soporte: 'Email',
    },
    color: 'gray',
  },
  pro: {
    nombre: 'Pro',
    precio: '$29/mes',
    descripcion: 'Para crecer',
    limites: {
      pedidos: '500 pedidos/mes',
      usuarios: 'Hasta 5 usuarios',
      m2_base: '20 m²',
      reportes: 'Avanzados',
      soporte: 'Email + Chat',
    },
    color: 'blue',
  },
  enterprise: {
    nombre: 'Enterprise',
    precio: 'Personalizado',
    descripcion: 'Para operar a escala',
    limites: {
      pedidos: 'Sin límite',
      usuarios: 'Usuarios ilimitados',
      m2_base: 'Personalizado',
      reportes: 'Premium + API',
      soporte: 'Soporte 24/7',
    },
    color: 'brand',
  },
}

function ModalComprarM2({ open, onClose, clienteId, m2Actual, onSaved }) {
  const [cantidad, setCantidad] = useState(5)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const precioM2 = 2 // Precio por m² adicional
  const totalCosto = cantidad * precioM2

  async function guardar(e) {
    e.preventDefault()
    if (!cantidad || cantidad <= 0) { setError('Ingresa una cantidad válida.'); return }
    setSaving(true); setError('')

    const nuevoTotal = m2Actual + cantidad
    const { error: err } = await supabase.from('clientes')
      .update({ m2_contratados: nuevoTotal })
      .eq('id', clienteId)

    setSaving(false)
    if (err) { setError(err.message); return }
    onSaved()
  }

  if (!open) return null
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
          <h2 className="font-semibold text-gray-900">Comprar m² adicionales</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-2xl leading-none">&times;</button>
        </div>
        <form onSubmit={guardar} className="p-6 space-y-4">
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-2">
              m² adicionales a comprar
            </label>
            <div className="flex items-end gap-2">
              <div className="flex-1">
                <input type="number" min="1" step="1" value={cantidad}
                  onChange={e => setCantidad(Number(e.target.value))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
                  placeholder="Cantidad" />
              </div>
              <span className="text-sm text-gray-500 pb-2">${precioM2}/m²</span>
            </div>
          </div>

          <div className="bg-gray-50 rounded-lg p-4 space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="text-gray-600">m² actual:</span>
              <span className="font-semibold text-gray-900">{m2Actual} m²</span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-gray-600">Compra:</span>
              <span className="font-semibold text-gray-900">+ {cantidad} m²</span>
            </div>
            <div className="border-t border-gray-200 pt-2 flex items-center justify-between text-sm font-semibold">
              <span className="text-gray-900">Total nuevo:</span>
              <span className="text-brand-700">{m2Actual + cantidad} m²</span>
            </div>
            <div className="border-t border-gray-200 pt-2 flex items-center justify-between">
              <span className="text-gray-600 text-sm">Costo total:</span>
              <span className="text-2xl font-bold text-gray-900">${totalCosto}</span>
            </div>
          </div>

          <p className="text-xs text-gray-500 bg-blue-50 px-3 py-2 rounded-lg">
            💳 El pago se procesará según el método registrado en tu cuenta.
          </p>

          {error && <p className="text-sm text-red-600 bg-red-50 px-3 py-2 rounded-lg">{error}</p>}

          <div className="flex justify-end gap-2 pt-2">
            <button type="button" onClick={onClose}
              className="px-4 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded-lg transition-colors">
              Cancelar
            </button>
            <button type="submit" disabled={saving}
              className="px-4 py-2 text-sm bg-brand-600 text-white rounded-lg hover:bg-brand-700 disabled:opacity-50 transition-colors">
              {saving ? 'Procesando…' : `Comprar por $${totalCosto}`}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

function ModalCambiarPlan({ open, onClose, clienteId, planActual, onSaved }) {
  const [planSeleccionado, setPlanSeleccionado] = useState(planActual)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  async function guardar(e) {
    e.preventDefault()
    if (planSeleccionado === planActual) { setError('Selecciona un plan diferente al actual.'); return }
    setSaving(true); setError('')

    const { error: err } = await supabase.from('clientes')
      .update({ plan: planSeleccionado })
      .eq('id', clienteId)

    setSaving(false)
    if (err) { setError(err.message); return }
    onSaved()
  }

  if (!open) return null
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
          <h2 className="font-semibold text-gray-900">Cambiar plan</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-2xl leading-none">&times;</button>
        </div>
        <form onSubmit={guardar} className="p-6 space-y-6">
          <div className="grid grid-cols-3 gap-4">
            {Object.entries(PLANES).map(([key, plan]) => (
              <label key={key} className={`relative p-4 rounded-xl border-2 cursor-pointer transition-all ${
                planSeleccionado === key
                  ? `border-${plan.color}-500 bg-${plan.color}-50`
                  : 'border-gray-200 hover:border-gray-300'
              }`}>
                <input type="radio" name="plan" value={key}
                  checked={planSeleccionado === key}
                  onChange={e => setPlanSeleccionado(e.target.value)}
                  className="hidden" />
                <div>
                  <p className="font-semibold text-gray-900">{plan.nombre}</p>
                  <p className="text-sm text-gray-500">{plan.precio}</p>
                  {planActual === key && (
                    <div className="mt-2">
                      <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full font-semibold">
                        Plan actual
                      </span>
                    </div>
                  )}
                </div>
              </label>
            ))}
          </div>

          {planSeleccionado && (
            <div className="bg-gray-50 rounded-lg p-4 space-y-2">
              <p className="text-xs font-semibold text-gray-600 uppercase">Características de {PLANES[planSeleccionado].nombre}</p>
              <ul className="space-y-2">
                {Object.entries(PLANES[planSeleccionado].limites).map(([key, val]) => (
                  <li key={key} className="text-sm text-gray-700 flex items-start gap-2">
                    <span className="text-brand-600 mt-0.5">✓</span>
                    <span><strong>{key.replace('_', ' ')}:</strong> {val}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {error && <p className="text-sm text-red-600 bg-red-50 px-3 py-2 rounded-lg">{error}</p>}

          <div className="flex justify-end gap-2 pt-2">
            <button type="button" onClick={onClose}
              className="px-4 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded-lg transition-colors">
              Cancelar
            </button>
            <button type="submit" disabled={saving}
              className="px-4 py-2 text-sm bg-brand-600 text-white rounded-lg hover:bg-brand-700 disabled:opacity-50 transition-colors">
              {saving ? 'Actualizando…' : 'Cambiar plan'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

export default function Planes() {
  const { perfil } = useAuth()
  const [cliente, setCliente] = useState(null)
  const [loading, setLoading] = useState(true)
  const [modalPlan, setModalPlan] = useState(false)
  const [modalM2, setModalM2] = useState(false)

  useEffect(() => {
    if (!perfil) return
    cargarCliente()
  }, [perfil])

  async function cargarCliente() {
    const { data } = await supabase.from('clientes')
      .select('id, nombre_negocio, plan, m2_contratados, plan_limite_pedidos_mes, plan_vence_at')
      .eq('usuario_id', perfil.id).single()
    setCliente(data ?? null)
    setLoading(false)
  }

  if (loading) return <div className="p-8 text-center text-gray-400">Cargando…</div>
  if (!cliente) return <div className="p-8 text-center text-gray-400">No se encontró información.</div>

  const planActual = PLANES[cliente.plan]

  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Mi Plan</h1>
        <p className="text-gray-500 text-sm mt-0.5">Gestiona tu suscripción y espacio de almacenamiento</p>
      </div>

      {/* Plan actual */}
      <div className="bg-white rounded-xl border border-gray-200 p-6 mb-8">
        <div className="flex items-start justify-between mb-6">
          <div>
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Plan actual</p>
            <h2 className="text-3xl font-bold text-gray-900 mt-1">{planActual.nombre}</h2>
            <p className="text-gray-500 text-sm mt-1">{planActual.precio}</p>
          </div>
          <button onClick={() => setModalPlan(true)}
            className="px-4 py-2 text-sm bg-brand-600 text-white rounded-lg hover:bg-brand-700 transition-colors font-medium">
            Cambiar plan
          </button>
        </div>

        <div className="grid grid-cols-2 gap-4 mb-6">
          {Object.entries(planActual.limites).map(([key, val]) => (
            <div key={key} className="bg-gray-50 rounded-lg p-3">
              <p className="text-xs text-gray-500 mb-1">{key.replace('_', ' ')}</p>
              <p className="font-semibold text-gray-900">{val}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Espacio de almacenamiento */}
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <div className="flex items-start justify-between mb-6">
          <div>
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Espacio de almacenamiento</p>
            <h3 className="text-2xl font-bold text-gray-900 mt-1">{cliente.m2_contratados} m²</h3>
            <p className="text-gray-500 text-sm mt-1">Espacio disponible para tu inventario</p>
          </div>
          <button onClick={() => setModalM2(true)}
            className="px-4 py-2 text-sm bg-brand-100 text-brand-700 rounded-lg hover:bg-brand-200 transition-colors font-medium">
            Comprar m²
          </button>
        </div>

        <div className="space-y-3">
          <div className="flex items-center justify-between text-sm">
            <span className="text-gray-600">m² contratados:</span>
            <span className="font-semibold text-gray-900">{cliente.m2_contratados} m²</span>
          </div>
          <div className="bg-gray-50 rounded-lg px-3 py-2 text-xs text-gray-600">
            💡 Cada m² adicional cuesta <strong>$2/mes</strong>. Puedes comprar en incrementos de 1 m².
          </div>
        </div>
      </div>

      {/* Otros planes disponibles */}
      <div className="mt-12">
        <h3 className="text-lg font-semibold text-gray-900 mb-6">Otros planes disponibles</h3>
        <div className="grid grid-cols-3 gap-6">
          {Object.entries(PLANES).map(([key, plan]) => (
            <div key={key} className={`rounded-xl border-2 p-6 transition-all ${
              cliente.plan === key
                ? `border-${plan.color}-500 bg-${plan.color}-50`
                : 'border-gray-200 hover:border-gray-300'
            }`}>
              <p className="text-sm font-semibold text-gray-500 uppercase">{plan.nombre}</p>
              <p className="text-2xl font-bold text-gray-900 mt-2">{plan.precio}</p>
              <p className="text-sm text-gray-600 mt-1">{plan.descripcion}</p>

              {cliente.plan === key && (
                <div className="mt-4">
                  <span className="text-xs bg-green-100 text-green-700 px-2 py-1 rounded-full font-semibold">
                    Tu plan actual
                  </span>
                </div>
              )}

              {cliente.plan !== key && (
                <button onClick={() => setModalPlan(true)}
                  className="w-full mt-4 px-4 py-2 text-sm bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors font-medium">
                  Cambiar a este plan
                </button>
              )}

              <ul className="mt-4 space-y-2">
                {Object.entries(plan.limites).map(([limiteKey, val]) => (
                  <li key={limiteKey} className="text-xs text-gray-600 flex gap-2">
                    <span className="text-brand-600 flex-shrink-0">✓</span>
                    <span>{val}</span>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </div>

      <ModalCambiarPlan
        open={modalPlan}
        onClose={() => setModalPlan(false)}
        clienteId={cliente.id}
        planActual={cliente.plan}
        onSaved={() => { setModalPlan(false); cargarCliente() }}
      />

      <ModalComprarM2
        open={modalM2}
        onClose={() => setModalM2(false)}
        clienteId={cliente.id}
        m2Actual={cliente.m2_contratados}
        onSaved={() => { setModalM2(false); cargarCliente() }}
      />
    </div>
  )
}
