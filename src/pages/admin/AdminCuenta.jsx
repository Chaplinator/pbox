import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useAuth } from '@/context/AuthContext'

export default function AdminCuenta() {
  const { t } = useTranslation()
  const { perfil } = useAuth()
  const [activeTab, setActiveTab] = useState('usuarios')

  if (perfil?.rol !== 'administrador_cuenta') {
    return (
      <div className="p-8 text-center">
        <p className="text-red-600">{t('errors.access_denied')}</p>
      </div>
    )
  }

  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">{t('admin.title')}</h1>
        <p className="text-gray-600 mt-1">{t('nav.bodegas')}</p>
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
          {t('nav.usuarios')}
        </button>
        <button
          onClick={() => setActiveTab('operaciones')}
          className={`px-4 py-2 font-medium ${
            activeTab === 'operaciones'
              ? 'border-b-2 border-brand-700 text-brand-700'
              : 'text-gray-600 hover:text-gray-900'
          }`}
        >
          Operaciones
        </button>
        <button
          onClick={() => setActiveTab('bodegas')}
          className={`px-4 py-2 font-medium ${
            activeTab === 'bodegas'
              ? 'border-b-2 border-brand-700 text-brand-700'
              : 'text-gray-600 hover:text-gray-900'
          }`}
        >
          {t('nav.bodegas')}
        </button>
      </div>

      {/* Content */}
      <div className="bg-white rounded-lg shadow p-6">
        {activeTab === 'usuarios' && (
          <div>
            <h2 className="text-xl font-bold mb-4">{t('nav.usuarios')}</h2>
            <p className="text-gray-600">{t('common.empty')}</p>
          </div>
        )}
        {activeTab === 'operaciones' && (
          <div>
            <h2 className="text-xl font-bold mb-4">Operaciones</h2>
            <p className="text-gray-600">{t('common.empty')}</p>
          </div>
        )}
        {activeTab === 'bodegas' && (
          <div>
            <h2 className="text-xl font-bold mb-4">{t('nav.bodegas')}</h2>
            <p className="text-gray-600">{t('common.empty')}</p>
          </div>
        )}
      </div>
    </div>
  )
}
