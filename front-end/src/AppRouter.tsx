// Ta datoteka določa glavne poti aplikacije.
// BrowserRouter skrbi za navigacijo po URL naslovih,
// Menu prikaže glavni meni,
// Routes in Route pa povežeta poti s posameznimi stranmi.

import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'

import Menu from './components/Menu'
import LoginPage from './pages/LoginPage'
import RegisterPage from './pages/RegisterPage'
import SearchPage from './pages/SearchPage'
import MySubscriptionsPage from './pages/MySubscriptionsPage'
import SingleSubscriptionPage from './pages/SingleSubscriptionPage'
import EditSubscriptionPage from './pages/EditSubscriptionPage'
import CreateSubscriptionPage from './pages/CreateSubscriptionPage'

export default function AppRouter() {
  return (
    <BrowserRouter>
      <Menu />

      <Routes>
        <Route path="/" element={<Navigate to="/search" replace />} />
        <Route path="/search" element={<SearchPage />} />

        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />

        <Route path="/subscriptions" element={<MySubscriptionsPage />} />
        <Route path="/subscriptions/create" element={<CreateSubscriptionPage />} />
        <Route path="/subscriptions/:id" element={<SingleSubscriptionPage />} />
        <Route path="/subscriptions/:id/edit" element={<EditSubscriptionPage />} />
      </Routes>
    </BrowserRouter>
  )
}