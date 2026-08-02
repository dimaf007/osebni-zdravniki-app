// Ta datoteka predstavlja stran "Moje naročnine".
// Stran preveri, ali je uporabnik prijavljen.
// Če je prijavljen, naloži njegove naročnine in šifrant krajev,
// da lahko na karticah prikažemo dejanska imena krajev
// namesto internih ID-jev.

import { useEffect, useState } from 'react'

import SubscriptionCard from '../components/SubscriptionCard'
import { fetch_cities } from '../api/lookups-api'
import { fetch_subscriptions } from '../api/subscriptions-api'
import { use_auth } from '../context/AuthContext'
import type { CityLookup } from '../types/lookups-types'
import type { Subscription } from '../types/subscription-types'

export default function MySubscriptionsPage() {
  const { user, is_authenticated } = use_auth()

  const [subscriptions, set_subscriptions] = useState<Subscription[]>([])
  const [cities, set_cities] = useState<CityLookup[]>([])
  const [loading, set_loading] = useState(true)
  const [error, set_error] = useState<string | null>(null)

  useEffect(() => {
    // Če uporabnik ni prijavljen, ne pošiljamo zahtev na backend.
    if (!is_authenticated || !user) {
      set_loading(false)
      return
    }

    let cancelled = false

    // Ta funkcija hkrati naloži naročnine prijavljenega uporabnika
    // in šifrant krajev za bolj prijazen prikaz na karticah.
    async function load_data() {
      if (!user) {
        return
      }

      try {
        set_loading(true)
        set_error(null)

        const [subscriptions_data, cities_data] = await Promise.all([
          fetch_subscriptions(user.id),
          fetch_cities(),
        ])

        if (!cancelled) {
          set_subscriptions(subscriptions_data)
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
  }, [is_authenticated, user])

  // Iz seznama krajev pripravimo slovar za dostop po ID-ju.
  // Ključ je kraj_id, vrednost pa celoten_naziv kraja.
  const placeNamesById: Record<number, string> = Object.fromEntries(
    cities.map((city) => [city.kraj_id, city.celoten_naziv]),
  )

  if (!is_authenticated || !user) {
    return (
      <main>
        <h1>Moje naročnine</h1>
        <p>Za ogled naročnin se moraš prijaviti.</p>
      </main>
    )
  }

  if (loading) {
    return (
      <main>
        <h1>Moje naročnine</h1>
        <p>Nalaganje naročnin...</p>
      </main>
    )
  }

  if (error) {
    return (
      <main>
        <h1>Moje naročnine</h1>
        <p>{error}</p>
      </main>
    )
  }

  if (subscriptions.length === 0) {
    return (
      <main className="subscriptions-page">
        <h1>Moje naročnine</h1>
        <p>Še nimaš nobene naročnine.</p>
      </main>
    )
  }

  return (
  <main className="subscriptions-page">
    <h1>Moje naročnine</h1>

    {/* Vsako naročnino prikažemo kot ločeno kartico.
    Kartici posredujemo tudi slovar imen krajev. */}
    <div className="subscriptions-list">
      {subscriptions.map((subscription) => (
        <SubscriptionCard
          key={subscription.poizvedba_id}
          subscription={subscription}
          placeNamesById={placeNamesById}
        />
      ))}
    </div>
  </main>
)
}