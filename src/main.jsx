import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'
import { QueryClientProviderComponent } from './providers/QueryClientProvider'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <QueryClientProviderComponent>
      <App />
    </QueryClientProviderComponent>
  </StrictMode>,
)
