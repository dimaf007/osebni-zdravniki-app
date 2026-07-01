// Ta komponenta predstavlja registracijsko stran.
// Uporabnik vnese uporabniško ime, e-pošto in geslo.
// Ob uspešni registraciji se uporabnik preusmeri na prijavno stran,
// pri tem pa se ohranijo podatki za nadaljnjo preusmeritev.

import { useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'

import { register_user } from '../api/auth-api'
import type { SearchQueryFormState } from '../components/SubscriptionQueryForm'

interface RegisterLocationState {
  redirect_to?: string
  subscription_prefill?: SearchQueryFormState
  source?: string
}

export default function RegisterPage() {
  const navigate = useNavigate()
  const location = useLocation()

  const location_state = location.state as RegisterLocationState | null

  const [username, set_username] = useState('')
  const [email, set_email] = useState('')
  const [password, set_password] = useState('')
  const [message, set_message] = useState<string | null>(null)
  const [loading, set_loading] = useState(false)

  // Ta funkcija obdela oddajo registracijskega obrazca.
  async function handle_submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()

    try {
      set_loading(true)
      set_message(null)

      const response = await register_user(username, email, password)
      set_message(response.message || 'Registracija uspešna.')

      setTimeout(() => {
        navigate('/login', {
          state: {
            redirect_to: location_state?.redirect_to,
            subscription_prefill: location_state?.subscription_prefill,
            source: location_state?.source,
          },
        })
      }, 1000)
    } catch (error) {
      set_message((error as Error).message)
    } finally {
      set_loading(false)
    }
  }

  return (
    <main className="login-page">
      <section className="login-card">
        <h1>Registracija</h1>

        {location_state?.source === 'search' && (
          <p>
            Po registraciji se boš lahko prijavil in nadaljeval z ustvarjanjem
            naročnine z že izpolnjenimi podatki.
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
            <label htmlFor="email">E-pošta</label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(event) => set_email(event.target.value)}
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
            {loading ? 'Registracija poteka...' : 'Registracija'}
          </button>
        </form>

        <p>
          Že imaš račun?{' '}
          <Link
            to="/login"
            state={{
              redirect_to: location_state?.redirect_to,
              subscription_prefill: location_state?.subscription_prefill,
              source: location_state?.source,
            }}
          >
            Prijava
          </Link>
        </p>

        {message && <p>{message}</p>}
      </section>
    </main>
  )
}