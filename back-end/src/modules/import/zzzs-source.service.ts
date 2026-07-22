/**
 * Servis za komunikacijo s spletno stranjo ZZZS. Poišče trenutne povezave
 * do Excel datotek s seznami zdravnikov (SAZO, SAZO_DADM, GINZO, ZOBZO)
 * in jih prenese ter shrani lokalno na disk za nadaljnjo obdelavo.
 */

import axios from 'axios';
import * as cheerio from 'cheerio';
import fs from 'fs';
import path from 'path';

// URL strani ZZZS, kjer so objavljeni seznami zdravnikov v Excel obliki.
const LIST_PAGE_URL =
  'https://zavarovanec.zzzs.si/izbira-in-zamenjava-osebnega-zdravnika/seznami-zdravnikov';

// Mapa, kamor lokalno shranjujemo prenesene Excel datoteke.
const DATA_DIR = path.resolve('data');

export interface ExcelLinks {
  SAZO: string;
  SAZO_DADM: string;
  GINZO: string;
  ZOBZO: string;
}

// Poišče trenutne povezave na Excel datoteke na strani ZZZS.
export async function fetchLatestExcelLinks(): Promise<ExcelLinks> {
  const resp = await axios.get(LIST_PAGE_URL, { timeout: 60000 });
  const $ = cheerio.load(resp.data);

  const links: Partial<ExcelLinks> = {};
  const table = $('table').first();

  // Sprehodimo se skozi vse vrstice tabele in poiščemo opise ter povezave.
  table.find('tr').each((_, row) => {
    const cells = $(row).find('td, th');
    if (cells.length < 2) return;

    const descCell = cells.eq(1);
    const descText = descCell.text().trim().toLowerCase();
    const a = descCell.find('a').first();
    if (!a.length) return;

    const href = a.attr('href');
    if (!href) return;

    // Sestavimo popolni URL, tudi če je povezava relativna.
    const fullUrl = new URL(href, LIST_PAGE_URL).toString();

    // Glede na besedilo opisa določimo, za katero vrsto datoteke gre.
    if (descText.includes('splošnih zdravnikih') || descText.includes('splošnih zdravnikov')) {
      links.SAZO = fullUrl;
    } else if (descText.includes('dodatnih ambulantah')) {
      links.SAZO_DADM = fullUrl;
    } else if (descText.includes('ginekolog')) {
      links.GINZO = fullUrl;
    } else if (descText.includes('zobozdravnik') || descText.includes('zobozdravnikov')) {
      links.ZOBZO = fullUrl;
    }
  });

  // Preverimo, ali smo našli vse štiri potrebne povezave.
  const missing = (['SAZO', 'SAZO_DADM', 'GINZO', 'ZOBZO'] as const).filter(
    (key) => !links[key],
  );
  if (missing.length) {
    throw new Error(`Manjkajo povezave za: ${missing.join(', ')}`);
  }

  return links as ExcelLinks;
}

// Prenese Excel datoteko z podanega URL-ja in jo shrani lokalno.
export async function downloadExcel(url: string, prefix: string): Promise<string> {
  // Ustvarimo mapo za podatke, če še ne obstaja.
  fs.mkdirSync(DATA_DIR, { recursive: true });

  const today = new Date().toISOString().slice(0, 10);
  const filename = `${prefix}_${today}.xlsx`;
  const filePath = path.join(DATA_DIR, filename);

  const resp = await axios.get(url, { responseType: 'arraybuffer', timeout: 60000 });
  fs.writeFileSync(filePath, resp.data);

  return filePath;
}