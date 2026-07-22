// Ta datoteka definira globalni auth context za celotno aplikacijo.
// Context hrani prijavljenega uporabnika
// ter funkcije za prijavo, odjavo in brisanje uporabniškega računa.

import {
  createContext,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from 'react'

import { delete_account as delete_account_api, login_user } from '../api/auth-api'
import type { AuthUser } from '../types/auth-types'

// Ta vmesnik opisuje podatke in funkcije, ki jih auth context deli z aplikacijo.
interface AuthContextValue {
  user: AuthUser | null
  is_authenticated: boolean
  login: (username: string, password: string) => Promise<void>
  logout: () => void
  delete_account: (username: string, password: string) => Promise<void>
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined)

// Ta vmesnik opisuje props za provider komponento.
interface AuthProviderProps {
  children: ReactNode
}

export function AuthProvider({ children }: AuthProviderProps) {
  // V state-u hranimo trenutno prijavljenega uporabnika.
  const [user, set_user] = useState<AuthUser | null>(null)

  // Funkcija pokliče login API in shrani uporabnika v state.
  async function login(username: string, password: string): Promise<void> {
    const response = await login_user(username, password)

    if (!response.success) {
      throw new Error(response.message || 'Login failed')
    }

    set_user(response.user)
  }

  // Funkcija izbriše prijavljenega uporabnika iz state.
  function logout(): void {
    set_user(null)
  }

  // Funkcija pokliče backend za brisanje uporabniškega računa.
  // Po uspešnem brisanju uporabnika odjavimo tudi na front-endu.
  async function delete_account(
    username: string,
    password: string,
  ): Promise<void> {
    const response = await delete_account_api(username, password)

    if (!response.success) {
      throw new Error(response.message || 'Delete account failed')
    }

    set_user(null)
  }

  // useMemo prepreči nepotrebno ponovno ustvarjanje context vrednosti.
  const value = useMemo(
    () => ({
      user,
      is_authenticated: user !== null,
      login,
      logout,
      delete_account,
    }),
    [user],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

// Ta helper funkcija omogoča enostaven dostop do auth contexta v drugih komponentah.
export function use_auth(): AuthContextValue {
  const context = useContext(AuthContext)

  if (!context) {
    throw new Error('use_auth must be used inside AuthProvider')
  }

  return context
}