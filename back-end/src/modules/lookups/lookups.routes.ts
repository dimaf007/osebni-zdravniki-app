import { Router } from 'express'
import {
  getCategoriesController,
  getChannelsController,
  getCitiesController,
} from './lookups.controller.js'

const router = Router()

// Testni endpoint za preverjanje, ali lookup modul deluje.
router.get('/health', async (req, res) => {
  res.json({
    success: true,
    message: 'Lookups route is working',
  })
})

// Endpoint vrne vse kategorije zdravnikov.
router.get('/categories', getCategoriesController)

// Endpoint vrne vse kanale obveščanja.
router.get('/channels', getChannelsController)

// Endpoint vrne vse kraje.
router.get('/cities', getCitiesController)

export default router