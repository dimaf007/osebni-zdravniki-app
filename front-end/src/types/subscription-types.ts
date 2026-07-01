// Ta vmesnik opisuje eno naročnino, kot jo frontend uporablja v aplikaciji.
// Vsebuje identifikatorje uporabnika, poizvedbe, kategorije in kanala,
// podatke o pogostosti pošiljanja, času pošiljanja, statusu aktivnosti
// ter seznam povezanih krajev.
export interface Subscription {
  poizvedba_id: number
  uporabnik_id: number
  kategorija_id: number
  naziv_kategorije: string
  kanal_id: number
  zunanji_id_kanala: string | null
  naziv_kanala: string
  pogostost: number
  ura_posiljanja: string
  zadnje_posiljanje_datum: string | null
  aktivna: boolean
  kraji_ids: number[]
}

// Ta vmesnik opisuje odgovor backend API-ja,
// ko pridobivamo seznam vseh naročnin za določenega uporabnika.
// Polje success pove, ali je bila zahteva uspešna,
// polje data pa vsebuje tabelo naročnin.
export interface GetSubscriptionsResponse {
  success: boolean
  data: Subscription[]
}

// Ta vmesnik opisuje odgovor backend API-ja,
// ko pridobivamo eno samo naročnino glede na njen ID.
// Polje success pove, ali je bila zahteva uspešna,
// polje data pa vsebuje eno naročnino.
export interface GetSubscriptionResponse {
  success: boolean
  data: Subscription
}