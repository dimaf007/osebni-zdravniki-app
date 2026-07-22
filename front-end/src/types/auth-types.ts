// Ta datoteka vsebuje TypeScript tipe za auth modul na front-endu.
// Tukaj opišemo uporabnika ter tipizirane odgovore backend API-ja
// za prijavo, registracijo in brisanje uporabniškega računa.

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