// Ta komponenta predstavlja skupni del obrazca za iskanje in naročnine.
// Uporabniku omogoča izbiro kategorije zdravnika ter do treh krajev.
// Glavno stanje obrazca ostaja v nadrejenem komponentu (controlled component),
// ta komponenta pa lokalno hrani le pomožno UI-stanje za autocomplete polja.

import { useEffect, useMemo, useState } from 'react'

import { fetch_categories, fetch_cities } from '../api/lookups-api'
import type { CategoryLookup, CityLookup } from '../types/lookups-types'

export interface SearchQueryFormState {
  kategorija_id: number
  kraji_ids: number[]
}

type SubscriptionQueryFormProps = {
  value: SearchQueryFormState
  on_change: (next_value: SearchQueryFormState) => void
  disabled?: boolean
}

export default function SubscriptionQueryForm({
  value,
  on_change,
  disabled = false,
}: SubscriptionQueryFormProps) {
  const [loading, set_loading] = useState(true)
  const [error, set_error] = useState<string | null>(null)

  const [categories, set_categories] = useState<CategoryLookup[]>([])
  const [cities, set_cities] = useState<CityLookup[]>([])

  const [city_query_1, set_city_query_1] = useState('')
  const [city_query_2, set_city_query_2] = useState('')
  const [city_query_3, set_city_query_3] = useState('')

  const [open_1, set_open_1] = useState(false)
  const [open_2, set_open_2] = useState(false)
  const [open_3, set_open_3] = useState(false)

  // Ob prvem prikazu komponente naložimo kategorije in kraje iz backend-a.
  // Če kategorija še ni izbrana, samodejno nastavimo prvo razpoložljivo.
  useEffect(() => {
    let cancelled = false

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

    return () => {
      cancelled = true
    }
  }, [])

  // Iz glavnega stanja value.kraji_ids izračunamo trenutno izbrane kraje
  // za tri ločena autocomplete polja.
  const selected_city_1 =
    cities.find((city) => city.kraj_id === (value.kraji_ids[0] ?? 0)) ?? null
  const selected_city_2 =
    cities.find((city) => city.kraj_id === (value.kraji_ids[1] ?? 0)) ?? null
  const selected_city_3 =
    cities.find((city) => city.kraj_id === (value.kraji_ids[2] ?? 0)) ?? null

  // Ko se prvi izbrani kraj spremeni od zunaj, posodobimo tudi prikazno besedilo v inputu.
  useEffect(() => {
    set_city_query_1(selected_city_1?.celoten_naziv ?? '')
  }, [selected_city_1])

  // Ko se drugi izbrani kraj spremeni od zunaj, posodobimo tudi prikazno besedilo v inputu.
  useEffect(() => {
    set_city_query_2(selected_city_2?.celoten_naziv ?? '')
  }, [selected_city_2])

  // Ko se tretji izbrani kraj spremeni od zunaj, posodobimo tudi prikazno besedilo v inputu.
  useEffect(() => {
    set_city_query_3(selected_city_3?.celoten_naziv ?? '')
  }, [selected_city_3])

  // Posodobi izbrano kategorijo v nadrejenem obrazcu.
  function handle_category_change(event: React.ChangeEvent<HTMLSelectElement>) {
    on_change({
      ...value,
      kategorija_id: Number(event.target.value),
    })
  }

  // Normalizira besedilo za enostavnejše iskanje po krajih.
  function normalize(text: string): string {
    return text.trim().toLowerCase()
  }

  // Preveri, ali kraj ustreza uporabniškemu iskalnemu nizu.
  function city_matches(city: CityLookup, query: string): boolean {
    const normalized_query = normalize(query)

    if (!normalized_query) {
      return true
    }

    return normalize(city.celoten_naziv).includes(normalized_query)
  }

  // Vrne filtrirane možnosti krajev za posamezno autocomplete polje.
  // Hkrati izloči kraje, ki so že izbrani v drugih poljih.
  function filter_city_options(query: string, excluded_ids: number[]) {
    return cities
      .filter((city) => !excluded_ids.includes(city.kraj_id))
      .filter((city) => city_matches(city, query))
      .slice(0, 8)
  }

  // Posodobi seznam krajev v nadrejenem obrazcu glede na to,
  // v katerem od treh polj je bil kraj izbran ali odstranjen.
  function update_kraj(index: number, city: CityLookup | null) {
    const next_kraji_ids = [
      value.kraji_ids[0] ?? null,
      value.kraji_ids[1] ?? null,
      value.kraji_ids[2] ?? null,
    ]

    next_kraji_ids[index] = city ? city.kraj_id : null

    on_change({
      ...value,
      kraji_ids: next_kraji_ids.filter((id): id is number => id !== null),
    })
  }

  // Možnosti za prvo polje kraja.
  const options_1 = useMemo(
    () =>
      filter_city_options(city_query_1, [
        selected_city_2?.kraj_id ?? -1,
        selected_city_3?.kraj_id ?? -1,
      ]),
    [cities, city_query_1, selected_city_2, selected_city_3],
  )

  // Možnosti za drugo polje kraja.
  const options_2 = useMemo(
    () =>
      filter_city_options(city_query_2, [
        selected_city_1?.kraj_id ?? -1,
        selected_city_3?.kraj_id ?? -1,
      ]),
    [cities, city_query_2, selected_city_1, selected_city_3],
  )

  // Možnosti za tretje polje kraja.
  const options_3 = useMemo(
    () =>
      filter_city_options(city_query_3, [
        selected_city_1?.kraj_id ?? -1,
        selected_city_2?.kraj_id ?? -1,
      ]),
    [cities, city_query_3, selected_city_1, selected_city_2],
  )

  // Izbere kraj v prvem polju.
  function select_city_1(city: CityLookup) {
    update_kraj(0, city)
    set_open_1(false)
  }

  // Izbere kraj v drugem polju.
  function select_city_2(city: CityLookup) {
    update_kraj(1, city)
    set_open_2(false)
  }

  // Izbere kraj v tretjem polju.
  function select_city_3(city: CityLookup) {
    update_kraj(2, city)
    set_open_3(false)
  }

  // Ob spremembi vnosa v prvem polju odpremo seznam možnosti.
  // Če uporabnik spremeni besedilo ročno, odstranimo trenutno izbiro.
  function handle_city_query_1_change(next_value: string) {
    set_city_query_1(next_value)
    set_open_1(true)

    if (selected_city_1 && next_value !== selected_city_1.celoten_naziv) {
      update_kraj(0, null)
    }
  }

  // Ob spremembi vnosa v drugem polju odpremo seznam možnosti.
  // Če uporabnik spremeni besedilo ročno, odstranimo trenutno izbiro.
  function handle_city_query_2_change(next_value: string) {
    set_city_query_2(next_value)
    set_open_2(true)

    if (selected_city_2 && next_value !== selected_city_2.celoten_naziv) {
      update_kraj(1, null)
    }
  }

  // Ob spremembi vnosa v tretjem polju odpremo seznam možnosti.
  // Če uporabnik spremeni besedilo ročno, odstranimo trenutno izbiro.
  function handle_city_query_3_change(next_value: string) {
    set_city_query_3(next_value)
    set_open_3(true)

    if (selected_city_3 && next_value !== selected_city_3.celoten_naziv) {
      update_kraj(2, null)
    }
  }

  if (loading) {
    return <p>Nalaganje obrazca...</p>
  }

  if (error) {
    return <p>{error}</p>
  }

  return (
    <>
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

      <div className="subscription-row">
        <strong>Kraji:</strong>
      </div>

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
          onChange={(event) => handle_city_query_1_change(event.target.value)}
          onFocus={() => set_open_1(true)}
          onBlur={() => setTimeout(() => set_open_1(false), 150)}
        />

        {open_1 && city_query_1.trim() !== '' && options_1.length > 0 && (
          <div className="cities-list">
            {options_1.map((city) => (
              <button
                key={city.kraj_id}
                type="button"
                className="city-option"
                onMouseDown={(event) => event.preventDefault()}
                onClick={() => select_city_1(city)}
                disabled={disabled}
              >
                {city.celoten_naziv}
              </button>
            ))}
          </div>
        )}
      </div>

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
          onChange={(event) => handle_city_query_2_change(event.target.value)}
          onFocus={() => set_open_2(true)}
          onBlur={() => setTimeout(() => set_open_2(false), 150)}
        />

        {open_2 && city_query_2.trim() !== '' && options_2.length > 0 && (
          <div className="cities-list">
            {options_2.map((city) => (
              <button
                key={city.kraj_id}
                type="button"
                className="city-option"
                onMouseDown={(event) => event.preventDefault()}
                onClick={() => select_city_2(city)}
                disabled={disabled}
              >
                {city.celoten_naziv}
              </button>
            ))}
          </div>
        )}
      </div>

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
          onChange={(event) => handle_city_query_3_change(event.target.value)}
          onFocus={() => set_open_3(true)}
          onBlur={() => setTimeout(() => set_open_3(false), 150)}
        />

        {open_3 && city_query_3.trim() !== '' && options_3.length > 0 && (
          <div className="cities-list">
            {options_3.map((city) => (
              <button
                key={city.kraj_id}
                type="button"
                className="city-option"
                onMouseDown={(event) => event.preventDefault()}
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