// Ta komponenta vsebuje skupni del obrazca za iskanje in naročnino.
// Uporabnik lahko izbere eno kategorijo zdravnika in do 3 kraje v določenem vrstnem redu.
// Komponenta sama naloži potrebne šifrante (kategorije, kraje) in skozi props
// vrne izbrane vrednosti staršu (npr. stran za iskanje ali nastavitev naročnine).

import { useEffect, useMemo, useState } from 'react'

import { fetch_categories, fetch_cities } from '../api/lookups-api'
import type { CategoryLookup, CityLookup } from '../types/lookups-types'

export interface SearchQueryFormState {
  // Izbrana kategorija zdravnika za iskanje / naročnino.
  kategorija_id: number
  // Izbrani kraji v vrstnem redu (Kraj 1 → Kraj 2 → Kraj 3).
  kraji_ids: number[]
}

type SubscriptionQueryFormProps = {
  // Trenutne vrednosti skupnega obrazca (kategorija + kraji).
  value: SearchQueryFormState
  // Callback, ki staršu sporoči nove vrednosti ob spremembi.
  on_change: (next_value: SearchQueryFormState) => void
  // Če je obrazec onemogočen (npr. med nalaganjem ali shranjevanjem).
  disabled?: boolean
}

export default function SubscriptionQueryForm({
  value,
  on_change,
  disabled = false,
}: SubscriptionQueryFormProps) {
  // Interno stanje nalaganja lookup podatkov.
  const [loading, set_loading] = useState(true)
  const [error, set_error] = useState<string | null>(null)

  // Seznami kategorij in krajev, pridobljeni iz backend šifrantov.
  const [categories, set_categories] = useState<CategoryLookup[]>([])
  const [cities, set_cities] = useState<CityLookup[]>([])

  // Besedilo, ki ga uporabnik vnaša v posamezno polje za kraj (za autocomplete).
  const [city_query_1, set_city_query_1] = useState('')
  const [city_query_2, set_city_query_2] = useState('')
  const [city_query_3, set_city_query_3] = useState('')

  // Dejanski izbrani kraji v vrstnem redu Kraj 1, Kraj 2 in Kraj 3.
  const [selected_city_1, set_selected_city_1] = useState<CityLookup | null>(null)
  const [selected_city_2, set_selected_city_2] = useState<CityLookup | null>(null)
  const [selected_city_3, set_selected_city_3] = useState<CityLookup | null>(null)

  // Ali je spustni seznam predlogov trenutno odprt za posamezno polje.
  const [open_1, set_open_1] = useState(false)
  const [open_2, set_open_2] = useState(false)
  const [open_3, set_open_3] = useState(false)

  useEffect(() => {
    let cancelled = false

    // Ta funkcija naloži lookup podatke za skupni del obrazca
    // (seznam kategorij zdravnikov in seznam krajev).
    async function load_lookups() {
      try {
        set_loading(true)
        set_error(null)

        const [categories_data, cities_data] = await Promise.all([
          fetch_categories(),
          fetch_cities(),
        ])

        if (cancelled) {
          return
        }

        set_categories(categories_data)
        set_cities(cities_data)

        // Če kategorija še ni izbrana, privzeto nastavimo prvo razpoložljivo.
        if (value.kategorija_id === 0 && categories_data.length > 0) {
          on_change({
            ...value,
            kategorija_id: categories_data[0].kategorija_id,
          })
        }
      } catch (e) {
        if (!cancelled) {
          set_error((e as Error).message)
        }
      } finally {
        if (!cancelled) {
          set_loading(false)
        }
      }
    }

    load_lookups()

    // Cleanup prepreči posodobitev state-a po odstranitvi komponente.
    return () => {
      cancelled = true
    }
    // Namenoma brez value v seznamu odvisnosti:
    // lookup podatki se naložijo ob prvem prikazu.
  }, [])

  useEffect(() => {
    // Ko se parent state (value.kraji_ids) spremeni od zunaj,
    // poskusimo obnoviti izbrane kraje na podlagi ID-jev iz šifranta cities.
    const selected_cities = value.kraji_ids.map(
      (kraj_id) => cities.find((city) => city.kraj_id === kraj_id) ?? null,
    )

    const city_1 = selected_cities[0] ?? null
    const city_2 = selected_cities[1] ?? null
    const city_3 = selected_cities[2] ?? null

    set_selected_city_1(city_1)
    set_selected_city_2(city_2)
    set_selected_city_3(city_3)

    set_city_query_1(city_1?.celoten_naziv ?? '')
    set_city_query_2(city_2?.celoten_naziv ?? '')
    set_city_query_3(city_3?.celoten_naziv ?? '')
  }, [value.kraji_ids, cities])

  useEffect(() => {
    // Iz treh izbranih krajev sestavimo končni seznam ID-jev
    // v pravilnem vrstnem redu: Kraj 1 → Kraj 2 → Kraj 3.
    const kraji_ids = [selected_city_1, selected_city_2, selected_city_3]
      .filter((city): city is CityLookup => city !== null)
      .map((city) => city.kraj_id)

    // Preverimo, ali so ID-ji enaki trenutnemu parent state-u,
    // da se izognemo nepotrebnim klicem on_change.
    const is_same =
      kraji_ids.length === value.kraji_ids.length &&
      kraji_ids.every((id, index) => id === value.kraji_ids[index])

    if (!is_same) {
      on_change({
        ...value,
        kraji_ids,
      })
    }
  }, [selected_city_1, selected_city_2, selected_city_3])

  // Posodobitev izbrane kategorije zdravnika.
  function handle_category_change(event: React.ChangeEvent<HTMLSelectElement>) {
    on_change({
      ...value,
      kategorija_id: Number(event.target.value),
    })
  }

  // Normalizira besedilo za primerjavo pri iskanju po krajih.
  function normalize(text: string): string {
    return text.trim().toLowerCase()
  }

  // Preveri, ali kraj ustreza vnesenemu iskalnemu nizu (po celotnem nazivu).
  function city_matches(city: CityLookup, query: string): boolean {
    const normalized_query = normalize(query)

    if (!normalized_query) {
      return true
    }

    return normalize(city.celoten_naziv).includes(normalized_query)
  }

  // Vrne seznam predlogov za posamezno polje,
  // hkrati izloči kraje, ki so že izbrani v drugih poljih.
  function filter_city_options(query: string, excluded_ids: number[]) {
    return cities
      .filter((city) => !excluded_ids.includes(city.kraj_id))
      .filter((city) => city_matches(city, query))
      .slice(0, 8)
  }

  // Predlogi za prvo polje ne smejo vsebovati že izbranih krajev v poljih 2 in 3.
  const options_1 = useMemo(
    () =>
      filter_city_options(city_query_1, [
        selected_city_2?.kraj_id ?? -1,
        selected_city_3?.kraj_id ?? -1,
      ]),
    [cities, city_query_1, selected_city_2, selected_city_3],
  )

  // Predlogi za drugo polje ne smejo vsebovati že izbranih krajev v poljih 1 in 3.
  const options_2 = useMemo(
    () =>
      filter_city_options(city_query_2, [
        selected_city_1?.kraj_id ?? -1,
        selected_city_3?.kraj_id ?? -1,
      ]),
    [cities, city_query_2, selected_city_1, selected_city_3],
  )

  // Predlogi za tretje polje ne smejo vsebovati že izbranih krajev v poljih 1 in 2.
  const options_3 = useMemo(
    () =>
      filter_city_options(city_query_3, [
        selected_city_1?.kraj_id ?? -1,
        selected_city_2?.kraj_id ?? -1,
      ]),
    [cities, city_query_3, selected_city_1, selected_city_2],
  )

  // Izbere kraj za prvo polje (Kraj 1) in zapre seznam predlogov.
  function select_city_1(city: CityLookup) {
    set_selected_city_1(city)
    set_city_query_1(city.celoten_naziv)
    set_open_1(false)
  }

  // Izbere kraj za drugo polje (Kraj 2) in zapre seznam predlogov.
  function select_city_2(city: CityLookup) {
    set_selected_city_2(city)
    set_city_query_2(city.celoten_naziv)
    set_open_2(false)
  }

  // Izbere kraj za tretje polje (Kraj 3) in zapre seznam predlogov.
  function select_city_3(city: CityLookup) {
    set_selected_city_3(city)
    set_city_query_3(city.celoten_naziv)
    set_open_3(false)
  }

  // Počisti prvo polje (Kraj 1).
  function clear_city_1() {
    set_selected_city_1(null)
    set_city_query_1('')
    set_open_1(false)
  }

  // Počisti drugo polje (Kraj 2).
  function clear_city_2() {
    set_selected_city_2(null)
    set_city_query_2('')
    set_open_2(false)
  }

  // Počisti tretje polje (Kraj 3).
  function clear_city_3() {
    set_selected_city_3(null)
    set_city_query_3('')
    set_open_3(false)
  }

  // Stanja nalaganja in napake za lookup podatke.
  if (loading) {
    return <p>Nalaganje obrazca...</p>
  }

  if (error) {
    return <p>{error}</p>
  }

  // Glavni del skupnega obrazca za kategorijo in kraje.
  return (
    <>
      {/* Izbira kategorije zdravnika */}
      <div className="subscription-row">
        <label htmlFor="kategorija_id">
          <strong>Kategorija:</strong>
        </label>

        <select
          id="kategorija_id"
          name="kategorija_id"
          value={value.kategorija_id}
          onChange={handle_category_change}
          disabled={disabled}
        >
          {categories.map((category) => (
            <option key={category.kategorija_id} value={category.kategorija_id}>
              {category.naziv_kategorije}
            </option>
          ))}
        </select>
      </div>

      {/* Skupni naslov za izbiro krajev */}
      <div className="subscription-row">
        <strong>Kraji:</strong>
      </div>

      {/* Autocomplete za Kraj 1 */}
      <div className="city-autocomplete">
        <label htmlFor="kraj_1">
          <strong>Kraj 1:</strong>
        </label>

        <input
          id="kraj_1"
          type="text"
          placeholder="Poštna številka ali ime kraja"
          value={city_query_1}
          disabled={disabled}
          onChange={(event) => {
            set_city_query_1(event.target.value)
            set_selected_city_1(null)
            set_open_1(true)
          }}
          onFocus={() => set_open_1(true)}
        />

        {selected_city_1 && (
          <button type="button" onClick={clear_city_1} disabled={disabled}>
            Počisti
          </button>
        )}

        {open_1 && city_query_1.trim() !== '' && options_1.length > 0 && (
          <div className="cities-list">
            {options_1.map((city) => (
              <button
                key={city.kraj_id}
                type="button"
                className="city-option"
                onClick={() => select_city_1(city)}
                disabled={disabled}
              >
                {city.celoten_naziv}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Autocomplete za Kraj 2 */}
      <div className="city-autocomplete">
        <label htmlFor="kraj_2">
          <strong>Kraj 2:</strong>
        </label>

        <input
          id="kraj_2"
          type="text"
          placeholder="Poštna številka ali ime kraja"
          value={city_query_2}
          disabled={disabled}
          onChange={(event) => {
            set_city_query_2(event.target.value)
            set_selected_city_2(null)
            set_open_2(true)
          }}
          onFocus={() => set_open_2(true)}
        />

        {selected_city_2 && (
          <button type="button" onClick={clear_city_2} disabled={disabled}>
            Počisti
          </button>
        )}

        {open_2 && city_query_2.trim() !== '' && options_2.length > 0 && (
          <div className="cities-list">
            {options_2.map((city) => (
              <button
                key={city.kraj_id}
                type="button"
                className="city-option"
                onClick={() => select_city_2(city)}
                disabled={disabled}
              >
                {city.celoten_naziv}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Autocomplete za Kraj 3 */}
      <div className="city-autocomplete">
        <label htmlFor="kraj_3">
          <strong>Kraj 3:</strong>
        </label>

        <input
          id="kraj_3"
          type="text"
          placeholder="Poštna številka ali ime kraja"
          value={city_query_3}
          disabled={disabled}
          onChange={(event) => {
            set_city_query_3(event.target.value)
            set_selected_city_3(null)
            set_open_3(true)
          }}
          onFocus={() => set_open_3(true)}
        />

        {selected_city_3 && (
          <button type="button" onClick={clear_city_3} disabled={disabled}>
            Počisti
          </button>
        )}

        {open_3 && city_query_3.trim() !== '' && options_3.length > 0 && (
          <div className="cities-list">
            {options_3.map((city) => (
              <button
                key={city.kraj_id}
                type="button"
                className="city-option"
                onClick={() => select_city_3(city)}
                disabled={disabled}
              >
                {city.celoten_naziv}
              </button>
            ))}
          </div>
        )}
      </div>
    </>
  )
}