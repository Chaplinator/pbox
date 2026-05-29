import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/supabase/client'
import { logError } from '@/utils/errorLogger'

async function fetchUsuarios() {
  const { data, error } = await supabase
    .from('usuarios')
    .select('id, nombre, apellido, email, rol, activo, bodega_id, created_at')
    .order('created_at', { ascending: false })

  if (error) {
    logError('fetchUsuarios', error)
    throw error
  }

  return data ?? []
}

export function useUsuariosData() {
  return useQuery({
    queryKey: ['usuarios'],
    queryFn: fetchUsuarios,
    staleTime: 5 * 60 * 1000, // 5 minutes for user data
  })
}
