import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { supabase } from '@/supabase/client'

const inp = 'w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent'
const lbl = 'block text-sm font-medium text-gray-700 mb-1'

export default function Registro() {
  const navigate = useNavigate()
  const [form, setForm] = useState({
    nombre: '', apellido: '', nombre_negocio: '',
    email: '', password: '', confirmar: '',
  })
  const [error, setError]     = useState('')
  const [loading, setLoading] = useState(false)

  function handleChange(e) {
    setForm(f => ({ ...f, [e.target.name]: e.target.value }))
  }

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')

    if (form.password !== form.confirmar) {
      setError('Las contraseñas no coinciden.')
      return
    }
    if (!form.nombre_negocio.trim()) {
      setError('El nombre del negocio es obligatorio.')
      return
    }

    setLoading(true)

    const { error } = await supabase.auth.signUp({
      email:    form.email,
      password: form.password,
      options: {
        data: {
          nombre:         form.nombre,
          apellido:       form.apellido,
          nombre_negocio: form.nombre_negocio,
          rol:            'cliente',
        },
      },
    })

    setLoading(false)

    if (error) {
      setError(error.message)
    } else {
      navigate('/inventario')
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4 py-8">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-brand-700">P-Box</h1>
          <p className="text-gray-500 text-sm mt-1">Crea tu cuenta de emprendedor</p>
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-8">
          <h2 className="text-lg font-semibold text-gray-900 mb-6">Registrarse</h2>

          <form onSubmit={handleSubmit} className="space-y-4">

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className={lbl}>Nombre *</label>
                <input name="nombre" type="text" value={form.nombre} onChange={handleChange}
                  required placeholder="Ana" className={inp} />
              </div>
              <div>
                <label className={lbl}>Apellido *</label>
                <input name="apellido" type="text" value={form.apellido} onChange={handleChange}
                  required placeholder="Torres" className={inp} />
              </div>
            </div>

            <div>
              <label className={lbl}>Nombre del negocio *</label>
              <input name="nombre_negocio" type="text" value={form.nombre_negocio} onChange={handleChange}
                required placeholder="Mi Tienda Online" className={inp} />
            </div>

            <div>
              <label className={lbl}>Correo electrónico *</label>
              <input name="email" type="email" value={form.email} onChange={handleChange}
                required placeholder="ana@negocio.com" className={inp} />
            </div>

            <div>
              <label className={lbl}>Contraseña *</label>
              <input name="password" type="password" value={form.password} onChange={handleChange}
                required placeholder="••••••••" className={inp} />
            </div>

            <div>
              <label className={lbl}>Confirmar contraseña *</label>
              <input name="confirmar" type="password" value={form.confirmar} onChange={handleChange}
                required placeholder="••••••••" className={inp} />
            </div>

            {error && (
              <p className="text-sm text-red-600 bg-red-50 px-3 py-2 rounded-lg">{error}</p>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-brand-600 text-white py-2 px-4 rounded-lg text-sm font-medium hover:bg-brand-700 disabled:opacity-50 transition-colors"
            >
              {loading ? 'Creando cuenta…' : 'Crear cuenta'}
            </button>
          </form>

          <p className="mt-4 text-center text-sm text-gray-500">
            ¿Ya tienes cuenta?{' '}
            <Link to="/login" className="text-brand-600 hover:underline font-medium">
              Inicia sesión
            </Link>
          </p>
        </div>
      </div>
    </div>
  )
}
