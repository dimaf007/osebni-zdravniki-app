/**
 * Servis za razčlenjevanje in normalizacijo Excel datotek ZZZS. Prebere
 * datoteke zdravnikov (SAZO, GINZO, ZOBZO) in dodatnih ambulant (SAZO_DADM),
 * poišče glavo tabele, določi kategorijo zdravnika glede na naziv dejavnosti
 * in vrne poenoteno strukturo podatkov, pripravljeno za shranjevanje v bazo.
 */

import XLSX from 'xlsx';

export interface DoctorImportRow {
  posta: string | null;
  naziv_kraja: string;
  celoten_naziv: string;
  obmocna_enota: string | null;
  sifra_izvajalca: string;
  naziv_izvajalca: string;
  ulica: string | null;
  sifra_zzzs_dejavnosti: string;
  naziv_dejavnosti: string;
  kategorija_id: number;
  sifra_zdravnika: string | null;
  priimek_ime: string;
  sprejema: boolean;
}

export interface AmbulanceImportRow {
  posta: string | null;
  naziv_kraja: string;
  celoten_naziv: string;
  sifra_izvajalca: string;
  naziv_izvajalca: string;
  ulica: string | null;
  naziv_ambulante: string;
}

const TYPE_MAPPING: Record<string, string[]> = {
  SEM: ['SPLOŠNA DEJAVNOST - SPLOŠNA AMBULANTA', 'AMB. SPECIALIZANTA DRUŽINSKE MEDICINE'],
  PED: ['SPLOŠNA DEJ.-OTROCI IN ŠOLSKI DISPANZER'],
  GIN: ['SPLOŠNA DEJAVNOST - DISPANZER ZA ŽENSKE'],
  ZOB: ['ZOBOZDR. DEJAVNOST-ZDRAVLJENJE ODRASLIH', 'ZOBOZDR. DEJAVNOST-ZDRAVLJENJE MLADINE'],
};

const CATEGORY_ID_BY_CODE: Record<string, number> = {
  SEM: 1,
  PED: 2,
  GIN: 3,
  ZOB: 4,
};

async function readSheetRows(filePath: string): Promise<string[][]> {
  const workbook = XLSX.readFile(filePath);
  const firstSheetName = workbook.SheetNames[0];

  if (!firstSheetName) {
    throw new Error(`V datoteki ${filePath} ni delovnega lista.`);
  }

  const sheet = workbook.Sheets[firstSheetName];
  const raw = XLSX.utils
    .sheet_to_json<(string | number | boolean | null)[]>(sheet, {
      header: 1,
      raw: false,
      defval: '',
    })
    .map((row) => row.map((v) => String(v ?? '').trim()));

  const headerIdx = raw.findIndex((r) => r[0] === 'Območna enota izvajalca');
  if (headerIdx === -1) {
    throw new Error(`V datoteki ${filePath} ni mogoče najti vrstice z glavo tabele.`);
  }

  const header = raw[headerIdx];
  const dataRows = raw.slice(headerIdx + 1).filter((r) => r.some((v) => v));

  return [header, ...dataRows];
}

function parseKraj(value: string | undefined): {
  posta: string | null;
  naziv_kraja: string;
  celoten_naziv: string;
} {
  const raw = (value ?? '').trim();

  if (!raw) {
    return {
      posta: null,
      naziv_kraja: '',
      celoten_naziv: '',
    };
  }

  const match = raw.match(/^(\d{4})\s+(.+)$/);

  if (match) {
    return {
      posta: match[1],
      naziv_kraja: match[2].trim(),
      celoten_naziv: raw,
    };
  }

  return {
    posta: null,
    naziv_kraja: raw,
    celoten_naziv: raw,
  };
}

function findCategoryForActivity(naziv: string): number | null {
  const upper = naziv.trim().toUpperCase();
  for (const [code, values] of Object.entries(TYPE_MAPPING)) {
    if (values.some((v) => v.toUpperCase() === upper)) {
      return CATEGORY_ID_BY_CODE[code];
    }
  }
  return null;
}

async function parseDoctorFile(filePath: string): Promise<DoctorImportRow[]> {
  const [header, ...rows] = await readSheetRows(filePath);
  const col = (name: string) => header.indexOf(name);

  const idx = {
    kraj: col('Kraj'),
    dejavnost: col('Naziv ZZZS dejavnosti'),
    sprejema: col('Zdravnik še sprejema zavarovane osebe'),
    priimekIme: col('Priimek in ime zdravnika'),
    izvajalec: col('Naziv izvajalca'),
    ulica: col('Ulica'),
    sifraIzvajalca: col('Šifra izvajalca'),
    sifraZdravnika: col('Šifra zdravnika'),
    obmocnaEnota: col('Območna enota izvajalca'),
    sifraDejavnosti: col('Šifra ZZZS dejavnosti'),
  };

  const result: DoctorImportRow[] = [];

  for (const r of rows) {
    const kategorija_id = findCategoryForActivity(r[idx.dejavnost] ?? '');
    if (!kategorija_id) continue;

    const kraj = parseKraj(r[idx.kraj]);

    if (!kraj.celoten_naziv) continue;

    result.push({
      posta: kraj.posta,
      naziv_kraja: kraj.naziv_kraja,
      celoten_naziv: kraj.celoten_naziv,
      obmocna_enota: idx.obmocnaEnota >= 0 ? r[idx.obmocnaEnota] : null,
      sifra_izvajalca: idx.sifraIzvajalca >= 0 ? r[idx.sifraIzvajalca] : (r[idx.izvajalec] ?? ''),
      naziv_izvajalca: r[idx.izvajalec] ?? '',
      ulica: idx.ulica >= 0 ? r[idx.ulica] : null,
      sifra_zzzs_dejavnosti: idx.sifraDejavnosti >= 0 ? r[idx.sifraDejavnosti] : (r[idx.dejavnost] ?? ''),
      naziv_dejavnosti: r[idx.dejavnost] ?? '',
      kategorija_id,
      sifra_zdravnika: idx.sifraZdravnika >= 0 ? r[idx.sifraZdravnika] : null,
      priimek_ime: r[idx.priimekIme] ?? '',
      sprejema: (r[idx.sprejema] ?? '').toUpperCase() === 'DA',
    });
  }

  return result;
}

async function parseAmbulanceFile(filePath: string): Promise<AmbulanceImportRow[]> {
  const [header, ...rows] = await readSheetRows(filePath);
  const col = (name: string) => header.indexOf(name);

  const idx = {
    izvajalec: col('Naziv izvajalca'),
    ulica: col('Ulica'),
    kraj: col('Kraj'),
    sifraIzvajalca: col('Šifra izvajalca'),
  };

  return rows
    .map((r) => {
      const kraj = parseKraj(r[idx.kraj]);

      return {
        posta: kraj.posta,
        naziv_kraja: kraj.naziv_kraja,
        celoten_naziv: kraj.celoten_naziv,
        sifra_izvajalca: idx.sifraIzvajalca >= 0 ? r[idx.sifraIzvajalca] : (r[idx.izvajalec] ?? ''),
        naziv_izvajalca: r[idx.izvajalec] ?? '',
        ulica: idx.ulica >= 0 ? r[idx.ulica] : null,
        naziv_ambulante: r[idx.izvajalec] ?? '',
      };
    })
    .filter((row) => row.celoten_naziv);
}

export async function parseAndNormalize(files: {
  SAZO: string;
  SAZO_DADM: string;
  GINZO: string;
  ZOBZO: string;
}): Promise<{ doctors: DoctorImportRow[]; ambulances: AmbulanceImportRow[] }> {
  const [sazo, ginzo, zobzo] = await Promise.all([
    parseDoctorFile(files.SAZO),
    parseDoctorFile(files.GINZO),
    parseDoctorFile(files.ZOBZO),
  ]);

  const ambulances = await parseAmbulanceFile(files.SAZO_DADM);

  return {
    doctors: [...sazo, ...ginzo, ...zobzo],
    ambulances,
  };
}