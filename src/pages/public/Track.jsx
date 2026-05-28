import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { supabase } from '@/supabase/client'

const FLUJO = ['recibido', 'en_proceso', 'despachado', 'entregado']

const ESTADO_INFO = {
  recibido:   { label: 'Recibido por P-Box',  desc: 'Tu pedido ha sido recibido y está en espera de procesamiento.' },
  en_proceso: { label: 'En proceso',           desc: 'P-Box está preparando tu pedido para el despacho.' },
  despachado: { label: 'Despachado',           desc: 'Tu pedido está en camino con el courier.' },
  entregado:  { label: 'Entregado',            desc: '¡Tu pedido fue entregado con éxito!' },
  devuelto:   { label: 'Devuelto por courier', desc: 'El courier no pudo entregar el pedido y fue devuelto.' },
  cancelado:  { label: 'Cancelado',            desc: 'Este pedido fue cancelado.' },
}

function fmt(iso) {
  if (!iso) return '—'
  return new Date(iso).toLocaleDateString('es-EC', {
    day: '2-digit', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  })
}

function Timeline({ estado, historial }) {
  const terminal = estado === 'devuelto' || estado === 'cancelado'
  const pasos    = terminal ? [...FLUJO, estado] : FLUJO

  const fechaPorEstado = {}
  if (historial) {
    for (const h of historial) fechaPorEstado[h.estado_nuevo] = h.created_at
  }

  const idx = pasos.indexOf(estado)

  return (
    <div className="relative">
      <div className="flex items-start justify-between gap-0">
        {pasos.map((paso, i) => {
          const completado = i <= idx
          const esActual   = i === idx
          const info       = ESTADO_INFO[paso]
          const fecha      = fechaPorEstado[paso]
          const esTerminal = paso === 'devuelto' || paso === 'cancelado'

          return (
            <div key={paso} className="flex-1 flex flex-col items-center relative">
              {/* Línea conectora */}
              {i < pasos.length - 1 && (
                <div className={`absolute top-4 left-1/2 w-full h-0.5 z-0 ${
                  i < idx ? 'bg-brand-500' : 'bg-gray-200'
                }`} />
              )}

              {/* Círculo */}
              <div className={`relative z-10 w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold border-2 ${
                esActual && esTerminal ? 'bg-red-500 border-red-500 text-white' :
                esActual              ? 'bg-brand-600 border-brand-600 text-white' :
                completado            ? 'bg-brand-500 border-brand-500 text-white' :
                                        'bg-white border-gray-300 text-gray-300'
              }`}>
                {completado ? '✓' : i + 1}
              </div>

              {/* Label */}
              <p className={`mt-2 text-center text-xs font-medium leading-tight px-1 ${
                esActual   ? esTerminal ? 'text-red-600' : 'text-brand-700' :
                completado ? 'text-gray-600' : 'text-gray-300'
              }`}>
                {info?.label ?? paso}
              </p>

              {/* Fecha */}
              {fecha && (
                <p className="mt-0.5 text-center text-xs text-gray-400 leading-tight px-1">
                  {new Date(fecha).toLocaleDateString('es-EC', { day:'2-digit', month:'short' })}
                </p>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}

export default function Track() {
  const { numero: paramNumero } = useParams()
  const navigate = useNavigate()
  const [input, setInput]     = useState(paramNumero ?? '')
  const [pedido, setPedido]   = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError]     = useState('')

  useEffect(() => {
    if (paramNumero) buscar(paramNumero)
  }, [paramNumero])

  async function buscar(num) {
    const n = (num ?? input).trim().toUpperCase()
    if (!n) return
    setLoading(true); setError(''); setPedido(null)

    const { data, error: err } = await supabase.rpc('get_pedido_tracking', { p_numero: n })

    setLoading(false)
    if (err) { setError('Error al consultar. Intenta de nuevo.'); return }
    if (!data || data.length === 0) {
      setError(`No se encontró el pedido "${n}". Verifica el número e intenta de nuevo.`)
      return
    }
    setPedido(data[0])
    if (!paramNumero) navigate(`/track/${n}`, { replace: true })
  }

  function handleSubmit(e) {
    e.preventDefault()
    buscar()
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200">
        <div className="max-w-2xl mx-auto px-4 py-4 flex items-center justify-between">
          <span className="text-xl font-bold text-brand-700">P-Box</span>
          <a href="/login" className="text-sm text-gray-500 hover:text-brand-600 transition-colors">
            Iniciar sesión
          </a>
        </div>
      </header>

      <div className="max-w-2xl mx-auto px-4 py-10">
        {/* Título */}
        <div className="text-center mb-8">
          <h1 className="text-2xl font-bold text-gray-900">Seguimiento de pedido</h1>
          <p className="text-gray-500 text-sm mt-1">Ingresa tu número de pedido para ver el estado</p>
        </div>

        {/* Buscador */}
        <form onSubmit={handleSubmit} className="flex gap-2 mb-8">
          <input
            value={input}
            onChange={e => setInput(e.target.value)}
            placeholder="Ej: PB-LF2ABC-XY1"
            className="flex-1 px-4 py-3 border border-gray-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent font-mono"
          />
          <button
            type="submit"
            disabled={loading}
            className="px-5 py-3 bg-brand-600 text-white rounded-xl text-sm font-medium hover:bg-brand-700 disabled:opacity-50 transition-colors whitespace-nowrap"
          >
            {loading ? 'Buscando…' : 'Consultar'}
          </button>
        </form>

        {/* Error */}
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 text-sm px-4 py-3 rounded-xl mb-6">
            {error}
          </div>
        )}

        {/* Resultado */}
        {pedido && (
          <div className="space-y-4">
            {/* Cabecera del pedido */}
            <div className="bg-white rounded-2xl border border-gray-200 p-6">
              <div className="flex items-start justify-between mb-1">
                <p className="text-xs text-gray-400 font-mono">{pedido.numero_pedido}</p>
                <span className={`text-xs font-semibold px-2.5 py-0.5 rounded-full ${
                  pedido.estado === 'entregado'  ? 'bg-green-100 text-green-700'  :
                  pedido.estado === 'cancelado'  ? 'bg-red-100 text-red-600'      :
                  pedido.estado === 'devuelto'   ? 'bg-orange-100 text-orange-600':
                  pedido.estado === 'despachado' ? 'bg-purple-100 text-purple-700':
                  pedido.estado === 'en_proceso' ? 'bg-yellow-100 text-yellow-700':
                                                   'bg-blue-100 text-blue-700'
                }`}>
                  {ESTADO_INFO[pedido.estado]?.label ?? pedido.estado}
                </span>
              </div>
              <p className="text-gray-500 text-sm mt-1">
                {ESTADO_INFO[pedido.estado]?.desc}
              </p>
              <p className="text-xs text-gray-400 mt-3">
                Creado: {fmt(pedido.created_at)}
                {pedido.updated_at !== pedido.created_at && (
                  <> · Actualizado: {fmt(pedido.updated_at)}</>
                )}
              </p>
            </div>

            {/* Timeline */}
            <div className="bg-white rounded-2xl border border-gray-200 p-6">
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-6">Progreso</p>
              <Timeline estado={pedido.estado} historial={pedido.historial} />
            </div>

            {/* Courier / Tracking */}
            {(pedido.courrier || pedido.numero_guia) && (
              <div className="bg-white rounded-2xl border border-gray-200 p-6">
                <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3">Información de envío</p>
                <div className="space-y-2 text-sm">
                  {pedido.courrier && (
                    <div className="flex gap-3">
                      <span className="text-gray-400 w-24 shrink-0">Courier</span>
                      <span className="text-gray-700 font-medium">{pedido.courrier}</span>
                    </div>
                  )}
                  {pedido.numero_guia && (
                    <div className="flex gap-3">
                      <span className="text-gray-400 w-24 shrink-0">N° de guía</span>
                      <span className="text-gray-700 font-mono">{pedido.numero_guia}</span>
                    </div>
                  )}
                  {pedido.ciudad_entrega && (
                    <div className="flex gap-3">
                      <span className="text-gray-400 w-24 shrink-0">Destino</span>
                      <span className="text-gray-700">
                        {[pedido.ciudad_entrega, pedido.provincia_entrega].filter(Boolean).join(', ')}
                      </span>
                    </div>
                  )}
                  {pedido.tracking_url && (
                    <a
                      href={pedido.tracking_url}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-1 mt-2 text-brand-600 hover:underline font-medium text-sm"
                    >
                      Ver tracking del courier →
                    </a>
                  )}
                </div>
              </div>
            )}

            {/* Productos */}
            {pedido.productos && pedido.productos.length > 0 && (
              <div className="bg-white rounded-2xl border border-gray-200 p-6">
                <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3">Productos</p>
                <div className="divide-y divide-gray-50">
                  {pedido.productos.map((p, i) => (
                    <div key={i} className="flex items-center justify-between py-2 text-sm">
                      <span className="text-gray-700">{p.nombre}</span>
                      <span className="text-gray-400 text-xs">{p.cantidad} u.</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Footer */}
        <p className="text-center text-xs text-gray-400 mt-10">
          ¿Tienes dudas? Contacta al negocio que realizó tu pedido.
        </p>
      </div>
    </div>
  )
}
