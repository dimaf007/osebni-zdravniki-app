// Ta komponenta prikaže eno naročnino v obliki kartice.
// Na kartici se izpišejo osnovni podatki naročnine,
// uporabniku pa omogoča prehod na urejanje naročnine.

import { Link } from 'react-router-dom'

import type { Subscription } from '../types/subscription-types'

type SubscriptionCardProps = {
  subscription: Subscription
  placeNamesById: Record<number, string>
}

export default function SubscriptionCard({
  subscription,
  placeNamesById,
}: SubscriptionCardProps) {
  // Pretvori seznam ID-jev krajev v berljivo besedilo z dejanskimi nazivi krajev.
  function formatKraji(krajiIds: number[]) {
    if (krajiIds.length === 0) {
      return 'Ni izbranih krajev'
    }

    return krajiIds
      .map((id) => placeNamesById[id] ?? `Kraj #${id}`)
      .join(', ')
  }

  // Pripravi prikaz cilja pošiljanja; če vrednost manjka, izpiše nadomestno besedilo.
  function formatChannelTarget(value: string | null) {
    if (!value || value.trim() === '') {
      return 'Ni nastavljeno'
    }

    return value
  }

  // Pogostost pretvori v bolj prijazen opis za uporabnika.
  function formatFrequency(value: number) {
    if (value === 1) {
      return 'Vsak dan'
    }

    return `Vsakih ${value} dni`
  }

  // Iz časa vzame samo ure in minute.
  function formatTime(value: string) {
    return value.slice(0, 5)
  }

  return (
    <article className="subscription-card">
      <div className="subscription-header">
        <h2>{subscription.naziv_kategorije}</h2>
        <span
          className={
            subscription.aktivna
              ? 'subscription-status is-active'
              : 'subscription-status is-inactive'
          }
        >
          {subscription.aktivna ? 'Aktivna' : 'Neaktivna'}
        </span>
      </div>

      <p>
        <strong>Kraji:</strong> {formatKraji(subscription.kraji_ids)}
      </p>

      <p>
        <strong>Kanal:</strong> {subscription.naziv_kanala}
      </p>

      <p>
        <strong>Pošiljanje na:</strong>{' '}
        {formatChannelTarget(subscription.zunanji_id_kanala)}
      </p>

      <p>
        <strong>Pogostost:</strong> {formatFrequency(subscription.pogostost)}
      </p>

      <p>
        <strong>Čas pošiljanja:</strong> {formatTime(subscription.ura_posiljanja)}
      </p>

      <Link
        className="subscription-link"
        to={`/subscriptions/${subscription.poizvedba_id}/edit`}
      >
        Uredi naročnino
      </Link>
    </article>
  )
}