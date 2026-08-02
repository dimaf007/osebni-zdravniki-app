// Ta komponenta predstavlja glavni navigacijski meni aplikacije.
// Uporablja Link iz react-router-dom za premikanje
// med stranmi brez ponovnega nalaganja celotne strani.
// Poleg navigacije omogoča tudi odjavo.

import { Link } from 'react-router-dom'
import { use_auth } from '../context/AuthContext'

export default function Menu() {
  const { is_authenticated, logout } = use_auth()

  return (
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

      {/* Povezavo za prijavo prikažemo gostu. */}
      {!is_authenticated && (
        <Link to="/login" className="menu-link">
          Prijava / Registracija
        </Link>
      )}

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

      {/* Brisanje računa odpremo kot ločeno stran. */}
      {is_authenticated && (
        <Link to="/delete-account" className="menu-link">
          Izbriši račun
        </Link>
      )}
    </nav>
  )
}