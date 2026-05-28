import { useEffect, useState, useCallback } from 'react'
import { supabase } from '@/supabase/client'

export function useInventario(clienteId) {
  const [productos, setProductos] = useState([])
  const [rotacion, setRotacion] = useState({})
  const [enviosMes, setEnviosMes] = useState(0)
  const [m2Contratados, setM2Contratados] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const fetch = useCallback(async () => {
    if (!clienteId) { setLoading(false); return }
    setLoading(true)
    setError(null)

    const inicioMes = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString()

    const [invRes, envRes, clienteRes] = await Promise.all([
      supabase
        .from('vista_inventario')
        .select('*')
        .eq('cliente_id', clienteId)
        .eq('activo', true)
        .order('nombre'),
      supabase
        .from('pedidos')
        .select('id', { count: 'exact', head: true })
        .eq('cliente_id', clienteId)
        .in('estado', ['despachado', 'entregado'])
        .gte('updated_at', inicioMes),
      supabase
        .from('clientes')
        .select('m2_contratados')
        .eq('id', clienteId)
        .single(),
    ])

    if (invRes.error) {
      setError(invRes.error.message)
    } else {
      const prods = invRes.data ?? []
      setProductos(prods)
      setEnviosMes(envRes.count ?? 0)
      setM2Contratados(clienteRes.data?.m2_contratados ?? null)

      // Solo consultar rotación para los productos de este cliente
      const ids = prods.map(p => p.producto_id)
      if (ids.length > 0) {
        const { data: rotData } = await supabase
          .from('vista_rotacion_30d')
          .select('*')
          .in('producto_id', ids)
        const map = {}
        for (const r of (rotData ?? [])) map[r.producto_id] = r
        setRotacion(map)
      }
    }

    setLoading(false)
  }, [clienteId])

  useEffect(() => { fetch() }, [fetch])

  const stats = {
    totalProductos: productos.length,
    totalUnidades: productos.reduce((s, p) => s + (p.cantidad ?? 0), 0),
    totalM2: productos.reduce((s, p) => s + (parseFloat(p.m2_total) || 0), 0).toFixed(2),
    bajoMinimo: productos.filter(p => p.stock_bajo).length,
  }

  const m2Uso = m2Contratados
    ? { usado: parseFloat(stats.totalM2), contratado: m2Contratados, pct: (parseFloat(stats.totalM2) / m2Contratados) * 100 }
    : null

  return { productos, rotacion, stats, enviosMes, m2Uso, loading, error, refetch: fetch }
}
