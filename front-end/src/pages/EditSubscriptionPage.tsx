// Ta datoteka predstavlja stran za urejanje obstoječe naročnine.
// Stran naloži podatke izbrane naročnine in potrebne šifrante za obrazec.
// Skupni del obrazca za kategorijo in kraje uporablja isti komponenti
// kot stran za ustvarjanje naročnine, da ohranimo enoten videz in logiko.

import { useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'

import SubscriptionQueryForm, {
  type SearchQueryFormState,
} from '../components/SubscriptionQueryForm'
import { fetch_channels } from '../api/lookups-api'
import {
  delete_subscription,
  fetch_subscription_by_id,
  update_subscription,
} from '../api/subscriptions-api'
import type { ChannelLookup } from '../types/lookups-types'
import type { Subscription } from '../types/subscription-types'

// Ta vmesnik opisuje celotno stanje obrazca za urejanje naročnine.
interface EditSubscriptionFormState extends SearchQueryFormState {
  kanal_id: number
  zunanji_id_kanala: string
  pogostost: number
  ura_posiljanja: string
  aktivna: boolean
}

export default function EditSubscriptionPage() {
  // Iz URL-ja preberemo ID naročnine in pripravimo preusmerjanje po shranjevanju.
  const { id } = useParams()
  const navigate = useNavigate()

  // Ti state-i skrbijo za osnovna stanja strani in morebitne napake.
  const [loading, set_loading] = useState(true)
  const [saving, set_saving] = useState(false)
  const [error, set_error] = useState<string | null>(null)

  // Tukaj hranimo naloženo naročnino in šifrante kanalov.
  const [subscription, set_subscription] = useState<Subscription | null>(null)
  const [channels, set_channels] = useState<ChannelLookup[]>([])

  // V tem state-u hranimo vse vrednosti obrazca, ki jih pošljemo backendu.
  const [form, set_form] = useState<EditSubscriptionFormState>({
    kategorija_id: 0,
    kraji_ids: [],
    kanal_id: 0,
    zunanji_id_kanala: '',
    pogostost: 1,
    ura_posiljanja: '',
    aktivna: true,
  })

  useEffect(() => {
    let cancelled = false

    // Če ID naročnine manjka, strani ne moremo pravilno naložiti.
    if (!id) {
      set_error('ID naročnine manjka.')
      set_loading(false)
      return
    }

    // Ta funkcija naloži obstoječo naročnino in kanale za obrazec.
    async function load_data() {
      try {
        set_loading(true)
        set_error(null)

        const [subscription_data, channels_data] = await Promise.all([
          fetch_subscription_by_id(Number(id)),
          fetch_channels(),
        ])

        if (cancelled) {
          return
        }

        set_subscription(subscription_data)
        set_channels(channels_data)

        set_form({
          kategorija_id: subscription_data.kategorija_id,
          kraji_ids: subscription_data.kraji_ids ?? [],
          kanal_id: subscription_data.kanal_id,
          zunanji_id_kanala: subscription_data.zunanji_id_kanala ?? '',
          pogostost: subscription_data.pogostost,
          ura_posiljanja: subscription_data.ura_posiljanja.slice(0, 5),
          aktivna: subscription_data.aktivna,
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

  // Posodobi skupni del obrazca, ki je enak kot na strani za ustvarjanje naročnine.
  function handle_search_form_change(next_value: SearchQueryFormState) {
    set_form((previous) => ({
      ...previous,
      kategorija_id: next_value.kategorija_id,
      kraji_ids: next_value.kraji_ids,
    }))
  }

  // Posodobi posamezna polja obrazca glede na tip vhodnega elementa.
  function handle_change(
    event: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>,
  ) {
    const target = event.target
    const { name, value } = target

    if (target instanceof HTMLInputElement && target.type === 'checkbox') {
      set_form((previous) => ({
        ...previous,
        [name]: target.checked,
      }))
      return
    }

    if (name === 'kanal_id' || name === 'pogostost') {
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

  // Pošlje posodobljene podatke na backend in po uspehu odpre podrobnosti naročnine.
  async function handle_submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()

    if (!id) {
      set_error('ID naročnine manjka.')
      return
    }

    if (form.kraji_ids.length === 0) {
      set_error('Izberi vsaj en kraj.')
      return
    }

    if (form.kategorija_id === 0) {
      set_error('Izberi kategorijo.')
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

  // Dokončno izbriše naročnino po potrditvi uporabnika
  // in uporabnika preusmeri nazaj na seznam naročnin.
  async function handle_delete() {
    if (!id) {
      set_error('ID naročnine manjka.')
      return
    }

    const confirmed = window.confirm(
      'Ali si prepričan, da želiš naročnino dokončno izbrisati?'
    )

    if (!confirmed) {
      return
    }

    try {
      set_saving(true)
      set_error(null)

      await delete_subscription(Number(id))

      navigate('/subscriptions')
    } catch (e) {
      set_error((e as Error).message)
    } finally {
      set_saving(false)
    }
  }

  if (loading) {
    return (
      <main className="subscriptions-page">
        <h1>Uredi naročnino</h1>
        <p className="status-message">Nalaganje obrazca za naročnino...</p>
      </main>
    )
  }

  if (error && !subscription) {
    return (
      <main className="subscriptions-page">
        <h1>Uredi naročnino</h1>
        <p className="status-message error-message">{error}</p>
        <p>
          <Link to="/subscriptions">Nazaj na naročnine</Link>
        </p>
      </main>
    )
  }

  if (!subscription) {
    return (
      <main className="subscriptions-page">
        <h1>Uredi naročnino</h1>
        <p className="status-message">Naročnina ni bila najdena.</p>
        <p>
          <Link to="/subscriptions">Nazaj na naročnine</Link>
        </p>
      </main>
    )
  }

  return (
    <main className="subscriptions-page">
      <h1>Uredi naročnino</h1>

      <p>
        <Link to={`/subscriptions/${id}`}>Nazaj na podrobnosti naročnine</Link>
      </p>

      {error && <p className="status-message error-message">{error}</p>}

      <form className="subscription-card" onSubmit={handle_submit}>
        <SubscriptionQueryForm
          value={{
            kategorija_id: form.kategorija_id,
            kraji_ids: form.kraji_ids,
          }}
          on_change={handle_search_form_change}
          disabled={saving}
        />

        <div className="subscription-row">
          <label htmlFor="kanal_id">
            <strong>Kanal:</strong>
          </label>

          <select
            id="kanal_id"
            name="kanal_id"
            value={form.kanal_id}
            onChange={handle_change}
            disabled={saving}
          >
            {channels.map((channel) => (
              <option key={channel.kanal_id} value={channel.kanal_id}>
                {channel.naziv_kanala}
              </option>
            ))}
          </select>
        </div>

        <div className="subscription-row">
          <label htmlFor="zunanji_id_kanala">
            <strong>Zunanji ID kanala:</strong>
          </label>

          <input
            id="zunanji_id_kanala"
            name="zunanji_id_kanala"
            type="text"
            value={form.zunanji_id_kanala}
            onChange={handle_change}
            disabled={saving}
          />
        </div>

        <div className="subscription-row">
          <label htmlFor="pogostost">
            <strong>Pogostost (1 pošiljanje na __ dni):</strong>
          </label>

          <input
            id="pogostost"
            name="pogostost"
            type="number"
            min={1}
            value={form.pogostost}
            onChange={handle_change}
            disabled={saving}
          />
        </div>

        <div className="subscription-row">
          <label htmlFor="ura_posiljanja">
            <strong>Čas pošiljanja:</strong>
          </label>

          <input
            id="ura_posiljanja"
            name="ura_posiljanja"
            type="time"
            value={form.ura_posiljanja}
            onChange={handle_change}
            disabled={saving}
          />
        </div>

        <div className="subscription-row subscription-row--status-actions">
          <div className="subscription-status-field">
            <label htmlFor="aktivna">
              <strong>Aktivna:</strong>
            </label>

            <input
              id="aktivna"
              name="aktivna"
              type="checkbox"
              checked={form.aktivna}
              onChange={handle_change}
              disabled={saving}
            />
          </div>

          <div className="subscription-danger-zone">
            <p className="subscription-danger-text">
              Naročnino lahko začasno izklopiš tako, da odstraniš kljukico pri
              polju <strong>Aktivna</strong>.
            </p>

            <button
              type="button"
              className="danger-button"
              onClick={handle_delete}
              disabled={saving}
            >
              Izbriši naročnino dokončno
            </button>
          </div>
        </div>

        <div className="auth-actions">
          <button type="submit" disabled={saving}>
            {saving ? 'Shranjevanje...' : 'Shrani spremembe'}
          </button>
        </div>
      </form>
    </main>
  )
}