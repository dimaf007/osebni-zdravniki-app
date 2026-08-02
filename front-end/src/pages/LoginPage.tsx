// Ta komponenta predstavlja prijavno stran.
// Uporabnik vnese uporabniško ime in geslo.
// Ob uspešni prijavi se uporabnik shrani v AuthContext
// in nato preusmeri na ustrezno stran aplikacije.

import { useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'

import { use_auth } from '../context/AuthContext'
import type { SearchQueryFormState } from '../components/SubscriptionQueryForm'

interface LoginLocationState {
  redirect_to?: string
  subscription_prefill?: SearchQueryFormState
  source?: string
}

export default function LoginPage() {
  const navigate = useNavigate()
  const location = useLocation()
  const { login } = use_auth()

  const location_state = location.state as LoginLocationState | null

  const [username, set_username] = useState('')
  const [password, set_password] = useState('')
  const [message, set_message] = useState<string | null>(null)
  const [loading, set_loading] = useState(false)

  // Ta funkcija obdela oddajo prijavnega obrazca.
  async function handle_submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()

    try {
      set_loading(true)
      set_message(null)

      await login(username, password)

      set_message('Prijava uspešna.')

      if (location_state?.redirect_to) {
        navigate(location_state.redirect_to, {
          state: {
            subscription_prefill: location_state.subscription_prefill,
            source: location_state.source,
          },
        })
        return
      }

      navigate('/subscriptions')
    } catch (error) {
      set_message((error as Error).message)
    } finally {
      set_loading(false)
    }
  }

  return (
    <main className="login-page">
      <section className="login-card">
        <h1>Prijava</h1>

        {location_state?.source === 'search' && (
          <p>
            Za ustvarjanje naročnine se najprej prijavi. Podatki iskanja se bodo
            ohranili.
          </p>
        )}

        <form onSubmit={handle_submit}>
          <div>
            <label htmlFor="username">Uporabniško ime</label>
            <input
              id="username"
              type="text"
              value={username}
              onChange={(event) => set_username(event.target.value)}
              required
            />
          </div>

          <div>
            <label htmlFor="password">Geslo</label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(event) => set_password(event.target.value)}
              required
            />
          </div>

          <button type="submit" disabled={loading} className="secondary-button">
            {loading ? 'Prijava poteka...' : 'Prijava'}
          </button>
        </form>

        <p>
          <Link to="/forgot-password">Pozabljeno geslo?</Link>
        </p>

        <p> Še nimaš računa?{' '}
          <Link
            to="/register"
            state={{
              redirect_to: location_state?.redirect_to,
              subscription_prefill: location_state?.subscription_prefill,
              source: location_state?.source,
            }}
          >
            Ustvari račun
          </Link>
        </p>

        {message && <p>{message}</p>}
      </section>
    </main>
  )
}