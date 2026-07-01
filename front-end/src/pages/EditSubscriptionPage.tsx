// Ta datoteka predstavlja stran za urejanje obstoječe naročnine.
// Stran naloži podatke naročnine in vse potrebne šifrante,
// nato pa omogoči uporabniku posodobitev obrazca.

import { useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'

import {
  fetch_subscription_by_id,
  update_subscription,
} from '../api/subscriptions-api'
import {
  fetch_categories,
  fetch_channels,
  fetch_cities,
} from '../api/lookups-api'
import type { Subscription } from '../types/subscription-types'
import type {
  CategoryLookup,
  ChannelLookup,
  CityLookup,
} from '../types/lookups-types'

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
  const { id } = useParams()
  const navigate = useNavigate()

  const [loading, set_loading] = useState(true)
  const [saving, set_saving] = useState(false)
  const [error, set_error] = useState<string | null>(null)

  const [subscription, set_subscription] = useState<Subscription | null>(null)
  const [categories, set_categories] = useState<CategoryLookup[]>([])
  const [channels, set_channels] = useState<ChannelLookup[]>([])
  const [cities, set_cities] = useState<CityLookup[]>([])

  const [form, set_form] = useState<EditSubscriptionFormState>({
    kategorija_id: 0,
    kanal_id: 0,
    zunanji_id_kanala: '',
    pogostost: 1,
    ura_posiljanja: '',
    aktivna: true,
    kraji_ids: [],
  })

  useEffect(() => {
    let cancelled = false

    // Preverimo, ali je ID naročnine v URL-ju prisoten.
    if (!id) {
      set_error('ID naročnine manjka.')
      set_loading(false)
      return
    }

    // Ta funkcija naloži naročnino in vse lookup podatke za obrazec.
    async function load_data() {
      try {
        set_loading(true)
        set_error(null)

        const [subscription_data, categories_data, channels_data, cities_data] =
          await Promise.all([
            fetch_subscription_by_id(Number(id)),
            fetch_categories(),
            fetch_channels(),
            fetch_cities(),
          ])

        if (cancelled) {
          return
        }

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

    load_data()

    // Cleanup prepreči posodobitev state-a po odstranitvi komponente.
    return () => {
      cancelled = true
    }
  }, [id])

  // Posodobi tekstovno ali numerično vrednost v obrazcu.
  function handle_change(
    event: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>,
  ) {
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

  // Posodobi seznam izbranih krajev glede na checkbox klik.
  function handle_city_toggle(kraj_id: number) {
    set_form((previous) => {
      const already_selected = previous.kraji_ids.includes(kraj_id)

      if (already_selected) {
        return {
          ...previous,
          kraji_ids: previous.kraji_ids.filter((id) => id !== kraj_id),
        }
      }

      return {
        ...previous,
        kraji_ids: [...previous.kraji_ids, kraj_id],
      }
    })
  }

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
          <select
            id="kategorija_id"
            name="kategorija_id"
            value={form.kategorija_id}
            onChange={handle_change}
          >
            {categories.map((category) => (
              <option
                key={category.kategorija_id}
                value={category.kategorija_id}
              >
                {category.naziv_kategorije}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label htmlFor="kanal_id">Kanal:</label>
          <select
            id="kanal_id"
            name="kanal_id"
            value={form.kanal_id}
            onChange={handle_change}
          >
            {channels.map((channel) => (
              <option key={channel.kanal_id} value={channel.kanal_id}>
                {channel.naziv_kanala}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label htmlFor="zunanji_id_kanala">Zunanji ID kanala:</label>
          <input
            id="zunanji_id_kanala"
            name="zunanji_id_kanala"
            type="text"
            value={form.zunanji_id_kanala}
            onChange={handle_change}
          />
        </div>

        <div>
          <label htmlFor="pogostost">Pogostost:</label>
          <input
            id="pogostost"
            name="pogostost"
            type="number"
            min={1}
            value={form.pogostost}
            onChange={handle_change}
          />
        </div>

        <div>
          <label htmlFor="ura_posiljanja">Čas pošiljanja:</label>
          <input
            id="ura_posiljanja"
            name="ura_posiljanja"
            type="time"
            value={form.ura_posiljanja}
            onChange={handle_change}
          />
        </div>

        <div>
          <label htmlFor="aktivna">Aktivna:</label>
          <input
            id="aktivna"
            name="aktivna"
            type="checkbox"
            checked={form.aktivna}
            onChange={handle_change}
          />
        </div>

        <fieldset>
          <legend>Kraji:</legend>

          {cities.map((city) => (
            <div key={city.kraj_id}>
              <label>
                <input
                  type="checkbox"
                  checked={form.kraji_ids.includes(city.kraj_id)}
                  onChange={() => handle_city_toggle(city.kraj_id)}
                />
                {city.celoten_naziv}
              </label>
            </div>
          ))}
        </fieldset>

        <button type="submit" disabled={saving}>
          {saving ? 'Shranjevanje...' : 'Shrani spremembe'}
        </button>
      </form>
    </main>
  )
}