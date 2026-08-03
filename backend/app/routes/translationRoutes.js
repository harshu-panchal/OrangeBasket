import express from 'express';
import * as translationController from '../controller/translationController.js';

const router = express.Router();

router.post('/', translationController.translateSingle);
router.post('/batch', translationController.translateBatchRoute);
router.post('/object', translationController.translateObjectRoute);

export default router;
