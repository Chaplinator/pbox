import { useEffect, useState, useCallback } from 'react'
import { supabase } from '@/supabase/client'

export function useInventario(clienteId) {
  const [productos, setProductos] = useState([])
  const [rotacion, setRotacion] = useState({})
  const [enviosMes, setEnviosMes] = useState(0)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const fetch = useCallback(async () => {
    if (!clienteId) { setLoading(false); return }
    setLoading(true)
    setError(null)

    const inicioMes = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString()

    const [invRes, rotRes, envRes] = await Promise.all([
      supabase
        .from('vista_inventario')
        .select('*')
        .eq('cliente_id', clienteId)
        .eq('activo', true)
        .order('nombre'),
      supabase
        .from('vista_rotacion_30d')
        .select('*'),
      supabase
        .from('pedidos')
        .select('id', { count: 'exact', head: true })
        .eq('cliente_id', clienteId)
        .in('estado', ['despachado', 'entregado'])
        .gte('updated_at', inicioMes),
    ])

    if (invRes.error) {
      setError(invRes.error.message)
    } else {
      setProductos(invRes.data ?? [])
      const map = {}
      for (const r of (rotRes.data ?? [])) map[r.producto_id] = r
      setRotacion(map)
      setEnviosMes(envRes.count ?? 0)
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

  return { productos, rotacion, stats, enviosMes, loading, error, refetch: fetch }
}
