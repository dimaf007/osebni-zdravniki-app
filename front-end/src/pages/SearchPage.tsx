// Ta datoteka predstavlja javno stran za iskanje.
// Uporabnik lahko brez prijave izbere kategorijo in do 3 kraje,
// nato pa se rezultati iskanja prikažejo na istem zaslonu.
// Če se uporabnik odloči ustvariti naročnino, ga lahko preusmerimo
// na prijavo ali neposredno na ustvarjanje naročnine.

import { useState } from 'react'
import { useNavigate } from 'react-router-dom'

import SubscriptionQueryForm, {
  type SearchQueryFormState,
} from '../components/SubscriptionQueryForm'
import { use_auth } from '../context/AuthContext'

interface SearchDoctorItem {
  zdravnik_id: number
  sifra_zdravnika: string | null
  priimek_ime: string
  sprejema: boolean
  dejavnost_id: number
  naziv_dejavnosti: string
  izvajalec_id: number
  naziv_izvajalca: string
  ulica: string | null
}

interface SearchCategoryGroup {
  kategorija_id: number
  naziv_kategorije: string
  oznaka_kategorije: string | null
  doctors: SearchDoctorItem[]
}

interface SearchAdditionalAmbulanceItem {
  dodatna_ambulanta_id: number
  naziv_ambulante: string
  ulica: string | null
  izvajalec_id: number
  naziv_izvajalca: string
}

interface SearchCityGroup {
  kraj_id: number
  posta: string | null
  naziv_kraja: string
  celoten_naziv: string
  categories: SearchCategoryGroup[]
  dodatne_ambulante: SearchAdditionalAmbulanceItem[]
}

interface SearchResponseData {
  updated_at: string | null
  filters: {
    kraji_ids: number[]
    kategorije_ids: number[]
  }
  cities: SearchCityGroup[]
}

export default function SearchPage() {
  const navigate = useNavigate()
  const { user, is_authenticated } = use_auth()

  const [form, set_form] = useState<SearchQueryFormState>({
    kategorija_id: 0,
    kraji_ids: [],
  })

  const [loading, set_loading] = useState(false)
  const [error, set_error] = useState<string | null>(null)
  const [results, set_results] = useState<SearchResponseData | null>(null)
  const [has_searched, set_has_searched] = useState(false)

  // Ta funkcija začasno simulira odgovor backend API-ja,
  // vendar v obliki, ki je bližje končni strukturi rezultatov.
  async function run_search(query: SearchQueryFormState): Promise<SearchResponseData> {
    await new Promise((resolve) => setTimeout(resolve, 500))

    return {
      updated_at: new Date().toLocaleString('sl-SI'),
      filters: {
        kraji_ids: query.kraji_ids,
        kategorije_ids: [query.kategorija_id],
      },
      cities: query.kraji_ids.map((kraj_id, index) => ({
        kraj_id,
        posta: null,
        naziv_kraja: `Kraj ${index + 1}`,
        celoten_naziv: `Izbran kraj ${kraj_id}`,
        categories: [
          {
            kategorija_id: query.kategorija_id,
            naziv_kategorije: `Kategorija ${query.kategorija_id}`,
            oznaka_kategorije: null,
            doctors: [
              {
                zdravnik_id: Number(`${query.kategorija_id}${kraj_id}${index + 1}`),
                sifra_zdravnika: null,
                priimek_ime: `Zdravnik ${index + 1}`,
                sprejema: true,
                dejavnost_id: query.kategorija_id,
                naziv_dejavnosti: `Dejavnost ${query.kategorija_id}`,
                izvajalec_id: kraj_id,
                naziv_izvajalca: `Izvajalec za kraj ${kraj_id}`,
                ulica: `Naslov ${index + 1}`,
              },
            ],
          },
        ],
        dodatne_ambulante: [
          {
            dodatna_ambulanta_id: Number(`9${kraj_id}${index + 1}`),
            naziv_ambulante: `Dodatna ambulanta ${index + 1}`,
            ulica: `Dodatni naslov ${index + 1}`,
            izvajalec_id: kraj_id,
            naziv_izvajalca: `Dodatni izvajalec ${kraj_id}`,
          },
        ],
      })),
    }
  }

  async function handle_submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()

    if (form.kraji_ids.length === 0) {
      set_error('Izberi vsaj en kraj.')
      set_results(null)
      set_has_searched(false)
      return
    }

    if (form.kategorija_id === 0) {
      set_error('Izberi kategorijo zdravnika.')
      set_results(null)
      set_has_searched(false)
      return
    }

    try {
      set_loading(true)
      set_error(null)

      const data = await run_search(form)

      set_results(data)
      set_has_searched(true)
    } catch (e) {
      set_error((e as Error).message)
      set_results(null)
      set_has_searched(true)
    } finally {
      set_loading(false)
    }
  }

  function handle_create_subscription() {
    const subscription_prefill = {
      kategorija_id: form.kategorija_id,
      kraji_ids: form.kraji_ids,
    }

    if (is_authenticated && user) {
      navigate('/subscriptions/create', {
        state: {
          subscription_prefill,
          source: 'search',
        },
      })
      return
    }

    navigate('/login', {
      state: {
        redirect_to: '/subscriptions/create',
        subscription_prefill,
        source: 'search',
      },
    })
  }

  return (
    <main className="subscriptions-page">
      <h1>Iskanje zdravnikov</h1>
      <p className="status-message">
        Iskanje je na voljo tudi brez prijave.
      </p>

      {error && <p className="status-message error-message">{error}</p>}

      <form className="subscription-card" onSubmit={handle_submit}>
        <SubscriptionQueryForm
          value={form}
          on_change={set_form}
          disabled={loading}
        />

        <div className="auth-actions">
          <button type="submit" disabled={loading}>
            {loading ? 'Iskanje...' : 'Išči'}
          </button>
        </div>
      </form>

      <section className="subscriptions-list">
        <h2>Rezultati iskanja</h2>

        {!loading && has_searched && !results && (
          <p className="status-message">Ni rezultatov.</p>
        )}

        {!loading && has_searched && results && results.updated_at && (
          <p className="status-message">
            Zadnja posodobitev podatkov: {results.updated_at}
          </p>
        )}

        {results?.cities.map((city) => (
          <article key={city.kraj_id} className="subscription-card">
            <div className="subscription-title">
              <strong>{city.celoten_naziv || city.naziv_kraja || `Kraj ${city.kraj_id}`}</strong>
            </div>

            {city.categories.length === 0 && (
              <p className="subscription-row">
                Za izbrano kategorijo v tem kraju trenutno ni najdenih zdravnikov,
                ki sprejemajo nove paciente.
              </p>
            )}

            {city.categories.map((category) => (
              <section key={category.kategorija_id}>
                <p className="subscription-row">
                  <strong>Kategorija:</strong> {category.naziv_kategorije}
                </p>

                {category.doctors.length === 0 ? (
                  <p className="subscription-row">
                    V tej kategoriji ni najdenih zdravnikov.
                  </p>
                ) : (
                  <ul className="subscription-row">
                    {category.doctors.map((doctor) => (
                      <li key={doctor.zdravnik_id}>
                        <strong>{doctor.priimek_ime}</strong>
                        {' — '}
                        {doctor.naziv_izvajalca}
                        {doctor.ulica ? `, ${doctor.ulica}` : ''}
                      </li>
                    ))}
                  </ul>
                )}
              </section>
            ))}

            <section>
              <p className="subscription-row">
                <strong>Dodatne ambulante:</strong>
              </p>

              {city.dodatne_ambulante.length === 0 ? (
                <p className="subscription-row">
                  Za ta kraj ni dodatnih ambulant.
                </p>
              ) : (
                <ul className="subscription-row">
                  {city.dodatne_ambulante.map((ambulance) => (
                    <li key={ambulance.dodatna_ambulanta_id}>
                      <strong>{ambulance.naziv_ambulante}</strong>
                      {' — '}
                      {ambulance.naziv_izvajalca}
                      {ambulance.ulica ? `, ${ambulance.ulica}` : ''}
                    </li>
                  ))}
                </ul>
              )}
            </section>

            <div className="auth-actions">
              <button type="button" onClick={handle_create_subscription}>
                {is_authenticated
                  ? 'Ustvari naročnino'
                  : 'Prijava za ustvarjanje naročnine'}
              </button>
            </div>
          </article>
        ))}
      </section>
    </main>
  )
}