// Uvozimo TypeScript tipe za eno naročnino ter za odgovora backend API-ja
// pri pridobivanju seznama naročnin in posamezne naročnine.
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
// Vključuje polja, ki jih uporabnik lahko spremeni na obrazcu za urejanje.
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
  data: {
    poizvedba_id: number
  }
}

// Ta funkcija pridobi vse naročnine za določenega uporabnika.
// Uporabnik_id pošljemo kot query parameter v GET zahtevi.
// Če HTTP odgovor ni uspešen ali backend vrne success = false,
// funkcija sproži napako. V nasprotnem primeru vrne seznam naročnin.
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
// Pošlje GET zahtevo na endpoint /api/queries/:id.
// Če zahteva ni uspešna ali backend vrne neuspešen odgovor,
// funkcija sproži napako. Če je vse v redu, vrne eno naročnino.
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
// Backendu pošljemo PUT zahtevo z JSON podatki iz obrazca.
// Če odgovor ni uspešen, funkcija sproži napako.
// Ob uspehu vrne posodobljeno naročnino.
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

  if (!response.ok) {
    throw new Error(`Failed to update subscription: ${response.status}`)
  }

  const json: GetSubscriptionResponse = await response.json()

  if (!json.success) {
    throw new Error('Backend returned error for subscription update')
  }

  return json.data
}

// Ta funkcija ustvari novo naročnino preko POST zahteve.
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

  if (!response.ok) {
    throw new Error(`Failed to create subscription: ${response.status}`)
  }

  const json: CreateSubscriptionResponse = await response.json()

  if (!json.success) {
    throw new Error('Backend returned error for create subscription')
  }

  return json.data.poizvedba_id
}