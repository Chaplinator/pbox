import { useEffect, useState, useCallback } from 'react'
import { useAuth } from '@/context/AuthContext'
import { useTranslation } from 'react-i18next'
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
  const { perfil, setPerfil, changeLanguage } = useAuth()
  const { t, i18n } = useTranslation()

  const [personal, setPersonal]   = useState({ nombre: '', apellido: '', telefono: '' })
  const [negocio, setNegocio]     = useState({
    nombre_negocio: '', ruc: '', telefono: '',
    direccion: '', ciudad: '', provincia: '', pais: 'Ecuador',
  })
  const [clienteId, setClienteId] = useState(null)
  const [alertas, setAlertas]     = useState({ alerta_stock: true, alerta_pedidos: true, alerta_m2: true, alerta_m2_pct: 80 })
  const [m2Contratados, setM2Contratados] = useState(null)
  const [loading, setLoading]     = useState(true)

  const [savingP, setSavingP] = useState(false)
  const [savedP, setSavedP]   = useState(false)
  const [savingN, setSavingN] = useState(false)
  const [savedN, setSavedN]   = useState(false)
  const [savingA, setSavingA] = useState(false)
  const [savedA, setSavedA]   = useState(false)
  const [errorP, setErrorP]   = useState('')
  const [errorN, setErrorN]   = useState('')
  const [savingLang, setSavingLang] = useState(false)
  const [savedLang, setSavedLang]   = useState(false)
  const [selectedLanguage, setSelectedLanguage] = useState(perfil?.idioma || 'es')

  useEffect(() => {
    if (!perfil) return
    setPersonal({ nombre: perfil.nombre ?? '', apellido: perfil.apellido ?? '', telefono: perfil.telefono ?? '' })
    setSelectedLanguage(perfil.idioma || 'es')

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
          setAlertas({
            alerta_stock:   data.alerta_stock   ?? true,
            alerta_pedidos: data.alerta_pedidos ?? true,
            alerta_m2:      data.alerta_m2      ?? true,
            alerta_m2_pct:  data.alerta_m2_pct  ?? 80,
          })
          setM2Contratados(data.m2_contratados ?? null)
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

  async function guardarAlertas() {
    if (!clienteId) return
    setSavingA(true); setSavedA(false)
    const { error } = await supabase
      .from('clientes')
      .update({
        alerta_stock:   alertas.alerta_stock,
        alerta_pedidos: alertas.alerta_pedidos,
        alerta_m2:      alertas.alerta_m2,
        alerta_m2_pct:  alertas.alerta_m2_pct,
      })
      .eq('id', clienteId)
    setSavingA(false)
    if (error) return
    setSavedA(true)
    setTimeout(() => setSavedA(false), 3000)
  }

  async function cambiarIdioma() {
    setSavingLang(true); setSavedLang(false)
    const success = await changeLanguage(selectedLanguage)
    setSavingLang(false)
    if (!success) return
    setSavedLang(true)
    setTimeout(() => setSavedLang(false), 3000)
  }

  if (loading) return <div className="p-8 text-center text-gray-400 text-sm">Cargando…</div>

  return (
    <div className="p-8 max-w-2xl">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">{t('title', { ns: 'perfil' })}</h1>
        <p className="text-gray-500 text-sm">{t('personal_info', { ns: 'perfil' })}</p>
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

        {/* Idioma */}
        <SectionCard
          title={t('language', { ns: 'perfil' })}
          subtitle={t('language', { ns: 'perfil' })}
          onSave={cambiarIdioma}
          saving={savingLang}
          saved={savedLang}
        >
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className={lbl}>{t('language', { ns: 'perfil' })}</label>
              <select
                value={selectedLanguage}
                onChange={(e) => setSelectedLanguage(e.target.value)}
                className={inp}
              >
                <option value="es">{t('language_es', { ns: 'perfil' })}</option>
                <option value="en">{t('language_en', { ns: 'perfil' })}</option>
              </select>
            </div>
          </div>
        </SectionCard>

        {/* Alertas */}
        <SectionCard
          title="Alertas por correo"
          subtitle="Recibirás notificaciones en el correo de tu cuenta"
          onSave={guardarAlertas}
          saving={savingA}
          saved={savedA}
        >
          <div className="space-y-4">
            <label className="flex items-start gap-3 cursor-pointer">
              <input type="checkbox" checked={alertas.alerta_stock}
                onChange={e => setAlertas(a => ({ ...a, alerta_stock: e.target.checked }))}
                className="mt-0.5 w-4 h-4 rounded border-gray-300 text-brand-600 focus:ring-brand-500" />
              <div>
                <p className="text-sm font-medium text-gray-800">Alerta de stock bajo</p>
                <p className="text-xs text-gray-400">Te avisamos cuando algún producto baje del stock mínimo.</p>
              </div>
            </label>
            <label className="flex items-start gap-3 cursor-pointer">
              <input type="checkbox" checked={alertas.alerta_pedidos}
                onChange={e => setAlertas(a => ({ ...a, alerta_pedidos: e.target.checked }))}
                className="mt-0.5 w-4 h-4 rounded border-gray-300 text-brand-600 focus:ring-brand-500" />
              <div>
                <p className="text-sm font-medium text-gray-800">Cambios de estado en pedidos</p>
                <p className="text-xs text-gray-400">Te avisamos cada vez que un pedido cambie de estado.</p>
              </div>
            </label>
            <label className="flex items-start gap-3 cursor-pointer">
              <input type="checkbox" checked={alertas.alerta_m2}
                onChange={e => setAlertas(a => ({ ...a, alerta_m2: e.target.checked }))}
                className="mt-0.5 w-4 h-4 rounded border-gray-300 text-brand-600 focus:ring-brand-500" />
              <div className="flex-1">
                <p className="text-sm font-medium text-gray-800">Espacio de bodega al límite</p>
                <p className="text-xs text-gray-400 mb-2">
                  Te avisamos cuando uses más del{' '}
                  <span className="font-semibold text-gray-600">{alertas.alerta_m2_pct}%</span>
                  {m2Contratados ? ` de tus ${m2Contratados} m² contratados.` : ' de tu espacio contratado.'}
                </p>
                {alertas.alerta_m2 && (
                  <div className="flex items-center gap-2">
                    <input type="range" min="60" max="95" step="5"
                      value={alertas.alerta_m2_pct}
                      onChange={e => setAlertas(a => ({ ...a, alerta_m2_pct: Number(e.target.value) }))}
                      className="w-32 accent-brand-600" />
                    <span className="text-xs text-gray-500 w-10">{alertas.alerta_m2_pct}%</span>
                  </div>
                )}
              </div>
            </label>
          </div>
        </SectionCard>

        {/* Mi equipo */}
        <EquipoSection clienteId={clienteId} perfilId={perfil?.id} bodegaId={perfil?.bodega_id} />
      </div>
    </div>
  )
}

function EquipoSection({ clienteId, perfilId, bodegaId }) {
  const [miembros, setMiembros]   = useState([])
  const [loading, setLoading]     = useState(false)
  const [form, setForm]           = useState({ email: '', nombre: '', apellido: '' })
  const [inviting, setInviting]   = useState(false)
  const [inviteOk, setInviteOk]   = useState(false)
  const [error, setError]         = useState('')
  const [showForm, setShowForm]   = useState(false)

  const cargar = useCallback(async () => {
    if (!clienteId) return
    setLoading(true)
    const { data } = await supabase
      .from('usuarios')
      .select('id, nombre, apellido, email, created_at')
      .eq('cliente_id', clienteId)
    setMiembros(data ?? [])
    setLoading(false)
  }, [clienteId])

  useEffect(() => { cargar() }, [cargar])

  async function invitar(e) {
    e.preventDefault()
    setError(''); setInviting(true); setInviteOk(false)
    const { data, error: err } = await supabase.functions.invoke('invite-subusuario', {
      body: { email: form.email, nombre: form.nombre, apellido: form.apellido, cliente_id: clienteId, bodega_id: bodegaId },
    })
    setInviting(false)
    if (err || data?.error) { setError(data?.error ?? err.message); return }
    setInviteOk(true)
    setForm({ email: '', nombre: '', apellido: '' })
    setShowForm(false)
    setTimeout(() => setInviteOk(false), 4000)
    cargar()
  }

  async function revocarAcceso(usuario) {
    if (!confirm(`¿Revocar el acceso de ${usuario.nombre} a este negocio?`)) return
    await supabase.from('usuarios').update({ cliente_id: null }).eq('id', usuario.id)
    cargar()
  }

  if (!clienteId) return null

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-6">
      <div className="flex items-start justify-between mb-5">
        <div>
          <h2 className="font-semibold text-gray-900">Mi equipo</h2>
          <p className="text-xs text-gray-400 mt-0.5">Personas con acceso a tu inventario y pedidos</p>
        </div>
        {!showForm && (
          <button onClick={() => setShowForm(true)}
            className="px-3 py-1.5 text-xs bg-brand-600 text-white rounded-lg hover:bg-brand-700 transition-colors font-medium">
            + Invitar miembro
          </button>
        )}
      </div>

      {/* Formulario de invitación */}
      {showForm && (
        <form onSubmit={invitar} className="bg-brand-50 border border-brand-200 rounded-xl p-4 mb-5 space-y-3">
          <p className="text-xs font-semibold text-brand-700">Enviar invitación por email</p>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={lbl}>Nombre *</label>
              <input value={form.nombre} onChange={e => setForm(f => ({ ...f, nombre: e.target.value }))}
                required className={inp} placeholder="Ana" />
            </div>
            <div>
              <label className={lbl}>Apellido</label>
              <input value={form.apellido} onChange={e => setForm(f => ({ ...f, apellido: e.target.value }))}
                className={inp} placeholder="Torres" />
            </div>
            <div className="col-span-2">
              <label className={lbl}>Correo electrónico *</label>
              <input type="email" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
                required className={inp} placeholder="ana@negocio.com" />
            </div>
          </div>
          {error && <p className="text-xs text-red-600 bg-red-50 px-3 py-2 rounded-lg">{error}</p>}
          <div className="flex justify-end gap-2">
            <button type="button" onClick={() => { setShowForm(false); setError('') }}
              className="px-3 py-1.5 text-xs text-gray-600 hover:bg-gray-100 rounded-lg transition-colors">
              Cancelar
            </button>
            <button type="submit" disabled={inviting}
              className="px-4 py-1.5 text-xs bg-brand-600 text-white rounded-lg hover:bg-brand-700 disabled:opacity-50 transition-colors font-medium">
              {inviting ? 'Enviando…' : 'Enviar invitación'}
            </button>
          </div>
        </form>
      )}

      {inviteOk && (
        <div className="mb-4 bg-green-50 border border-green-200 rounded-lg px-4 py-2 text-sm text-green-700">
          Invitación enviada. El usuario recibirá un email para activar su cuenta.
        </div>
      )}

      {/* Lista de miembros */}
      {loading ? (
        <p className="text-xs text-gray-400">Cargando…</p>
      ) : miembros.length === 0 ? (
        <p className="text-sm text-gray-400">Aún no hay miembros en tu equipo.</p>
      ) : (
        <div className="divide-y divide-gray-100">
          {miembros.map(m => (
            <div key={m.id} className="flex items-center justify-between py-3">
              <div>
                <p className="text-sm font-medium text-gray-800">
                  {[m.nombre, m.apellido].filter(Boolean).join(' ')}
                </p>
                <p className="text-xs text-gray-400">{m.email}</p>
              </div>
              <button onClick={() => revocarAcceso(m)}
                className="text-xs text-gray-400 hover:text-red-500 transition-colors">
                Revocar acceso
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
