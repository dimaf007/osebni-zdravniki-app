// Ta komponenta predstavlja glavni navigacijski meni aplikacije.
// Uporablja Link iz react-router-dom za premikanje
// med stranmi brez ponovnega nalaganja celotne strani.

import { Link } from 'react-router-dom'
import { use_auth } from '../context/AuthContext'

export default function Menu() {
  const { is_authenticated, logout } = use_auth()

  return (
    <nav>
      <Link to="/search">Iskanje</Link>

      <Link to="/subscriptions">Moje naročnine</Link>

      {is_authenticated && (
        <Link to="/subscriptions/create">Ustvari naročnino</Link>
      )}

      {!is_authenticated && <Link to="/login">Prijava</Link>}

      {!is_authenticated && <Link to="/register">Registracija</Link>}

      {is_authenticated && (
        <button type="button" onClick={logout}>
          Odjava
        </button>
      )}
    </nav>
  )
}