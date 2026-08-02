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
import AboutPage from './pages/AboutPage'

export default function AppRouter() {
  return (
    <BrowserRouter>
      <div className="app-shell">
        {/* Glava aplikacije vsebuje glavni naslov. */}
        <header className="app-header">
          <h1 className="app-title">Osebni zdravniki Slovenije</h1>
        </header>

        <Menu />

        {/* Glavna vsebina vsebuje meni in trenutno stran. */}
        <main className="app-content">


          <Routes>
            {/* Začetna stran aplikacije ostane iskanje. */}
            <Route path="/" element={<SearchPage />} />



            {/* Strani za upravljanje naročnin. */}
            <Route path="/subscriptions" element={<MySubscriptionsPage />} />
            <Route path="/subscriptions/:id" element={<SingleSubscriptionPage />} />
            <Route path="/subscriptions/:id/edit" element={<EditSubscriptionPage />} />
            <Route path="/create-subscription" element={<CreateSubscriptionPage />} />

            {/* Avtentikacija in upravljanje računa. */}
            <Route path="/login" element={<LoginPage />} />
            <Route path="/register" element={<RegisterPage />} />
            <Route path="/delete-account" element={<DeleteAccountPage />} />
            <Route path="/forgot-password" element={<ForgotPasswordPage />} />
            <Route path="/reset-password" element={<ResetPasswordPage />} />

            {/* Informativna stran o storitvi. */}
            <Route path="/about" element={<AboutPage />} />

            {/* Vse neznane poti preusmerimo nazaj na iskanje. */}
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </main>

        {/* Noga aplikacije vsebuje kratek informativni zapis. */}
        <footer className="app-footer">
          Dmitrij Fedorčuk, 2026.
        </footer>
      </div>
    </BrowserRouter>
  )
}