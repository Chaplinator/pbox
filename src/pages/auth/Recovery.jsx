import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '@/supabase/client'

const inp = 'w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent'
const lbl = 'block text-sm font-medium text-gray-700 mb-1'

export default function Recovery() {
  const navigate = useNavigate()
  const [ready, setReady]       = useState(false)
  const [form, setForm]         = useState({ password: '', confirmar: '' })
  const [loading, setLoading]   = useState(false)
  const [error, setError]       = useState('')
  const [done, setDone]         = useState(false)

  useEffect(() => {
    // Si la sesión de recovery ya está activa al montar el componente
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) setReady(true)
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'PASSWORD_RECOVERY') setReady(true)
    })
    return () => subscription.unsubscribe()
  }, [])

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    if (form.password !== form.confirmar) { setError('Las contraseñas no coinciden.'); return }
    if (form.password.length < 6) { setError('La contraseña debe tener al menos 6 caracteres.'); return }

    setLoading(true)
    const { error } = await supabase.auth.updateUser({ password: form.password })
    setLoading(false)

    if (error) { setError(error.message); return }
    setDone(true)
    setTimeout(() => navigate('/inventario'), 2500)
  }

  if (done) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <p className="text-2xl font-bold text-brand-700 mb-2">P-Box</p>
          <p className="text-green-600 font-medium">Contraseña actualizada correctamente.</p>
          <p className="text-gray-400 text-sm mt-1">Redirigiendo…</p>
        </div>
      </div>
    )
  }

  if (!ready) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <p className="text-2xl font-bold text-brand-700 mb-4">P-Box</p>
          <p className="text-gray-400 text-sm">Verificando enlace de recuperación…</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-brand-700">P-Box</h1>
          <p className="text-gray-500 text-sm mt-1">Establece tu nueva contraseña</p>
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-8">
          <h2 className="text-lg font-semibold text-gray-900 mb-6">Nueva contraseña</h2>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className={lbl}>Nueva contraseña *</label>
              <input type="password" value={form.password}
                onChange={e => setForm(f => ({ ...f, password: e.target.value }))}
                required minLength={6} className={inp} placeholder="Mínimo 6 caracteres" />
            </div>
            <div>
              <label className={lbl}>Confirmar contraseña *</label>
              <input type="password" value={form.confirmar}
                onChange={e => setForm(f => ({ ...f, confirmar: e.target.value }))}
                required className={inp} placeholder="••••••••" />
            </div>

            {error && <p className="text-sm text-red-600 bg-red-50 px-3 py-2 rounded-lg">{error}</p>}

            <button type="submit" disabled={loading}
              className="w-full bg-brand-600 text-white py-2 px-4 rounded-lg text-sm font-medium hover:bg-brand-700 disabled:opacity-50 transition-colors">
              {loading ? 'Actualizando…' : 'Actualizar contraseña'}
            </button>
          </form>
        </div>
      </div>
    </div>
  )
}
