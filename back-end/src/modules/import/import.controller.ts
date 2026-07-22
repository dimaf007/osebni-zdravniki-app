/**
 * HTTP kontroler za modul uvoza podatkov. Izpostavlja dva endpointa:
 * pridobivanje trenutnega stanja uvoza (GET /status) in ročno sprožitev
 * uvoza podatkov iz ZZZS (POST /run). Vso poslovno logiko delegira
 * na import.service.ts.
 */

import { NextFunction, Request, Response } from 'express';
import { getImportStatus, runZzzsImport } from './import.service.js';

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

// Sproži ročni uvoz podatkov iz ZZZS. Uvoz teče v ozadju, odziv se vrne takoj.
export async function triggerImportController(
  _req: Request,
  res: Response,
  next: NextFunction,
) {
  try {
    runZzzsImport().catch((err) => {
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