import express from 'express';
import { createPayment } from '../controllers/create-payment-intent.js';

const router = express.Router();

router.post('/create-payment-intent', createPayment);

export default router;