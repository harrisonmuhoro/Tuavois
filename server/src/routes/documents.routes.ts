import { Router } from 'express';
import multer from 'multer';
import path from 'path';
import crypto from 'crypto';
import { deleteDocument, downloadDocument, invoicePdf, listDocuments, quotationPdf, receiptPdf, uploadDocument } from '../controllers/documents.controller';
import { authenticate, authorize } from '../middleware/auth.middleware';
import fs from 'fs';

const uploadDirectory = path.resolve(process.env.UPLOAD_DIR || path.join(process.cwd(), 'uploads'));
fs.mkdirSync(uploadDirectory, { recursive: true });

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadDirectory);
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    cb(null, `${crypto.randomBytes(16).toString('hex')}${ext}`);
  }
});
const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    const allowed = ['application/pdf', 'image/jpeg', 'image/png', 'image/webp', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'application/vnd.ms-excel', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'];
    cb(null, allowed.includes(file.mimetype));
  },
});

const router = Router();
router.use(authenticate);

router.get('/invoices/:id/pdf', authorize('reports.view'), invoicePdf);
router.get('/quotations/:id/pdf', authorize('reports.view'), quotationPdf);
router.get('/receipts/:id/pdf', authorize('reports.view'), receiptPdf);
router.get('/', authorize('clients.view', 'trips.view', 'invoices.view', 'quotations.view'), listDocuments);
router.get('/:id', authorize('clients.view', 'trips.view', 'invoices.view', 'quotations.view'), downloadDocument);
router.delete('/:id', authorize('clients.edit', 'trips.edit', 'invoices.edit', 'quotations.edit'), deleteDocument);

router.post('/', authorize('clients.edit', 'trips.edit'), upload.single('file'), uploadDocument);

export default router;
