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