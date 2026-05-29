import { useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/supabase/client'
import { logError } from '@/utils/errorLogger'

async function deleteUsuario(usuarioId) {
  const { error } = await supabase.from('usuarios').delete().eq('id', usuarioId)

  if (error) {
    logError('deleteUsuario', error, { usuario_id: usuarioId })
    throw error
  }
}

export function useDeleteUsuario() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: deleteUsuario,
    onSuccess: () => {
      // Invalidate usuarios list so it refetches
      queryClient.invalidateQueries({ queryKey: ['usuarios'] })
    },
    onError: (error, usuarioId) => {
      logError('useDeleteUsuario:error', error, { usuario_id: usuarioId })
    },
  })
}
