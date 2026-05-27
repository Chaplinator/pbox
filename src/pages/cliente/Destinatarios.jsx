import { useState, useEffect, useCallback } from 'react'
import { useAuth } from '@/context/AuthContext'
import { supabase } from '@/supabase/client'

const inp = 'w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent'
const lbl = 'block text-xs font-medium text-gray-600 mb-1'

const VACIO = {
  nombres: '', apellidos: '', cedula: '',
  telefono1: '', telefono2: '', email: '',
  direccion: '', numero_casa: '', ciudad: '', provincia: '', referencias: '',
}

function ModalDestinatario({ open, onClose, clienteId, editando, onSaved }) {
  const [form, setForm]     = useState(VACIO)
  const [saving, setSaving] = useState(false)
  const [error, setError]   = useState('')

  useEffect(() => {
    if (!open) return
    setError('')
    setForm(editando ? {
      nombres:    editando.nombres    ?? '',
      apellidos:  editando.apellidos  ?? '',
      cedula:     editando.cedula     ?? '',
      telefono1:  editando.telefono1  ?? '',
      telefono2:  editando.telefono2  ?? '',
      email:      editando.email      ?? '',
      direccion:  editando.direccion  ?? '',
      numero_casa:editando.numero_casa?? '',
      ciudad:     editando.ciudad     ?? '',
      provincia:  editando.provincia  ?? '',
      referencias:editando.referencias?? '',
    } : VACIO)
  }, [open, editando])

  function setF(e) { setForm(f => ({ ...f, [e.target.name]: e.target.value })) }

  async function guardar(e) {
    e.preventDefault()
    setSaving(true); setError('')
    const payload = { ...form, cliente_id: clienteId }

    const { error: err } = editando
      ? await supabase.from('destinatarios').update(payload).eq('id', editando.id)
      : await supabase.from('destinatarios').insert(payload)

    setSaving(false)
    if (err) { setError(err.message); return }
    onSaved()
  }

  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
          <h2 className="font-semibold text-gray-900">
            {editando ? 'Editar destinatario' : 'Nuevo destinatario'}
          </h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-2xl leading-none">&times;</button>
        </div>

        <form onSubmit={guardar} className="p-6 space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={lbl}>Nombres *</label>
              <input name="nombres" value={form.nombres} onChange={setF} required className={inp} />
            </div>
            <div>
              <label className={lbl}>Apellidos *</label>
              <input name="apellidos" value={form.apellidos} onChange={setF} required className={inp} />
            </div>
            <div>
              <label className={lbl}>Cédula</label>
              <input name="cedula" value={form.cedula} onChange={setF} className={inp} placeholder="0912345678" />
            </div>
            <div>
              <label className={lbl}>Teléfono 1 *</label>
              <input name="telefono1" value={form.telefono1} onChange={setF} required className={inp} placeholder="0999123456" />
            </div>
            <div>
              <label className={lbl}>Teléfono 2</label>
              <input name="telefono2" value={form.telefono2} onChange={setF} className={inp} placeholder="Opcional" />
            </div>
            <div>
              <label className={lbl}>Correo electrónico</label>
              <input name="email" type="email" value={form.email} onChange={setF} className={inp} placeholder="Opcional" />
            </div>
            <div className="col-span-2">
              <label className={lbl}>Dirección</label>
              <input name="direccion" value={form.direccion} onChange={setF} className={inp} placeholder="Av. Principal 123 y Secundaria" />
            </div>
            <div>
              <label className={lbl}>N° casa / dpto</label>
              <input name="numero_casa" value={form.numero_casa} onChange={setF} className={inp} placeholder="Dpto 4B" />
            </div>
            <div>
              <label className={lbl}>Ciudad</label>
              <input name="ciudad" value={form.ciudad} onChange={setF} className={inp} placeholder="Guayaquil" />
            </div>
            <div>
              <label className={lbl}>Provincia</label>
              <input name="provincia" value={form.provincia} onChange={setF} className={inp} placeholder="Guayas" />
            </div>
            <div>
              <label className={lbl}>Referencias</label>
              <input name="referencias" value={form.referencias} onChange={setF} className={inp} placeholder="Frente al parque…" />
            </div>
          </div>

          {error && <p className="text-sm text-red-600 bg-red-50 px-3 py-2 rounded-lg">{error}</p>}

          <div className="flex justify-end gap-2 pt-1">
            <button type="button" onClick={onClose}
              className="px-4 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded-lg transition-colors">
              Cancelar
            </button>
            <button type="submit" disabled={saving}
              className="px-4 py-2 text-sm bg-brand-600 text-white rounded-lg hover:bg-brand-700 disabled:opacity-50 transition-colors">
              {saving ? 'Guardando…' : 'Guardar'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

export default function Destinatarios() {
  const { perfil } = useAuth()
  const [clienteId, setClienteId]         = useState(null)
  const [destinatarios, setDestinatarios] = useState([])
  const [busqueda, setBusqueda]           = useState('')
  const [loading, setLoading]             = useState(true)
  const [modalOpen, setModalOpen]         = useState(false)
  const [editando, setEditando]           = useState(null)
  const [eliminando, setEliminando]       = useState(null)

  useEffect(() => {
    if (!perfil) return
    supabase.from('clientes').select('id').eq('usuario_id', perfil.id).single()
      .then(({ data }) => { if (data) setClienteId(data.id) })
  }, [perfil])

  const cargar = useCallback(async () => {
    if (!clienteId) return
    setLoading(true)
    const { data } = await supabase
      .from('destinatarios')
      .select('*')
      .eq('cliente_id', clienteId)
      .order('apellidos')
    setDestinatarios(data ?? [])
    setLoading(false)
  }, [clienteId])

  useEffect(() => { cargar() }, [cargar])

  async function eliminar(id) {
    await supabase.from('destinatarios').delete().eq('id', id)
    setEliminando(null)
    cargar()
  }

  const filtrados = destinatarios.filter(d => {
    const q = busqueda.toLowerCase()
    return !q ||
      d.nombres.toLowerCase().includes(q) ||
      d.apellidos.toLowerCase().includes(q) ||
      (d.ciudad ?? '').toLowerCase().includes(q) ||
      (d.cedula ?? '').includes(q)
  })

  function abrirNuevo() { setEditando(null); setModalOpen(true) }
  function abrirEditar(d) { setEditando(d); setModalOpen(true) }

  return (
    <div className="p-8">
      <div className="mb-6 flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Destinatarios</h1>
          <p className="text-gray-500 text-sm mt-0.5">Agenda de clientes frecuentes para agilizar nuevos pedidos</p>
        </div>
        <button
          onClick={abrirNuevo}
          className="px-4 py-2 text-sm bg-brand-600 text-white rounded-lg hover:bg-brand-700 transition-colors font-medium"
        >
          + Nuevo destinatario
        </button>
      </div>

      {/* Buscador */}
      <div className="mb-4">
        <input
          value={busqueda}
          onChange={e => setBusqueda(e.target.value)}
          placeholder="Buscar por nombre, ciudad o cédula…"
          className="w-full max-w-sm px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent"
        />
      </div>

      {/* Tabla */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-gray-400 text-sm">Cargando…</div>
        ) : filtrados.length === 0 ? (
          <div className="p-8 text-center text-gray-400 text-sm">
            {busqueda ? 'Sin resultados para esa búsqueda.' : 'No hay destinatarios guardados. Agrega uno para comenzar.'}
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Nombre</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Cédula</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Teléfono</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Ciudad</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Dirección</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filtrados.map(d => (
                <tr key={d.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-4 py-3 font-medium text-gray-900">
                    {d.nombres} {d.apellidos}
                  </td>
                  <td className="px-4 py-3 text-gray-500">{d.cedula || '—'}</td>
                  <td className="px-4 py-3 text-gray-600">
                    {d.telefono1}
                    {d.telefono2 && <span className="text-gray-400"> · {d.telefono2}</span>}
                  </td>
                  <td className="px-4 py-3 text-gray-600">{d.ciudad || '—'}</td>
                  <td className="px-4 py-3 text-gray-500 max-w-xs truncate">
                    {[d.direccion, d.numero_casa].filter(Boolean).join(', ') || '—'}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3 justify-end">
                      <button
                        onClick={() => abrirEditar(d)}
                        className="text-xs text-brand-600 hover:underline font-medium"
                      >
                        Editar
                      </button>
                      {eliminando === d.id ? (
                        <span className="flex items-center gap-2">
                          <button
                            onClick={() => eliminar(d.id)}
                            className="text-xs text-red-600 hover:underline font-medium"
                          >
                            Confirmar
                          </button>
                          <button
                            onClick={() => setEliminando(null)}
                            className="text-xs text-gray-400 hover:underline"
                          >
                            Cancelar
                          </button>
                        </span>
                      ) : (
                        <button
                          onClick={() => setEliminando(d.id)}
                          className="text-xs text-gray-400 hover:text-red-500 transition-colors"
                        >
                          Eliminar
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <ModalDestinatario
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        clienteId={clienteId}
        editando={editando}
        onSaved={() => { setModalOpen(false); cargar() }}
      />
    </div>
  )
}
