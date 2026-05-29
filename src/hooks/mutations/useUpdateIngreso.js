import { useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/supabase/client'
import { logError } from '@/utils/errorLogger'

async function updateIngreso(ingresoId, updates) {
  const { error } = await supabase
    .from('ingresos_inventario')
    .update(updates)
    .eq('id', ingresoId)

  if (error) {
    logError('updateIngreso', error, { ingreso_id: ingresoId, updates })
    throw error
  }
}

export function useUpdateIngreso() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ ingresoId, updates }) => updateIngreso(ingresoId, updates),
    onSuccess: () => {
      // Invalidate ingresos list
      queryClient.invalidateQueries({ queryKey: ['ingresos'] })
    },
    onError: (error, variables) => {
      logError('useUpdateIngreso:error', error, { ingreso_id: variables.ingresoId })
    },
  })
}
