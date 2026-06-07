import { Router } from 'express';
import {
  createSearchQueryController,
  deleteSearchQueryController,
  getSearchQueriesController,
  getSearchQueryByIdController,
  updateSearchQueryController,
} from './search-queries.controller.js';

const router = Router();

router.get('/', getSearchQueriesController);
router.get('/:id', getSearchQueryByIdController);
router.post('/', createSearchQueryController);
router.put('/:id', updateSearchQueryController);
router.delete('/:id', deleteSearchQueryController);

export default router;