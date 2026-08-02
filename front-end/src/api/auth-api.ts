// Ta datoteka vsebuje funkcije za prijavo, registracijo
// in brisanje uporabniškega računa ter ponastavitev gesla.
// Funkcije pošljejo zahteve na backend API
// in vrnejo tipizirane odgovore.

import { API_URL } from "./api-config";
import type {
  DeleteAccountResponse,
  LoginResponse,
  RegisterResponse,
  RequestPasswordResetResponse,
  ResetPasswordResponse,
} from "../types/auth-types";

// Ta pomožna funkcija prebere odgovor strežnika kot besedilo
// in ga nato varno pretvori v JSON.
// Če backend vrne HTML ali drug nepravilen odgovor,
// funkcija sproži jasno napako.
async function parse_json_response<T>(response: Response): Promise<T> {
  const text = await response.text();

  try {
    return JSON.parse(text) as T;
  } catch {
    throw new Error(`Strežnik ni vrnil JSON odgovora. Status: ${response.status}`);
  }
}

// Ta pomožna funkcija prevede znana backend sporočila
// v slovenski jezik, da uporabnik na front-endu vidi
// bolj razumljiva obvestila.
function translate_auth_message(message: string): string {
  const normalized_message = message.trim();

  switch (normalized_message) {
    case "User is not registered.":
      return "Uporabnik ni registriran.";
    case "Invalid password.":
      return "Napačno geslo.";
    case "Login failed":
      return "Prijava ni uspela.";
    case "Registration failed":
      return "Registracija ni uspela.";
    case "Delete account failed":
      return "Brisanje računa ni uspelo.";
    case "Request password reset failed":
      return "Zahteva za ponastavitev gesla ni uspela.";
    case "Reset password failed":
      return "Ponastavitev gesla ni uspela.";
    default:
      return normalized_message;
  }
}

// Ta pomožna funkcija vrne prevedeno sporočilo iz backend odziva,
// če je na voljo. Če ga ni, uporabi privzeto sporočilo.
function get_error_message(
  backend_message: unknown,
  fallback_message: string,
): string {
  if (typeof backend_message === "string" && backend_message.trim()) {
    return translate_auth_message(backend_message);
  }

  return fallback_message;
}

// Ta funkcija pošlje uporabniško ime in geslo na backend.
// Če backend vrne napako HTTP ali success = false,
// funkcija sproži izjemo. Sicer vrne uspešen odgovor.
export async function login_user(
  username: string,
  password: string,
): Promise<LoginResponse> {
  const response = await fetch(`${API_URL}/api/auth/login`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    body: JSON.stringify({
      username,
      password,
    }),
  });

  const json = await parse_json_response<LoginResponse>(response);

  if (!response.ok) {
    throw new Error(
      get_error_message(
        json.message,
        `Prijava ni uspela. Status: ${response.status}`,
      ),
    );
  }

  if (!json.success) {
    throw new Error(
      get_error_message(json.message, "Prijava ni uspela"),
    );
  }

  return json;
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
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    body: JSON.stringify({
      username,
      email,
      password,
    }),
  });

  const json = await parse_json_response<RegisterResponse>(response);

  if (!response.ok) {
    throw new Error(
      get_error_message(
        json.message,
        `Registracija ni uspela. Status: ${response.status}`,
      ),
    );
  }

  if (!json.success) {
    throw new Error(
      get_error_message(json.message, "Registracija ni uspela"),
    );
  }

  return json;
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
    method: "DELETE",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    body: JSON.stringify({
      username,
      password,
    }),
  });

  const json = await parse_json_response<DeleteAccountResponse>(response);

  if (!response.ok) {
    throw new Error(
      get_error_message(
        json.message,
        `Brisanje računa ni uspelo. Status: ${response.status}`,
      ),
    );
  }

  if (!json.success) {
    throw new Error(
      get_error_message(json.message, "Brisanje računa ni uspelo"),
    );
  }

  return json;
}

// Zahteva za ponastavitev gesla na podlagi e-poštnega naslova.
// V tej implementaciji strežnik vrne reset kodo v odzivu,
// ker e-mail prehod ni konfiguriran.
export async function request_password_reset(
  email: string,
): Promise<RequestPasswordResetResponse> {
  const response = await fetch(`${API_URL}/api/auth/request-password-reset`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    body: JSON.stringify({ email }),
  });

  const json =
    await parse_json_response<RequestPasswordResetResponse>(response);

  if (!response.ok) {
    throw new Error(
      get_error_message(
        json.message,
        `Zahteva za ponastavitev gesla ni uspela. Status: ${response.status}`,
      ),
    );
  }

  if (!json.success) {
    throw new Error(
      get_error_message(
        json.message,
        "Zahteva za ponastavitev gesla ni uspela",
      ),
    );
  }

  return json;
}

// Dejanska ponastavitev gesla na podlagi reset kode in novega gesla.
// Funkcija pošlje kodo in novo geslo na backend
// ter ob napaki sproži jasno izjemo.
export async function reset_password(
  resetCode: string,
  newPassword: string,
): Promise<ResetPasswordResponse> {
  const response = await fetch(`${API_URL}/api/auth/reset-password`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    body: JSON.stringify({ resetCode, newPassword }),
  });

  const json = await parse_json_response<ResetPasswordResponse>(response);

  if (!response.ok) {
    throw new Error(
      get_error_message(
        json.message,
        `Ponastavitev gesla ni uspela. Status: ${response.status}`,
      ),
    );
  }

  if (!json.success) {
    throw new Error(
      get_error_message(json.message, "Ponastavitev gesla ni uspela"),
    );
  }

  return json;
}