import { useState } from 'react'
import { useAuth } from '@/context/AuthContext'

export default function Admin() {
  const { perfil } = useAuth()
  const [activeTab, setActiveTab] = useState('bodegas')

  if (perfil?.rol !== 'administrador_cuenta') {
    return (
      <div className="p-8 text-center">
        <p className="text-red-600">Acceso denegado</p>
      </div>
    )
  }

  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Panel de Administración</h1>
        <p className="text-gray-600 mt-1">Gestiona tus bodegas, usuarios y operaciones</p>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 mb-8 border-b border-gray-200 overflow-x-auto">
        <button
          onClick={() => setActiveTab('bodegas')}
          className={`px-4 py-2 font-medium whitespace-nowrap ${
            activeTab === 'bodegas'
              ? 'border-b-2 border-brand-700 text-brand-700'
              : 'text-gray-600 hover:text-gray-900'
          }`}
        >
          Bodegas & m²
        </button>
        <button
          onClick={() => setActiveTab('usuarios')}
          className={`px-4 py-2 font-medium whitespace-nowrap ${
            activeTab === 'usuarios'
              ? 'border-b-2 border-brand-700 text-brand-700'
              : 'text-gray-600 hover:text-gray-900'
          }`}
        >
          Usuarios
        </button>
        <button
          onClick={() => setActiveTab('inventario')}
          className={`px-4 py-2 font-medium whitespace-nowrap ${
            activeTab === 'inventario'
              ? 'border-b-2 border-brand-700 text-brand-700'
              : 'text-gray-600 hover:text-gray-900'
          }`}
        >
          Inventario
        </button>
        <button
          onClick={() => setActiveTab('pedidos')}
          className={`px-4 py-2 font-medium whitespace-nowrap ${
            activeTab === 'pedidos'
              ? 'border-b-2 border-brand-700 text-brand-700'
              : 'text-gray-600 hover:text-gray-900'
          }`}
        >
          Pedidos
        </button>
        <button
          onClick={() => setActiveTab('ingresos')}
          className={`px-4 py-2 font-medium whitespace-nowrap ${
            activeTab === 'ingresos'
              ? 'border-b-2 border-brand-700 text-brand-700'
              : 'text-gray-600 hover:text-gray-900'
          }`}
        >
          Ingresos
        </button>
        <button
          onClick={() => setActiveTab('reportes')}
          className={`px-4 py-2 font-medium whitespace-nowrap ${
            activeTab === 'reportes'
              ? 'border-b-2 border-brand-700 text-brand-700'
              : 'text-gray-600 hover:text-gray-900'
          }`}
        >
          Reportes
        </button>
      </div>

      {/* Content */}
      <div className="bg-white rounded-lg shadow p-6">
        {activeTab === 'bodegas' && (
          <div>
            <h2 className="text-xl font-bold mb-4">Bodegas & m²</h2>
            <p className="text-gray-600">Crea y gestiona tus bodegas, distribución de m²</p>
          </div>
        )}
        {activeTab === 'usuarios' && (
          <div>
            <h2 className="text-xl font-bold mb-4">Usuarios</h2>
            <p className="text-gray-600">Crea operadores y clientes, asigna roles y permisos</p>
          </div>
        )}
        {activeTab === 'inventario' && (
          <div>
            <h2 className="text-xl font-bold mb-4">Inventario</h2>
            <p className="text-gray-600">Vista compartida del inventario de todas tus bodegas</p>
          </div>
        )}
        {activeTab === 'pedidos' && (
          <div>
            <h2 className="text-xl font-bold mb-4">Pedidos</h2>
            <p className="text-gray-600">Todos los pedidos de tus clientes</p>
          </div>
        )}
        {activeTab === 'ingresos' && (
          <div>
            <h2 className="text-xl font-bold mb-4">Ingresos</h2>
            <p className="text-gray-600">Recepción de inventario</p>
          </div>
        )}
        {activeTab === 'reportes' && (
          <div>
            <h2 className="text-xl font-bold mb-4">Reportes</h2>
            <p className="text-gray-600">Análisis y reportes de operaciones</p>
          </div>
        )}
      </div>
    </div>
  )
}
