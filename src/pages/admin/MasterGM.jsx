import { useState } from 'react'
import { useAuth } from '@/context/AuthContext'

export default function MasterGM() {
  const { perfil } = useAuth()
  const [activeTab, setActiveTab] = useState('usuarios')

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
          Usuarios & Módulos
        </button>
        <button
          onClick={() => setActiveTab('admins')}
          className={`px-4 py-2 font-medium ${
            activeTab === 'admins'
              ? 'border-b-2 border-brand-700 text-brand-700'
              : 'text-gray-600 hover:text-gray-900'
          }`}
        >
          Administradores
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
            <p className="text-gray-600">Tabla de todos los Admins con acceso a módulos específicos</p>
          </div>
        )}
        {activeTab === 'admins' && (
          <div>
            <h2 className="text-xl font-bold mb-4">Administradores</h2>
            <p className="text-gray-600">Lista de todos los Admins que compran la plataforma</p>
          </div>
        )}
        {activeTab === 'accesos' && (
          <div>
            <h2 className="text-xl font-bold mb-4">Registros de Acceso</h2>
            <p className="text-gray-600">Auditoría de quién accedió a qué y cuándo</p>
          </div>
        )}
      </div>
    </div>
  )
}
