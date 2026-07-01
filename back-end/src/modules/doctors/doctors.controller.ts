// Ta datoteka vsebuje controller za javno iskanje zdravnikov.
// Controller prebere vhodne podatke iz request body-ja,
// preveri osnovna pravila validacije in nato preda iskanje service sloju.

import { NextFunction, Request, Response } from 'express'
import { searchDoctors } from './doctors.service.js'

// Pretvori vhodno vrednost v seznam pozitivnih številskih ID-jev.
function parseNumberArray(value: unknown): number[] {
  if (!Array.isArray(value)) {
    return []
  }

  return value
    .map((item) => Number(item))
    .filter((item) => Number.isInteger(item) && item > 0)
}

// Odstrani podvojene ID-je, pri čemer ohrani prvi pojav vsake vrednosti.
function getUniqueNumbers(values: number[]): number[] {
  return Array.from(new Set(values))
}

// Sprejme zahtevo za iskanje zdravnikov, preveri omejitve
// in vrne rezultate v obliki, ki jo frontend lahko neposredno prikaže.
export async function searchDoctorsController(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  try {
    const kraji_ids = getUniqueNumbers(parseNumberArray(req.body.kraji_ids))
    const kategorije_ids = getUniqueNumbers(parseNumberArray(req.body.kategorije_ids))

    // Uporabnik mora izbrati vsaj en kraj.
    if (kraji_ids.length === 0) {
      res.status(400).json({
        success: false,
        message: 'At least one city is required',
      })
      return
    }

    // Uporabnik mora izbrati vsaj eno kategorijo zdravnika.
    if (kategorije_ids.length === 0) {
      res.status(400).json({
        success: false,
        message: 'At least one category is required',
      })
      return
    }

    // Po UX pravilih je dovoljenih največ 3 krajev.
    if (kraji_ids.length > 3) {
      res.status(400).json({
        success: false,
        message: 'At most 3 cities are allowed',
      })
      return
    }

    // Po UX pravilih so dovoljene največ 4 kategorije.
    if (kategorije_ids.length > 4) {
      res.status(400).json({
        success: false,
        message: 'At most 4 categories are allowed',
      })
      return
    }

    const result = await searchDoctors({
      kraji_ids,
      kategorije_ids,
    })

    res.status(200).json({
      success: true,
      data: result,
    })
  } catch (error) {
    next(error)
  }
}