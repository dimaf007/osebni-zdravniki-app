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

  const [selected_city_1, set_selected_city_1] = useState<CityLookup | null>(null)
  const [selected_city_2, set_selected_city_2] = useState<CityLookup | null>(null)
  const [selected_city_3, set_selected_city_3] = useState<CityLookup | null>(null)

  const [open_1, set_open_1] = useState(false)
  const [open_2, set_open_2] = useState(false)
  const [open_3, set_open_3] = useState(false)

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

  useEffect(() => {
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
    const kraji_ids = [selected_city_1, selected_city_2, selected_city_3]
      .filter((city): city is CityLookup => city !== null)
      .map((city) => city.kraj_id)

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

  function handle_category_change(event: React.ChangeEvent<HTMLSelectElement>) {
    on_change({
      ...value,
      kategorija_id: Number(event.target.value),
    })
  }

  function normalize(text: string): string {
    return text.trim().toLowerCase()
  }

  function city_matches(city: CityLookup, query: string): boolean {
    const normalized_query = normalize(query)

    if (!normalized_query) {
      return true
    }

    return normalize(city.celoten_naziv).includes(normalized_query)
  }

  function filter_city_options(query: string, excluded_ids: number[]) {
    return cities
      .filter((city) => !excluded_ids.includes(city.kraj_id))
      .filter((city) => city_matches(city, query))
      .slice(0, 8)
  }

  const options_1 = useMemo(
    () =>
      filter_city_options(city_query_1, [
        selected_city_2?.kraj_id ?? -1,
        selected_city_3?.kraj_id ?? -1,
      ]),
    [cities, city_query_1, selected_city_2, selected_city_3],
  )

  const options_2 = useMemo(
    () =>
      filter_city_options(city_query_2, [
        selected_city_1?.kraj_id ?? -1,
        selected_city_3?.kraj_id ?? -1,
      ]),
    [cities, city_query_2, selected_city_1, selected_city_3],
  )

  const options_3 = useMemo(
    () =>
      filter_city_options(city_query_3, [
        selected_city_1?.kraj_id ?? -1,
        selected_city_2?.kraj_id ?? -1,
      ]),
    [cities, city_query_3, selected_city_1, selected_city_2],
  )

  function select_city_1(city: CityLookup) {
    set_selected_city_1(city)
    set_city_query_1(city.celoten_naziv)
    set_open_1(false)
  }

  function select_city_2(city: CityLookup) {
    set_selected_city_2(city)
    set_city_query_2(city.celoten_naziv)
    set_open_2(false)
  }

  function select_city_3(city: CityLookup) {
    set_selected_city_3(city)
    set_city_query_3(city.celoten_naziv)
    set_open_3(false)
  }

  function handle_city_query_1_change(next_value: string) {
    set_city_query_1(next_value)
    set_open_1(true)

    if (selected_city_1 && next_value !== selected_city_1.celoten_naziv) {
      set_selected_city_1(null)
    }
  }

  function handle_city_query_2_change(next_value: string) {
    set_city_query_2(next_value)
    set_open_2(true)

    if (selected_city_2 && next_value !== selected_city_2.celoten_naziv) {
      set_selected_city_2(null)
    }
  }

  function handle_city_query_3_change(next_value: string) {
    set_city_query_3(next_value)
    set_open_3(true)

    if (selected_city_3 && next_value !== selected_city_3.celoten_naziv) {
      set_selected_city_3(null)
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