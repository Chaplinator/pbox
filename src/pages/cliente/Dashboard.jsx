import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '@/context/AuthContext'
import { supabase } from '@/supabase/client'

function KpiCard({ label, value, sub, variant = 'default', to }) {
  const colors = {
    default: 'text-gray-900',
    blue:    'text-blue-700',
    red:     'text-red-600',
    orange:  'text-orange-600',
    green:   'text-brand-700',
  }
  const inner = (
    <div className="bg-white rounded-xl border border-gray-200 p-5 hover:border-gray-300 transition-colors h-full">
      <p className="text-sm text-gray-500">{label}</p>
      <p className={`text-3xl font-bold mt-1 ${colors[variant]}`}>{value ?? '—'}</p>
      {sub && <p className="text-xs text-gray-400 mt-1">{sub}</p>}
    </div>
  )
  return to ? <Link to={to} className="block">{inner}</Link> : inner
}

export default function Dashboard() {
  const { perfil } = useAuth()
  const [kpis, setKpis] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!perfil) return

    async function cargar() {
      const { data: cliente } = await supabase
        .from('clientes').select('id').eq('usuario_id', perfil.id).single()

      if (!cliente) { setLoading(false); return }
      const cid = cliente.id
      const inicioMes = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString()

      const [prodRes, bajoRes, enProcesoRes, despachadosRes] = await Promise.all([
        supabase.from('vista_inventario')
          .select('producto_id', { count: 'exact', head: true })
          .eq('cliente_id', cid).eq('activo', true),
        supabase.from('vista_inventario')
          .select('producto_id', { count: 'exact', head: true })
          .eq('cliente_id', cid).eq('stock_bajo', true),
        supabase.from('pedidos')
          .select('id', { count: 'exact', head: true })
          .eq('cliente_id', cid).in('estado', ['recibido', 'en_proceso']),
        supabase.from('pedidos')
          .select('id', { count: 'exact', head: true })
          .eq('cliente_id', cid).in('estado', ['despachado', 'entregado'])
          .gte('updated_at', inicioMes),
      ])

      setKpis({
        productos:   prodRes.count   ?? 0,
        bajoMinimo:  bajoRes.count   ?? 0,
        enProceso:   enProcesoRes.count ?? 0,
        despachados: despachadosRes.count ?? 0,
      })
      setLoading(false)
    }

    cargar()
  }, [perfil])

  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold text-gray-900 mb-1">
        Hola, {perfil?.nombre ?? '…'}
      </h1>
      <p className="text-gray-500 text-sm mb-8">Resumen de tu operación en P-Box</p>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard
          label="Productos activos"
          value={loading ? '…' : kpis?.productos}
          variant="blue"
          to="/inventario"
        />
        <KpiCard
          label="Stock bajo mínimo"
          value={loading ? '…' : kpis?.bajoMinimo}
          variant={kpis?.bajoMinimo > 0 ? 'red' : 'default'}
          sub={kpis?.bajoMinimo > 0 ? 'Requieren atención' : undefined}
          to="/inventario"
        />
        <KpiCard
          label="Pedidos en proceso"
          value={loading ? '…' : kpis?.enProceso}
          variant="orange"
          to="/pedidos"
        />
        <KpiCard
          label="Despachados este mes"
          value={loading ? '…' : kpis?.despachados}
          variant="green"
          to="/pedidos"
        />
      </div>

      {!loading && kpis?.bajoMinimo > 0 && (
        <div className="mt-6 bg-red-50 border border-red-200 rounded-xl px-5 py-4 flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-red-800">
              {kpis.bajoMinimo} producto{kpis.bajoMinimo !== 1 ? 's' : ''} con stock bajo mínimo
            </p>
            <p className="text-xs text-red-600 mt-0.5">
              Revisa tu inventario y coordina reposición con P-Box.
            </p>
          </div>
          <Link to="/inventario"
            className="text-sm font-medium text-red-700 hover:underline whitespace-nowrap ml-4">
            Ver inventario →
          </Link>
        </div>
      )}
    </div>
  )
}
