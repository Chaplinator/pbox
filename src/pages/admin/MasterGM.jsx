import { useEffect, useState } from 'react'
import { useAuth } from '@/context/AuthContext'
import { supabase } from '@/supabase/client'

export default function MasterGM() {
  const { perfil } = useAuth()
  const [activeTab, setActiveTab] = useState('usuarios')
  const [admins, setAdmins] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    cargarAdmins()
  }, [])

  async function cargarAdmins() {
    setLoading(true)
    const { data } = await supabase
      .from('usuarios')
      .select('id, nombre, apellido, email, rol, created_at, activo')
      .eq('rol', 'administrador_cuenta')
      .order('created_at', { ascending: false })
    setAdmins(data || [])
    setLoading(false)
  }

  if (perfil?.rol !== 'administrador_gm') {
    return (
      <div className="p-8 text-center">
        <p className="text-red-600">Acceso denegado</p>
      </div>
    )
  }

  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Master GM - Gestión de Permisos</h1>
        <p className="text-gray-600 mt-1">Administra usuarios y módulos del sistema</p>
      </div>

      {/* Tabs */}
      <div className="flex gap-4 mb-8 border-b border-gray-200">
        <button
          onClick={() => setActiveTab('usuarios')}
          className={`px-4 py-2 font-medium ${
            activeTab === 'usuarios'
              ? 'border-b-2 border-brand-700 text-brand-700'
              : 'text-gray-600 hover:text-gray-900'
          }`}
        >
          Usuarios & Módulos ({admins.length})
        </button>
        <button
          onClick={() => setActiveTab('admins')}
          className={`px-4 py-2 font-medium ${
            activeTab === 'admins'
              ? 'border-b-2 border-brand-700 text-brand-700'
              : 'text-gray-600 hover:text-gray-900'
          }`}
        >
          Administradores ({admins.length})
        </button>
        <button
          onClick={() => setActiveTab('accesos')}
          className={`px-4 py-2 font-medium ${
            activeTab === 'accesos'
              ? 'border-b-2 border-brand-700 text-brand-700'
              : 'text-gray-600 hover:text-gray-900'
          }`}
        >
          Registros de Acceso
        </button>
      </div>

      {/* Content */}
      <div className="bg-white rounded-lg shadow p-6">
        {activeTab === 'usuarios' && (
          <div>
            <h2 className="text-xl font-bold mb-4">Usuarios & Módulos</h2>
            {loading ? (
              <p className="text-gray-600">Cargando...</p>
            ) : admins.length === 0 ? (
              <p className="text-gray-600">No hay administradores creados</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-2 text-left font-semibold text-gray-700">Nombre</th>
                      <th className="px-4 py-2 text-left font-semibold text-gray-700">Email</th>
                      <th className="px-4 py-2 text-left font-semibold text-gray-700">Estado</th>
                      <th className="px-4 py-2 text-left font-semibold text-gray-700">Creado</th>
                      <th className="px-4 py-2 text-left font-semibold text-gray-700">Módulos</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {admins.map(admin => (
                      <tr key={admin.id} className="hover:bg-gray-50">
                        <td className="px-4 py-2">{admin.nombre} {admin.apellido || ''}</td>
                        <td className="px-4 py-2 text-gray-600">{admin.email}</td>
                        <td className="px-4 py-2">
                          <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                            admin.activo
                              ? 'bg-green-100 text-green-700'
                              : 'bg-red-100 text-red-700'
                          }`}>
                            {admin.activo ? 'Activo' : 'Inactivo'}
                          </span>
                        </td>
                        <td className="px-4 py-2 text-gray-600 text-xs">
                          {new Date(admin.created_at).toLocaleDateString('es-ES')}
                        </td>
                        <td className="px-4 py-2">
                          <button className="text-brand-600 hover:text-brand-700 font-medium">
                            Configurar
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {activeTab === 'admins' && (
          <div>
            <h2 className="text-xl font-bold mb-4">Administradores de Cuentas</h2>
            {loading ? (
              <p className="text-gray-600">Cargando...</p>
            ) : admins.length === 0 ? (
              <p className="text-gray-600">No hay administradores creados</p>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {admins.map(admin => (
                  <div key={admin.id} className="border border-gray-200 rounded-lg p-4">
                    <div className="mb-3">
                      <h3 className="font-semibold text-gray-900">{admin.nombre} {admin.apellido || ''}</h3>
                      <p className="text-sm text-gray-600">{admin.email}</p>
                    </div>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span className="text-gray-600">Estado:</span>
                        <span className={admin.activo ? 'text-green-600 font-medium' : 'text-red-600 font-medium'}>
                          {admin.activo ? 'Activo' : 'Inactivo'}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">Miembro desde:</span>
                        <span className="text-gray-900">{new Date(admin.created_at).toLocaleDateString('es-ES')}</span>
                      </div>
                    </div>
                    <button className="mt-4 w-full px-3 py-2 bg-brand-600 text-white rounded-lg text-sm font-medium hover:bg-brand-700">
                      Gestionar
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {activeTab === 'accesos' && (
          <div>
            <h2 className="text-xl font-bold mb-4">Registros de Acceso</h2>
            <p className="text-gray-600">Próximamente: Auditoría de accesos y movimientos</p>
            <div className="mt-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
              <p className="text-sm text-blue-900">
                Los registros de acceso se irán indexando automáticamente cuando los administradores accedan al sistema.
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
