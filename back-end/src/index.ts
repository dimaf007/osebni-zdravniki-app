// Glavna vstopna točka back-end aplikacije.
// Tukaj inicializiramo Express strežnik,
// nastavimo osnovne middleware (vmesne programske opreme),
// povežemo modularne API poti in na koncu vključimo centralizirano obdelavo napak.
// Datoteka skrbi tudi za osnovne "health check" poti
// ter za zagon strežnika na portu iz konfiguracije.

import express, { NextFunction, Request, Response } from 'express';
import cors from 'cors';
import { env } from './config/env.js';
import pool from './config/db.js';
import { errorMiddleware } from './middleware/error.middleware.js';
import authRoutes from './modules/auth/auth.routes.js';
import lookupsRoutes from './modules/lookups/lookups.routes.js';
import searchQueriesRoutes from './modules/search-queries/search-queries.routes.js';
import importRouter from './modules/import/import.routes.js';
import doctorsRoutes from './modules/doctors/doctors.routes.js';

const app = express();

// Inicializacija Express aplikacije
// Objekt app predstavlja glavni HTTP strežnik in točko, kjer povezujemo
// middleware, poti in globalno obdelavo napak.

// Dovolimo CORS samo za front-end aplikacijo iz konfiguracije.
// S tem preprečimo dostop iz nepooblaščenih izvorov.
app.use(
  cors({
    origin: env.frontendUrl,
  }),
);

// Omogoča obdelavo JSON telesa zahtevkov.
// Potrebno za POST/PUT/PATCH zahteve, kjer front-end pošilja JSON.
app.use(express.json());

// Omogoča obdelavo application/x-www-form-urlencoded podatkov.
// Uporabno za klasične HTML obrazce ali določene starejše odjemalce.
app.use(express.urlencoded({ extended: false }));

// Modularne poti za upravljanje iskalnih poizvedb uporabnika.
app.use('/api/queries', searchQueriesRoutes);

// Osnovna testna pot za preverjanje, ali strežnik deluje.
app.get('/', async (_req: Request, res: Response) => {
  res.send('Osebni Zdravniki backend is running');
});

// Testna pot za preverjanje povezave z bazo podatkov.
// Strežnik poskusi pridobiti povezavo iz connection pool-a in jo takoj vrne.
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

// Povezava modularnih API poti.
// Vsak modul skrbi za svojo funkcionalnost in svoje endpoint-e.
app.use('/api/auth', authRoutes);
app.use('/api/lookups', lookupsRoutes);
app.use('/import', importRouter);
app.use('/api/doctors', doctorsRoutes);

// Centraliziran middleware za obdelavo napak.
// Ta mora biti registriran za vsemi potmi in drugimi middleware funkcijami.
app.use(errorMiddleware);

// Zagon HTTP strežnika na portu iz konfiguracije okolja.
app.listen(env.port, () => {
  console.log(`Server is running on port ${env.port}`);
});