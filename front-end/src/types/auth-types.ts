// Ta datoteka vsebuje TypeScript tipe za auth modul na front-endu.
// Tukaj opišemo uporabnika ter tipizirane odgovore backend API-ja
// za prijavo, registracijo, brisanje uporabniškega računa
// in ponastavitev gesla.

export interface AuthUser {
  id: number
  username: string
  email: string
}

export interface LoginResponse {
  success: boolean
  message: string
  user: AuthUser
}

export interface RegisterResponse {
  success: boolean
  message: string
  user?: AuthUser
}

// Ta vmesnik opisuje odgovor backend API-ja po uspešnem ali neuspešnem
// brisanju uporabniškega računa.
export interface DeleteAccountResponse {
  success: boolean
  message: string
}

// Odgovor po zahtevi za reset gesla.
// Če backend vrne tudi reset kodo, jo opišemo kot optional polje.
export interface RequestPasswordResetResponse {
  success: boolean
  message: string
  resetCode?: string
}

// Odgovor po dejanski spremembi gesla.
export interface ResetPasswordResponse {
  success: boolean
  message: string
}