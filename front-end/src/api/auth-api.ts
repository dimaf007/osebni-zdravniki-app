// Ta datoteka vsebuje funkcije za prijavo, registracijo
// in brisanje uporabniškega računa.
// Funkcije pošljejo zahteve na backend API
// in vrnejo tipizirane odgovore.

import { API_URL } from './api-config'
import type {
  DeleteAccountResponse,
  LoginResponse,
  RegisterResponse,
} from '../types/auth-types'

// Ta pomožna funkcija prebere odgovor strežnika kot besedilo
// in ga nato varno pretvori v JSON.
// Če backend vrne HTML ali drug nepravilen odgovor,
// funkcija sproži jasno napako.
async function parse_json_response<T>(response: Response): Promise<T> {
  const text = await response.text()

  try {
    return JSON.parse(text) as T
  } catch {
    throw new Error(`Server did not return JSON. Status: ${response.status}`)
  }
}

// Ta funkcija pošlje uporabniško ime in geslo na backend.
// Če backend vrne napako HTTP ali success = false,
// funkcija sproži izjemo. Sicer vrne uspešen odgovor.
export async function login_user(
  username: string,
  password: string,
): Promise<LoginResponse> {
  const response = await fetch(`${API_URL}/api/auth/login`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json',
    },
    body: JSON.stringify({
      username,
      password,
    }),
  })

  const json = await parse_json_response<LoginResponse>(response)

  if (!response.ok) {
    throw new Error(json.message || `Login failed with status ${response.status}`)
  }

  if (!json.success) {
    throw new Error(json.message || 'Login failed')
  }

  return json
}

// Ta funkcija pošlje podatke za registracijo na backend.
// Če backend vrne napako HTTP ali success = false,
// funkcija sproži izjemo. Sicer vrne uspešen odgovor.
export async function register_user(
  username: string,
  email: string,
  password: string,
): Promise<RegisterResponse> {
  const response = await fetch(`${API_URL}/api/auth/register`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json',
    },
    body: JSON.stringify({
      username,
      email,
      password,
    }),
  })

  const json = await parse_json_response<RegisterResponse>(response)

  if (!response.ok) {
    throw new Error(
      json.message || `Registration failed with status ${response.status}`,
    )
  }

  if (!json.success) {
    throw new Error(json.message || 'Registration failed')
  }

  return json
}

// Ta funkcija pošlje zahtevo za brisanje uporabniškega računa.
// Uporabnik mora zaradi varnosti ponovno potrditi uporabniško ime in geslo.
// Če backend vrne napako HTTP ali success = false,
// funkcija sproži izjemo. V nasprotnem primeru vrne uspešen odgovor.
export async function delete_account(
  username: string,
  password: string,
): Promise<DeleteAccountResponse> {
  const response = await fetch(`${API_URL}/api/auth/delete-account`, {
    method: 'DELETE',
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json',
    },
    body: JSON.stringify({
      username,
      password,
    }),
  })

  const json = await parse_json_response<DeleteAccountResponse>(response)

  if (!response.ok) {
    throw new Error(
      json.message || `Delete account failed with status ${response.status}`,
    )
  }

  if (!json.success) {
    throw new Error(json.message || 'Delete account failed')
  }

  return json
}