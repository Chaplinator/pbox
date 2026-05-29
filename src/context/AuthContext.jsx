import { createContext, useContext, useEffect, useState } from 'react'
import { supabase } from '@/supabase/client'
import i18n from '@/i18n/config'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [session, setSession] = useState(undefined)
  const [perfil, setPerfil] = useState(null)
  const [bodegaActual, setBodegaActual] = useState(null)
  const [bodegas, setBodegas] = useState([])

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session)
      if (session) fetchPerfil(session.user.id)
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (_event === 'PASSWORD_RECOVERY') {
        if (window.location.pathname !== '/recovery') window.location.href = '/recovery'
        return
      }
      setSession(session)
      if (session) fetchPerfil(session.user.id)
      else {
        setPerfil(null)
        setBodegaActual(null)
        setBodegas([])
      }
    })

    return () => subscription.unsubscribe()
  }, [])

  async function fetchPerfil(userId) {
    const { data } = await supabase
      .from('usuarios')
      .select('*')
      .eq('id', userId)
      .single()

    if (data) {
      setPerfil(data)

      // Set language preference
      const userLanguage = data.idioma || 'es'
      i18n.changeLanguage(userLanguage)

      // If account admin, fetch their bodegas
      if (data.rol === 'administrador_cuenta') {
        const { data: bodegasData } = await supabase
          .from('usuarios')
          .select('bodega_id')
          .eq('id', userId)

        if (bodegasData && bodegasData.length > 0) {
          const bodegaIds = bodegasData.map(b => b.bodega_id).filter(Boolean)

          if (bodegaIds.length > 0) {
            const { data: bodegasInfo } = await supabase
              .from('bodegas')
              .select('*')
              .in('id', bodegaIds)

            setBodegas(bodegasInfo || [])
            // Set current bodega (use the one from perfil or first one)
            setBodegaActual(data.bodega_id || (bodegasInfo?.[0]?.id))
          }
        }
      } else {
        // Operador or Cliente - set their single bodega
        setBodegaActual(data.bodega_id)
      }
    }
  }

  async function switchBodega(bodegaId) {
    if (perfil?.rol === 'administrador_cuenta') {
      // Update user's bodega_id
      const { error } = await supabase
        .from('usuarios')
        .update({ bodega_id: bodegaId })
        .eq('id', perfil.id)

      if (!error) {
        setBodegaActual(bodegaId)
        setPerfil({ ...perfil, bodega_id: bodegaId })
      }
      return !error
    }
    return false
  }

  async function changeLanguage(language) {
    if (!perfil) return false

    const { error } = await supabase
      .from('usuarios')
      .update({ idioma: language })
      .eq('id', perfil.id)

    if (!error) {
      i18n.changeLanguage(language)
      setPerfil({ ...perfil, idioma: language })
      return true
    }
    return false
  }

  async function signOut() {
    await supabase.auth.signOut()
  }

  const loading = session === undefined

  return (
    <AuthContext.Provider value={{
      session,
      perfil,
      setPerfil,
      bodegaActual,
      bodegas,
      switchBodega,
      changeLanguage,
      loading,
      signOut,
    }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth debe usarse dentro de <AuthProvider>')
  return ctx
}
