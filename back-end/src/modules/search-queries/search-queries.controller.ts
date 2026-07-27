// Ta datoteka vsebuje Express kontrolerje za modul iskalnih poizvedb.
// Kontrolerji skrbijo za branje vhodnih podatkov iz HTTP zahtevkov,
// osnovno validacijo, klic servisne plasti in vračanje enotnih JSON odgovorov.

import { NextFunction, Request, Response } from 'express';
import {
  countActiveQueriesByUserId,
  createSearchQuery,
  deleteSearchQuery,
  getQueriesByUserId,
  getQueryById,
  getQueryCityIds,
  updateSearchQuery,
} from './search-queries.service.js';

// Vrne vse iskalne poizvedbe za podanega uporabnika.
export async function getSearchQueriesController(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  try {
    const uporabnikId = Number(req.query.uporabnik_id);

    if (!uporabnikId || Number.isNaN(uporabnikId)) {
      res.status(400).json({
        success: false,
        message: 'uporabnik_id is required',
      });
      return;
    }

    const queries = await getQueriesByUserId(uporabnikId);

    const result = await Promise.all(
      queries.map(async (query) => {
        const kraji_ids = await getQueryCityIds(query.poizvedba_id);

        return {
          ...query,
          aktivna: Boolean(query.aktivna),
          kraji_ids,
        };
      }),
    );

    res.status(200).json({
      success: true,
      data: result,
    });
  } catch (error) {
    next(error);
  }
}

// Vrne eno iskalno poizvedbo glede na njen ID.
export async function getSearchQueryByIdController(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  try {
    const poizvedba_id = Number(req.params.id);

    if (!poizvedba_id || Number.isNaN(poizvedba_id)) {
      res.status(400).json({
        success: false,
        message: 'Invalid query id',
      });
      return;
    }

    const query = await getQueryById(poizvedba_id);

    if (!query) {
      res.status(404).json({
        success: false,
        message: 'Search query not found',
      });
      return;
    }

    const kraji_ids = await getQueryCityIds(poizvedba_id);

    res.status(200).json({
      success: true,
      data: {
        ...query,
        aktivna: Boolean(query.aktivna),
        kraji_ids,
      },
    });
  } catch (error) {
    next(error);
  }
}

// Ustvari novo iskalno poizvedbo in vrne ID ustvarjenega zapisa.
export async function createSearchQueryController(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  try {
    const uporabnik_id = Number(req.body.uporabnik_id);
    const kategorija_id = Number(req.body.kategorija_id);
    const kanal_id = Number(req.body.kanal_id);
    const zunanji_id_kanala = req.body.zunanji_id_kanala?.trim();
    const pogostost = Number(req.body.pogostost);
    const ura_posiljanja = req.body.ura_posiljanja?.trim();
    const aktivna =
      req.body.aktivna === undefined
        ? true
        : req.body.aktivna === true || req.body.aktivna === 'true';

    const kraji_ids = Array.isArray(req.body.kraji_ids)
      ? req.body.kraji_ids
        .map(Number)
        // Po pretvorbi vrednosti ohranimo le veljavna pozitivna števila.
        .filter((value: number) => !Number.isNaN(value) && value > 0)
      : [];

    if (
      !uporabnik_id ||
      Number.isNaN(uporabnik_id) ||
      !kategorija_id ||
      Number.isNaN(kategorija_id) ||
      !kanal_id ||
      Number.isNaN(kanal_id) ||
      !zunanji_id_kanala ||
      !pogostost ||
      Number.isNaN(pogostost) ||
      !ura_posiljanja ||
      kraji_ids.length === 0
    ) {
      res.status(400).json({
        success: false,
        message:
          'uporabnik_id, kategorija_id, kanal_id, zunanji_id_kanala, pogostost, ura_posiljanja and kraji_ids are required',
      });
      return;
    }

    const activeQueriesCount = await countActiveQueriesByUserId(uporabnik_id);

    if (aktivna && activeQueriesCount >= 2) {
      res.status(400).json({
        success: false,
        message: 'User can have at most 2 active search queries',
      });
      return;
    }

    const newQueryId = await createSearchQuery({
      uporabnik_id,
      kategorija_id,
      kanal_id,
      zunanji_id_kanala,
      pogostost,
      ura_posiljanja,
      aktivna,
      kraji_ids,
    });

    res
      .status(201)
      .location(`/api/queries/${newQueryId}`)
      .json({
        success: true,
        message: 'Search query created',
        data: {
          poizvedba_id: newQueryId,
        },
      });
  } catch (error) {
    next(error);
  }
}

// Posodobi obstoječo iskalno poizvedbo.
export async function updateSearchQueryController(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  try {
    const poizvedba_id = Number(req.params.id);
    const kategorija_id = Number(req.body.kategorija_id);
    const kanal_id = Number(req.body.kanal_id);
    const zunanji_id_kanala = req.body.zunanji_id_kanala?.trim();
    const pogostost = Number(req.body.pogostost);
    const ura_posiljanja = req.body.ura_posiljanja?.trim();
    const aktivna =
      req.body.aktivna === undefined
        ? true
        : req.body.aktivna === true || req.body.aktivna === 'true';

    const kraji_ids = Array.isArray(req.body.kraji_ids)
      ? req.body.kraji_ids
          .map(Number)
          .filter((value: number) => !Number.isNaN(value) && value > 0)
      : [];

    if (
      !poizvedba_id ||
      Number.isNaN(poizvedba_id) ||
      !kategorija_id ||
      Number.isNaN(kategorija_id) ||
      !kanal_id ||
      Number.isNaN(kanal_id) ||
      !zunanji_id_kanala ||
      !pogostost ||
      Number.isNaN(pogostost) ||
      !ura_posiljanja ||
      kraji_ids.length === 0
    ) {
      res.status(400).json({
        success: false,
        message:
          'id, kategorija_id, kanal_id, zunanji_id_kanala, pogostost, ura_posiljanja and kraji_ids are required',
      });
      return;
    }

    const existingQuery = await getQueryById(poizvedba_id);

    if (!existingQuery) {
      res.status(404).json({
        success: false,
        message: 'Search query not found',
      });
      return;
    }

    const activeQueriesCount = await countActiveQueriesByUserId(
      existingQuery.uporabnik_id,
    );

    if (aktivna && !existingQuery.aktivna && activeQueriesCount >= 2) {
      res.status(400).json({
        success: false,
        message: 'User can have at most 2 active search queries',
      });
      return;
    }

    const updated = await updateSearchQuery(poizvedba_id, {
      kategorija_id,
      kanal_id,
      zunanji_id_kanala,
      pogostost,
      ura_posiljanja,
      aktivna,
      kraji_ids,
    });

    if (!updated) {
      res.status(404).json({
        success: false,
        message: 'Search query not found',
      });
      return;
    }

    res.status(200).json({
      success: true,
      message: 'Search query updated',
    });
  } catch (error) {
    next(error);
  }
}

// Izbriše iskalno poizvedbo glede na njen ID.
export async function deleteSearchQueryController(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  try {
    const poizvedba_id = Number(req.params.id);

    if (!poizvedba_id || Number.isNaN(poizvedba_id)) {
      res.status(400).json({
        success: false,
        message: 'Invalid query id',
      });
      return;
    }

    const deleted = await deleteSearchQuery(poizvedba_id);

    if (!deleted) {
      res.status(404).json({
        success: false,
        message: 'Search query not found',
      });
      return;
    }

    res.status(200).json({
      success: true,
      message: 'Search query deleted',
    });
  } catch (error) {
    next(error);
  }
}