// Ta datoteka je vstopna točka React aplikacije.
// Tukaj zaženemo aplikacijo, uvozimo globalne stile
// in ovijemo celotno aplikacijo v AuthProvider.

import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'

import AppRouter from './AppRouter'
import { AuthProvider } from './context/AuthContext'
import './index.css'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <AuthProvider>
      <AppRouter />
    </AuthProvider>
  </StrictMode>,
)