import { Router } from 'express';
import { getFinancialReport, getSalesReport, getTripsReport, getQuotationReport, reportPdf } from '../controllers/reports.controller';
import { exportReport } from '../controllers/exports.controller';
import { authenticate, authorize } from '../middleware/auth.middleware';

const router = Router();
router.use(authenticate);
router.get('/financial', authorize('finance.view'), getFinancialReport);
router.get('/sales', authorize('reports.view'), getSalesReport);
router.get('/quotations', authorize('reports.view'), getQuotationReport);
router.get('/trips', authorize('reports.view'), getTripsReport);
router.get('/:type/pdf', (req, res, next) => authorize(req.params.type === 'financial' ? 'finance.view' : 'reports.view')(req, res, next), reportPdf);
router.get('/exports/:type', (req, res, next) => authorize(req.params.type === 'financial' ? 'finance.view' : 'reports.view')(req, res, next), exportReport);
export default router;
