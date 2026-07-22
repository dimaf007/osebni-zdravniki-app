// Ta datoteka predstavlja stran za urejanje obstoječe naročnine.
// Stran naloži podatke naročnine in vse potrebne šifrante,
// nato pa omogoči uporabniku posodobitev obrazca.
// Mesta se izbirajo prek treh iskalnih polj s predlogi,
// da lahko uporabnik določi vrstni red krajev.

import { useEffect, useMemo, useState } from "react"
import { Link, useNavigate, useParams } from "react-router-dom"

import { fetch_subscription_by_id, update_subscription } from "../api/subscriptions-api"
import { fetch_categories, fetch_channels, fetch_cities } from "../api/lookups-api"
import type { Subscription } from "../types/subscription-types"
import type { CategoryLookup, ChannelLookup, CityLookup } from "../types/lookups-types"

// Ta vmesnik opisuje stanje obrazca za urejanje naročnine.
interface EditSubscriptionFormState {
  kategorija_id: number
  kanal_id: number
  zunanji_id_kanala: string
  pogostost: number
  ura_posiljanja: string
  aktivna: boolean
  kraji_ids: number[]
}

export default function EditSubscriptionPage() {
  // Iz URL-ja preberemo ID naročnine in pripravimo preusmerjanje po shranjevanju.
  const { id } = useParams()
  const navigate = useNavigate()

  // Ta state hrani osnovna stanja nalaganja, shranjevanja in morebitne napake.
  const [loading, set_loading] = useState(true)
  const [saving, set_saving] = useState(false)
  const [error, set_error] = useState<string | null>(null)

  // Ti state-i hranijo naloženo naročnino in vse lookup podatke za obrazec.
  const [subscription, set_subscription] = useState<Subscription | null>(null)
  const [categories, set_categories] = useState<CategoryLookup[]>([])
  const [channels, set_channels] = useState<ChannelLookup[]>([])
  const [cities, set_cities] = useState<CityLookup[]>([])

  // V tem state-u hranimo vse vrednosti, ki jih pošljemo backendu ob shranjevanju.
  const [form, set_form] = useState<EditSubscriptionFormState>({
    kategorija_id: 0,
    kanal_id: 0,
    zunanji_id_kanala: '',
    pogostost: 1,
    ura_posiljanja: '',
    aktivna: true,
    kraji_ids: [],
  })

  // Ta state-i skrbijo za tri polja za iskanje krajev in za trenutno izbrane kraje.
  const [city_query_1, set_city_query_1] = useState('')
  const [city_query_2, set_city_query_2] = useState('')
  const [city_query_3, set_city_query_3] = useState('')
  const [selected_city_1, set_selected_city_1] = useState<CityLookup | null>(null)
  const [selected_city_2, set_selected_city_2] = useState<CityLookup | null>(null)
  const [selected_city_3, set_selected_city_3] = useState<CityLookup | null>(null)
  const [open_1, set_open_1] = useState(false)
  const [open_2, set_open_2] = useState(false)
  const [open_3, set_open_3] = useState(false)

  // Ta effect ob odprtju strani naloži naročnino ter vse šifrante za obrazec.
  useEffect(() => {
    let cancelled = false

    if (!id) {
      set_error('ID naročnine manjka.')
      set_loading(false)
      return
    }

    // Ta funkcija pridobi podatke naročnine, kategorije, kanale in kraje.
    async function load_data() {
      try {
        set_loading(true)
        set_error(null)

        const [subscription_data, categories_data, channels_data, cities_data] = await Promise.all([
          fetch_subscription_by_id(Number(id)),
          fetch_categories(),
          fetch_channels(),
          fetch_cities(),
        ])

        if (cancelled) return

        set_subscription(subscription_data)
        set_categories(categories_data)
        set_channels(channels_data)
        set_cities(cities_data)

        set_form({
          kategorija_id: subscription_data.kategorija_id,
          kanal_id: subscription_data.kanal_id,
          zunanji_id_kanala: subscription_data.zunanji_id_kanala ?? '',
          pogostost: subscription_data.pogostost,
          ura_posiljanja: subscription_data.ura_posiljanja.slice(0, 5),
          aktivna: subscription_data.aktivna,
          kraji_ids: subscription_data.kraji_ids,
        })

        const selected = subscription_data.kraji_ids
          .map((kraj_id) => cities_data.find((city) => city.kraj_id === kraj_id))
          .filter((city): city is CityLookup => Boolean(city))

        set_selected_city_1(selected[0] ?? null)
        set_selected_city_2(selected[1] ?? null)
        set_selected_city_3(selected[2] ?? null)
        set_city_query_1(selected[0]?.celoten_naziv ?? '')
        set_city_query_2(selected[1]?.celoten_naziv ?? '')
        set_city_query_3(selected[2]?.celoten_naziv ?? '')
      } catch (e) {
        if (!cancelled) set_error((e as Error).message)
      } finally {
        if (!cancelled) set_loading(false)
      }
    }

    load_data()

    return () => {
      cancelled = true
    }
  }, [id])

  // Posodobi tekstovna, številčna in logična polja obrazca.
  function handle_change(event: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) {
    const { name, value, type } = event.target

    if (type === 'checkbox' && 'checked' in event.target) {
      set_form((previous) => ({
        ...previous,
        [name]: event.target.checked,
      }))
      return
    }

    if (name === 'kategorija_id' || name === 'kanal_id' || name === 'pogostost') {
      set_form((previous) => ({
        ...previous,
        [name]: Number(value),
      }))
      return
    }

    set_form((previous) => ({
      ...previous,
      [name]: value,
    }))
  }

  // Normalizira besedilo za lažjo primerjavo pri iskanju.
  function normalize(value: string): string {
    return value.trim().toLowerCase()
  }

  // Preveri, ali posamezen kraj ustreza iskalnemu nizu.
  function city_matches(city: CityLookup, query: string): boolean {
    const q = normalize(query)
    if (!q) return true
    return normalize(city.celoten_naziv).includes(q)
  }

  // Vrne največ osem predlogov in izloči kraje, ki so že izbrani v drugih poljih.
  function filter_city_options(query: string, excluded_ids: number[]) {
    return cities
      .filter((city) => !excluded_ids.includes(city.kraj_id))
      .filter((city) => city_matches(city, query))
      .slice(0, 8)
  }

  // Predlogi za prvo polje ne smejo vsebovati krajev, ki so izbrani v drugem ali tretjem polju.
  const options_1 = useMemo(() => filter_city_options(city_query_1, [selected_city_2?.kraj_id ?? -1, selected_city_3?.kraj_id ?? -1]), [cities, city_query_1, selected_city_2, selected_city_3])
  // Predlogi za drugo polje ne smejo vsebovati krajev, ki so izbrani v prvem ali tretjem polju.
  const options_2 = useMemo(() => filter_city_options(city_query_2, [selected_city_1?.kraj_id ?? -1, selected_city_3?.kraj_id ?? -1]), [cities, city_query_2, selected_city_1, selected_city_3])
  // Predlogi za tretje polje ne smejo vsebovati krajev, ki so izbrani v prvem ali drugem polju.
  const options_3 = useMemo(() => filter_city_options(city_query_3, [selected_city_1?.kraj_id ?? -1, selected_city_2?.kraj_id ?? -1]), [cities, city_query_3, selected_city_1, selected_city_2])

  // Izbere kraj za prvo polje in zapre seznam predlogov.
  function select_city_1(city: CityLookup) {
    set_selected_city_1(city)
    set_city_query_1(city.celoten_naziv)
    set_open_1(false)
  }

  // Izbere kraj za drugo polje in zapre seznam predlogov.
  function select_city_2(city: CityLookup) {
    set_selected_city_2(city)
    set_city_query_2(city.celoten_naziv)
    set_open_2(false)
  }

  // Izbere kraj za tretje polje in zapre seznam predlogov.
  function select_city_3(city: CityLookup) {
    set_selected_city_3(city)
    set_city_query_3(city.celoten_naziv)
    set_open_3(false)
  }

  // Počisti prvo polje za kraj.
  function clear_city_1() {
    set_selected_city_1(null)
    set_city_query_1('')
    set_open_1(false)
  }

  // Počisti drugo polje za kraj.
  function clear_city_2() {
    set_selected_city_2(null)
    set_city_query_2('')
    set_open_2(false)
  }

  // Počisti tretje polje za kraj.
  function clear_city_3() {
    set_selected_city_3(null)
    set_city_query_3('')
    set_open_3(false)
  }

  // Ta effect iz izbranih krajev pripravi končni seznam ID-jev v pravilnem vrstnem redu.
  useEffect(() => {
    const kraji_ids = [selected_city_1, selected_city_2, selected_city_3]
      .filter((city): city is CityLookup => city !== null)
      .map((city) => city.kraj_id)

    set_form((previous) => ({
      ...previous,
      kraji_ids,
    }))
  }, [selected_city_1, selected_city_2, selected_city_3])

  // Odda obrazec in pošlje posodobljene podatke na backend.
  async function handle_submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()

    if (!id) {
      set_error('ID naročnine manjka.')
      return
    }

    try {
      set_saving(true)
      set_error(null)

      await update_subscription(Number(id), {
        kategorija_id: form.kategorija_id,
        kanal_id: form.kanal_id,
        zunanji_id_kanala: form.zunanji_id_kanala,
        pogostost: form.pogostost,
        ura_posiljanja: form.ura_posiljanja,
        aktivna: form.aktivna,
        kraji_ids: form.kraji_ids,
      })

      navigate(`/subscriptions/${id}`)
    } catch (e) {
      set_error((e as Error).message)
    } finally {
      set_saving(false)
    }
  }

  // Izriše eno polje za iskanje in izbiro kraja s spustnim seznamom predlogov.
  function render_city_picker(
    label: string,
    query: string,
    set_query: (value: string) => void,
    selected: CityLookup | null,
    clear: () => void,
    open: boolean,
    set_open: (value: boolean) => void,
    options: CityLookup[],
    on_select: (city: CityLookup) => void,
  ) {
    return (
      <div className="city-picker">
        <label htmlFor={label}>{label}</label>
        <div className="city-picker__row">
          <input
            id={label}
            type="text"
            value={query}
            onChange={(event) => {
              set_query(event.target.value)
              set_open(true)
              if (selected) clear()
            }}
            onFocus={() => set_open(true)}
            autoComplete="off"
          />
          {selected && (
            <button type="button" onClick={clear}>
              Počisti
            </button>
          )}
        </div>
        {open && query.trim() !== '' && options.length > 0 && (
          <ul className="city-picker__menu">
            {options.map((city) => (
              <li key={city.kraj_id}>
                <button type="button" onClick={() => on_select(city)}>
                  {city.celoten_naziv}
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    )
  }

  if (loading) {
    return (
      <main>
        <h1>Uredi naročnino</h1>
        <p>Nalaganje obrazca za naročnino...</p>
      </main>
    )
  }

  if (error && !subscription) {
    return (
      <main>
        <h1>Uredi naročnino</h1>
        <p>{error}</p>
        <p>
          <Link to="/subscriptions">Nazaj na naročnine</Link>
        </p>
      </main>
    )
  }

  if (!subscription) {
    return (
      <main>
        <h1>Uredi naročnino</h1>
        <p>Naročnina ni bila najdena.</p>
        <p>
          <Link to="/subscriptions">Nazaj na naročnine</Link>
        </p>
      </main>
    )
  }

  return (
    <main>
      <h1>Uredi naročnino</h1>
      <p>
        <Link to={`/subscriptions/${id}`}>Nazaj na podrobnosti naročnine</Link>
      </p>
      {error && <p>{error}</p>}
      <form onSubmit={handle_submit}>
        <div>
          <label htmlFor="kategorija_id">Kategorija:</label>
          <select id="kategorija_id" name="kategorija_id" value={form.kategorija_id} onChange={handle_change}>
            {categories.map((category) => (
              <option key={category.kategorija_id} value={category.kategorija_id}>
                {category.naziv_kategorije}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label htmlFor="kanal_id">Kanal:</label>
          <select id="kanal_id" name="kanal_id" value={form.kanal_id} onChange={handle_change}>
            {channels.map((channel) => (
              <option key={channel.kanal_id} value={channel.kanal_id}>
                {channel.naziv_kanala}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label htmlFor="zunanji_id_kanala">Zunanji ID kanala:</label>
          <input id="zunanji_id_kanala" name="zunanji_id_kanala" type="text" value={form.zunanji_id_kanala} onChange={handle_change} />
        </div>

        <div>
          <label htmlFor="pogostost">Pogostost:</label>
          <input id="pogostost" name="pogostost" type="number" min={1} value={form.pogostost} onChange={handle_change} />
        </div>

        <div>
          <label htmlFor="ura_posiljanja">Čas pošiljanja:</label>
          <input id="ura_posiljanja" name="ura_posiljanja" type="time" value={form.ura_posiljanja} onChange={handle_change} />
        </div>

        <div>
          <label htmlFor="aktivna">Aktivna:</label>
          <input id="aktivna" name="aktivna" type="checkbox" checked={form.aktivna} onChange={handle_change} />
        </div>

        <fieldset>
          <legend>Kraji:</legend>
          {render_city_picker('Kraj 1', city_query_1, set_city_query_1, selected_city_1, clear_city_1, open_1, set_open_1, options_1, select_city_1)}
          {render_city_picker('Kraj 2', city_query_2, set_city_query_2, selected_city_2, clear_city_2, open_2, set_open_2, options_2, select_city_2)}
          {render_city_picker('Kraj 3', city_query_3, set_city_query_3, selected_city_3, clear_city_3, open_3, set_open_3, options_3, select_city_3)}
        </fieldset>

        <button type="submit" disabled={saving}>
          {saving ? 'Shranjevanje...' : 'Shrani spremembe'}
        </button>
      </form>
    </main>
  )
}