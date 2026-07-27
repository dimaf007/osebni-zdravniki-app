// Ta datoteka predstavlja stran za ustvarjanje nove naročnine.
// Stran naloži potrebne šifrante za naročnino in uporabi skupni del obrazca
// za kategorijo in kraje. Če uporabnik pride iz strani iskanja,
// se podatki iskanja samodejno prenesejo v obrazec.

import { useEffect, useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'

import SubscriptionQueryForm, {
  type SearchQueryFormState,
} from '../components/SubscriptionQueryForm'
import { create_subscription } from '../api/subscriptions-api'
import { fetch_channels } from '../api/lookups-api'
import { use_auth } from '../context/AuthContext'
import type { ChannelLookup } from '../types/lookups-types'

interface CreateSubscriptionFormState extends SearchQueryFormState {
  kanal_id: number
  zunanji_id_kanala: string
  pogostost: number
  ura_posiljanja: string
  aktivna: boolean
}

interface CreateSubscriptionLocationState {
  subscription_prefill?: SearchQueryFormState
  source?: string
}

export default function CreateSubscriptionPage() {
  const navigate = useNavigate()
  const location = useLocation()
  const { user, is_authenticated } = use_auth()

  const location_state = location.state as CreateSubscriptionLocationState | null
  const subscription_prefill = location_state?.subscription_prefill

  useEffect(() => {
    if (!subscription_prefill) {
      return
    }

    set_form((previous) => ({
      ...previous,
      kategorija_id: subscription_prefill.kategorija_id ?? 0,
      kraji_ids: subscription_prefill.kraji_ids ?? [],
    }))
  }, [subscription_prefill])

  const [loading, set_loading] = useState(true)
  const [saving, set_saving] = useState(false)
  const [error, set_error] = useState<string | null>(null)

  const [channels, set_channels] = useState<ChannelLookup[]>([])

  const [form, set_form] = useState<CreateSubscriptionFormState>({
    kategorija_id: subscription_prefill?.kategorija_id ?? 0,
    kraji_ids: subscription_prefill?.kraji_ids ?? [],
    kanal_id: 0,
    zunanji_id_kanala: '',
    pogostost: 1,
    ura_posiljanja: '08:00',
    aktivna: true,
  })

  useEffect(() => {
    if (!is_authenticated || !user) {
      set_loading(false)
      return
    }

    let cancelled = false

    // Naložimo samo kanale, ker kategorije in kraje ureja SubscriptionQueryForm.
    async function load_lookups() {
      try {
        set_loading(true)
        set_error(null)

        const channels_data = await fetch_channels()

        if (cancelled) {
          return
        }

        set_channels(channels_data)

        set_form((previous) => ({
          ...previous,
          kanal_id:
            previous.kanal_id !== 0
              ? previous.kanal_id
              : channels_data.length > 0
                ? channels_data[0].kanal_id
                : 0,
        }))
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
  }, [is_authenticated, user])

  // Posodobi del obrazca, ki je skupen z iskalno stranjo.
  function handle_search_form_change(next_value: SearchQueryFormState) {
    set_form((previous) => ({
      ...previous,
      kategorija_id: next_value.kategorija_id,
      kraji_ids: next_value.kraji_ids,
    }))
  }

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

  // Pošlje obrazec na backend in po uspehu preusmeri na novo naročnino.
  async function handle_submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()

    if (!user) {
      set_error('Za ustvarjanje naročnine se moraš prijaviti.')
      return
    }

    if (form.kraji_ids.length === 0) {
      set_error('Izberi vsaj en kraj.')
      return
    }

    try {
      set_saving(true)
      set_error(null)

      const new_subscription_id = await create_subscription({
        uporabnik_id: user.id,
        kategorija_id: form.kategorija_id,
        kanal_id: form.kanal_id,
        zunanji_id_kanala: form.zunanji_id_kanala,
        pogostost: form.pogostost,
        ura_posiljanja: form.ura_posiljanja,
        aktivna: form.aktivna,
        kraji_ids: form.kraji_ids,
      })

      if (!new_subscription_id || Number.isNaN(new_subscription_id)) {
        throw new Error('Backend ni vrnil veljavnega ID-ja naročnine.')
      }

      navigate(`/subscriptions/${new_subscription_id}`)
    } catch (e) {
      set_error((e as Error).message)
    } finally {
      set_saving(false)
    }
  }

  if (!is_authenticated || !user) {
    return (
      <main className="subscriptions-page">
        <h1>Ustvari naročnino</h1>

        {location_state?.source === 'search' && (
          <p className="status-message">
            Podatki iskanja so pripravljeni. Za nadaljevanje se prijavi ali
            registriraj.
          </p>
        )}

        <div className="auth-actions">
          <Link
            to="/login"
            state={{
              redirect_to: '/create-subscription',
              subscription_prefill,
              source: location_state?.source,
            }}
          >
            Prijava
          </Link>

          <Link
            to="/register"
            state={{
              redirect_to: '/create-subscription',
              subscription_prefill,
              source: location_state?.source,
            }}
          >
            Registracija
          </Link>
        </div>
      </main>
    )
  }

  if (loading) {
    return (
      <main className="subscriptions-page">
        <h1>Ustvari naročnino</h1>
        <p className="status-message">Nalaganje obrazca...</p>
      </main>
    )
  }

  return (
    <main className="subscriptions-page">
      <h1>Ustvari naročnino</h1>

      <p>
        <Link to="/subscriptions">Nazaj na naročnine</Link>
      </p>

      {location_state?.source === 'search' && (
        <p className="status-message">Podatki iskanja so že izpolnjeni.</p>
      )}

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

        <div className="subscription-row">
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

        <div className="auth-actions">
          <button type="submit" disabled={saving}>
            {saving ? 'Ustvarjanje...' : 'Ustvari naročnino'}
          </button>
        </div>
      </form>
    </main>
  )
}