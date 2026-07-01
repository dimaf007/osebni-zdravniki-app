// Ta datoteka definira globalni auth context za celotno aplikacijo.
// Context hrani prijavljenega uporabnika
// ter funkcije za prijavo in odjavo.

import {
  createContext,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from 'react'

import { login_user } from '../api/auth-api'
import type { AuthUser } from '../types/auth-types'

interface AuthContextValue {
  user: AuthUser | null
  is_authenticated: boolean
  login: (username: string, password: string) => Promise<void>
  logout: () => void
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined)

interface AuthProviderProps {
  children: ReactNode
}

export function AuthProvider({ children }: AuthProviderProps) {
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

  const value = useMemo(
    () => ({
      user,
      is_authenticated: user !== null,
      login,
      logout,
    }),
    [user],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function use_auth(): AuthContextValue {
  const context = useContext(AuthContext)

  if (!context) {
    throw new Error('use_auth must be used inside AuthProvider')
  }

  return context
}