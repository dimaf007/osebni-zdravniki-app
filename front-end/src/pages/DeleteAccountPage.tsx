// Ta komponenta predstavlja stran za brisanje uporabniškega računa.
// Uporabnik mora zaradi varnosti vnesti svoje geslo.
// Ob potrditvi se pošlje zahteva za izbris računa.

import { useState } from 'react'
import { Link } from 'react-router-dom'

import { use_auth } from '../context/AuthContext'

export default function DeleteAccountPage() {
  const { user, delete_account } = use_auth()

  const [password, set_password] = useState('')
  const [message, set_message] = useState<string | null>(null)
  const [loading, set_loading] = useState(false)

  async function handle_submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()

    if (!user) {
      set_message('Uporabnik ni prijavljen.')
      return
    }

    try {
      set_loading(true)
      set_message(null)

      await delete_account(user.username, password)

      set_message('Račun je uspešno izbrisan.')
      set_password('')
    } catch (error) {
      set_message((error as Error).message)
    } finally {
      set_loading(false)
    }
  }

  return (
    <main className="login-page">
      <section className="login-card">
        <h1>Izbriši račun</h1>

        <p>
          Potrdi brisanje računa za uporabnika <strong>{user?.username}</strong>.
        </p>

        <form onSubmit={handle_submit}>
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
            {loading ? 'Brisanje poteka...' : 'Potrdi brisanje'}
          </button>
        </form>

        <p>
          Ne želiš izbrisati računa? <Link to="/">Nazaj na iskanje</Link>
        </p>

        {message && <p>{message}</p>}
      </section>
    </main>
  )
}