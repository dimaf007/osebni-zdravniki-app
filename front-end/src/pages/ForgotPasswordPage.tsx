// Ta komponenta predstavlja stran za zahtevo ponastavitve gesla.
// Uporabnik vnese svoj e-poštni naslov.
// Ob uspešni zahtevi sistem vrne reset kodo,
// ker e-mail prehod v tej učni implementaciji ni konfiguriran.

import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'

import { request_password_reset } from '../api/auth-api'

export default function ForgotPasswordPage() {
  const navigate = useNavigate()

  const [email, set_email] = useState('')
  const [message, set_message] = useState<string | null>(null)
  const [loading, set_loading] = useState(false)
  const [reset_code, set_reset_code] = useState<string | null>(null)

  // Ta funkcija obdela oddajo obrazca za zahtevo ponastavitve gesla.
  // Če je zahteva uspešna, shrani vrnjeno reset kodo
  // in uporabnika preusmeri na stran za nastavitev novega gesla.
  async function handle_submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()

    try {
      set_loading(true)
      set_message(null)
      set_reset_code(null)

      const response = await request_password_reset(email)

      set_message(response.message)

      if (response.resetCode) {
        set_reset_code(response.resetCode)

        navigate('/reset-password', {
          state: {
            email,
            reset_code: response.resetCode,
          },
        })
        return
      }
    } catch (error) {
      set_message((error as Error).message)
    } finally {
      set_loading(false)
    }
  }

  return (
    <main className="login-page">
      <section className="login-card">
        <h1>Pozabljeno geslo</h1>

        <p>
          Vnesi svoj e-poštni naslov. Sistem bo ustvaril kodo za ponastavitev
          gesla.
        </p>

        <form onSubmit={handle_submit}>
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

          <button type="submit" disabled={loading} className="secondary-button">
            {loading ? 'Pridobivanje kode poteka...' : 'Pridobi kodo'}
          </button>
        </form>

        <p>
          <Link to="/login">Nazaj na prijavo</Link>
        </p>

        {message && <p>{message}</p>}

        {reset_code && (
          <p>
            Demonstracijska reset koda: <strong>{reset_code}</strong>
          </p>
        )}
      </section>
    </main>
  )
}