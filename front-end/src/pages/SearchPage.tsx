import { useState } from 'react'
import { useNavigate } from 'react-router-dom'

import SubscriptionQueryForm, {
  type SearchQueryFormState,
} from '../components/SubscriptionQueryForm'
import { use_auth } from '../context/AuthContext'
import { API_URL } from '../api/api-config'

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

  async function run_search(query: SearchQueryFormState): Promise<SearchResponseData> {

    const response = await fetch(`${API_URL}/api/doctors/search`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      kraji_ids: query.kraji_ids,
      kategorije_ids: [query.kategorija_id],
    }),
  })

  const payload = await response.json()

  if (!response.ok || !payload.success) {
    throw new Error(payload.message || 'Search request failed')
  }

  return payload.data
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
      navigate('/create-subscription', {
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

  function count_total_doctors(data: SearchResponseData): number {
    return data.cities.reduce((city_total, city) => {
      const doctors_in_city = city.categories.reduce((category_total, category) => {
        return category_total + category.doctors.length
      }, 0)

      return city_total + doctors_in_city
    }, 0)
  }

  function has_any_accepting_doctors(city: SearchCityGroup): boolean {
    return city.categories.some((category) =>
      category.doctors.some((doctor) => doctor.sprejema)
    )
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
            {loading ? 'Iskanje poteka...' : 'Išči'}
          </button>
        </div>
      </form>

      <section className="subscriptions-list">
        <h2>Rezultati iskanja</h2>

        {!loading && has_searched && !results && (
          <p className="status-message">
            Za izbrane kriterije trenutno ni rezultatov.
          </p>
        )}

        {!loading && has_searched && results && (
          <>
            <div className="search-summary">
              <span className="search-summary-badge">
                Najdeni kraji: {results.cities.length}
              </span>
              <span className="search-summary-badge">
                Zdravniki: {count_total_doctors(results)}
              </span>
            </div>

            <p className="status-message">
                Zadnja posodobitev podatkov:{' '}
                {results.updated_at ? results.updated_at : 'ni podatka'}
            </p>

            {results.cities.map((city) => (
              <article key={city.kraj_id} className="subscription-card">
                <div className="subscription-title">
                  <strong>{city.celoten_naziv || city.naziv_kraja}</strong>
                </div>

                <p className="subscription-row">
                  {has_any_accepting_doctors(city)
                    ? 'V tem kraju so na voljo zdravniki, ki sprejemajo nove paciente.'
                    : 'V tem kraju trenutno ni zdravnikov, ki sprejemajo nove paciente.'}
                </p>

                {city.categories.length === 0 ? (
                  <p className="subscription-row">
                    Za izbrano kategorijo v tem kraju trenutno ni zdravnikov.
                  </p>
                ) : (
                  city.categories.map((category) => (
                    <section key={category.kategorija_id}>
                      <p className="subscription-row">
                        <strong>Kategorija:</strong> {category.naziv_kategorije}
                      </p>

                      {category.doctors.length === 0 ? (
                        <p className="subscription-row">
                          V tej kategoriji ni najdenih zdravnikov.
                        </p>
                      ) : (
                        <div className="subscription-row">
                          {category.doctors.map((doctor) => (
                            <div key={doctor.zdravnik_id} className="search-result-item">
                              <p>
                                <strong>{doctor.priimek_ime}</strong>
                              </p>
                              <p>{doctor.naziv_izvajalca}</p>
                              {doctor.ulica && (
                                <p className="search-result-meta">{doctor.ulica}</p>
                              )}
                              <span
                                className={
                                  doctor.sprejema
                                    ? 'search-result-status'
                                    : 'search-result-status inactive'
                                }
                              >
                                {doctor.sprejema
                                  ? 'Sprejema nove paciente'
                                  : 'Trenutno ne sprejema novih pacientov'}
                              </span>
                            </div>
                          ))}
                        </div>
                      )}
                    </section>
                  ))
                )}

                <section>
                  <p className="subscription-row">
                    <strong>Dodatne ambulante:</strong>
                  </p>

                  {city.dodatne_ambulante.length === 0 ? (
                    <p className="subscription-row">
                      Za ta kraj ni dodatnih ambulant.
                    </p>
                  ) : (
                    <div className="subscription-row">
                      {city.dodatne_ambulante.map((ambulance) => (
                        <div
                          key={ambulance.dodatna_ambulanta_id}
                          className="search-result-item"
                        >
                          <p>
                            <strong>{ambulance.naziv_ambulante}</strong>
                          </p>
                          <p>{ambulance.naziv_izvajalca}</p>
                          {ambulance.ulica && (
                            <p className="search-result-meta">{ambulance.ulica}</p>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </section>
              </article>
            ))}

            <div className="auth-actions">
              <button type="button" onClick={handle_create_subscription}>
                {is_authenticated
                  ? 'Ustvari naročnino za to iskanje'
                  : 'Prijavi se za ustvarjanje naročnine'}
              </button>
            </div>
          </>
        )}
      </section>
    </main>
  )
}