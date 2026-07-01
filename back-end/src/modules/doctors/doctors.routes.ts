// Ta datoteka določa HTTP poti za javni modul iskanja zdravnikov.
// Trenutno vsebuje glavni endpoint za zagon iskanja po krajih
// in kategorijah zdravnikov, kot jih izbere uporabnik na frontend strani.

import { Router } from 'express'
import { searchDoctorsController } from './doctors.controller.js'

const router = Router()

// Zažene iskanje zdravnikov in dodatnih ambulant glede na podane filtre.
router.post('/search', searchDoctorsController)

export default router