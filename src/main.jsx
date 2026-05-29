import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'
import { QueryClientProviderComponent } from './providers/QueryClientProvider'
import { I18nProviderComponent } from './providers/i18nProvider'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <I18nProviderComponent>
      <QueryClientProviderComponent>
        <App />
      </QueryClientProviderComponent>
    </I18nProviderComponent>
  </StrictMode>,
)
