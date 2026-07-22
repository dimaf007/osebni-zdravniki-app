/**
 * Definicija Express poti za modul uvoza podatkov. Povezuje HTTP endpointe
 * s pripadajočimi kontrolerji v import.controller.ts.
 */

import { Router } from 'express';
import { getImportStatusController, triggerImportController } from './import.controller.js';

const router = Router();

// Vrne trenutno stanje uvoza podatkov.
router.get('/status', getImportStatusController);

// Ročno sproži uvoz podatkov iz ZZZS.
router.post('/run', triggerImportController);

export default router;