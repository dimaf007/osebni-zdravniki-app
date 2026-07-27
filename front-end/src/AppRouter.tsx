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
import DeleteAccountPage from './pages/DeleteAccountPage'
import ForgotPasswordPage from './pages/ForgotPasswordPage'
import ResetPasswordPage from './pages/ResetPasswordPage'

export default function AppRouter() {
  return (
    <BrowserRouter>
      <Menu />

      <Routes>
        <Route path="/" element={<SearchPage />} />
        <Route path="/subscriptions" element={<MySubscriptionsPage />} />
        <Route path="/subscriptions/:id" element={<SingleSubscriptionPage />} />
        <Route path="/subscriptions/:id/edit" element={<EditSubscriptionPage />} />
        <Route path="/create-subscription" element={<CreateSubscriptionPage />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />
        <Route path="/delete-account" element={<DeleteAccountPage />} />
        <Route path="/forgot-password" element={<ForgotPasswordPage />} />
        <Route path="/reset-password" element={<ResetPasswordPage />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  )
}