import pool from '../../config/db.js';
import { ResultSetHeader, RowDataPacket } from 'mysql2/promise';

// Основная строка поискового запроса
export interface SearchQueryRow extends RowDataPacket {
  poizvedba_id: number;
  uporabnik_id: number;
  kategorija_id: number;
  kanal_id: number;
  pogostost: number;
  ura_posiljanja: string;
  zadnje_posiljanje_datum: string | null;
  aktivna: number;
}

// Строка с расширенной информацией для отображения
export interface SearchQueryDetailsRow extends RowDataPacket {
  poizvedba_id: number;
  uporabnik_id: number;
  kategorija_id: number;
  naziv_kategorije: string;
  kanal_id: number;
  naziv_kanala: string;
  pogostost: number;
  ura_posiljanja: string;
  zadnje_posiljanje_datum: string | null;
  aktivna: number;
}

// Подсчитывает количество активных запросов пользователя
export async function countActiveQueriesByUserId(
  uporabnikId: number,
): Promise<number> {
  const [rows] = await pool.query<RowDataPacket[]>(
    `
      SELECT COUNT(*) AS total
      FROM iskalna_poizvedba
      WHERE uporabnik_id = ? AND aktivna = 1
    `,
    [uporabnikId],
  );

  return Number(rows[0]?.total ?? 0);
}

// Получает все поисковые запросы конкретного пользователя
export async function getQueriesByUserId(
  uporabnikId: number,
): Promise<SearchQueryDetailsRow[]> {
  const [rows] = await pool.query<SearchQueryDetailsRow[]>(
    `
      SELECT
        ip.poizvedba_id,
        ip.uporabnik_id,
        ip.kategorija_id,
        kz.naziv_kategorije,
        ip.kanal_id,
        k.naziv_kanala,
        ip.pogostost,
        ip.ura_posiljanja,
        ip.zadnje_posiljanje_datum,
        ip.aktivna
      FROM iskalna_poizvedba ip
      INNER JOIN kategorija_zdravnika kz
        ON kz.kategorija_id = ip.kategorija_id
      INNER JOIN kanal k
        ON k.kanal_id = ip.kanal_id
      WHERE ip.uporabnik_id = ?
      ORDER BY ip.poizvedba_id DESC
    `,
    [uporabnikId],
  );

  return rows;
}

// Получает один поисковый запрос по id
export async function getQueryById(
  poizvedbaId: number,
): Promise<SearchQueryDetailsRow | null> {
  const [rows] = await pool.query<SearchQueryDetailsRow[]>(
    `
      SELECT
        ip.poizvedba_id,
        ip.uporabnik_id,
        ip.kategorija_id,
        kz.naziv_kategorije,
        ip.kanal_id,
        k.naziv_kanala,
        ip.pogostost,
        ip.ura_posiljanja,
        ip.zadnje_posiljanje_datum,
        ip.aktivna
      FROM iskalna_poizvedba ip
      INNER JOIN kategorija_zdravnika kz
        ON kz.kategorija_id = ip.kategorija_id
      INNER JOIN kanal k
        ON k.kanal_id = ip.kanal_id
      WHERE ip.poizvedba_id = ?
      LIMIT 1
    `,
    [poizvedbaId],
  );

  return rows[0] ?? null;
}

// Получает id всех городов, связанных с поисковым запросом
export async function getQueryCityIds(poizvedbaId: number): Promise<number[]> {
  const [rows] = await pool.query<RowDataPacket[]>(
    `
      SELECT kraj_id
      FROM poizvedba_kraj
      WHERE poizvedba_id = ?
      ORDER BY kraj_id ASC
    `,
    [poizvedbaId],
  );

  return rows.map((row) => Number(row.kraj_id));
}

// Создаёт новый поисковый запрос и привязывает города
export async function createSearchQuery(data: {
  uporabnik_id: number;
  kategorija_id: number;
  kanal_id: number;
  pogostost: number;
  ura_posiljanja: string;
  aktivna: boolean;
  kraji_ids: number[];
}): Promise<number> {
  const connection = await pool.getConnection();

  try {
    await connection.beginTransaction();

    const [insertResult] = await connection.query<ResultSetHeader>(
      `
        INSERT INTO iskalna_poizvedba
        (
          uporabnik_id,
          kategorija_id,
          kanal_id,
          pogostost,
          ura_posiljanja,
          aktivna
        )
        VALUES (?, ?, ?, ?, ?, ?)
      `,
      [
        data.uporabnik_id,
        data.kategorija_id,
        data.kanal_id,
        data.pogostost,
        data.ura_posiljanja,
        data.aktivna ? 1 : 0,
      ],
    );

    const poizvedbaId = insertResult.insertId;

    for (const krajId of data.kraji_ids) {
      await connection.query(
        `
          INSERT INTO poizvedba_kraj
          (
            poizvedba_id,
            kraj_id
          )
          VALUES (?, ?)
        `,
        [poizvedbaId, krajId],
      );
    }

    await connection.commit();

    return poizvedbaId;
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
}

// Обновляет поисковый запрос и заново сохраняет связанные города
export async function updateSearchQuery(
  poizvedbaId: number,
  data: {
    kategorija_id: number;
    kanal_id: number;
    pogostost: number;
    ura_posiljanja: string;
    aktivna: boolean;
    kraji_ids: number[];
  },
): Promise<boolean> {
  const connection = await pool.getConnection();

  try {
    await connection.beginTransaction();

    const [updateResult] = await connection.query<ResultSetHeader>(
      `
        UPDATE iskalna_poizvedba
        SET
          kategorija_id = ?,
          kanal_id = ?,
          pogostost = ?,
          ura_posiljanja = ?,
          aktivna = ?
        WHERE poizvedba_id = ?
      `,
      [
        data.kategorija_id,
        data.kanal_id,
        data.pogostost,
        data.ura_posiljanja,
        data.aktivna ? 1 : 0,
        poizvedbaId,
      ],
    );

    if (updateResult.affectedRows === 0) {
      await connection.rollback();
      return false;
    }

    await connection.query(
      `
        DELETE FROM poizvedba_kraj
        WHERE poizvedba_id = ?
      `,
      [poizvedbaId],
    );

    for (const krajId of data.kraji_ids) {
      await connection.query(
        `
          INSERT INTO poizvedba_kraj
          (
            poizvedba_id,
            kraj_id
          )
          VALUES (?, ?)
        `,
        [poizvedbaId, krajId],
      );
    }

    await connection.commit();

    return true;
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
}

// Удаляет поисковый запрос
export async function deleteSearchQuery(poizvedbaId: number): Promise<boolean> {
  const [result] = await pool.query<ResultSetHeader>(
    `
      DELETE FROM iskalna_poizvedba
      WHERE poizvedba_id = ?
    `,
    [poizvedbaId],
  );

  return result.affectedRows > 0;
}