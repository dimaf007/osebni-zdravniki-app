/**
 * HTTP kontroler za modul uvoza podatkov. Izpostavlja dva endpointa:
 * - pridobivanje trenutnega stanja uvoza (GET /status)
 * - ročno sprožitev uvoza podatkov iz ZZZS (POST /run)
 *
 * Poslovno logiko delegira na import.service.ts.
 */

import { NextFunction, Request, Response } from 'express';
import { getImportStatus, runZzzsImportIfNeeded } from './import.service.js';

// Vrne trenutno stanje uvoza (idle, running, done, error) in datum zadnjega uvoza.
export async function getImportStatusController(
  _req: Request,
  res: Response,
  next: NextFunction,
) {
  try {
    const statusRow = await getImportStatus();

    if (!statusRow) {
      res.status(404).json({
        success: false,
        message: 'Import status not found',
      });
      return;
    }

    res.status(200).json({
      success: true,
      data: {
        updated_at: statusRow.datum_uvoza,
        status: statusRow.status,
      },
    });
  } catch (error) {
    next(error);
  }
}

// Sproži ročni uvoz podatkov iz ZZZS.
// Uvoz teče v ozadju, odziv pa se vrne takoj.
//
// Pri ročnem zagonu uporabimo force: true, kar pomeni,
// da preskočimo preverjanje, ali je bil uvoz danes že narejen.
// Kljub temu SQL zaklep še vedno prepreči, da bi več instanc
// istočasno začelo isti uvoz.
export async function triggerImportController(
  _req: Request,
  res: Response,
  next: NextFunction,
) {
  try {
    runZzzsImportIfNeeded({ force: true }).catch((err) => {
      console.error('Napaka pri uvozu:', err);
    });

    res.status(202).json({
      success: true,
      message: 'Uvoz podatkov se je začel.',
    });
  } catch (error) {
    next(error);
  }
}