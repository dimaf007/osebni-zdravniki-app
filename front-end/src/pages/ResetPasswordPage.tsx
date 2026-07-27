// Ta komponenta predstavlja stran za dejansko ponastavitev gesla.
// Uporabnik vnese reset kodo in novo geslo.
// Če je koda veljavna, sistem posodobi uporabniško geslo.

import { useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'

import { reset_password } from '../api/auth-api'

interface ResetPasswordLocationState {
  email?: string
  reset_code?: string
}

export default function ResetPasswordPage() {
  const navigate = useNavigate()
  const location = useLocation()

  const location_state = location.state as ResetPasswordLocationState | null

  const [reset_code, set_reset_code] = useState(location_state?.reset_code ?? '')
  const [new_password, set_new_password] = useState('')
  const [message, set_message] = useState<string | null>(null)
  const [loading, set_loading] = useState(false)

  // Ta funkcija obdela oddajo obrazca za ponastavitev gesla.
  // Na backend pošlje reset kodo in novo geslo.
  // Ob uspehu uporabnika preusmeri nazaj na prijavno stran.
  async function handle_submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()

    try {
      set_loading(true)
      set_message(null)

      const response = await reset_password(reset_code, new_password)

      set_message(response.message)

      setTimeout(() => {
        navigate('/login')
      }, 1500)
    } catch (error) {
      set_message((error as Error).message)
    } finally {
      set_loading(false)
    }
  }

  return (
    <main className="login-page">
      <section className="login-card">
        <h1>Ponastavitev gesla</h1>

        <p>
          Vnesi reset kodo in novo geslo. Po uspešni spremembi se boš lahko
          prijavil z novim geslom.
        </p>

        <form onSubmit={handle_submit}>
          <div>
            <label htmlFor="reset-code">Reset koda</label>
            <input
              id="reset-code"
              type="text"
              value={reset_code}
              onChange={(event) => set_reset_code(event.target.value)}
              required
            />
          </div>

          <div>
            <label htmlFor="new-password">Novo geslo</label>
            <input
              id="new-password"
              type="password"
              value={new_password}
              onChange={(event) => set_new_password(event.target.value)}
              required
            />
          </div>

          <button type="submit" disabled={loading} className="secondary-button">
            {loading ? 'Ponastavitev poteka...' : 'Ponastavi geslo'}
          </button>
        </form>

        <p>
          <Link to="/login">Nazaj na prijavo</Link>
        </p>

        {message && <p>{message}</p>}
      </section>
    </main>
  )
}