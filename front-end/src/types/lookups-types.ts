// Ta vmesnik opisuje eno kategorijo zdravnika za prikaz v spustnem seznamu.
export interface CategoryLookup {
  kategorija_id: number
  naziv_kategorije: string
  oznaka_kategorije: string
}

// Ta vmesnik opisuje en kanal obveščanja za prikaz v spustnem seznamu.
export interface ChannelLookup {
  kanal_id: number
  naziv_kanala: string
}

// Ta vmesnik opisuje en kraj za prikaz v seznamu krajev.
export interface CityLookup {
  kraj_id: number
  posta: string
  naziv_kraja: string
  celoten_naziv: string
}

// Ta vmesnik opisuje splošni odgovor backend API-ja za kategorije.
export interface GetCategoriesResponse {
  success: boolean
  data: CategoryLookup[]
}

// Ta vmesnik opisuje splošni odgovor backend API-ja za kanale.
export interface GetChannelsResponse {
  success: boolean
  data: ChannelLookup[]
}

// Ta vmesnik opisuje splošni odgovor backend API-ja za kraje.
export interface GetCitiesResponse {
  success: boolean
  data: CityLookup[]
}