// Glavna vstopna točka back-end aplikacije.
// Tukaj inicializiramo Express strežnik,
// nastavimo osnovne middleware (vmesne programske opreme),
// povežemo modularne API poti in na koncu vključimo centralizirano obdelavo napak.
// Datoteka skrbi tudi za osnovne "health check" poti,
// za zagon strežnika na portu iz konfiguracije
// ter za samodejni poskus uvoza podatkov ob zagonu aplikacije.

import express, { NextFunction, Request, Response } from 'express';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';

import { env } from './config/env.js';
import pool from './config/db.js';
import { errorMiddleware } from './middleware/error.middleware.js';
import authRoutes from './modules/auth/auth.routes.js';
import lookupsRoutes from './modules/lookups/lookups.routes.js';
import searchQueriesRoutes from './modules/search-queries/search-queries.routes.js';
import importRouter from './modules/import/import.routes.js';
import doctorsRoutes from './modules/doctors/doctors.routes.js';
import { runZzzsImportIfNeeded } from './modules/import/import.service.js';

const app = express();

// Ker uporabljamo ESM module, __dirname ni na voljo samodejno.
// Zato ga izračunamo iz URL-ja trenutne datoteke.
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// To je absolutna pot do zgrajenega React front-enda.
// Build bomo po navodilih kopirali v mapo frontend-build
// na ravni back-end projekta.
const frontend_build_path = path.join(__dirname, '../frontend-build');

// Inicializacija Express aplikacije.
// Objekt app predstavlja glavni HTTP strežnik in točko, kjer povezujemo
// middleware, poti in globalno obdelavo napak.

app.use(
  cors({
    origin: env.frontendUrl,
  }),
);

app.use(express.json());
app.use(express.urlencoded({ extended: false }));

// Express naj streže statične datoteke React builda
// (HTML, JS, CSS, slike in druge assete).
app.use(express.static(frontend_build_path));

app.use('/api/queries', searchQueriesRoutes);

app.get('/api/health/db', async (_req: Request, res: Response, next: NextFunction) => {
  try {
    const connection = await pool.getConnection();
    connection.release();

    res.json({
      success: true,
      message: 'Database connection successful',
    });
  } catch (error) {
    next(error);
  }
});

app.use('/api/auth', authRoutes);
app.use('/api/lookups', lookupsRoutes);
app.use('/import', importRouter);
app.use('/api/doctors', doctorsRoutes);

// Za vse ne-API poti vrnemo React index.html,
// da client-side routing deluje tudi ob refreshu strani.
app.get(/^\/(?!api|import).*/, (_req: Request, res: Response) => {
  res.sendFile(path.join(frontend_build_path, 'index.html'));
});

app.use(errorMiddleware);

// Ko se strežnik uspešno zažene, v ozadju poskusimo sprožiti
// samodejni uvoz podatkov iz ZZZS.
//
// Če SQL zaklepa ne dobimo, pomeni, da je uvoz že sprožila druga instanca.
// Če so podatki že sveži za današnji dan, nov uvoz ni potreben.
app.listen(env.port, () => {
  console.log(`Server is running on port ${env.port}`);

  runZzzsImportIfNeeded()
    .then((result) => {
      if (result === 'started') {
        console.log('Samodejni uvoz ZZZS ob zagonu strežnika se je začel.');
      } else if (result === 'skipped-locked') {
        console.log('Samodejni uvoz ZZZS je preskočen, ker zaklep že drži druga instanca.');
      } else if (result === 'skipped-fresh') {
        console.log('Samodejni uvoz ZZZS je preskočen, ker je bil danes že uspešno izveden.');
      }
    })
    .catch((err) => {
      console.error('Napaka pri samodejnem zagonu uvoza ZZZS:', err);
    });
});