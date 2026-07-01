import pool from '../../config/db.js'
import { RowDataPacket } from 'mysql2/promise'

export interface CategoryLookupRow extends RowDataPacket {
  kategorija_id: number
  naziv_kategorije: string
  oznaka_kategorije: string
}

export interface ChannelLookupRow extends RowDataPacket {
  kanal_id: number
  naziv_kanala: string
}

export interface CityLookupRow extends RowDataPacket {
  kraj_id: number
  posta: string
  naziv_kraja: string
  celoten_naziv: string
}

// Pridobi vse kategorije zdravnikov za spustni seznam na frontend strani.
export async function getAllCategories(): Promise<CategoryLookupRow[]> {
  const [rows] = await pool.query<CategoryLookupRow[]>(
    `
      SELECT
        kategorija_id,
        naziv_kategorije,
        oznaka_kategorije
      FROM kategorija_zdravnika
      ORDER BY naziv_kategorije ASC
    `,
  )

  return rows
}

// Pridobi vse kanale obveščanja za spustni seznam na frontend strani.
export async function getAllChannels(): Promise<ChannelLookupRow[]> {
  const [rows] = await pool.query<ChannelLookupRow[]>(
    `
      SELECT
        kanal_id,
        naziv_kanala
      FROM kanal
      ORDER BY kanal_id ASC
    `,
  )

  return rows
}

// Pridobi vse kraje za izbiro pri ustvarjanju ali urejanju naročnine.
export async function getAllCities(): Promise<CityLookupRow[]> {
  const [rows] = await pool.query<CityLookupRow[]>(
    `
      SELECT
        kraj_id,
        posta,
        naziv_kraja,
        celoten_naziv
      FROM kraj
      ORDER BY celoten_naziv ASC
    `,
  )

  return rows
}