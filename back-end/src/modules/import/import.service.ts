/**
 * Osrednja servisna plast za uvoz podatkov o zdravnikih iz strani ZZZS.
 * Ta datoteka vsebuje:
 * - branje trenutnega statusa uvoza,
 * - preverjanje, ali je bil današnji uvoz že uspešno izveden,
 * - posodabljanje statusa uvoza,
 * - upsert logiko za posamezne tabele,
 * - glavni uvozni proces iz ZZZS,
 * - zaščitno ovojnico za varen zagon uvoza,
 * - SQL zaklep (GET_LOCK / RELEASE_LOCK), ki prepreči,
 *   da bi isti uvoz hkrati zagnalo več instanc aplikacije.
 */

import pool from '../../config/db.js';
import { PoolConnection, ResultSetHeader, RowDataPacket } from 'mysql2/promise';
import { fetchLatestExcelLinks, downloadExcel } from './zzzs-source.service.js';
import { parseAndNormalize } from './zzzs-parser.service.js';

interface ImportStatusRow extends RowDataPacket {
  import_status_id: number;
  datum_uvoza: Date | string | null;
  status: string;
}

interface IdRow extends RowDataPacket {
  kraj_id?: number;
  izvajalec_id?: number;
  dejavnost_id?: number;
  zdravnik_id?: number;
  dodatna_ambulanta_id?: number;
}

interface LockRow extends RowDataPacket {
  acquired?: number | null;
  released?: number | null;
}

const IMPORT_LOCK_NAME = 'osebni_zdravniki.zzzs_import_lock';

// Vrne trenutno vrstico statusa uvoza iz tabele import_status.
export async function getImportStatus(): Promise<ImportStatusRow | null> {
  const [rows] = await pool.query<ImportStatusRow[]>(
    `
    SELECT import_status_id, datum_uvoza, status
    FROM import_status
    WHERE import_status_id = 1
    LIMIT 1
    `,
  );

  return rows[0] ?? null;
}

// Preveri, ali je bil uvoz danes že uspešno zaključen.
export async function isFreshToday(): Promise<boolean> {
  const status = await getImportStatus();

  if (!status?.datum_uvoza || status.status !== 'done') {
    return false;
  }

  const today = new Date().toISOString().slice(0, 10);

  // Če mysql2 vrne datum kot niz, lahko neposredno uporabimo slice().
  if (typeof status.datum_uvoza === 'string') {
    return status.datum_uvoza.slice(0, 10) === today;
  }

  // Če mysql2 vrne datum kot objekt Date, ga pretvorimo v ISO niz.
  if (status.datum_uvoza instanceof Date) {
    return status.datum_uvoza.toISOString().slice(0, 10) === today;
  }

  return false;
}

// Posodobi status uvoza v bazi.
// Če je status "done", hkrati zapišemo tudi čas zadnjega uspešnega uvoza.
export async function setImportStatus(
  status: 'idle' | 'running' | 'done' | 'error',
): Promise<void> {
  if (status === 'done') {
    await pool.query(
      `UPDATE import_status SET status = ?, datum_uvoza = NOW() WHERE import_status_id = 1`,
      [status],
    );
    return;
  }

  await pool.query(
    `UPDATE import_status SET status = ? WHERE import_status_id = 1`,
    [status],
  );
}

// Poskusi pridobiti globalni uporabniški zaklep v MySQL.
// Zaklep je vezan na točno določeno povezavo (connection), zato moramo
// to povezavo hraniti odprto ves čas trajanja uvoza.
//
// GET_LOCK(..., 0) pomeni:
// - če je zaklep prost, ga dobimo takoj;
// - če ga že drži druga instanca, ne čakamo in dobimo rezultat 0.
//
// Vrne objekt z odprto connection povezavo samo v primeru,
// ko je bil zaklep uspešno pridobljen.
async function acquireImportLock(): Promise<PoolConnection | null> {
  const connection = await pool.getConnection();

  try {
    const [rows] = await connection.query<LockRow[]>(
      `SELECT GET_LOCK(?, 0) AS acquired`,
      [IMPORT_LOCK_NAME],
    );

    if (rows[0]?.acquired === 1) {
      return connection;
    }

    connection.release();
    return null;
  } catch (error) {
    connection.release();
    throw error;
  }
}

// Sprosti globalni uporabniški zaklep.
// Zaklep mora sprostiti ista connection povezava, ki ga je pridobila.
async function releaseImportLock(connection: PoolConnection): Promise<void> {
  try {
    await connection.query<LockRow[]>(
      `SELECT RELEASE_LOCK(?) AS released`,
      [IMPORT_LOCK_NAME],
    );
  } finally {
    connection.release();
  }
}

// Varno sproži uvoz le takrat, ko je to smiselno.
// Ta funkcija je primerna tako za samodejni zagon ob startu strežnika
// kot tudi za ročni zagon prek endpointa POST /run.
//
// Zaščita poteka v več korakih:
// 1. poskusimo pridobiti SQL zaklep;
// 2. če zaklepa ne dobimo, pomeni, da druga instanca že izvaja uvoz;
// 3. če zaklep dobimo, preverimo še svežino podatkov;
// 4. šele nato sprožimo glavni uvoz.
export async function runZzzsImportIfNeeded(
  options: { force?: boolean } = {},
): Promise<'started' | 'skipped-locked' | 'skipped-fresh'> {
  const { force = false } = options;

  const lockConnection = await acquireImportLock();

  if (!lockConnection) {
    return 'skipped-locked';
  }

  try {
    if (!force && (await isFreshToday())) {
      return 'skipped-fresh';
    }

    await runZzzsImport();
    return 'started';
  } finally {
    await releaseImportLock(lockConnection);
  }
}

export async function upsertKraj(
  posta: string | null,
  naziv_kraja: string,
  celoten_naziv: string,
): Promise<number> {
  const cleanPosta = posta?.trim() || null;
  const cleanNaziv = naziv_kraja.trim();
  const cleanCeloten = celoten_naziv.trim();

  if (!cleanCeloten) {
    throw new Error('Kraj manjka v izvornih podatkih.');
  }

  const [existing] = await pool.query<IdRow[]>(
    `SELECT kraj_id FROM kraj WHERE celoten_naziv = ? LIMIT 1`,
    [cleanCeloten],
  );

  if (existing[0]?.kraj_id) {
    return existing[0].kraj_id;
  }

  const [result] = await pool.query<ResultSetHeader>(
    `INSERT INTO kraj (posta, naziv_kraja, celoten_naziv) VALUES (?, ?, ?)`,
    [cleanPosta, cleanNaziv || cleanCeloten, cleanCeloten],
  );

  return result.insertId;
}

export async function upsertIzvajalec(
  obmocna_enota: string | null,
  sifra_izvajalca: string,
  naziv_izvajalca: string,
  ulica: string | null,
  kraj_id: number,
): Promise<number> {
  const [existing] = await pool.query<IdRow[]>(
    `SELECT izvajalec_id FROM izvajalec WHERE sifra_izvajalca = ? LIMIT 1`,
    [sifra_izvajalca],
  );

  if (existing[0]?.izvajalec_id) {
    await pool.query(
      `UPDATE izvajalec
       SET obmocna_enota = ?, naziv_izvajalca = ?, ulica = ?, kraj_id = ?
       WHERE izvajalec_id = ?`,
      [obmocna_enota, naziv_izvajalca, ulica, kraj_id, existing[0].izvajalec_id],
    );
    return existing[0].izvajalec_id;
  }

  const [result] = await pool.query<ResultSetHeader>(
    `INSERT INTO izvajalec (obmocna_enota, sifra_izvajalca, naziv_izvajalca, ulica, kraj_id)
     VALUES (?, ?, ?, ?, ?)`,
    [obmocna_enota, sifra_izvajalca, naziv_izvajalca, ulica, kraj_id],
  );

  return result.insertId;
}

export async function upsertDejavnost(
  sifra_zzzs_dejavnosti: string,
  naziv_dejavnosti: string,
  kategorija_id: number,
): Promise<number> {
  const [existing] = await pool.query<IdRow[]>(
    `SELECT dejavnost_id FROM dejavnost WHERE sifra_zzzs_dejavnosti = ? LIMIT 1`,
    [sifra_zzzs_dejavnosti],
  );

  if (existing[0]?.dejavnost_id) {
    return existing[0].dejavnost_id;
  }

  const [result] = await pool.query<ResultSetHeader>(
    `INSERT INTO dejavnost (sifra_zzzs_dejavnosti, naziv_dejavnosti, kategorija_id)
     VALUES (?, ?, ?)`,
    [sifra_zzzs_dejavnosti, naziv_dejavnosti, kategorija_id],
  );

  return result.insertId;
}

export async function upsertZdravnik(
  sifra_zdravnika: string | null,
  priimek_ime: string,
  sprejema: boolean,
  izvajalec_id: number,
  dejavnost_id: number,
): Promise<void> {
  if (sifra_zdravnika) {
    const [existing] = await pool.query<IdRow[]>(
      `SELECT zdravnik_id
       FROM zdravnik
       WHERE sifra_zdravnika = ? AND izvajalec_id = ? AND dejavnost_id = ?
       LIMIT 1`,
      [sifra_zdravnika, izvajalec_id, dejavnost_id],
    );

    if (existing[0]?.zdravnik_id) {
      await pool.query(
        `UPDATE zdravnik
         SET priimek_ime = ?, sprejema = ?
         WHERE zdravnik_id = ?`,
        [priimek_ime, sprejema ? 1 : 0, existing[0].zdravnik_id],
      );
      return;
    }
  }

  const [existingByName] = await pool.query<IdRow[]>(
    `SELECT zdravnik_id
     FROM zdravnik
     WHERE priimek_ime = ? AND izvajalec_id = ? AND dejavnost_id = ?
     LIMIT 1`,
    [priimek_ime, izvajalec_id, dejavnost_id],
  );

  if (existingByName[0]?.zdravnik_id) {
    await pool.query(
      `UPDATE zdravnik
       SET sifra_zdravnika = ?, sprejema = ?
       WHERE zdravnik_id = ?`,
      [sifra_zdravnika, sprejema ? 1 : 0, existingByName[0].zdravnik_id],
    );
    return;
  }

  await pool.query(
    `INSERT INTO zdravnik (sifra_zdravnika, priimek_ime, sprejema, izvajalec_id, dejavnost_id)
     VALUES (?, ?, ?, ?, ?)`,
    [sifra_zdravnika, priimek_ime, sprejema ? 1 : 0, izvajalec_id, dejavnost_id],
  );
}

export async function upsertDodatnaAmbulanta(
  naziv_ambulante: string,
  ulica: string | null,
  izvajalec_id: number,
  kraj_id: number,
): Promise<void> {
  const [existing] = await pool.query<IdRow[]>(
    `SELECT dodatna_ambulanta_id
     FROM dodatna_ambulanta
     WHERE naziv_ambulante = ? AND izvajalec_id = ?
     LIMIT 1`,
    [naziv_ambulante, izvajalec_id],
  );

  if (existing[0]?.dodatna_ambulanta_id) {
    return;
  }

  await pool.query(
    `INSERT INTO dodatna_ambulanta (naziv_ambulante, ulica, izvajalec_id, kraj_id)
     VALUES (?, ?, ?, ?)`,
    [naziv_ambulante, ulica, izvajalec_id, kraj_id],
  );
}

// Glavni uvozni proces:
// 1. status nastavimo na "running",
// 2. pridobimo aktualne Excel povezave iz strani ZZZS,
// 3. prenesemo datoteke,
// 4. jih razčlenimo in normaliziramo,
// 5. podatke zapišemo v bazo,
// 6. ob uspehu status nastavimo na "done",
// 7. ob napaki status nastavimo na "error".
export async function runZzzsImport(): Promise<void> {
  await setImportStatus('running');

  try {
    const links = await fetchLatestExcelLinks();

    const files = {
      SAZO: await downloadExcel(links.SAZO, 'SAZO'),
      SAZO_DADM: await downloadExcel(links.SAZO_DADM, 'SAZO_DADM'),
      GINZO: await downloadExcel(links.GINZO, 'GINZO'),
      ZOBZO: await downloadExcel(links.ZOBZO, 'ZOBZO'),
    };

    const { doctors, ambulances } = await parseAndNormalize(files);

    for (const row of doctors) {
      const kraj_id = await upsertKraj(row.posta, row.naziv_kraja, row.celoten_naziv);
      const izvajalec_id = await upsertIzvajalec(
        row.obmocna_enota,
        row.sifra_izvajalca,
        row.naziv_izvajalca,
        row.ulica,
        kraj_id,
      );
      const dejavnost_id = await upsertDejavnost(
        row.sifra_zzzs_dejavnosti,
        row.naziv_dejavnosti,
        row.kategorija_id,
      );
      await upsertZdravnik(
        row.sifra_zdravnika,
        row.priimek_ime,
        row.sprejema,
        izvajalec_id,
        dejavnost_id,
      );
    }

    for (const row of ambulances) {
      const kraj_id = await upsertKraj(row.posta, row.naziv_kraja, row.celoten_naziv);
      const izvajalec_id = await upsertIzvajalec(
        null,
        row.sifra_izvajalca,
        row.naziv_izvajalca,
        row.ulica,
        kraj_id,
      );
      await upsertDodatnaAmbulanta(row.naziv_ambulante, row.ulica, izvajalec_id, kraj_id);
    }

    await setImportStatus('done');
  } catch (err) {
    await setImportStatus('error');
    throw err;
  }
}