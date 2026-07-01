import { NextFunction, Request, Response } from 'express'
import {
  getAllCategories,
  getAllChannels,
  getAllCities,
} from './lookups.service.js'

// Vrne vse kategorije zdravnikov.
export async function getCategoriesController(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  try {
    const data = await getAllCategories()

    res.json({
      success: true,
      data,
    })
  } catch (error) {
    next(error)
  }
}

// Vrne vse kanale obveščanja.
export async function getChannelsController(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  try {
    const data = await getAllChannels()

    res.json({
      success: true,
      data,
    })
  } catch (error) {
    next(error)
  }
}

// Vrne vse kraje.
export async function getCitiesController(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  try {
    const data = await getAllCities()

    res.json({
      success: true,
      data,
    })
  } catch (error) {
    next(error)
  }
}