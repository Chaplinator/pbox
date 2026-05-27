import { useEffect, useState } from 'react'
import { useAuth } from '@/context/AuthContext'
import { supabase } from '@/supabase/client'

const inp = 'w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent disabled:bg-gray-50 disabled:text-gray-400'
const lbl = 'block text-xs font-medium text-gray-600 mb-1'

function SectionCard({ title, subtitle, children, onSave, saving, saved }) {
  return (
    <div className="bg-white rounded-xl border border-gray-200 p-6">
      <div className="mb-5">
        <h2 className="font-semibold text-gray-900">{title}</h2>
        {subtitle && <p className="text-xs text-gray-400 mt-0.5">{subtitle}</p>}
      </div>
      {children}
      <div className="flex items-center justify-end gap-3 mt-6 pt-4 border-t border-gray-100">
        {saved && (
          <span className="text-xs text-green-600 font-medium">Guardado correctamente</span>
        )}
        <button
          onClick={onSave}
          disabled={saving}
          className="px-4 py-2 text-sm bg-brand-600 text-white rounded-lg hover:bg-brand-700 disabled:opacity-50 transition-colors font-medium"
        >
          {saving ? 'Guardando…' : 'Guardar cambios'}
        </button>
      </div>
    </div>
  )
}

export default function Perfil() {
  const { perfil, setPerfil } = useAuth()

  const [personal, setPersonal]   = useState({ nombre: '', apellido: '', telefono: '' })
  const [negocio, setNegocio]     = useState({
    nombre_negocio: '', ruc: '', telefono: '',
    direccion: '', ciudad: '', provincia: '', pais: 'Ecuador',
  })
  const [clienteId, setClienteId] = useState(null)
  const [loading, setLoading]     = useState(true)

  const [savingP, setSavingP] = useState(false)
  const [savedP, setSavedP]   = useState(false)
  const [savingN, setSavingN] = useState(false)
  const [savedN, setSavedN]   = useState(false)
  const [errorP, setErrorP]   = useState('')
  const [errorN, setErrorN]   = useState('')

  useEffect(() => {
    if (!perfil) return
    setPersonal({ nombre: perfil.nombre ?? '', apellido: perfil.apellido ?? '', telefono: perfil.telefono ?? '' })

    supabase.from('clientes').select('*').eq('usuario_id', perfil.id).single()
      .then(({ data }) => {
        if (data) {
          setClienteId(data.id)
          setNegocio({
            nombre_negocio: data.nombre_negocio ?? '',
            ruc:            data.ruc       ?? '',
            telefono:       data.telefono  ?? '',
            direccion:      data.direccion ?? '',
            ciudad:         data.ciudad    ?? '',
            provincia:      data.provincia ?? '',
            pais:           data.pais      ?? 'Ecuador',
          })
        }
        setLoading(false)
      })
  }, [perfil])

  function setP(e) { setPersonal(f => ({ ...f, [e.target.name]: e.target.value })) }
  function setN(e) { setNegocio(f =>  ({ ...f, [e.target.name]: e.target.value })) }

  async function guardarPersonal() {
    setSavingP(true); setErrorP(''); setSavedP(false)
    const { error } = await supabase
      .from('usuarios')
      .update({ nombre: personal.nombre, apellido: personal.apellido || null, telefono: personal.telefono || null })
      .eq('id', perfil.id)
    setSavingP(false)
    if (error) { setErrorP(error.message); return }
    setPerfil(p => ({ ...p, nombre: personal.nombre, apellido: personal.apellido, telefono: personal.telefono }))
    setSavedP(true)
    setTimeout(() => setSavedP(false), 3000)
  }

  async function guardarNegocio() {
    if (!negocio.nombre_negocio.trim()) { setErrorN('El nombre del negocio es obligatorio.'); return }
    setSavingN(true); setErrorN(''); setSavedN(false)

    const payload = {
      nombre_negocio: negocio.nombre_negocio,
      ruc:       negocio.ruc       || null,
      telefono:  negocio.telefono  || null,
      direccion: negocio.direccion || null,
      ciudad:    negocio.ciudad    || null,
      provincia: negocio.provincia || null,
      pais:      negocio.pais      || 'Ecuador',
    }

    const { error } = clienteId
      ? await supabase.from('clientes').update(payload).eq('id', clienteId)
      : await supabase.from('clientes').insert({ usuario_id: perfil.id, ...payload }).select('id').single()
        .then(async ({ data, error }) => {
          if (data) setClienteId(data.id)
          return { error }
        })

    setSavingN(false)
    if (error) { setErrorN(error.message); return }
    setSavedN(true)
    setTimeout(() => setSavedN(false), 3000)
  }

  if (loading) return <div className="p-8 text-center text-gray-400 text-sm">Cargando…</div>

  return (
    <div className="p-8 max-w-2xl">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Mi perfil</h1>
        <p className="text-gray-500 text-sm">Datos personales y de tu negocio</p>
      </div>

      <div className="space-y-6">
        {/* Datos personales */}
        <SectionCard
          title="Datos personales"
          subtitle="Nombre y contacto de tu cuenta"
          onSave={guardarPersonal}
          saving={savingP}
          saved={savedP}
        >
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className={lbl}>Nombre *</label>
              <input name="nombre" value={personal.nombre} onChange={setP} className={inp} />
            </div>
            <div>
              <label className={lbl}>Apellido</label>
              <input name="apellido" value={personal.apellido} onChange={setP} className={inp} />
            </div>
            <div className="col-span-2 sm:col-span-1">
              <label className={lbl}>Teléfono personal</label>
              <input name="telefono" value={personal.telefono} onChange={setP} className={inp} placeholder="0999123456" />
            </div>
            <div className="col-span-2">
              <label className={lbl}>Correo electrónico</label>
              <input value={perfil?.email ?? ''} disabled className={inp} />
              <p className="text-xs text-gray-400 mt-1">El correo no se puede modificar desde aquí.</p>
            </div>
          </div>
          {errorP && <p className="text-sm text-red-600 bg-red-50 px-3 py-2 rounded-lg mt-3">{errorP}</p>}
        </SectionCard>

        {/* Perfil del negocio */}
        <SectionCard
          title="Perfil del negocio"
          subtitle="Información de tu empresa para facturación y despachos"
          onSave={guardarNegocio}
          saving={savingN}
          saved={savedN}
        >
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2">
              <label className={lbl}>Nombre del negocio *</label>
              <input name="nombre_negocio" value={negocio.nombre_negocio} onChange={setN}
                className={inp} placeholder="Mi Tienda Online" />
            </div>
            <div>
              <label className={lbl}>RUC / Cédula</label>
              <input name="ruc" value={negocio.ruc} onChange={setN}
                className={inp} placeholder="0912345678001" />
            </div>
            <div>
              <label className={lbl}>Teléfono del negocio</label>
              <input name="telefono" value={negocio.telefono} onChange={setN}
                className={inp} placeholder="042123456" />
            </div>
            <div className="col-span-2">
              <label className={lbl}>Dirección</label>
              <input name="direccion" value={negocio.direccion} onChange={setN}
                className={inp} placeholder="Av. Principal 123 y Secundaria" />
            </div>
            <div>
              <label className={lbl}>Ciudad</label>
              <input name="ciudad" value={negocio.ciudad} onChange={setN}
                className={inp} placeholder="Guayaquil" />
            </div>
            <div>
              <label className={lbl}>Provincia</label>
              <input name="provincia" value={negocio.provincia} onChange={setN}
                className={inp} placeholder="Guayas" />
            </div>
            <div>
              <label className={lbl}>País</label>
              <input name="pais" value={negocio.pais} onChange={setN}
                className={inp} />
            </div>
          </div>
          {errorN && <p className="text-sm text-red-600 bg-red-50 px-3 py-2 rounded-lg mt-3">{errorN}</p>}
        </SectionCard>
      </div>
    </div>
  )
}
