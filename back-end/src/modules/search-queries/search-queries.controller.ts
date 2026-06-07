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

// Возвращает все поисковые запросы пользователя
export async function getSearchQueriesController(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  try {
    const uporabnikId = Number(req.query.uporabnik_id);

    if (!uporabnikId) {
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

// Возвращает один поисковый запрос по id
export async function getSearchQueryByIdController(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  try {
    const poizvedbaId = Number(req.params.id);

    if (!poizvedbaId) {
      res.status(400).json({
        success: false,
        message: 'Invalid query id',
      });
      return;
    }

    const query = await getQueryById(poizvedbaId);

    if (!query) {
      res.status(404).json({
        success: false,
        message: 'Search query not found',
      });
      return;
    }

    const kraji_ids = await getQueryCityIds(poizvedbaId);

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

// Создаёт новый поисковый запрос
export async function createSearchQueryController(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  try {
    const uporabnik_id = Number(req.body.uporabnik_id);
    const kategorija_id = Number(req.body.kategorija_id);
    const kanal_id = Number(req.body.kanal_id);
    const pogostost = Number(req.body.pogostost);
    const ura_posiljanja = req.body.ura_posiljanja?.trim();
    const aktivna = req.body.aktivna === undefined ? true : Boolean(req.body.aktivna);
    const kraji_ids = Array.isArray(req.body.kraji_ids)
      ? req.body.kraji_ids.map(Number).filter(Boolean)
      : [];

    if (
      !uporabnik_id ||
      !kategorija_id ||
      !kanal_id ||
      !pogostost ||
      !ura_posiljanja ||
      kraji_ids.length === 0
    ) {
      res.status(400).json({
        success: false,
        message:
          'uporabnik_id, kategorija_id, kanal_id, pogostost, ura_posiljanja and kraji_ids are required',
      });
      return;
    }

    const activeQueriesCount = await countActiveQueriesByUserId(uporabnik_id);

    if (aktivna && activeQueriesCount >= 3) {
      res.status(400).json({
        success: false,
        message: 'User can have at most 3 active search queries',
      });
      return;
    }

    const newQueryId = await createSearchQuery({
      uporabnik_id,
      kategorija_id,
      kanal_id,
      pogostost,
      ura_posiljanja,
      aktivna,
      kraji_ids,
    });

    res.status(201).json({
      success: true,
      message: 'Search query created',
      poizvedba_id: newQueryId,
    });
  } catch (error) {
    next(error);
  }
}

// Обновляет существующий поисковый запрос
export async function updateSearchQueryController(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  try {
    const poizvedbaId = Number(req.params.id);
    const kategorija_id = Number(req.body.kategorija_id);
    const kanal_id = Number(req.body.kanal_id);
    const pogostost = Number(req.body.pogostost);
    const ura_posiljanja = req.body.ura_posiljanja?.trim();
    const aktivna = Boolean(req.body.aktivna);
    const kraji_ids = Array.isArray(req.body.kraji_ids)
      ? req.body.kraji_ids.map(Number).filter(Boolean)
      : [];

    if (
      !poizvedbaId ||
      !kategorija_id ||
      !kanal_id ||
      !pogostost ||
      !ura_posiljanja ||
      kraji_ids.length === 0
    ) {
      res.status(400).json({
        success: false,
        message:
          'id, kategorija_id, kanal_id, pogostost, ura_posiljanja and kraji_ids are required',
      });
      return;
    }

    const existingQuery = await getQueryById(poizvedbaId);

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

    if (aktivna && !existingQuery.aktivna && activeQueriesCount >= 3) {
      res.status(400).json({
        success: false,
        message: 'User can have at most 3 active search queries',
      });
      return;
    }

    const updated = await updateSearchQuery(poizvedbaId, {
      kategorija_id,
      kanal_id,
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

// Удаляет поисковый запрос
export async function deleteSearchQueryController(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  try {
    const poizvedbaId = Number(req.params.id);

    if (!poizvedbaId) {
      res.status(400).json({
        success: false,
        message: 'Invalid query id',
      });
      return;
    }

    const deleted = await deleteSearchQuery(poizvedbaId);

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