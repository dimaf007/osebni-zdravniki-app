// Ta datoteka vsebuje glavno poslovno logiko za iskanje zdravnikov.
// Service prebere zdravnike in dodatne ambulante iz baze,
// nato pa rezultate združi po krajih v vrstnem redu, ki ga je določil uporabnik.

import pool from '../../config/db.js'
import { RowDataPacket } from 'mysql2/promise'

export interface DoctorSearchParams {
  kraji_ids: number[]
  kategorije_ids: number[]
}

export interface DoctorRow extends RowDataPacket {
  zdravnik_id: number
  sifra_zdravnika: string | null
  priimek_ime: string
  sprejema: number
  dejavnost_id: number
  naziv_dejavnosti: string
  kategorija_id: number
  naziv_kategorije: string
  oznaka_kategorije: string | null
  izvajalec_id: number
  naziv_izvajalca: string
  ulica: string | null
  kraj_id: number
  posta: string | null
  naziv_kraja: string
  celoten_naziv: string
}

export interface AdditionalAmbulanceRow extends RowDataPacket {
  dodatna_ambulanta_id: number
  naziv_ambulante: string
  ulica: string | null
  izvajalec_id: number
  naziv_izvajalca: string
  kraj_id: number
  posta: string | null
  naziv_kraja: string
  celoten_naziv: string
}

export interface UpdatedAtRow extends RowDataPacket {
  updated_at: string | null
}

export interface SearchDoctorItem {
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

export interface SearchCategoryGroup {
  kategorija_id: number
  naziv_kategorije: string
  oznaka_kategorije: string | null
  doctors: SearchDoctorItem[]
}

export interface SearchAdditionalAmbulanceItem {
  dodatna_ambulanta_id: number
  naziv_ambulante: string
  ulica: string | null
  izvajalec_id: number
  naziv_izvajalca: string
}

export interface SearchCityGroup {
  kraj_id: number
  posta: string | null
  naziv_kraja: string
  celoten_naziv: string
  categories: SearchCategoryGroup[]
  dodatne_ambulante: SearchAdditionalAmbulanceItem[]
}

export interface SearchDoctorsResult {
  updated_at: string | null
  filters: {
    kraji_ids: number[]
    kategorije_ids: number[]
  }
  cities: SearchCityGroup[]
}

// Sestavi niz ?, ?, ? za SQL IN (...) glede na število podanih ID-jev.
function buildInClausePlaceholders(values: number[]): string {
  return values.map(() => '?').join(', ')
}

// Razvrsti elemente po istem vrstnem redu, kot so bili ID-ji podani v vhodu.
function sortByInputOrder<T>(
  items: T[],
  getId: (item: T) => number,
  orderedIds: number[],
): T[] {
  const orderMap = new Map<number, number>()
  orderedIds.forEach((id, index) => {
    orderMap.set(id, index)
  })

  return [...items].sort((a, b) => {
    const aOrder = orderMap.get(getId(a)) ?? Number.MAX_SAFE_INTEGER
    const bOrder = orderMap.get(getId(b)) ?? Number.MAX_SAFE_INTEGER
    return aOrder - bOrder
  })
}

// Iz baze prebere vse zdravnike, ki sprejemajo nove paciente
// in ustrezajo izbranim krajem ter kategorijam.
async function getDoctorsRows(
  kraji_ids: number[],
  kategorije_ids: number[],
): Promise<DoctorRow[]> {
  const cityPlaceholders = buildInClausePlaceholders(kraji_ids)
  const categoryPlaceholders = buildInClausePlaceholders(kategorije_ids)

  const [rows] = await pool.query<DoctorRow[]>(
    `
    SELECT
      z.zdravnik_id,
      z.sifra_zdravnika,
      z.priimek_ime,
      z.sprejema,
      d.dejavnost_id,
      d.naziv_dejavnosti,
      kz.kategorija_id,
      kz.naziv_kategorije,
      kz.oznaka_kategorije,
      i.izvajalec_id,
      i.naziv_izvajalca,
      i.ulica,
      k.kraj_id,
      k.posta,
      k.naziv_kraja,
      k.celoten_naziv
    FROM zdravnik z
    INNER JOIN dejavnost d
      ON d.dejavnost_id = z.dejavnost_id
    INNER JOIN kategorija_zdravnika kz
      ON kz.kategorija_id = d.kategorija_id
    INNER JOIN izvajalec i
      ON i.izvajalec_id = z.izvajalec_id
    INNER JOIN kraj k
      ON k.kraj_id = i.kraj_id
    WHERE z.sprejema = 1
      AND k.kraj_id IN (${cityPlaceholders})
      AND kz.kategorija_id IN (${categoryPlaceholders})
    ORDER BY
      k.celoten_naziv ASC,
      kz.naziv_kategorije ASC,
      z.priimek_ime ASC,
      i.naziv_izvajalca ASC
    `,
    [...kraji_ids, ...kategorije_ids],
  )

  return rows
}

// Iz baze prebere dodatne ambulante za izbrane kraje.
// Te ambulante se na frontend strani prikažejo kot ločen fallback blok.
async function getAdditionalAmbulancesRows(
  kraji_ids: number[],
): Promise<AdditionalAmbulanceRow[]> {
  const cityPlaceholders = buildInClausePlaceholders(kraji_ids)

  const [rows] = await pool.query<AdditionalAmbulanceRow[]>(
    `
    SELECT
      da.dodatna_ambulanta_id,
      da.naziv_ambulante,
      da.ulica,
      i.izvajalec_id,
      i.naziv_izvajalca,
      k.kraj_id,
      k.posta,
      k.naziv_kraja,
      k.celoten_naziv
    FROM dodatna_ambulanta da
    INNER JOIN izvajalec i
      ON i.izvajalec_id = da.izvajalec_id
    INNER JOIN kraj k
      ON k.kraj_id = i.kraj_id
    WHERE k.kraj_id IN (${cityPlaceholders})
    ORDER BY
      k.celoten_naziv ASC,
      da.naziv_ambulante ASC,
      i.naziv_izvajalca ASC
    `,
    kraji_ids,
  )

  return rows
}

// Poskusi vrniti čas zadnje posodobitve podatkov,
// da ga lahko frontend po potrebi prikaže nad rezultati iskanja.
async function getLastUpdatedAt(): Promise<string | null> {
  const [rows] = await pool.query<UpdatedAtRow[]>(
    `
    SELECT DATE_FORMAT(datum_uvoza, '%Y-%m-%d %H:%i:%s') AS updated_at
    FROM import_status
    WHERE import_status_id = 1
    LIMIT 1
    `,
  )

  return rows[0]?.updated_at ?? null
}

// Združi vrstice zdravnikov in ambulant v končno strukturo po krajih.
// Vsak kraj vsebuje seznam kategorij in ločen seznam dodatnih ambulant.
function buildCityGroups(
  kraji_ids: number[],
  doctorsRows: DoctorRow[],
  ambulanceRows: AdditionalAmbulanceRow[],
): SearchCityGroup[] {
  const cityMap = new Map<number, SearchCityGroup>()

  for (const row of doctorsRows) {
    if (!cityMap.has(row.kraj_id)) {
      cityMap.set(row.kraj_id, {
        kraj_id: row.kraj_id,
        posta: row.posta,
        naziv_kraja: row.naziv_kraja,
        celoten_naziv: row.celoten_naziv,
        categories: [],
        dodatne_ambulante: [],
      })
    }
  }

  for (const row of ambulanceRows) {
    if (!cityMap.has(row.kraj_id)) {
      cityMap.set(row.kraj_id, {
        kraj_id: row.kraj_id,
        posta: row.posta,
        naziv_kraja: row.naziv_kraja,
        celoten_naziv: row.celoten_naziv,
        categories: [],
        dodatne_ambulante: [],
      })
    }
  }

  // Poskrbimo, da so v rezultatu prisotni vsi izbrani kraji,
  // tudi če v posameznem kraju ni najdenega nobenega zdravnika.
  for (const kraj_id of kraji_ids) {
    if (!cityMap.has(kraj_id)) {
      cityMap.set(kraj_id, {
        kraj_id,
        posta: null,
        naziv_kraja: '',
        celoten_naziv: '',
        categories: [],
        dodatne_ambulante: [],
      })
    }
  }

  // Zdravnike razdelimo po krajih in nato še po kategorijah zdravnikov.
  for (const row of doctorsRows) {
    const city = cityMap.get(row.kraj_id)
    if (!city) {
      continue
    }

    let category = city.categories.find(
      (item) => item.kategorija_id === row.kategorija_id,
    )

    if (!category) {
      category = {
        kategorija_id: row.kategorija_id,
        naziv_kategorije: row.naziv_kategorije,
        oznaka_kategorije: row.oznaka_kategorije,
        doctors: [],
      }
      city.categories.push(category)
    }

    category.doctors.push({
      zdravnik_id: row.zdravnik_id,
      sifra_zdravnika: row.sifra_zdravnika,
      priimek_ime: row.priimek_ime,
      sprejema: Boolean(row.sprejema),
      dejavnost_id: row.dejavnost_id,
      naziv_dejavnosti: row.naziv_dejavnosti,
      izvajalec_id: row.izvajalec_id,
      naziv_izvajalca: row.naziv_izvajalca,
      ulica: row.ulica,
    })
  }

  // Dodatne ambulante dodamo v ločen seznam znotraj posameznega kraja.
  for (const row of ambulanceRows) {
    const city = cityMap.get(row.kraj_id)
    if (!city) {
      continue
    }

    city.dodatne_ambulante.push({
      dodatna_ambulanta_id: row.dodatna_ambulanta_id,
      naziv_ambulante: row.naziv_ambulante,
      ulica: row.ulica,
      izvajalec_id: row.izvajalec_id,
      naziv_izvajalca: row.naziv_izvajalca,
    })
  }

  return sortByInputOrder(
    Array.from(cityMap.values()),
    (city) => city.kraj_id,
    kraji_ids,
  )
}

// Glavna funkcija modula izvede oba SQL poizvedovanja
// in pripravi končni rezultat za frontend.
export async function searchDoctors(
  params: DoctorSearchParams,
): Promise<SearchDoctorsResult> {
  const [doctorsRows, ambulanceRows, updated_at] = await Promise.all([
    getDoctorsRows(params.kraji_ids, params.kategorije_ids),
    getAdditionalAmbulancesRows(params.kraji_ids),
    getLastUpdatedAt(),
  ])

  const cities = buildCityGroups(
    params.kraji_ids,
    doctorsRows,
    ambulanceRows,
  )

  return {
    updated_at,
    filters: {
      kraji_ids: params.kraji_ids,
      kategorije_ids: params.kategorije_ids,
    },
    cities,
  }
}