// Ta datoteka predstavlja stran za prikaz ene naročnine.
// Stran naloži podatke o izbrani naročnini in šifrant krajev,
// da lahko uporabniku prikažemo imena krajev namesto ID-jev.
// Uporabnik lahko s te strani preide tudi na urejanje naročnine.

import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'

import { fetch_cities } from '../api/lookups-api'
import { fetch_subscription_by_id } from '../api/subscriptions-api'
import { use_auth } from '../context/AuthContext'
import type { CityLookup } from '../types/lookups-types'
import type { Subscription } from '../types/subscription-types'

export default function SingleSubscriptionPage() {
  // Iz URL-ja preberemo ID naročnine in preverimo stanje prijave.
  const { id } = useParams()
  const { user, is_authenticated } = use_auth()

  // Ti state-i hranijo naročnino, šifrant krajev ter stanja nalaganja in napake.
  const [subscription, set_subscription] = useState<Subscription | null>(null)
  const [cities, set_cities] = useState<CityLookup[]>([])
  const [loading, set_loading] = useState(true)
  const [error, set_error] = useState<string | null>(null)

  // Ta effect ob odprtju strani naloži podatke naročnine in seznam krajev.
  useEffect(() => {
    if (!is_authenticated || !user || !id) {
      set_loading(false)
      return
    }

    let cancelled = false

    // Ta funkcija hkrati pridobi naročnino in šifrant krajev.
    async function load_data() {
      try {
        set_loading(true)
        set_error(null)

        const [subscription_data, cities_data] = await Promise.all([
          fetch_subscription_by_id(Number(id)),
          fetch_cities(),
        ])

        if (!cancelled) {
          set_subscription(subscription_data)
          set_cities(cities_data)
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

    load_data()

    // Cleanup prepreči posodobitev state-a po odstranitvi komponente.
    return () => {
      cancelled = true
    }
  }, [is_authenticated, user, id])

  // Pripravi prikaz zunanjega ID-ja kanala; če manjka, vrne nadomestno besedilo.
  function format_zunanji_id(value: string | null) {
    if (!value || value.trim() === '') {
      return 'Ni nastavljeno'
    }

    return value
  }

  // Pretvori seznam ID-jev krajev v berljiv seznam nazivov krajev.
  function format_kraji(kraji_ids: number[]) {
    if (kraji_ids.length === 0) {
      return 'Ni izbranih krajev'
    }

    return kraji_ids
      .map((id) => {
        const city = cities.find((item) => item.kraj_id === id)
        return city ? city.celoten_naziv : `Kraj #${id}`
      })
      .join(', ')
  }

  // Pogostost pretvori v uporabniku prijazen opis.
  function format_pogostost(value: number) {
    if (value === 1) {
      return 'Vsak dan'
    }

    return `Vsakih ${value} dni`
  }

  // Iz časa izpiše samo ure in minute.
  function format_ura(value: string) {
    return value.slice(0, 5)
  }

  if (!is_authenticated || !user) {
    return (
      <main>
        <h1>Naročnina</h1>
        <p>Za ogled naročnine se moraš prijaviti.</p>
      </main>
    )
  }

  if (loading) {
    return (
      <main>
        <h1>Naročnina</h1>
        <p>Nalaganje naročnine...</p>
      </main>
    )
  }

  if (error) {
    return (
      <main>
        <h1>Naročnina</h1>
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
        <h1>Naročnina</h1>
        <p>Naročnina ni bila najdena.</p>
        <p>
          <Link to="/subscriptions">Nazaj na naročnine</Link>
        </p>
      </main>
    )
  }

  return (
    <main>
      <h1>Naročnina</h1>

      <p>
        <Link to="/subscriptions">Nazaj na naročnine</Link>
      </p>

      <article>
        <h2>{subscription.naziv_kategorije}</h2>

        <p>
          <strong>Kanal:</strong> {subscription.naziv_kanala}
        </p>

        <p>
          <strong>Zunanji ID kanala:</strong>{' '}
          {format_zunanji_id(subscription.zunanji_id_kanala)}
        </p>

        <p>
          <strong>Pogostost:</strong> {format_pogostost(subscription.pogostost)}
        </p>

        <p>
          <strong>Čas pošiljanja:</strong> {format_ura(subscription.ura_posiljanja)}
        </p>

        <p>
          <strong>Kraji:</strong> {format_kraji(subscription.kraji_ids)}
        </p>

        <p>
          <strong>Aktivna:</strong> {subscription.aktivna ? 'Da' : 'Ne'}
        </p>

        <p>
          <Link to={`/subscriptions/${subscription.poizvedba_id}/edit`}>
            Uredi naročnino
          </Link>
        </p>
      </article>
    </main>
  )
}