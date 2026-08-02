// Ta datoteka vsebuje front-end API funkcije za delo z naročninami.
// Skrbi za pošiljanje HTTP zahtev na back-end, tipizacijo odgovorov
// ter enotno obravnavo napak pri nalaganju, ustvarjanju in posodabljanju naročnin.

import type {
  GetSubscriptionResponse,
  GetSubscriptionsResponse,
  Subscription,
} from '../types/subscription-types'

// Osnovni URL backend strežnika preberemo iz .env datoteke.
// Če Vite ne prebere .env pravilno, uporabimo rezervni naslov backend-a.
const API_URL =
  import.meta.env.VITE_API_BASE_URL || 'http://88.200.63.148:30033'

// Ta vmesnik opisuje podatke, ki jih pošljemo backendu pri posodobitvi naročnine.
export interface UpdateSubscriptionPayload {
  kategorija_id: number
  kanal_id: number
  zunanji_id_kanala: string | null
  pogostost: number
  ura_posiljanja: string
  aktivna: boolean
  kraji_ids: number[]
}

// Ta vmesnik opisuje payload za ustvarjanje nove naročnine.
export interface CreateSubscriptionPayload {
  uporabnik_id: number
  kategorija_id: number
  kanal_id: number
  zunanji_id_kanala: string
  pogostost: number
  ura_posiljanja: string
  aktivna: boolean
  kraji_ids: number[]
}

// Ta vmesnik opisuje odgovor backend API-ja po uspešnem ustvarjanju naročnine.
export interface CreateSubscriptionResponse {
  success: boolean
  message?: string
  data: {
    poizvedba_id: number
  }
}

// Ta funkcija pridobi vse naročnine za določenega uporabnika.
export async function fetch_subscriptions(
  uporabnik_id: number,
): Promise<Subscription[]> {
  const response = await fetch(
    `${API_URL}/api/queries?uporabnik_id=${encodeURIComponent(uporabnik_id)}`,
    {
      method: 'GET',
      headers: {
        Accept: 'application/json',
      },
    },
  )

  if (!response.ok) {
    throw new Error(`Failed to load subscriptions: ${response.status}`)
  }

  const json: GetSubscriptionsResponse = await response.json()

  if (!json.success) {
    throw new Error('Backend returned error for subscriptions')
  }

  return json.data
}

// Ta funkcija pridobi eno konkretno naročnino glede na njen ID.
export async function fetch_subscription_by_id(
  id: number,
): Promise<Subscription> {
  const response = await fetch(`${API_URL}/api/queries/${id}`, {
    method: 'GET',
    headers: {
      Accept: 'application/json',
    },
  })

  if (!response.ok) {
    throw new Error(`Failed to load subscription: ${response.status}`)
  }

  const json: GetSubscriptionResponse = await response.json()

  if (!json.success) {
    throw new Error('Backend returned error for subscription')
  }

  return json.data
}

// Ta funkcija posodobi obstoječo naročnino glede na njen ID.
export async function update_subscription(
  id: number,
  payload: UpdateSubscriptionPayload,
): Promise<Subscription> {
  const response = await fetch(`${API_URL}/api/queries/${id}`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json',
    },
    body: JSON.stringify(payload),
  })

  const json: GetSubscriptionResponse & { message?: string } =
    await response.json()

  if (!response.ok || !json.success) {
    throw new Error(
      json.message || `Failed to update subscription: ${response.status}`,
    )
  }

  return json.data
}

// Ta funkcija ustvari novo naročnino preko POST zahteve in vrne ID nove poizvedbe.
export async function create_subscription(
  payload: CreateSubscriptionPayload,
): Promise<number> {
  const response = await fetch(`${API_URL}/api/queries`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json',
    },
    body: JSON.stringify(payload),
  })

  const json: CreateSubscriptionResponse = await response.json()

  if (!response.ok || !json.success) {
    throw new Error(
      json.message || `Failed to create subscription: ${response.status}`,
    )
  }

  const created_id = Number(json.data?.poizvedba_id)

  if (!created_id || Number.isNaN(created_id)) {
    throw new Error('Backend ni vrnil veljavnega ID-ja naročnine.')
  }

  return created_id
}

// Ta funkcija dokončno izbriše naročnino po njenem ID-ju.
// Če backend vrne napako, jo pretvorimo v razumljivo sporočilo.
export async function delete_subscription(
  subscription_id: number,
): Promise<void> {
  const response = await fetch(`${API_URL}/api/queries/${subscription_id}`, {
    method: 'DELETE',
    headers: {
      Accept: 'application/json',
    },
  })

  const payload = await response.json()

  if (!response.ok || !payload.success) {
    throw new Error(payload.message || 'Subscription delete failed')
  }
}