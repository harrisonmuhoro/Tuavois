import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import path from 'path';
import fs from 'fs';
import { validateEnvironment } from './config/environment';

import { errorHandler } from './middleware/error.middleware';

// Routes
import authRoutes from './routes/auth.routes';
import clientRoutes from './routes/clients.routes';
import prospectRoutes from './routes/prospects.routes';
import quotationRoutes from './routes/quotations.routes';
import invoiceRoutes from './routes/invoices.routes';
import paymentRoutes from './routes/payments.routes';
import tripRoutes from './routes/trips.routes';
import itineraryRoutes from './routes/itineraries.routes';
import voucherRoutes from './routes/vouchers.routes';
import { getDashboard } from './controllers/dashboard.controller';
import { authenticate, authorize } from './middleware/auth.middleware';
import { getReceipts } from './controllers/payments.controller';
import reportsRoutes from './routes/reports.routes';
import notificationsRoutes from './routes/notifications.routes';
import auditRoutes from './routes/audit.routes';
import adminRoutes from './routes/admin.routes';
import documentsRoutes from './routes/documents.routes';
import creditNotesRoutes from './routes/credit-notes.routes';
import lettersRoutes from './routes/letters.routes';
import searchRoutes from './routes/search.routes';
import companiesRoutes from './routes/companies.routes';
import systemRoutes from './routes/system.routes';

validateEnvironment();
const app = express();

// Security
app.use(helmet());
app.use(cors({
  origin: (origin, callback) => {
    // Allow requests with no origin (mobile apps, Postman, curl)
    if (!origin) return callback(null, true);
    // Allow any localhost / 127.0.0.1 port during development
    if (/^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(origin)) return callback(null, true);
    // In production, restrict to CLIENT_URL env var
    if (process.env.CLIENT_URL && origin === process.env.CLIENT_URL) return callback(null, true);
    callback(new Error('Not allowed by CORS'));
  },
  credentials: true,
}));

// Rate limiting
const limiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 500, standardHeaders: true });
app.use('/api', limiter);

// Auth rate limiting (stricter)
const authLimiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 20, standardHeaders: true });
app.use('/api/v1/auth/login', authLimiter);
const companyProvisioningLimiter = rateLimit({ windowMs: 60 * 60 * 1000, max: 5, standardHeaders: true });
app.use('/api/v1/companies', companyProvisioningLimiter);

// Body parsing
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Health check
app.get('/api/v1/health', (_req, res) => {
  res.json({ success: true, message: 'TuaVois API is running', timestamp: new Date().toISOString() });
});

// Public API reference endpoints (the specification contains no credentials).
app.get('/api/v1/openapi.yaml', (_req, res) => {
  res.type('text/yaml').send(fs.readFileSync(path.join(__dirname, '..', '..', 'docs', 'openapi.yaml'), 'utf8'));
});
app.get('/api/v1/docs', (_req, res) => {
  res.type('html').send('<!doctype html><html><head><meta charset="utf-8"><title>TuaVois API documentation</title><style>body{font:16px system-ui;max-width:900px;margin:40px auto;padding:0 20px;color:#172033}code{background:#f1f5f9;padding:3px 6px;border-radius:4px}a{color:#0f4c81}</style></head><body><h1>TuaVois API</h1><p>Authenticated REST API for travel operations, CRM, finance, reports, documents, and notifications.</p><p>Download the <a href="/api/v1/openapi.yaml">OpenAPI 3.1 specification</a>.</p><h2>Authentication</h2><p>Send a JWT using <code>Authorization: Bearer &lt;token&gt;</code>.</p><h2>Base URL</h2><p><code>/api/v1</code></p></body></html>');
});

// Dashboard
app.get('/api/v1/dashboard', authenticate, authorize('dashboard.view'), getDashboard);

// Receipts (standalone route)
app.get('/api/v1/receipts', authenticate, authorize('payments.view'), getReceipts);

// Module routes
app.use('/api/v1/auth', authRoutes);
app.use('/api/v1/companies', companiesRoutes);
app.use('/api/v1/system', systemRoutes);
app.use('/api/v1/clients', clientRoutes);
app.use('/api/v1/prospects', prospectRoutes);
app.use('/api/v1/quotations', quotationRoutes);
app.use('/api/v1/invoices', invoiceRoutes);
app.use('/api/v1/payments', paymentRoutes);
app.use('/api/v1/trips', tripRoutes);
app.use('/api/v1/itineraries', itineraryRoutes);
app.use('/api/v1/vouchers', voucherRoutes);
app.use('/api/v1/reports', reportsRoutes);
app.use('/api/v1/notifications', notificationsRoutes);
app.use('/api/v1/audit-log', auditRoutes);
app.use('/api/v1/admin', adminRoutes);
app.use('/api/v1/documents', documentsRoutes);
app.use('/api/v1/credit-notes', creditNotesRoutes);
app.use('/api/v1/letters', lettersRoutes);
app.use('/api/v1/search', searchRoutes);

// 404
app.use((_req, res) => {
  res.status(404).json({ success: false, message: 'Route not found' });
});

// Error handler (must be last)
app.use(errorHandler);

export default app;
