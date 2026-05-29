import { useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/supabase/client'
import { logError, logInfo } from '@/utils/errorLogger'
import { alertaM2 } from '@/utils/alertas'

async function cancelIngreso(ingresoId, explicacion) {
  const { error } = await supabase
    .from('ingresos_inventario')
    .update({ estado: 'rechazado', explicacion_rechazo: explicacion })
    .eq('id', ingresoId)

  if (error) {
    logError('cancelIngreso', error, { ingreso_id: ingresoId })
    throw error
  }

  logInfo('cancelIngreso', 'Ingreso cancelled', { ingreso_id: ingresoId })
}

export function useCancelIngreso() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ ingresoId, explicacion }) => cancelIngreso(ingresoId, explicacion),
    onSuccess: (_, variables) => {
      // Invalidate ingresos list
      queryClient.invalidateQueries({ queryKey: ['ingresos'] })
      // Notify client
      if (variables.clienteId) {
        alertaM2(variables.clienteId)
      }
    },
    onError: (error, variables) => {
      logError('useCancelIngreso:error', error, { ingreso_id: variables.ingresoId })
    },
  })
}
