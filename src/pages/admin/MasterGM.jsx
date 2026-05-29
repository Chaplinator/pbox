import { useEffect, useState } from 'react'
import { useAuth } from '@/context/AuthContext'
import { supabase } from '@/supabase/client'

export default function MasterGM() {
  const { perfil } = useAuth()
  const [activeTab, setActiveTab] = useState('usuarios')
  const [admins, setAdmins] = useState([])
  const [allUsers, setAllUsers] = useState([])
  const [loading, setLoading] = useState(true)
  const [selectedUser, setSelectedUser] = useState(null)
  const [promotingUser, setPromotingUser] = useState(null)

  useEffect(() => {
    cargarDatos()
  }, [])

  async function cargarDatos() {
    setLoading(true)
    // Cargar admins
    const { data: adminsData } = await supabase
      .from('usuarios')
      .select('id, nombre, apellido, email, rol, created_at, activo')
      .eq('rol', 'administrador_cuenta')
      .order('created_at', { ascending: false })
    setAdmins(adminsData || [])

    // Cargar todos los usuarios
    const { data: allUsersData } = await supabase
      .from('usuarios')
      .select('id, nombre, apellido, email, rol, created_at, activo')
      .order('created_at', { ascending: false })
    setAllUsers(allUsersData || [])
    setLoading(false)
  }

  async function promoteToAdmin(userId) {
    setPromotingUser(userId)
    const { error } = await supabase
      .from('usuarios')
      .update({ rol: 'administrador_cuenta' })
      .eq('id', userId)

    if (!error) {
      setSelectedUser(null)
      await cargarDatos()
    } else {
      alert('Error al promocionar usuario: ' + error.message)
    }
    setPromotingUser(null)
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
            ) : (
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Lista de usuarios */}
                <div className="lg:col-span-2">
                  <h3 className="font-semibold text-gray-900 mb-3">Todos los Usuarios</h3>
                  <div className="space-y-2 max-h-96 overflow-y-auto">
                    {allUsers.map(user => (
                      <div
                        key={user.id}
                        onClick={() => setSelectedUser(user)}
                        className={`p-3 border rounded-lg cursor-pointer transition ${
                          selectedUser?.id === user.id
                            ? 'border-brand-500 bg-brand-50'
                            : 'border-gray-200 hover:border-gray-300'
                        }`}
                      >
                        <div className="flex justify-between items-start">
                          <div>
                            <p className="font-medium text-gray-900">{user.nombre} {user.apellido || ''}</p>
                            <p className="text-sm text-gray-600">{user.email}</p>
                          </div>
                          <span className={`px-2 py-1 rounded text-xs font-medium ${
                            user.rol === 'administrador_cuenta'
                              ? 'bg-blue-100 text-blue-700'
                              : user.rol === 'administrador_gm'
                              ? 'bg-purple-100 text-purple-700'
                              : user.rol === 'operador'
                              ? 'bg-orange-100 text-orange-700'
                              : 'bg-gray-100 text-gray-700'
                          }`}>
                            {user.rol === 'administrador_cuenta' ? 'Admin' : user.rol}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Panel de detalles */}
                <div className="lg:col-span-1">
                  {selectedUser ? (
                    <div className="border border-gray-200 rounded-lg p-4 sticky top-0">
                      <h3 className="font-semibold text-gray-900 mb-4">Detalles</h3>
                      <div className="space-y-3 mb-4">
                        <div>
                          <p className="text-xs text-gray-600">Nombre</p>
                          <p className="font-medium text-gray-900">{selectedUser.nombre} {selectedUser.apellido || ''}</p>
                        </div>
                        <div>
                          <p className="text-xs text-gray-600">Email</p>
                          <p className="font-medium text-gray-900">{selectedUser.email}</p>
                        </div>
                        <div>
                          <p className="text-xs text-gray-600">Rol Actual</p>
                          <p className="font-medium text-gray-900">{selectedUser.rol}</p>
                        </div>
                        <div>
                          <p className="text-xs text-gray-600">Estado</p>
                          <p className={selectedUser.activo ? 'text-green-600 font-medium' : 'text-red-600 font-medium'}>
                            {selectedUser.activo ? 'Activo' : 'Inactivo'}
                          </p>
                        </div>
                      </div>

                      {selectedUser.rol !== 'administrador_cuenta' && (
                        <button
                          onClick={() => promoteToAdmin(selectedUser.id)}
                          disabled={promotingUser === selectedUser.id}
                          className="w-full px-4 py-2 bg-brand-600 text-white rounded-lg font-medium hover:bg-brand-700 disabled:opacity-50"
                        >
                          {promotingUser === selectedUser.id ? 'Promoviendo...' : 'Promocionar a Admin'}
                        </button>
                      )}

                      {selectedUser.rol === 'administrador_cuenta' && (
                        <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
                          <p className="text-sm text-blue-900">✓ Este usuario ya es Admin</p>
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="border border-gray-200 rounded-lg p-4 text-center">
                      <p className="text-gray-600">Selecciona un usuario para ver detalles</p>
                    </div>
                  )}
                </div>
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
