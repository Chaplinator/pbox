import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/supabase/client'
import { logError } from '@/utils/errorLogger'

async function fetchIngresos(bodegaId, filtro) {
  if (!bodegaId) return []

  const q = supabase
    .from('ingresos_inventario')
    .select(`
      *,
      items_ingreso ( producto_id, cantidad_enviada, cantidad_recibida, productos ( nombre, sku ) )
    `)
    .eq('bodega_id', bodegaId)
    .order('created_at', { ascending: false })

  if (filtro !== 'todos') {
    q.eq('estado', filtro)
  }

  const { data, error } = await q

  if (error) {
    logError('fetchIngresos', error, { bodega_id: bodegaId, filtro })
    throw error
  }

  return data ?? []
}

export function useIngresosData(bodegaId, filtro = 'pendiente') {
  return useQuery({
    queryKey: ['ingresos', bodegaId, filtro],
    queryFn: () => fetchIngresos(bodegaId, filtro),
    enabled: !!bodegaId,
    staleTime: 2 * 60 * 1000, // 2 minutes for inventory
  })
}
