// Ta komponenta predstavlja glavni navigacijski meni aplikacije.
// Uporablja Link iz react-router-dom za premikanje
// med stranmi brez ponovnega nalaganja celotne strani.
// Poleg navigacije omogoča tudi odjavo
// ter preprost obrazec za brisanje uporabniškega računa.

import { useState } from 'react'
import { Link } from 'react-router-dom'
import { use_auth } from '../context/AuthContext'

export default function Menu() {
  const { user, is_authenticated, logout, delete_account } = use_auth()

  // State pove, ali je obrazec za brisanje računa trenutno prikazan.
  const [show_delete_form, set_show_delete_form] = useState(false)

  // V state-u hranimo potrditveno geslo za brisanje računa.
  const [delete_password, set_delete_password] = useState('')

  // Tukaj hranimo morebitno napako ali uspešno sporočilo.
  const [status_message, set_status_message] = useState<string | null>(null)

  // State pove, ali se zahteva za brisanje trenutno izvaja.
  const [is_deleting, set_is_deleting] = useState(false)

  // Funkcija preklopi prikaz obrazca za brisanje računa.
  function toggle_delete_form(): void {
    set_show_delete_form((previous) => !previous)
    set_delete_password('')
    set_status_message(null)
  }

  // Funkcija pošlje zahtevo za brisanje računa.
  // Uporabniško ime vzamemo iz prijavljenega uporabnika,
  // geslo pa mora uporabnik zaradi varnosti vnesti ročno.
  async function handle_delete_account(
    event: React.FormEvent<HTMLFormElement>,
  ): Promise<void> {
    event.preventDefault()

    if (!user) {
      set_status_message('No authenticated user.')
      return
    }

    if (!delete_password.trim()) {
      set_status_message('Password is required.')
      return
    }

    try {
      set_is_deleting(true)
      set_status_message(null)

      await delete_account(user.username, delete_password)

      set_status_message('Account deleted successfully.')
      set_delete_password('')
      set_show_delete_form(false)
    } catch (error) {
      set_status_message(
        error instanceof Error ? error.message : 'Delete account failed.',
      )
    } finally {
      set_is_deleting(false)
    }
  }

  return (
    <>
      <nav className="main-menu">
        {/* Povezava na glavno iskalno stran. */}
        <Link to="/" className="menu-link">
          Iskanje
        </Link>

        {/* Pregled uporabnikovih naročnin. */}
        <Link to="/subscriptions" className="menu-link">
          Moje naročnine
        </Link>

        {/* Ustvarjanje naročnine prikažemo le prijavljenemu uporabniku. */}
        {is_authenticated && (
          <Link to="/create-subscription" className="menu-link">
            Ustvari naročnino
          </Link>
        )}

        {/* Povezavi za prijavo in registracijo prikažemo gostu. */}
        {!is_authenticated && (
          <Link to="/login" className="menu-link">
            Prijava / Registracija
          </Link>
        )}

        {/* {!is_authenticated && (
          <Link to="/register" className="menu-link">
            Registracija
          </Link>
        )} */}

        {/* Informativna stran o storitvi je dostopna vsem uporabnikom. */}
        <Link to="/about" className="menu-link">
          O storitvi
        </Link>

        {/* Gumb za odjavo je na voljo le prijavljenemu uporabniku. */}
        {is_authenticated && (
          <button type="button" onClick={logout} className="menu-link">
            Odjava
          </button>
        )}

        {/* Gumb odpre obrazec za potrditev brisanja računa. */}
        {is_authenticated && (
          <button
            type="button"
            onClick={toggle_delete_form}
            className="menu-link"
          >
            Izbriši račun
          </button>
        )}
      </nav>

      {/* Obrazec za brisanje računa prikažemo pod menijem. */}
      {is_authenticated && show_delete_form && (
        <main>
          <section className="login-card">
            <form onSubmit={handle_delete_account}>
              <p>Potrdi brisanje računa za uporabnika: {user?.username}</p>

              <div>
                <label htmlFor="delete-password">Geslo</label>
                <input
                  id="delete-password"
                  type="password"
                  placeholder="Vnesi geslo"
                  value={delete_password}
                  onChange={(event) => set_delete_password(event.target.value)}
                />
              </div>

              <div className="auth-actions">
                <button type="submit" disabled={is_deleting}>
                  {is_deleting ? 'Brisanje...' : 'Potrdi brisanje'}
                </button>

                <button
                  type="button"
                  className="secondary-button"
                  onClick={toggle_delete_form}
                  disabled={is_deleting}
                >
                  Prekliči
                </button>
              </div>
            </form>

            {/* Sporočilo uporabniku prikažemo po uspehu ali napaki. */}
            {status_message && (
              <p className="status-message">{status_message}</p>
            )}
          </section>
        </main>
      )}
    </>
  )
}