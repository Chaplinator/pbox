import { useState, useEffect } from 'react'
import { useAuth } from '@/context/AuthContext'
import { supabase } from '@/supabase/client'

const M2_BASE = { basico: 10, pro: 20, enterprise: 0 }

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
  const [m2Nuevo, setM2Nuevo] = useState(null)
  const [savingM2, setSavingM2] = useState(false)
  const [modoM2, setModoM2] = useState(null) // 'comprar' | 'vender' | null

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

  async function guardarCambioM2() {
    if (!m2Nuevo || m2Nuevo === cliente.m2_contratados) { setM2Nuevo(null); return }

    setSavingM2(true)
    const { error } = await supabase.from('clientes')
      .update({ m2_contratados: m2Nuevo })
      .eq('id', cliente.id)

    setSavingM2(false)
    if (error) { alert(error.message); return }
    setM2Nuevo(null)
    cargarCliente()
  }

  if (loading) return <div className="p-8 text-center text-gray-400">Cargando…</div>
  if (!cliente) return <div className="p-8 text-center text-gray-400">No se encontró información.</div>

  const planActual = PLANES[cliente.plan]
  const precioM2 = 2
  const cambioM2 = m2Nuevo !== null ? m2Nuevo - cliente.m2_contratados : 0
  const costoCambio = Math.abs(cambioM2) * precioM2

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

        <div className="grid grid-cols-2 gap-4">
          {Object.entries(planActual.limites).map(([key, val]) => (
            <div key={key} className="bg-gray-50 rounded-lg p-3">
              <p className="text-xs text-gray-500 mb-1">{key.replace('_', ' ')}</p>
              <p className="font-semibold text-gray-900">{val}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Espacio con slider solo para comprar */}
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <div className="mb-6">
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Espacio de almacenamiento</p>
          <div className="flex items-baseline gap-2 mt-2">
            <h3 className="text-3xl font-bold text-gray-900">{m2Nuevo !== null ? m2Nuevo : cliente.m2_contratados} m²</h3>
            {m2Nuevo !== null && (
              <span className={`text-sm font-semibold text-emerald-600`}>
                +{cambioM2} m²
              </span>
            )}
          </div>
          <p className="text-gray-500 text-sm mt-1">Espacio disponible para tu inventario</p>
        </div>

        {m2Nuevo === null ? (
          <>
            <div className="bg-gray-50 rounded-lg p-4 mb-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">m² contratados</p>
                  <p className="text-2xl font-bold text-gray-900 mt-1">{cliente.m2_contratados} m²</p>
                </div>
                <div className="text-center">
                  <p className="text-sm text-gray-600">Compras:</p>
                  <p className="text-lg font-bold text-emerald-700 mt-1">Inmediatas</p>
                </div>
                <div className="text-right">
                  <p className="text-sm text-gray-600">Devoluciones:</p>
                  <p className="text-lg font-bold text-gray-500 mt-1">Próx. factura</p>
                </div>
              </div>
            </div>

            <div className="flex gap-3">
              <button onClick={() => { setM2Nuevo(cliente.m2_contratados); setModoM2('comprar'); }}
                className="flex-1 px-4 py-3 text-sm bg-emerald-200 text-emerald-800 rounded-lg hover:bg-emerald-300 transition-colors font-medium">
                + Comprar m² (inmediato)
              </button>
              <button onClick={() => { setM2Nuevo(cliente.m2_contratados); setModoM2('vender'); }}
                disabled={cliente.m2_contratados <= M2_BASE[cliente.plan]}
                className={`flex-1 px-4 py-3 text-sm rounded-lg font-medium transition-colors ${
                  cliente.m2_contratados <= M2_BASE[cliente.plan]
                    ? 'bg-gray-100 text-gray-500 cursor-not-allowed'
                    : 'bg-red-200 text-red-800 hover:bg-red-300'
                }`}>
                − Reducir m²
              </button>
            </div>
          </>
        ) : (
          <>
            <div className={`border rounded-lg p-5 space-y-4 ${
              modoM2 === 'comprar'
                ? 'bg-blue-50 border-blue-200'
                : 'bg-orange-50 border-orange-200'
            }`}>
              <div>
                <p className="text-sm font-semibold text-gray-700 mb-3">
                  {modoM2 === 'comprar' ? '¿Cuántos m² quieres comprar?' : '¿Cuántos m² quieres reducir?'}
                </p>
                <p className={`text-xs mb-2 ${modoM2 === 'comprar' ? 'text-emerald-700' : 'text-orange-700'}`}>
                  {modoM2 === 'comprar'
                    ? '✓ Se aplica inmediatamente'
                    : '⏳ Se procesa en el próximo ciclo de facturación'}
                </p>
                <div className="flex gap-3 items-center">
                  <input
                    type="range"
                    min={modoM2 === 'comprar' ? cliente.m2_contratados : M2_BASE[cliente.plan]}
                    max={modoM2 === 'comprar' ? cliente.m2_contratados + 100 : cliente.m2_contratados}
                    step="1"
                    value={m2Nuevo}
                    onChange={e => setM2Nuevo(Number(e.target.value))}
                    className={`flex-1 h-2 bg-gray-300 rounded-lg appearance-none cursor-pointer ${
                      modoM2 === 'comprar' ? 'accent-emerald-600' : 'accent-red-600'
                    }`}
                  />
                  <div className="w-16">
                    <input
                      type="number"
                      min={modoM2 === 'comprar' ? cliente.m2_contratados : M2_BASE[cliente.plan]}
                      max={modoM2 === 'comprar' ? cliente.m2_contratados + 100 : cliente.m2_contratados}
                      value={m2Nuevo}
                      onChange={e => setM2Nuevo(Math.min(Math.max(Number(e.target.value), modoM2 === 'comprar' ? cliente.m2_contratados : M2_BASE[cliente.plan]), modoM2 === 'comprar' ? cliente.m2_contratados + 100 : cliente.m2_contratados))}
                      className={`w-full px-2 py-1 border border-gray-300 rounded-lg text-sm text-center focus:outline-none focus:ring-2 ${
                        modoM2 === 'comprar' ? 'focus:ring-emerald-600' : 'focus:ring-red-600'
                      }`}
                    />
                  </div>
                  <span className="text-sm text-gray-600 whitespace-nowrap">m²</span>
                </div>
              </div>

              <div className="bg-white rounded-lg p-3 space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Actual:</span>
                  <span className="font-semibold">{cliente.m2_contratados} m²</span>
                </div>
                <div className={`flex justify-between text-sm font-semibold ${
                  modoM2 === 'comprar' ? 'text-emerald-700' : 'text-red-700'
                }`}>
                  <span>{modoM2 === 'comprar' ? 'Compra:' : 'Reducción:'}</span>
                  <span>{modoM2 === 'comprar' ? '+' : '−'}{Math.abs(cambioM2)} m² @ ${precioM2}/m²</span>
                </div>
                <div className="border-t border-gray-200 pt-2 flex justify-between text-sm">
                  <span className="text-gray-900 font-semibold">
                    {modoM2 === 'comprar' ? 'Total a pagar:' : 'Se reducirá en próxima factura:'}
                  </span>
                  <span className={`text-lg font-bold ${
                    modoM2 === 'comprar' ? 'text-emerald-600' : 'text-red-600'
                  }`}>
                    ${costoCambio}
                  </span>
                </div>
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  onClick={() => { setM2Nuevo(null); setModoM2(null); }}
                  className="flex-1 px-4 py-2 text-sm text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors">
                  Cancelar
                </button>
                <button
                  onClick={guardarCambioM2}
                  disabled={savingM2 || m2Nuevo === cliente.m2_contratados}
                  className={`flex-1 px-4 py-2 text-sm text-white rounded-lg font-medium transition-colors disabled:opacity-50 ${
                    modoM2 === 'comprar'
                      ? 'bg-emerald-600 hover:bg-emerald-700'
                      : 'bg-red-600 hover:bg-red-700'
                  }`}>
                  {savingM2
                    ? 'Procesando…'
                    : modoM2 === 'comprar'
                      ? `Comprar $${costoCambio}`
                      : `Reducir m²`}
                </button>
              </div>
            </div>
          </>
        )}
      </div>

      {/* Otros planes */}
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
    </div>
  )
}
