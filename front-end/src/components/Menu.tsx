// Ta komponenta predstavlja glavni navigacijski meni aplikacije.
// Uporablja Link iz react-router-dom za premikanje
// med stranmi brez ponovnega nalaganja celotne strani.
// Poleg navigacije omogoča tudi odjavo uporabnika.

import { Link } from 'react-router-dom'
import { use_auth } from '../context/AuthContext'

export default function Menu() {
  const { is_authenticated, logout } = use_auth()

  // Funkcija izvede odjavo uporabnika.
  function handle_logout(): void {
    logout()
  }

  return (
    <nav className="main-menu">
      <Link to="/" className="menu-link">
        Iskanje
      </Link>

      <Link to="/subscriptions" className="menu-link">
        Moje naročnine
      </Link>

      {is_authenticated && (
        <Link to="/create-subscription" className="menu-link">
          Ustvari naročnino
        </Link>
      )}

      {!is_authenticated && (
        <Link to="/login" className="menu-link">
          Prijava
        </Link>
      )}

      {!is_authenticated && (
        <Link to="/register" className="menu-link">
          Registracija
        </Link>
      )}

      {is_authenticated && (
        <button
          type="button"
          onClick={handle_logout}
          className="menu-link"
          style={{
            background: 'none',
            border: 'none',
            padding: 0,
            margin: 0,
            font: 'inherit',
            cursor: 'pointer',
          }}
        >
          Odjava
        </button>
      )}

      {is_authenticated && (
        <Link to="/delete-account" className="menu-link">
          Izbriši račun
        </Link>
      )}
    </nav>
  )
}