import { useEffect, useMemo, useState } from 'react'
import { useLocation } from 'react-router-dom'
import { useAuth } from '@/context/AuthContext'
import { supabase } from '@/supabase/client'
import { exportarResumen } from '@/utils/exportExcel'
import * as XLSX from 'xlsx'

// Wrapper local para no depender de la función genérica vía require()
function xlsxDownload(filas, nombreArchivo, hoja) {
  const ws = XLSX.utils.json_to_sheet(filas)
  const wb = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(wb, ws, hoja)
  XLSX.writeFile(wb, `${nombreArchivo}_${new Date().toISOString().slice(0,10)}.xlsx`)
}

const TABS = ['dashboard', 'bodegas', 'usuarios', 'inventario', 'pedidos', 'ingresos', 'reportes']
const TAB_LABEL = {
  dashboard: 'Dashboard',
  bodegas: 'Bodegas & m²',
  usuarios: 'Usuarios',
  inventario: 'Inventario',
  pedidos: 'Pedidos',
  ingresos: 'Ingresos',
  reportes: 'Reportes',
}

function tabFromPath(pathname) {
  const seg = pathname.split('/')[2]
  return TABS.includes(seg) ? seg : 'dashboard'
}

export default function Admin() {
  const { perfil } = useAuth()
  const location = useLocation()
  const activeTab = tabFromPath(location.pathname)

  const [bodegas, setBodegas] = useState([])
  const [usuarios, setUsuarios] = useState([])
  const [clientes, setClientes] = useState([])
  const [planes, setPlanes] = useState([])
  const [opBodegas, setOpBodegas] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (perfil?.id) cargar()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [perfil?.id])

  async function cargar() {
    setLoading(true)
    const [b, u, p, c, ob] = await Promise.all([
      supabase.from('bodegas').select('*'),
      supabase.from('usuarios').select('id, nombre, apellido, email, rol, activo, bodega_id, deleted_at'),
      supabase.from('planes').select('*').order('created_at'),
      supabase.from('clientes').select('id, usuario_id, nombre_negocio, m2_contratados, bodega_id'),
      supabase.from('operador_bodegas').select('operador_id, bodega_id'),
    ])
    if (b.error) console.error('bodegas:', b.error)
    if (u.error) console.error('usuarios:', u.error)
    if (p.error) console.error('planes:', p.error)
    setBodegas(b.data || [])
    setUsuarios(u.data || [])
    setPlanes(p.data || [])
    setClientes(c.data || [])
    setOpBodegas(ob.data || [])
    setLoading(false)
  }

  if (perfil?.rol !== 'administrador_cuenta') {
    return <div className="p-8 text-center"><p className="text-red-600">Acceso denegado</p></div>
  }

  const misBodegas = bodegas.filter(b => b.admin_id === perfil.id)
  const misBodegaIds = misBodegas.map(b => b.id)
  const misUsuarios = usuarios.filter(u => misBodegaIds.includes(u.bodega_id) && u.id !== perfil.id && !u.deleted_at)

  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Panel de Administración</h1>
        <p className="text-gray-600 mt-1">Gestiona tus bodegas, usuarios y operaciones</p>
      </div>

      <div className="bg-white rounded-lg shadow p-6">
        {loading ? (
          <p className="text-gray-600">Cargando…</p>
        ) : activeTab === 'dashboard' ? (
          <DashboardTab bodegas={misBodegas} />
        ) : activeTab === 'bodegas' ? (
          <BodegasTab bodegas={misBodegas} planes={planes} adminId={perfil.id} onSaved={cargar} />
        ) : activeTab === 'usuarios' ? (
          <UsuariosTab usuarios={misUsuarios} bodegas={misBodegas} clientes={clientes} opBodegas={opBodegas} onSaved={cargar} />
        ) : activeTab === 'inventario' ? (
          <InventarioTab bodegaIds={misBodegaIds} />
        ) : activeTab === 'pedidos' ? (
          <PedidosTab bodegaIds={misBodegaIds} />
        ) : activeTab === 'ingresos' ? (
          <IngresosTab bodegaIds={misBodegaIds} />
        ) : activeTab === 'reportes' ? (
          <ReportesTab bodegas={misBodegas} bodegaIds={misBodegaIds} />
        ) : (
          <Placeholder tab={activeTab} />
        )}
      </div>
    </div>
  )
}

/* ---------------- DASHBOARD ---------------- */

function DashboardTab({ bodegas }) {
  const [loading, setLoading] = useState(true)
  const [filas, setFilas] = useState([])
  const [sortKey, setSortKey] = useState('m2_ocupado')
  const [sortDir, setSortDir] = useState('desc')

  const bodegaIds = useMemo(() => bodegas.map(b => b.id), [bodegas])
  const nombreBodega = (id) => bodegas.find(b => b.id === id)?.nombre || '—'

  useEffect(() => {
    if (bodegaIds.length) cargar()
    else setLoading(false)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [bodegaIds.join(',')])

  async function cargar() {
    setLoading(true)
    try {
      const { data: cls } = await supabase
        .from('clientes')
        .select('id, usuario_id, nombre_negocio, bodega_id, m2_contratados, plan, usuarios!usuario_id(rol)')
        .in('bodega_id', bodegaIds)
      // Solo clientes reales (excluir operadores que tengan registro en clientes por error del trigger)
      const clientes = (cls || []).filter(c => c.usuarios?.rol === 'cliente')
      const clienteIds = clientes.map(c => c.id)

      let inv = [], rot = [], peds = []
      if (clienteIds.length) {
        const invRes = await supabase
          .from('vista_inventario')
          .select('producto_id, cliente_id, sku, cantidad, m2_total, m3_total, activo')
          .in('cliente_id', clienteIds)
        inv = invRes.data || []
        const productoIds = inv.map(i => i.producto_id)
        if (productoIds.length) {
          const rotRes = await supabase
            .from('vista_rotacion_30d')
            .select('producto_id, unidades_30d, pedidos_30d')
            .in('producto_id', productoIds)
          rot = rotRes.data || []
        }
      }
      const pedRes = await supabase.from('pedidos').select('id, cliente_id').in('bodega_id', bodegaIds)
      peds = pedRes.data || []

      const rotByProd = {}
      rot.forEach(r => { rotByProd[r.producto_id] = r })
      const pedPorCliente = {}
      peds.forEach(p => { pedPorCliente[p.cliente_id] = (pedPorCliente[p.cliente_id] || 0) + 1 })

      const f = clientes.map(c => {
        const invC = inv.filter(i => i.cliente_id === c.id)
        const m2_ocupado = invC.reduce((a, i) => a + (Number(i.m2_total) || 0), 0)
        const m3_ocupado = invC.reduce((a, i) => a + (Number(i.m3_total) || 0), 0)
        const skus = invC.filter(i => i.activo).length
        const unidades = invC.reduce((a, i) => a + (Number(i.cantidad) || 0), 0)
        const rot_u = invC.reduce((a, i) => a + (rotByProd[i.producto_id]?.unidades_30d || 0), 0)
        const rot_p = invC.reduce((a, i) => a + (rotByProd[i.producto_id]?.pedidos_30d || 0), 0)
        const m2_contratados = Number(c.m2_contratados) || 0
        return {
          cliente_id: c.id,
          nombre: c.nombre_negocio || '—',
          bodega_id: c.bodega_id,
          m2_contratados,
          m2_ocupado: Math.round(m2_ocupado * 100) / 100,
          m3_ocupado: Math.round(m3_ocupado * 100) / 100,
          skus,
          unidades,
          rot_u,
          rot_p,
          pedidos: pedPorCliente[c.id] || 0,
          uso_pct: m2_contratados > 0 ? Math.round((m2_ocupado / m2_contratados) * 1000) / 10 : 0,
        }
      })
      setFilas(f)
    } catch (e) {
      console.error('dashboard:', e)
    }
    setLoading(false)
  }

  const filasOrdenadas = useMemo(() => {
    const arr = [...filas]
    arr.sort((a, b) => {
      const va = a[sortKey], vb = b[sortKey]
      if (typeof va === 'string') return sortDir === 'asc' ? va.localeCompare(vb) : vb.localeCompare(va)
      return sortDir === 'asc' ? va - vb : vb - va
    })
    return arr
  }, [filas, sortKey, sortDir])

  function toggleSort(key) {
    if (sortKey === key) setSortDir(d => d === 'asc' ? 'desc' : 'asc')
    else { setSortKey(key); setSortDir('desc') }
  }

  // Métricas por bodega
  const statsBodega = bodegas.map(b => {
    const fc = filas.filter(f => f.bodega_id === b.id)
    const capacidad = Number(b.plan_limite_m2) || 0
    const ocupado = fc.reduce((a, f) => a + f.m2_ocupado, 0)
    return { ...b, capacidad, ocupado: Math.round(ocupado * 100) / 100, clientes: fc.length, uso_pct: capacidad > 0 ? Math.round((ocupado / capacidad) * 1000) / 10 : 0 }
  })

  const totCapacidad = statsBodega.reduce((a, b) => a + b.capacidad, 0)
  const totOcupado = Math.round(statsBodega.reduce((a, b) => a + b.ocupado, 0) * 100) / 100
  const totSkus = filas.reduce((a, f) => a + f.skus, 0)
  const totPedidos = filas.reduce((a, f) => a + f.pedidos, 0)

  function descargar() {
    const rows = filasOrdenadas.map(f => ({
      'Cliente': f.nombre,
      'Bodega': nombreBodega(f.bodega_id),
      'm² contratados': f.m2_contratados,
      'm² ocupado': f.m2_ocupado,
      '% uso': f.uso_pct,
      'SKUs': f.skus,
      'Unidades': f.unidades,
      'm³ ocupado': f.m3_ocupado,
      'Rotación 30d (u)': f.rot_u,
      'Rotación 30d (ped)': f.rot_p,
      'Pedidos': f.pedidos,
    }))
    exportarResumen(rows, 'resumen_clientes', 'Clientes')
  }

  if (loading) return <p className="text-gray-600">Cargando…</p>
  if (bodegas.length === 0) {
    return <p className="text-gray-500">Aún no tienes bodegas. Créalas en la pestaña “Bodegas & m²”.</p>
  }

  const COLS = [
    { key: 'nombre', label: 'Cliente', align: 'left' },
    { key: 'm2_contratados', label: 'm² contrat.', align: 'right' },
    { key: 'm2_ocupado', label: 'm² ocupado', align: 'right' },
    { key: 'uso_pct', label: '% uso', align: 'right' },
    { key: 'skus', label: 'SKUs', align: 'right' },
    { key: 'unidades', label: 'Unidades', align: 'right' },
    { key: 'rot_u', label: 'Rot. 30d', align: 'right' },
    { key: 'pedidos', label: 'Pedidos', align: 'right' },
  ]

  return (
    <div className="space-y-8">
      <div className="flex justify-between items-start">
        <h2 className="text-xl font-bold">Resumen</h2>
        <button onClick={descargar} className="px-4 py-2 bg-green-600 text-white rounded-lg text-sm font-medium hover:bg-green-700">
          ⬇ Descargar Excel
        </button>
      </div>

      {/* Tarjetas */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3">
        <Stat label="Bodegas" value={bodegas.length} />
        <Stat label="Capacidad m²" value={totCapacidad.toLocaleString()} />
        <Stat label="m² ocupado" value={totOcupado.toLocaleString()} />
        <Stat label="% uso" value={totCapacidad > 0 ? `${Math.round((totOcupado / totCapacidad) * 1000) / 10}%` : '—'} />
        <Stat label="SKUs" value={totSkus} />
        <Stat label="Pedidos" value={totPedidos} />
      </div>

      {/* Por bodega */}
      <div>
        <h3 className="text-lg font-bold mb-3">Bodegas</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {statsBodega.map(b => (
            <div key={b.id} className="border border-gray-200 rounded-lg p-4">
              <p className="font-semibold text-gray-900">{b.nombre}</p>
              <div className="mt-2 space-y-1 text-sm text-gray-600">
                <div className="flex justify-between"><span>Capacidad</span><span className="text-gray-900">{b.capacidad.toLocaleString()} m²</span></div>
                <div className="flex justify-between"><span>Ocupado</span><span className="text-gray-900">{b.ocupado.toLocaleString()} m²</span></div>
                <div className="flex justify-between"><span>Uso</span><span className={b.uso_pct >= 90 ? 'text-red-600 font-medium' : 'text-gray-900'}>{b.uso_pct}%</span></div>
                <div className="flex justify-between"><span>Clientes</span><span className="text-gray-900">{b.clientes}</span></div>
              </div>
              <div className="mt-2 h-2 bg-gray-100 rounded-full overflow-hidden">
                <div className={`h-full ${b.uso_pct >= 90 ? 'bg-red-500' : 'bg-brand-500'}`} style={{ width: `${Math.min(100, b.uso_pct)}%` }} />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Ranking de clientes */}
      <div>
        <h3 className="text-lg font-bold mb-3">Clientes (clic en columna para ordenar)</h3>
        {filas.length === 0 ? (
          <p className="text-gray-500 text-sm">No hay clientes con datos todavía.</p>
        ) : (
          <div className="overflow-x-auto border border-gray-200 rounded-lg">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 text-gray-600">
                <tr>
                  <th className="text-left px-3 py-2 font-medium">#</th>
                  {COLS.map(c => (
                    <th
                      key={c.key}
                      onClick={() => toggleSort(c.key)}
                      className={`px-3 py-2 font-medium cursor-pointer select-none hover:text-gray-900 ${c.align === 'right' ? 'text-right' : 'text-left'}`}
                    >
                      {c.label}{sortKey === c.key ? (sortDir === 'asc' ? ' ▲' : ' ▼') : ''}
                    </th>
                  ))}
                  <th className="text-left px-3 py-2 font-medium">Bodega</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filasOrdenadas.map((f, i) => (
                  <tr key={f.cliente_id} className="hover:bg-gray-50">
                    <td className="px-3 py-2 text-gray-400">{i + 1}</td>
                    <td className="px-3 py-2 font-medium text-gray-900">{f.nombre}</td>
                    <td className="px-3 py-2 text-right">{f.m2_contratados.toLocaleString()}</td>
                    <td className="px-3 py-2 text-right">{f.m2_ocupado.toLocaleString()}</td>
                    <td className={`px-3 py-2 text-right ${f.uso_pct >= 90 ? 'text-red-600 font-medium' : ''}`}>{f.uso_pct}%</td>
                    <td className="px-3 py-2 text-right">{f.skus}</td>
                    <td className="px-3 py-2 text-right">{f.unidades.toLocaleString()}</td>
                    <td className="px-3 py-2 text-right">{f.rot_u.toLocaleString()}</td>
                    <td className="px-3 py-2 text-right">{f.pedidos}</td>
                    <td className="px-3 py-2 text-gray-600">{nombreBodega(f.bodega_id)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}

function Stat({ label, value }) {
  return (
    <div className="border border-gray-200 rounded-lg p-3">
      <p className="text-[11px] text-gray-500 uppercase tracking-wide">{label}</p>
      <p className="text-2xl font-bold text-gray-900 mt-1">{value}</p>
    </div>
  )
}

/* ---------------- BODEGAS ---------------- */

function slugify(s) {
  return s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '').slice(0, 40)
    + '-' + Math.random().toString(36).slice(2, 6)
}

function BodegasTab({ bodegas, planes, adminId, onSaved }) {
  const [mostrarForm, setMostrarForm] = useState(false)

  return (
    <div>
      <div className="flex justify-between items-start mb-5">
        <div>
          <h2 className="text-xl font-bold mb-1">Bodegas & m²</h2>
          <p className="text-gray-600 text-sm">Crea y edita tus bodegas, y administra sus planes.</p>
        </div>
        <button onClick={() => setMostrarForm(v => !v)} className="px-4 py-2 bg-brand-600 text-white rounded-lg text-sm font-medium hover:bg-brand-700">
          {mostrarForm ? 'Cerrar' : '+ Crear bodega'}
        </button>
      </div>

      {mostrarForm && <CrearBodegaForm adminId={adminId} onCreated={() => { setMostrarForm(false); onSaved?.() }} />}

      {bodegas.length === 0 ? (
        <p className="text-gray-500">Aún no tienes bodegas. Crea la primera con “+ Crear bodega”.</p>
      ) : (
        <div className="space-y-4">
          {bodegas.map(b => (
            <BodegaCard key={b.id} bodega={b} planes={planes.filter(p => p.bodega_id === b.id)} onSaved={onSaved} />
          ))}
        </div>
      )}
    </div>
  )
}

function CrearBodegaForm({ adminId, onCreated }) {
  const [nombre, setNombre] = useState('')
  const [m2, setM2] = useState('')
  const [busy, setBusy] = useState(false)
  const [msg, setMsg] = useState('')

  async function crear() {
    if (!nombre.trim()) return
    setBusy(true); setMsg('')
    const { error } = await supabase.from('bodegas').insert({
      nombre: nombre.trim(),
      slug: slugify(nombre),
      admin_id: adminId,
      plan_limite_m2: m2 === '' ? null : Number(m2),
    })
    setBusy(false)
    if (error) { setMsg('❌ ' + error.message); return }
    onCreated?.()
  }

  return (
    <div className="border border-brand-200 bg-brand-50/40 rounded-lg p-4 mb-5">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <div><p className="text-xs text-gray-600 mb-1">Nombre</p><input value={nombre} onChange={e => setNombre(e.target.value)} className="inp" /></div>
        <div><p className="text-xs text-gray-600 mb-1">Capacidad (m²)</p><input type="number" value={m2} onChange={e => setM2(e.target.value)} className="inp" /></div>
      </div>
      <div className="flex items-center gap-3 mt-4">
        <button onClick={crear} disabled={busy || !nombre.trim()} className="px-4 py-2 bg-brand-600 text-white rounded-lg text-sm font-medium hover:bg-brand-700 disabled:opacity-50">
          {busy ? 'Creando…' : 'Crear bodega'}
        </button>
        {msg && <span className="text-sm text-gray-600">{msg}</span>}
      </div>
    </div>
  )
}

function BodegaCard({ bodega, planes, onSaved }) {
  const [editando, setEditando] = useState(false)
  const [form, setForm] = useState({ nombre: bodega.nombre || '', plan_limite_m2: bodega.plan_limite_m2 ?? '' })
  const [saving, setSaving] = useState(false)
  const [msg, setMsg] = useState('')

  function set(k, v) { setForm(f => ({ ...f, [k]: v })) }

  async function guardar() {
    setSaving(true); setMsg('')
    const { data, error } = await supabase.from('bodegas').update({
      nombre: form.nombre,
      plan_limite_m2: form.plan_limite_m2 === '' ? null : Number(form.plan_limite_m2),
    }).eq('id', bodega.id).select('id')
    setSaving(false)
    if (error) { setMsg('❌ ' + error.message); return }
    if (!data || data.length === 0) { setMsg('⚠️ No se pudo guardar (permisos).'); return }
    setEditando(false)
    setMsg('')
    onSaved?.()
  }

  return (
    <div className="border border-gray-200 rounded-lg p-4">
      {/* Cabecera: nombre + botón editar */}
      <div className="flex justify-between items-start mb-3">
        <div>
          <p className="font-semibold text-gray-900">{bodega.nombre}</p>
          <p className="text-sm text-gray-500">
            Capacidad: {bodega.plan_limite_m2 ? `${Number(bodega.plan_limite_m2).toLocaleString()} m²` : '—'}
          </p>
        </div>
        <button
          onClick={() => { setEditando(v => !v); setMsg('') }}
          className="px-3 py-1.5 text-sm border border-gray-300 rounded-lg hover:bg-gray-50"
        >
          {editando ? 'Cancelar' : 'Editar bodega'}
        </button>
      </div>

      {/* Formulario de edición (colapsable) */}
      {editando && (
        <div className="border-t border-gray-100 pt-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <p className="text-xs text-gray-600 mb-1">Nombre</p>
              <input value={form.nombre} onChange={e => set('nombre', e.target.value)} className="inp" />
            </div>
            <div>
              <p className="text-xs text-gray-600 mb-1">Capacidad (m²)</p>
              <input type="number" value={form.plan_limite_m2} onChange={e => set('plan_limite_m2', e.target.value)} className="inp" />
              <p className="text-[11px] text-gray-400 mt-1">Capacidad física total de la bodega.</p>
            </div>
          </div>
          <div className="flex items-center gap-3 mt-4">
            <button onClick={guardar} disabled={saving} className="px-4 py-2 bg-brand-600 text-white rounded-lg text-sm font-medium hover:bg-brand-700 disabled:opacity-50">
              {saving ? 'Guardando…' : 'Guardar cambios'}
            </button>
            {msg && <span className="text-sm text-gray-600">{msg}</span>}
          </div>
        </div>
      )}

      <PlanesManager bodegaId={bodega.id} planes={planes} onSaved={onSaved} />
    </div>
  )
}

function PlanesManager({ bodegaId, planes, onSaved }) {
  const vacio = { nombre: '', m2_incluidos: '', limite_pedidos_mes: '', limite_skus: '', precio: '' }
  const [nuevo, setNuevo] = useState(vacio)
  const [busy, setBusy] = useState(false)

  function num(v) { return v === '' ? null : Number(v) }

  async function crear() {
    if (!nuevo.nombre.trim()) return
    setBusy(true)
    const { error } = await supabase.from('planes').insert({
      bodega_id: bodegaId,
      nombre: nuevo.nombre.trim(),
      m2_incluidos: num(nuevo.m2_incluidos),
      limite_pedidos_mes: num(nuevo.limite_pedidos_mes),
      limite_skus: num(nuevo.limite_skus),
      precio: num(nuevo.precio),
    })
    setBusy(false)
    if (error) { alert(error.message); return }
    setNuevo(vacio)
    onSaved?.()
  }

  async function toggleActivo(plan) {
    const { error } = await supabase.from('planes').update({ activo: !plan.activo }).eq('id', plan.id)
    if (error) { alert(error.message); return }
    onSaved?.()
  }

  return (
    <div className="mt-5 border-t border-gray-100 pt-4">
      <p className="text-sm font-semibold text-gray-900 mb-2">Planes de esta bodega</p>
      {planes.length === 0 ? (
        <p className="text-xs text-gray-400 mb-3">Aún no hay planes. Crea el primero abajo.</p>
      ) : (
        <div className="space-y-1.5 mb-3">
          {planes.map(p => (
            <div key={p.id} className="flex justify-between items-center text-sm border border-gray-200 rounded-lg px-3 py-2">
              <div>
                <span className={`font-medium ${p.activo ? 'text-gray-900' : 'text-gray-400 line-through'}`}>{p.nombre}</span>
                <span className="text-gray-500 ml-2">
                  {p.m2_incluidos ?? 0} m² · {p.limite_pedidos_mes ?? '∞'} ped/mes · {p.limite_skus ?? '∞'} SKUs · ${p.precio ?? 0}
                </span>
              </div>
              <button onClick={() => toggleActivo(p)} className="text-xs text-gray-500 hover:text-gray-800">
                {p.activo ? 'Desactivar' : 'Activar'}
              </button>
            </div>
          ))}
        </div>
      )}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-2">
        <input value={nuevo.nombre} onChange={e => setNuevo(n => ({ ...n, nombre: e.target.value }))} placeholder="Nombre" className="inp" />
        <input type="number" value={nuevo.m2_incluidos} onChange={e => setNuevo(n => ({ ...n, m2_incluidos: e.target.value }))} placeholder="m²" className="inp" />
        <input type="number" value={nuevo.limite_pedidos_mes} onChange={e => setNuevo(n => ({ ...n, limite_pedidos_mes: e.target.value }))} placeholder="Pedidos/mes" className="inp" />
        <input type="number" value={nuevo.limite_skus} onChange={e => setNuevo(n => ({ ...n, limite_skus: e.target.value }))} placeholder="SKUs" className="inp" />
        <input type="number" value={nuevo.precio} onChange={e => setNuevo(n => ({ ...n, precio: e.target.value }))} placeholder="Precio" className="inp" />
      </div>
      <button onClick={crear} disabled={busy || !nuevo.nombre.trim()} className="mt-2 px-3 py-1.5 bg-gray-800 text-white rounded-lg text-sm font-medium disabled:opacity-50">
        {busy ? 'Creando…' : '+ Agregar plan'}
      </button>
    </div>
  )
}

/* ---------------- USUARIOS ---------------- */

function UsuariosTab({ usuarios, bodegas, clientes, opBodegas, onSaved }) {
  const nombreBodega = (id) => bodegas.find(b => b.id === id)?.nombre || '—'
  const clientePorUsuario = (uid) => clientes.find(c => c.usuario_id === uid)
  const bodegasDeOperador = (uid) => new Set((opBodegas || []).filter(o => o.operador_id === uid).map(o => o.bodega_id))

  async function toggleOpBodega(operadorId, bodegaId, checked, primaryBodegaId) {
    if (checked) {
      const { error } = await supabase.from('operador_bodegas').insert({ operador_id: operadorId, bodega_id: bodegaId })
      if (error && !error.message.includes('duplicate')) { alert(error.message); return }
      // Si el operador no tenía bodega principal, asignar esta
      if (!primaryBodegaId) await supabase.from('usuarios').update({ bodega_id: bodegaId }).eq('id', operadorId)
    } else {
      const { error } = await supabase.from('operador_bodegas').delete().eq('operador_id', operadorId).eq('bodega_id', bodegaId)
      if (error) { alert(error.message); return }
    }
    onSaved?.()
  }
  const [mostrarForm, setMostrarForm] = useState(false)
  const [moviendo, setMoviendo] = useState(null)
  const [eliminando, setEliminando] = useState(null)
  const [editM2, setEditM2] = useState({}) // { [userId]: m2_string }
  const [savingM2, setSavingM2] = useState(null)
  const sinBodegas = bodegas.length === 0

  async function guardarM2(userId) {
    const val = editM2[userId]
    if (val === undefined) return
    setSavingM2(userId)
    const cli = clientePorUsuario(userId)
    if (cli) {
      const { error } = await supabase.from('clientes')
        .update({ m2_contratados: val === '' ? 0 : Number(val) })
        .eq('usuario_id', userId)
      if (error) { alert(error.message); setSavingM2(null); return }
    }
    setSavingM2(null)
    setEditM2(prev => { const n={...prev}; delete n[userId]; return n })
    onSaved?.()
  }

  async function moverBodega(userId, bodegaId) {
    setMoviendo(userId)
    const { error } = await supabase.from('usuarios').update({ bodega_id: bodegaId }).eq('id', userId)
    if (error) { alert(error.message); setMoviendo(null); return }
    await supabase.from('clientes').update({ bodega_id: bodegaId }).eq('usuario_id', userId)
    setMoviendo(null)
    onSaved?.()
  }

  async function eliminarUsuario(u) {
    if (!confirm(`¿Eliminar a ${u.nombre} ${u.apellido || ''}? El usuario quedará desactivado y se puede restaurar por 3 días.`)) return
    setEliminando(u.id)
    const { data, error } = await supabase.functions.invoke('admin-user-actions', {
      body: { action: 'delete_user', userId: u.id },
    })
    setEliminando(null)
    if (error || data?.error) { alert((data?.error || error?.message)); return }
    onSaved?.()
  }

  return (
    <div>
      <div className="flex justify-between items-start mb-5">
        <div>
          <h2 className="text-xl font-bold mb-1">Usuarios</h2>
          <p className="text-gray-600 text-sm">Crea y gestiona operadores y clientes de tus bodegas.</p>
        </div>
        <button
          onClick={() => setMostrarForm(v => !v)}
          disabled={sinBodegas}
          title={sinBodegas ? 'Primero crea una bodega' : ''}
          className="px-4 py-2 bg-brand-600 text-white rounded-lg text-sm font-medium hover:bg-brand-700 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {mostrarForm ? 'Cerrar' : '+ Crear usuario'}
        </button>
      </div>

      {sinBodegas && (
        <p className="text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2 text-sm mb-4">
          Debes crear al menos una bodega antes de poder crear usuarios.
        </p>
      )}

      {mostrarForm && !sinBodegas && (
        <CrearUsuarioForm bodegas={bodegas} onCreated={() => { setMostrarForm(false); onSaved?.() }} />
      )}

      {usuarios.length === 0 ? (
        <p className="text-gray-500">No hay usuarios en tus bodegas todavía.</p>
      ) : (
        <div className="space-y-2">
          {usuarios.map(u => {
            const cli = clientePorUsuario(u.id)
            const m2Val = editM2[u.id] !== undefined ? editM2[u.id] : (cli?.m2_contratados ?? '')
            const isDirty = editM2[u.id] !== undefined
            return (
              <div key={u.id} className="flex justify-between items-center gap-3 p-3 border border-gray-200 rounded-lg flex-wrap md:flex-nowrap">
                <div className="min-w-0 flex-1">
                  <p className="font-medium text-gray-900 truncate">
                    {u.nombre} {u.apellido || ''}
                    {!u.activo && <span className="ml-2 text-xs text-red-600">(Inactivo)</span>}
                  </p>
                  <p className="text-xs text-gray-600 truncate">{u.email} · {nombreBodega(u.bodega_id)}</p>
                </div>
                <div className="flex items-center gap-2 shrink-0 flex-wrap">
                  <span className="text-xs px-2 py-1 rounded bg-gray-100 text-gray-700">{u.rol}</span>

                  {/* m² contratados — solo para clientes */}
                  {u.rol === 'cliente' && cli && (
                    <div className="flex items-center gap-1">
                      <input
                        type="number"
                        value={m2Val}
                        onChange={e => setEditM2(prev => ({ ...prev, [u.id]: e.target.value }))}
                        className="w-20 text-xs border border-gray-300 rounded px-2 py-1 text-right"
                        title="m² contratados"
                        placeholder="m²"
                      />
                      <span className="text-xs text-gray-500">m²</span>
                      {isDirty && (
                        <button
                          onClick={() => guardarM2(u.id)}
                          disabled={savingM2 === u.id}
                          className="text-xs px-2 py-1 bg-brand-600 text-white rounded hover:bg-brand-700 disabled:opacity-50"
                        >
                          {savingM2 === u.id ? '…' : '✓'}
                        </button>
                      )}
                    </div>
                  )}

                  {/* Operador: multi-bodega (checkboxes). Cliente: mover a una bodega */}
                  {u.rol === 'operador' ? (
                    <div className="flex items-center gap-2 flex-wrap" title="Bodegas asignadas">
                      {bodegas.map(b => {
                        const checked = bodegasDeOperador(u.id).has(b.id) || u.bodega_id === b.id
                        return (
                          <label key={b.id} className="flex items-center gap-1 text-xs text-gray-700">
                            <input
                              type="checkbox"
                              checked={checked}
                              onChange={e => toggleOpBodega(u.id, b.id, e.target.checked, u.bodega_id)}
                              className="w-3.5 h-3.5 rounded border-gray-300"
                            />
                            {b.nombre}
                          </label>
                        )
                      })}
                    </div>
                  ) : (
                    <select
                      value={u.bodega_id || ''}
                      disabled={moviendo === u.id || bodegas.length <= 1}
                      onChange={e => moverBodega(u.id, e.target.value)}
                      className="text-xs border border-gray-300 rounded px-2 py-1 bg-white disabled:opacity-50"
                      title="Mover a bodega"
                    >
                      {bodegas.map(b => <option key={b.id} value={b.id}>{b.nombre}</option>)}
                    </select>
                  )}
                  <button
                    onClick={() => eliminarUsuario(u)}
                    disabled={eliminando === u.id}
                    className="text-xs text-red-600 hover:text-red-800 disabled:opacity-50"
                    title="Eliminar"
                  >✕</button>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

function CrearUsuarioForm({ bodegas, onCreated }) {
  const [form, setForm] = useState({
    nombre: '', apellido: '', email: '', password: '', rol: 'cliente',
    bodega_id: bodegas[0]?.id || '',
  })
  const [busy, setBusy] = useState(false)
  const [msg, setMsg] = useState('')

  function set(k, v) { setForm(f => ({ ...f, [k]: v })) }

  async function crear() {
    setBusy(true); setMsg('')
    const { data, error } = await supabase.functions.invoke('admin-user-actions', { body: { action: 'create_user', ...form } })
    setBusy(false)
    if (error) {
      let m = error.message
      try { const j = await error.context.json(); if (j?.error) m = j.error } catch { /* noop */ }
      setMsg('❌ ' + m); return
    }
    if (data?.error) { setMsg('❌ ' + data.error); return }
    setMsg('✅ Usuario creado')
    onCreated?.()
  }

  return (
    <div className="border border-brand-200 bg-brand-50/40 rounded-lg p-4 mb-5">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <div><p className="text-xs text-gray-600 mb-1">Nombre</p><input value={form.nombre} onChange={e => set('nombre', e.target.value)} className="inp" /></div>
        <div><p className="text-xs text-gray-600 mb-1">Apellido</p><input value={form.apellido} onChange={e => set('apellido', e.target.value)} className="inp" /></div>
        <div><p className="text-xs text-gray-600 mb-1">Email</p><input type="email" value={form.email} onChange={e => set('email', e.target.value)} className="inp" /></div>
        <div><p className="text-xs text-gray-600 mb-1">Contraseña</p><input type="text" value={form.password} onChange={e => set('password', e.target.value)} className="inp" placeholder="mínimo 6 caracteres" /></div>
        <div>
          <p className="text-xs text-gray-600 mb-1">Rol</p>
          <select value={form.rol} onChange={e => set('rol', e.target.value)} className="inp">
            <option value="cliente">Cliente</option>
            <option value="operador">Operador</option>
          </select>
        </div>
        <div>
          <p className="text-xs text-gray-600 mb-1">Bodega</p>
          <select value={form.bodega_id} onChange={e => set('bodega_id', e.target.value)} className="inp">
            {bodegas.map(b => <option key={b.id} value={b.id}>{b.nombre}</option>)}
          </select>
        </div>
      </div>
      <div className="flex items-center gap-3 mt-4">
        <button onClick={crear} disabled={busy || !form.email || form.password.length < 6 || !form.bodega_id} className="px-4 py-2 bg-brand-600 text-white rounded-lg text-sm font-medium hover:bg-brand-700 disabled:opacity-50">
          {busy ? 'Creando…' : 'Crear usuario'}
        </button>
        {msg && <span className="text-sm text-gray-600">{msg}</span>}
      </div>
    </div>
  )
}

/* ---------------- INVENTARIO ---------------- */
function InventarioTab({ bodegaIds }) {
  const [items, setItems] = useState([])
  const [clientes, setClientes] = useState([])
  const [loading, setLoading] = useState(true)
  const [buscar, setBuscar] = useState('')
  const [filtroCli, setFiltroCli] = useState('todos')
  const [sortKey, setSortKey] = useState('nombre')
  const [sortDir, setSortDir] = useState('asc')

  useEffect(() => {
    if (bodegaIds.length) cargar()
    else setLoading(false)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [bodegaIds.join(',')])

  async function cargar() {
    setLoading(true)
    const [invRes, clRes] = await Promise.all([
      supabase.from('vista_inventario')
        .select('producto_id,cliente_id,sku,nombre,categoria,cantidad,stock_minimo,m2_total,m3_total,stock_bajo,activo,peso_kg,alto_cm,ancho_cm,largo_cm'),
      supabase.from('clientes')
        .select('id,nombre_negocio,usuarios!usuario_id(rol)')
        .in('bodega_id', bodegaIds),
    ])
    const cliData = (clRes.data || []).filter(c => c.usuarios?.rol === 'cliente')
    setItems(invRes.data || [])
    setClientes(cliData)
    setLoading(false)
  }

  const nombreCliente = (id) => clientes.find(c => c.id === id)?.nombre_negocio || '—'

  function toggleSort(key) {
    if (sortKey === key) setSortDir(d => d === 'asc' ? 'desc' : 'asc')
    else { setSortKey(key); setSortDir('asc') }
  }

  const filtered = useMemo(() => {
    let arr = items
    if (filtroCli !== 'todos') arr = arr.filter(i => i.cliente_id === filtroCli)
    if (buscar) {
      const q = buscar.toLowerCase()
      arr = arr.filter(i => (i.sku||'').toLowerCase().includes(q) || (i.nombre||'').toLowerCase().includes(q))
    }
    return [...arr].sort((a, b) => {
      const va = a[sortKey] ?? '', vb = b[sortKey] ?? ''
      if (typeof va === 'string') return sortDir === 'asc' ? va.localeCompare(vb) : vb.localeCompare(va)
      return sortDir === 'asc' ? va - vb : vb - va
    })
  }, [items, filtroCli, buscar, sortKey, sortDir])

  function descargar() {
    xlsxDownload(filtered.map(i => ({
      'Cliente': nombreCliente(i.cliente_id),
      'SKU': i.sku, 'Nombre': i.nombre, 'Categoría': i.categoria ?? '',
      'Stock': i.cantidad, 'Mínimo': i.stock_minimo, 'Bajo mínimo': i.stock_bajo ? 'Sí' : 'No',
      'm² total': i.m2_total, 'm³ total': i.m3_total,
      'Peso kg': i.peso_kg ?? '', 'Alto cm': i.alto_cm ?? '', 'Ancho cm': i.ancho_cm ?? '', 'Largo cm': i.largo_cm ?? '',
    })), 'inventario_admin', 'Inventario')
  }

  const COLS = [
    { key: 'sku', label: 'SKU' },
    { key: 'nombre', label: 'Nombre' },
    { key: 'categoria', label: 'Categoría' },
    { key: 'cliente_id', label: 'Cliente' },
    { key: 'cantidad', label: 'Stock', right: true },
    { key: 'stock_minimo', label: 'Mínimo', right: true },
    { key: 'm2_total', label: 'm² total', right: true },
    { key: 'estado', label: 'Estado' },
  ]

  if (loading) return <p className="text-gray-600">Cargando…</p>
  return (
    <div>
      <div className="flex justify-between items-start mb-4">
        <h2 className="text-xl font-bold">Inventario</h2>
        <button onClick={descargar} className="px-3 py-1.5 bg-green-600 text-white rounded-lg text-sm hover:bg-green-700">⬇ Excel</button>
      </div>
      <div className="flex gap-3 mb-4 flex-wrap">
        <input value={buscar} onChange={e => setBuscar(e.target.value)} placeholder="Buscar por SKU o nombre…" className="inp flex-1 min-w-40" />
        <select value={filtroCli} onChange={e => setFiltroCli(e.target.value)} className="inp w-auto">
          <option value="todos">Todos los clientes</option>
          {clientes.map(c => <option key={c.id} value={c.id}>{c.nombre_negocio}</option>)}
        </select>
      </div>
      {filtered.length === 0 ? <p className="text-gray-500">Sin resultados.</p> : (
        <div className="overflow-x-auto border border-gray-200 rounded-lg">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-gray-600">
              <tr>
                {COLS.map(c => (
                  <th key={c.key} onClick={() => c.key !== 'estado' && toggleSort(c.key)}
                    className={`px-3 py-2 font-medium select-none ${c.key !== 'estado' ? 'cursor-pointer hover:text-gray-900' : ''} ${c.right ? 'text-right' : 'text-left'}`}>
                    {c.label}{sortKey === c.key ? (sortDir === 'asc' ? ' ▲' : ' ▼') : ''}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filtered.map(i => (
                <tr key={i.producto_id} className="hover:bg-gray-50">
                  <td className="px-3 py-2 font-mono text-xs">{i.sku}</td>
                  <td className="px-3 py-2 font-medium">{i.nombre}</td>
                  <td className="px-3 py-2 text-gray-600">{i.categoria ?? '—'}</td>
                  <td className="px-3 py-2 text-gray-700">{nombreCliente(i.cliente_id)}</td>
                  <td className="px-3 py-2 text-right">{i.cantidad}</td>
                  <td className="px-3 py-2 text-right text-gray-500">{i.stock_minimo}</td>
                  <td className="px-3 py-2 text-right">{Number(i.m2_total || 0).toFixed(2)}</td>
                  <td className="px-3 py-2">
                    {i.stock_bajo
                      ? <span className="px-2 py-0.5 rounded text-xs bg-red-100 text-red-700">Bajo mínimo</span>
                      : <span className="px-2 py-0.5 rounded text-xs bg-green-100 text-green-700">OK</span>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}

/* ---------------- PEDIDOS ---------------- */
const ESTADOS_PEDIDO = ['recibido','en_proceso','despachado','entregado','cancelado','devuelto']
const ESTADO_COLOR = {
  recibido: 'bg-gray-100 text-gray-700',
  en_proceso: 'bg-blue-100 text-blue-700',
  despachado: 'bg-yellow-100 text-yellow-700',
  entregado: 'bg-green-100 text-green-700',
  cancelado: 'bg-red-100 text-red-700',
  devuelto: 'bg-orange-100 text-orange-700',
}

function PedidosTab({ bodegaIds }) {
  const [pedidos, setPedidos] = useState([])
  const [loading, setLoading] = useState(true)
  const [filtroEstado, setFiltroEstado] = useState('todos')
  const [editando, setEditando] = useState(null) // pedido completo

  useEffect(() => {
    if (bodegaIds.length) cargar()
    else setLoading(false)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [bodegaIds.join(',')])

  async function cargar() {
    setLoading(true)
    const { data, error } = await supabase
      .from('pedidos')
      .select('id,numero_pedido,estado,created_at,destinatario_nombre,destinatario_apellido,ciudad_entrega,provincia_entrega,direccion_entrega,courrier,numero_guia,tracking_url,notas,costo_envio,items_pedido(id,cantidad,productos(sku,nombre))')
      .in('bodega_id', bodegaIds)
      .order('created_at', { ascending: false })
    if (error) console.error('pedidos admin:', error)
    setPedidos(data || [])
    setLoading(false)
  }

  async function guardarPedido(id, patch) {
    const { error } = await supabase.from('pedidos').update(patch).eq('id', id)
    if (error) { alert(error.message); return }
    await cargar()
    setEditando(null)
  }

  function descargar() {
    const rows = pedidos.flatMap(p =>
      (p.items_pedido||[]).length
        ? (p.items_pedido||[]).map(it => ({
            'N° Pedido': p.numero_pedido,
            'Fecha': new Date(p.created_at).toLocaleDateString('es-EC'),
            'Estado': p.estado,
            'Destinatario': [p.destinatario_nombre,p.destinatario_apellido].filter(Boolean).join(' '),
            'Ciudad': p.ciudad_entrega??'',
            'SKU': it.productos?.sku??'',
            'Producto': it.productos?.nombre??'',
            'Cantidad': it.cantidad,
            'Courrier': p.courrier??'',
            'Guía': p.numero_guia??'',
          }))
        : [{ 'N° Pedido': p.numero_pedido, 'Fecha': new Date(p.created_at).toLocaleDateString('es-EC'), 'Estado': p.estado,
             'Destinatario': [p.destinatario_nombre,p.destinatario_apellido].filter(Boolean).join(' '),
             'Ciudad': p.ciudad_entrega??'', 'SKU': '', 'Producto': '', 'Cantidad': '', 'Courrier': p.courrier??'', 'Guía': p.numero_guia??'' }]
    )
    xlsxDownload(rows, 'pedidos_admin', 'Pedidos')
  }

  // Mini-dashboard: top SKUs
  const skuCount = {}
  pedidos.forEach(p => (p.items_pedido||[]).forEach(it => {
    const sku = it.productos?.sku || 'desconocido'
    skuCount[sku] = (skuCount[sku] || 0) + Number(it.cantidad || 0)
  }))
  const topSkus = Object.entries(skuCount).sort((a,b)=>b[1]-a[1]).slice(0,5)
  const maxUnits = topSkus[0]?.[1] || 1

  const filtrados = filtroEstado === 'todos' ? pedidos : pedidos.filter(p => p.estado === filtroEstado)

  if (loading) return <p className="text-gray-600">Cargando…</p>
  return (
    <div className="space-y-6">
      {/* Mini dashboard */}
      <div className="grid grid-cols-2 md:grid-cols-6 gap-3">
        {[['Todos', pedidos.length, 'text-gray-900'], ...ESTADOS_PEDIDO.map(e => [e.replace('_',' '), pedidos.filter(p=>p.estado===e).length, 'text-gray-700'])].map(([label, n]) => (
          <button key={label} onClick={() => setFiltroEstado(label === 'Todos' ? 'todos' : label.replace(' ','_'))}
            className={`border rounded-lg p-3 text-left transition ${filtroEstado === (label === 'Todos' ? 'todos' : label.replace(' ','_')) ? 'border-brand-500 bg-brand-50' : 'border-gray-200 hover:border-gray-300'}`}>
            <p className="text-[11px] text-gray-500 uppercase tracking-wide truncate">{label}</p>
            <p className="text-2xl font-bold text-gray-900">{n}</p>
          </button>
        ))}
      </div>

      {/* Top SKUs */}
      {topSkus.length > 0 && (
        <div className="border border-gray-200 rounded-lg p-4">
          <p className="text-sm font-semibold text-gray-900 mb-3">Top SKUs más pedidos</p>
          <div className="space-y-2">
            {topSkus.map(([sku, n]) => (
              <div key={sku} className="flex items-center gap-3">
                <span className="text-xs font-mono text-gray-700 w-32 truncate">{sku}</span>
                <div className="flex-1 h-3 bg-gray-100 rounded-full overflow-hidden">
                  <div className="h-full bg-brand-500 rounded-full" style={{ width: `${(n/maxUnits)*100}%` }} />
                </div>
                <span className="text-xs text-gray-600 w-12 text-right">{n.toLocaleString()} u.</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Tabla */}
      <div>
        <div className="flex justify-between items-center mb-3">
          <p className="text-sm text-gray-600">{filtrados.length} pedido(s)</p>
          <button onClick={descargar} className="px-3 py-1.5 bg-green-600 text-white rounded-lg text-sm hover:bg-green-700">⬇ Excel</button>
        </div>
        {filtrados.length === 0 ? <p className="text-gray-500">No hay pedidos con ese estado.</p> : (
          <div className="overflow-x-auto border border-gray-200 rounded-lg">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 text-gray-600">
                <tr>{['N° Pedido','Fecha','Destinatario','Ciudad','Productos','Estado','Guía',''].map(h=>
                  <th key={h} className="px-3 py-2 text-left font-medium">{h}</th>)}</tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filtrados.map(p => (
                  <tr key={p.id} className="hover:bg-gray-50">
                    <td className="px-3 py-2 font-mono text-xs">{p.numero_pedido}</td>
                    <td className="px-3 py-2 text-gray-600">{new Date(p.created_at).toLocaleDateString('es-EC')}</td>
                    <td className="px-3 py-2">{[p.destinatario_nombre,p.destinatario_apellido].filter(Boolean).join(' ')}</td>
                    <td className="px-3 py-2 text-gray-600">{p.ciudad_entrega??'—'}</td>
                    <td className="px-3 py-2 text-xs text-gray-600">{(p.items_pedido||[]).map(i=>i.productos?.sku).filter(Boolean).join(', ')||'—'}</td>
                    <td className="px-3 py-2">
                      <span className={`px-2 py-0.5 rounded text-xs ${ESTADO_COLOR[p.estado]||'bg-gray-100'}`}>{p.estado}</span>
                    </td>
                    <td className="px-3 py-2 text-xs text-gray-500">{p.numero_guia??'—'}</td>
                    <td className="px-3 py-2">
                      <button onClick={() => setEditando(p)} className="text-xs text-brand-600 hover:text-brand-800">Editar</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modal edición pedido */}
      {editando && <EditarPedidoModal pedido={editando} onClose={() => setEditando(null)} onSave={guardarPedido} />}
    </div>
  )
}

function EditarPedidoModal({ pedido, onClose, onSave }) {
  const [form, setForm] = useState({
    estado: pedido.estado,
    courrier: pedido.courrier ?? '',
    numero_guia: pedido.numero_guia ?? '',
    tracking_url: pedido.tracking_url ?? '',
    notas: pedido.notas ?? '',
  })
  const [busy, setBusy] = useState(false)
  const set = (k,v) => setForm(f=>({...f,[k]:v}))

  async function guardar() {
    setBusy(true)
    await onSave(pedido.id, form)
    setBusy(false)
  }

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div className="bg-white rounded-xl shadow-xl w-full max-w-md" onClick={e=>e.stopPropagation()}>
        <div className="flex justify-between items-center p-5 border-b border-gray-200">
          <div>
            <h3 className="font-bold text-gray-900">Editar Pedido</h3>
            <p className="text-sm text-gray-500 font-mono">{pedido.numero_pedido}</p>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-700 text-xl">×</button>
        </div>
        <div className="p-5 space-y-4">
          {/* Productos (solo lectura) */}
          <div className="bg-gray-50 rounded-lg p-3">
            <p className="text-xs font-semibold text-gray-500 mb-2">Productos</p>
            {(pedido.items_pedido||[]).map(it => (
              <div key={it.id} className="flex justify-between text-sm">
                <span>{it.productos?.nombre}</span>
                <span className="text-gray-600 font-mono">{it.productos?.sku} × {it.cantidad}</span>
              </div>
            ))}
          </div>

          <div>
            <p className="text-xs text-gray-600 mb-1">Estado</p>
            <select value={form.estado} onChange={e=>set('estado',e.target.value)} className="inp">
              {ESTADOS_PEDIDO.map(e=><option key={e} value={e}>{e.replace('_',' ')}</option>)}
            </select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <p className="text-xs text-gray-600 mb-1">Courrier</p>
              <input value={form.courrier} onChange={e=>set('courrier',e.target.value)} className="inp" />
            </div>
            <div>
              <p className="text-xs text-gray-600 mb-1">N° Guía</p>
              <input value={form.numero_guia} onChange={e=>set('numero_guia',e.target.value)} className="inp" />
            </div>
          </div>
          <div>
            <p className="text-xs text-gray-600 mb-1">URL de seguimiento</p>
            <input value={form.tracking_url} onChange={e=>set('tracking_url',e.target.value)} className="inp" placeholder="https://..." />
          </div>
          <div>
            <p className="text-xs text-gray-600 mb-1">Notas</p>
            <textarea value={form.notas} onChange={e=>set('notas',e.target.value)} rows={2} className="inp resize-none" />
          </div>
        </div>
        <div className="flex gap-3 p-5 border-t border-gray-200">
          <button onClick={guardar} disabled={busy} className="px-4 py-2 bg-brand-600 text-white rounded-lg text-sm font-medium hover:bg-brand-700 disabled:opacity-50">
            {busy ? 'Guardando…' : 'Guardar cambios'}
          </button>
          <button onClick={onClose} className="px-4 py-2 border border-gray-300 rounded-lg text-sm text-gray-600 hover:bg-gray-50">Cancelar</button>
        </div>
      </div>
    </div>
  )
}

/* ---------------- REPORTES ---------------- */
function ReportesTab({ bodegas, bodegaIds }) {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (bodegaIds.length) cargar()
    else setLoading(false)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [bodegaIds.join(',')])

  async function cargar() {
    setLoading(true)
    const [clRes, invRes, rotRes, pedRes] = await Promise.all([
      supabase.from('clientes')
        .select('id,nombre_negocio,bodega_id,m2_contratados,plan,usuarios!usuario_id(rol)')
        .in('bodega_id', bodegaIds),
      supabase.from('vista_inventario').select('producto_id,cliente_id,sku,nombre,cantidad,m2_total,stock_bajo,activo'),
      supabase.from('vista_rotacion_30d').select('producto_id,unidades_30d,pedidos_30d'),
      supabase.from('pedidos').select('id,cliente_id,estado,created_at').order('created_at',{ascending:false}),
    ])
    // Excluir operadores que puedan tener registro en clientes por el trigger
    const clientes = (clRes.data || []).filter(c => c.usuarios?.rol === 'cliente')
    const inv = invRes.data || []
    const rot = Object.fromEntries((rotRes.data||[]).map(r=>[r.producto_id,r]))
    const peds = pedRes.data || []

    const resumen = clientes.map(c => {
      const cInv = inv.filter(i=>i.cliente_id===c.id)
      const cPed = peds.filter(p=>p.cliente_id===c.id)
      const m2Ocu = cInv.reduce((a,i)=>a+Number(i.m2_total||0),0)
      const unidRot = cInv.reduce((a,i)=>a+(rot[i.producto_id]?.unidades_30d||0),0)
      return {
        nombre: c.nombre_negocio||'—',
        bodega: bodegas.find(b=>b.id===c.bodega_id)?.nombre||'—',
        m2Cont: Number(c.m2_contratados||0),
        m2Ocu: Math.round(m2Ocu*100)/100,
        usoPct: c.m2_contratados>0 ? Math.round((m2Ocu/Number(c.m2_contratados))*1000)/10 : 0,
        skus: cInv.filter(i=>i.activo).length,
        unidades: cInv.reduce((a,i)=>a+Number(i.cantidad||0),0),
        rot30d: unidRot,
        pedidos: cPed.length,
        pedidosMes: cPed.filter(p=>new Date(p.created_at)>new Date(Date.now()-30*864e5)).length,
      }
    }).sort((a,b)=>b.m2Ocu-a.m2Ocu)
    setData(resumen)
    setLoading(false)
  }

  function descargarExcel() {
    if (!data) return
    xlsxDownload(data.map(r=>({
      'Cliente': r.nombre, 'Bodega': r.bodega,
      'm² contratados': r.m2Cont, 'm² ocupado': r.m2Ocu, '% uso': r.usoPct,
      'SKUs activos': r.skus, 'Unidades': r.unidades,
      'Rotación 30d (u)': r.rot30d, 'Pedidos total': r.pedidos, 'Pedidos 30d': r.pedidosMes,
    })), 'reporte_admin', 'Reporte')
  }

  if (loading) return <p className="text-gray-600">Cargando…</p>
  if (!data || data.length === 0) return (
    <div>
      <h2 className="text-xl font-bold mb-4">Reportes</h2>
      <p className="text-gray-500">Aún no hay datos suficientes para generar reportes.</p>
    </div>
  )

  const totM2Cont = data.reduce((a,r)=>a+r.m2Cont,0)
  const totM2Ocu = Math.round(data.reduce((a,r)=>a+r.m2Ocu,0)*100)/100
  const totPeds30d = data.reduce((a,r)=>a+r.pedidosMes,0)

  return (
    <div>
      <div className="flex justify-between items-start mb-6">
        <h2 className="text-xl font-bold">Reportes</h2>
        <button onClick={descargarExcel} className="px-4 py-2 bg-green-600 text-white rounded-lg text-sm font-medium hover:bg-green-700">⬇ Descargar Excel</button>
      </div>

      <div className="grid grid-cols-3 gap-4 mb-6">
        <div className="border border-gray-200 rounded-lg p-4">
          <p className="text-xs text-gray-500 uppercase tracking-wide">m² contratados total</p>
          <p className="text-2xl font-bold text-gray-900 mt-1">{totM2Cont.toLocaleString()}</p>
        </div>
        <div className="border border-gray-200 rounded-lg p-4">
          <p className="text-xs text-gray-500 uppercase tracking-wide">m² ocupado total</p>
          <p className="text-2xl font-bold text-brand-700 mt-1">{totM2Ocu.toLocaleString()}</p>
        </div>
        <div className="border border-gray-200 rounded-lg p-4">
          <p className="text-xs text-gray-500 uppercase tracking-wide">Pedidos últimos 30d</p>
          <p className="text-2xl font-bold text-orange-600 mt-1">{totPeds30d}</p>
        </div>
      </div>

      <div className="overflow-x-auto border border-gray-200 rounded-lg">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 text-gray-600">
            <tr>{['Cliente','Bodega','m² cont.','m² ocup.','% uso','SKUs','Unidades','Rot.30d','Ped.30d'].map(h=>
              <th key={h} className="px-3 py-2 text-left font-medium">{h}</th>)}</tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {data.map((r,i)=>(
              <tr key={i} className="hover:bg-gray-50">
                <td className="px-3 py-2 font-medium">{r.nombre}</td>
                <td className="px-3 py-2 text-gray-600">{r.bodega}</td>
                <td className="px-3 py-2 text-right">{r.m2Cont}</td>
                <td className="px-3 py-2 text-right">{r.m2Ocu}</td>
                <td className={`px-3 py-2 text-right ${r.usoPct>=90?'text-red-600 font-medium':''}`}>{r.usoPct}%</td>
                <td className="px-3 py-2 text-right">{r.skus}</td>
                <td className="px-3 py-2 text-right">{r.unidades.toLocaleString()}</td>
                <td className="px-3 py-2 text-right">{r.rot30d}</td>
                <td className="px-3 py-2 text-right">{r.pedidosMes}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

/* ---------------- INGRESOS ---------------- */
const ESTADOS_INGRESO = ['pendiente','recibido','parcial','rechazado']
const INGRESO_COLOR = { pendiente:'bg-yellow-100 text-yellow-700', recibido:'bg-green-100 text-green-700', parcial:'bg-blue-100 text-blue-700', rechazado:'bg-red-100 text-red-700' }

function IngresosTab({ bodegaIds }) {
  const [ingresos, setIngresos] = useState([])
  const [loading, setLoading] = useState(true)
  const [filtro, setFiltro] = useState('todos')
  const [detalle, setDetalle] = useState(null) // ingreso seleccionado para detalle/edición

  useEffect(() => {
    if (bodegaIds.length) cargar()
    else setLoading(false)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [bodegaIds.join(',')])

  async function cargar() {
    setLoading(true)
    const { data, error } = await supabase
      .from('ingresos_inventario')
      .select('id,numero,estado,created_at,recibido_at,notas,observacion_recepcion,cliente_id,bodega_id,items_ingreso(id,producto_id,cantidad_enviada,cantidad_recibida,productos(sku,nombre))')
      .in('bodega_id', bodegaIds)
      .order('created_at', { ascending: false })
    if (error) console.error('ingresos:', error)
    setIngresos(data || [])
    setLoading(false)
  }

  async function recibirIngreso(id, items, obs) {
    const { error } = await supabase.rpc('recibir_ingreso', {
      p_ingreso: id,
      p_items: items.map(it => ({ id: it.id, recibida: it.recibida })),
      p_obs: obs || null,
    })
    if (error) { alert(error.message); return false }
    await cargar()
    setDetalle(null)
    return true
  }

  function descargar() {
    const rows = ingresos.flatMap(ing =>
      (ing.items_ingreso||[]).length
        ? (ing.items_ingreso||[]).map(it => ({
            'N° Ingreso': ing.numero, 'Fecha': new Date(ing.created_at).toLocaleDateString('es-EC'),
            'Estado': ing.estado, 'SKU': it.productos?.sku??'', 'Producto': it.productos?.nombre??'',
            'Cant. enviada': it.cantidad_enviada, 'Cant. recibida': it.cantidad_recibida??'',
          }))
        : [{ 'N° Ingreso': ing.numero, 'Fecha': new Date(ing.created_at).toLocaleDateString('es-EC'), 'Estado': ing.estado }]
    )
    xlsxDownload(rows, 'ingresos_admin', 'Ingresos')
  }

  const filtrados = filtro === 'todos' ? ingresos : ingresos.filter(i => i.estado === filtro)

  if (loading) return <p className="text-gray-600">Cargando…</p>
  return (
    <div className="space-y-5">
      <div className="flex justify-between items-start">
        <div className="flex gap-2 flex-wrap">
          {['todos', ...ESTADOS_INGRESO].map(e => (
            <button key={e} onClick={() => setFiltro(e)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium border ${filtro===e?'bg-brand-600 text-white border-brand-600':'border-gray-300 text-gray-600 hover:bg-gray-50'}`}>
              {e==='todos'?'Todos':e} {e!=='todos'&&`(${ingresos.filter(i=>i.estado===e).length})`}
            </button>
          ))}
        </div>
        <button onClick={descargar} className="px-3 py-1.5 bg-green-600 text-white rounded-lg text-sm hover:bg-green-700">⬇ Excel</button>
      </div>

      {filtrados.length === 0 ? <p className="text-gray-500">No hay ingresos.</p> : (
        <div className="overflow-x-auto border border-gray-200 rounded-lg">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-gray-600">
              <tr>{['N° Ingreso','Fecha','Items','Estado','Acción',''].map(h=><th key={h} className="px-3 py-2 text-left font-medium">{h}</th>)}</tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filtrados.map(ing => (
                <tr key={ing.id} className="hover:bg-gray-50">
                  <td className="px-3 py-2 font-mono text-xs">{ing.numero}</td>
                  <td className="px-3 py-2 text-gray-600">{new Date(ing.created_at).toLocaleDateString('es-EC')}</td>
                  <td className="px-3 py-2 text-xs text-gray-600">{(ing.items_ingreso||[]).map(i=>i.productos?.sku).filter(Boolean).join(', ')||'—'}</td>
                  <td className="px-3 py-2"><span className={`px-2 py-0.5 rounded text-xs ${INGRESO_COLOR[ing.estado]||'bg-gray-100'}`}>{ing.estado}</span></td>
                  <td className="px-3 py-2">
                    {ing.estado === 'pendiente'
                      ? <button onClick={() => setDetalle(ing)} className="px-2 py-1 text-xs bg-green-600 text-white rounded hover:bg-green-700">Recibir</button>
                      : <span className="text-xs text-gray-400">—</span>}
                  </td>
                  <td className="px-3 py-2">
                    <button onClick={() => setDetalle(ing)} className="text-xs text-brand-600 hover:text-brand-800">Ver detalle</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {detalle && (
        <RecepcionModal ingreso={detalle} onClose={() => setDetalle(null)} onRecibir={recibirIngreso} />
      )}
    </div>
  )
}

function RecepcionModal({ ingreso, onClose, onRecibir }) {
  const editable = ingreso.estado === 'pendiente'
  const [items, setItems] = useState(
    (ingreso.items_ingreso || []).map(it => ({
      id: it.id, sku: it.productos?.sku, nombre: it.productos?.nombre,
      enviada: it.cantidad_enviada,
      recibida: it.cantidad_recibida ?? it.cantidad_enviada,
    }))
  )
  const [obs, setObs] = useState(ingreso.observacion_recepcion ?? '')
  const [busy, setBusy] = useState(false)

  const hayDiferencia = items.some(it => Number(it.recibida) !== Number(it.enviada))

  function setRecibida(id, val) {
    setItems(prev => prev.map(it => it.id === id ? { ...it, recibida: val } : it))
  }

  async function confirmar() {
    setBusy(true)
    await onRecibir(ingreso.id, items.map(it => ({ id: it.id, recibida: it.recibida === '' ? 0 : Number(it.recibida) })), obs)
    setBusy(false)
  }

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div className="bg-white rounded-xl shadow-xl w-full max-w-lg max-h-[85vh] overflow-y-auto" onClick={e=>e.stopPropagation()}>
        <div className="flex justify-between items-center p-5 border-b border-gray-200">
          <div>
            <h3 className="font-bold text-gray-900">{editable ? 'Recibir ingreso' : 'Ingreso'} {ingreso.numero}</h3>
            <p className="text-xs text-gray-500">
              {new Date(ingreso.created_at).toLocaleDateString('es-EC')} ·{' '}
              <span className={`px-2 py-0.5 rounded ${INGRESO_COLOR[ingreso.estado]||''}`}>{ingreso.estado}</span>
            </p>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-700 text-xl">×</button>
        </div>
        <div className="p-5 space-y-4">
          {editable && <p className="text-sm text-gray-600">Ajusta la cantidad realmente recibida. Si llega menos, el stock se corrige automáticamente y el cliente verá la observación.</p>}
          <table className="w-full text-sm border border-gray-200 rounded-lg overflow-hidden">
            <thead className="bg-gray-50"><tr>{['SKU','Producto','Enviado','Recibido'].map(h=><th key={h} className="px-3 py-2 text-left text-xs font-medium text-gray-600">{h}</th>)}</tr></thead>
            <tbody className="divide-y divide-gray-100">
              {items.map(it => {
                const menos = Number(it.recibida) < Number(it.enviada)
                return (
                  <tr key={it.id} className={menos ? 'bg-red-50' : ''}>
                    <td className="px-3 py-2 font-mono text-xs">{it.sku}</td>
                    <td className="px-3 py-2">{it.nombre}</td>
                    <td className="px-3 py-2 text-right">{it.enviada}</td>
                    <td className="px-3 py-2 text-right">
                      {editable
                        ? <input type="number" min="0" max={it.enviada} value={it.recibida}
                            onChange={e => setRecibida(it.id, e.target.value)}
                            className="w-20 border border-gray-300 rounded px-2 py-1 text-right text-sm" />
                        : (it.recibida ?? '—')}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>

          <div>
            <p className="text-xs text-gray-600 mb-1">Observación {hayDiferencia && editable && <span className="text-red-600">(hay diferencias — explica al cliente)</span>}</p>
            <textarea value={obs} onChange={e=>setObs(e.target.value)} rows={2} disabled={!editable}
              className="inp resize-none disabled:bg-gray-50" placeholder="Ej: llegaron 3 unidades dañadas / faltaron 5 unidades…" />
          </div>

          {ingreso.notas && <p className="text-xs text-gray-500 bg-gray-50 rounded p-3">Nota del cliente: {ingreso.notas}</p>}

          {editable && (
            <button onClick={confirmar} disabled={busy}
              className="w-full py-2 bg-green-600 text-white rounded-lg text-sm font-medium hover:bg-green-700 disabled:opacity-50">
              {busy ? 'Procesando…' : (hayDiferencia ? '✓ Confirmar recepción parcial' : '✓ Confirmar recepción completa')}
            </button>
          )}
        </div>
      </div>
    </div>
  )
}

function Placeholder({ tab }) {
  return (
    <div>
      <h2 className="text-xl font-bold mb-4">{TAB_LABEL[tab]}</h2>
      <p className="text-gray-500">Próximamente.</p>
    </div>
  )
}
