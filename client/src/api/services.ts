import api from './client';
import type {
  ApiResponse, Client, Prospect, Quotation, Invoice, Payment,
  Receipt, Trip, Itinerary, Voucher, Notification, DashboardData, User,
} from '../types';

// ---- AUTH ----
export const authApi = {
  login: (data: { email: string; password: string }) => api.post<ApiResponse<{ token: string; user: any; company: import('../types').Company }>>('/auth/login', data),
  logout: () => api.post('/auth/logout'),
  me: () => api.get<ApiResponse<User & { company: import('../types').Company }>>('/auth/me'),
  changePassword: (data: { currentPassword: string; newPassword: string }) => api.put('/auth/change-password', data),
};

// ---- COMPANY PROVISIONING ----
export const companiesApi = {
  provision: (data: { company: Record<string, unknown>; owner: { name: string; email: string; password: string; phone?: string } }) =>
    api.post<ApiResponse<any>>('/companies', data),
};

// ---- ADMIN ----
export const adminApi = {
  getSystemSettings: () => api.get<ApiResponse<any>>('/admin/settings'),
  updateSystemSettings: (data: any) => api.put<ApiResponse<any>>('/admin/settings', data),
  getAuditLogs: (params?: Record<string, any>) => api.get<ApiResponse<any>>('/audit-log', { params }),
};

// ---- SEARCH ----
export const searchApi = {
  global: (q: string) => api.get<ApiResponse<any>>('/search', { params: { q } }),
};

// ---- DASHBOARD ----
export const dashboardApi = {
  get: () => api.get<ApiResponse<DashboardData>>('/dashboard'),
};

// ---- CLIENTS ----
export const clientsApi = {
  list: (params?: Record<string, any>) => api.get<ApiResponse<Client[]>>('/clients', { params }),
  get: (id: string) => api.get<ApiResponse<Client>>(`/clients/${id}`),
  activity: (id: string) => api.get<ApiResponse<any[]>>(`/clients/${id}/activity`),
  create: (data: Partial<Client>) => api.post<ApiResponse<Client>>('/clients', data),
  update: (id: string, data: Partial<Client>) => api.put<ApiResponse<Client>>(`/clients/${id}`, data),
  delete: (id: string) => api.delete(`/clients/${id}`),
};

// ---- PROSPECTS ----
export const prospectsApi = {
  list: (params?: Record<string, any>) => api.get<ApiResponse<Prospect[]>>('/prospects', { params }),
  get: (id: string) => api.get<ApiResponse<Prospect>>(`/prospects/${id}`),
  create: (data: Partial<Prospect>) => api.post<ApiResponse<Prospect>>('/prospects', data),
  update: (id: string, data: Partial<Prospect>) => api.put<ApiResponse<Prospect>>(`/prospects/${id}`, data),
  convert: (id: string) => api.post<ApiResponse<Client>>(`/prospects/${id}/convert`),
};

// ---- QUOTATIONS ----
export const quotationsApi = {
  list: (params?: Record<string, any>) => api.get<ApiResponse<Quotation[]>>('/quotations', { params }),
  get: (id: string) => api.get<ApiResponse<Quotation>>(`/quotations/${id}`),
  create: (data: Partial<Quotation> & { items: any[] }) => api.post<ApiResponse<Quotation>>('/quotations', data),
  update: (id: string, data: Partial<Quotation> & { items: any[] }) => api.put<ApiResponse<Quotation>>(`/quotations/${id}`, data),
  convertToInvoice: (id: string) => api.post<ApiResponse<Invoice>>(`/quotations/${id}/convert-to-invoice`),
  duplicate: (id: string) => api.post<ApiResponse<Quotation>>(`/quotations/${id}/duplicate`),
};

// ---- INVOICES ----
export const invoicesApi = {
  list: (params?: Record<string, any>) => api.get<ApiResponse<Invoice[]>>('/invoices', { params }),
  get: (id: string) => api.get<ApiResponse<Invoice>>(`/invoices/${id}`),
  create: (data: Partial<Invoice> & { items: any[] }) => api.post<ApiResponse<Invoice>>('/invoices', data),
  update: (id: string, data: Partial<Invoice> & { items: any[] }) => api.put<ApiResponse<Invoice>>(`/invoices/${id}`, data),
  updateStatus: (id: string, status: string) => api.patch(`/invoices/${id}/status`, { status }),
};

// ---- PAYMENTS ----
export const paymentsApi = {
  list: (params?: Record<string, any>) => api.get<ApiResponse<Payment[]>>('/payments', { params }),
  create: (data: Partial<Payment>) => api.post<ApiResponse<{ payment: Payment; receipt: Receipt }>>('/payments', data),
};

// ---- RECEIPTS ----
export const receiptsApi = {
  list: (params?: Record<string, any>) => api.get<ApiResponse<Receipt[]>>('/receipts', { params }),
};

export const documentsApi = {
  list: (params: Record<string, string>) => api.get<ApiResponse<any[]>>('/documents', { params }),
  invoice: (id: string) => api.get<Blob>(`/documents/invoices/${id}/pdf`, { responseType: 'blob' }),
  quotation: (id: string) => api.get<Blob>(`/documents/quotations/${id}/pdf`, { responseType: 'blob' }),
  receipt: (id: string) => api.get<Blob>(`/documents/receipts/${id}/pdf`, { responseType: 'blob' }),
  download: (id: string) => api.get<Blob>(`/documents/${id}`, { responseType: 'blob' }),
  remove: (id: string) => api.delete(`/documents/${id}`),
  upload: (file: File, meta: { clientId?: string; tripId?: string; invoiceId?: string; quotationId?: string }) => {
    const formData = new FormData();
    formData.append('file', file);
    if (meta.clientId) formData.append('clientId', meta.clientId);
    if (meta.tripId) formData.append('tripId', meta.tripId);
    if (meta.invoiceId) formData.append('invoiceId', meta.invoiceId);
    if (meta.quotationId) formData.append('quotationId', meta.quotationId);
    return api.post<ApiResponse<any>>('/documents', formData, { headers: { 'Content-Type': 'multipart/form-data' } });
  }
};

export const downloadDocument = async (request: Promise<{ data: Blob }>, filename: string) => {
  const { data } = await request;
  const url = URL.createObjectURL(data);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
};

export const creditNotesApi = {
  list: (params?: Record<string, any>) => api.get<ApiResponse<any[]>>('/credit-notes', { params }),
  create: (data: any) => api.post<ApiResponse<any>>('/credit-notes', data),
  apply: (id: string, amount?: number) => api.post<ApiResponse<any>>(`/credit-notes/${id}/apply`, amount === undefined ? {} : { amount }),
  void: (id: string) => api.post<ApiResponse<any>>(`/credit-notes/${id}/void`),
};

// ---- TRIPS ----
export const tripsApi = {
  list: (params?: Record<string, any>) => api.get<ApiResponse<Trip[]>>('/trips', { params }),
  get: (id: string) => api.get<ApiResponse<Trip>>(`/trips/${id}`),
  create: (data: Partial<Trip>) => api.post<ApiResponse<Trip>>('/trips', data),
  update: (id: string, data: Partial<Trip>) => api.put<ApiResponse<Trip>>(`/trips/${id}`, data),
  addParticipant: (tripId: string, data: any) => api.post(`/trips/${tripId}/participants`, data),
  updateParticipant: (tripId: string, participantId: string, data: any) => api.put(`/trips/${tripId}/participants/${participantId}`, data),
  removeParticipant: (tripId: string, participantId: string) => api.delete(`/trips/${tripId}/participants/${participantId}`),
  addExpense: (tripId: string, data: any) => api.post(`/trips/${tripId}/expenses`, data),
  updateExpense: (tripId: string, expenseId: string, data: any) => api.put(`/trips/${tripId}/expenses/${expenseId}`, data),
  removeExpense: (tripId: string, expenseId: string) => api.delete(`/trips/${tripId}/expenses/${expenseId}`),
};

// ---- ITINERARIES ----
export const itinerariesApi = {
  list: (params?: Record<string, any>) => api.get<ApiResponse<Itinerary[]>>('/itineraries', { params }),
  get: (id: string) => api.get<ApiResponse<Itinerary>>(`/itineraries/${id}`),
  create: (data: Partial<Itinerary>) => api.post<ApiResponse<Itinerary>>('/itineraries', data),
  update: (id: string, data: Partial<Itinerary>) => api.put<ApiResponse<Itinerary>>(`/itineraries/${id}`, data),
  templates: (params?: Record<string, any>) => api.get<ApiResponse<any[]>>('/itineraries/templates', { params }),
  createTemplate: (data: any) => api.post<ApiResponse<any>>('/itineraries/templates', data),
  deleteTemplate: (id: string) => api.delete(`/itineraries/templates/${id}`),
};

// ---- VOUCHERS ----
export const vouchersApi = {
  list: (params?: Record<string, any>) => api.get<ApiResponse<Voucher[]>>('/vouchers', { params }),
  operations: (params?: Record<string, any>) => api.get<ApiResponse<Voucher[]>>('/vouchers/operations', { params }),
  get: (id: string) => api.get<ApiResponse<Voucher>>(`/vouchers/${id}`),
  create: (data: any) => api.post<ApiResponse<Voucher>>('/vouchers', data),
  updateStatus: (id: string, status: string) => api.patch(`/vouchers/${id}/status`, { status }),
  completeOperation: (id: string, operation: 'check-in' | 'check-out') => api.patch(`/vouchers/${id}/operations`, { operation }),
};

export const lettersApi = {
  list: (params?: Record<string, any>) => api.get<ApiResponse<any[]>>('/letters', { params }),
  create: (data: { letterName: string; details: string }) => api.post<ApiResponse<any>>('/letters', data),
  update: (id: string, data: { letterName: string; details: string }) => api.put<ApiResponse<any>>(`/letters/${id}`, data),
  delete: (id: string) => api.delete(`/letters/${id}`),
};

// ---- NOTIFICATIONS ----
export const notificationsApi = {
  list: (params?: Record<string, any>) => api.get<ApiResponse<Notification[]>>('/notifications', { params }),
  markRead: (id: string) => api.put(`/notifications/${id}/read`),
  markAllRead: () => api.put('/notifications/read-all'),
};

export const reportsApi = {
  financial: (params?: Record<string, any>) => api.get('/reports/financial', { params }),
  sales: (params?: Record<string, any>) => api.get('/reports/sales', { params }),
  quotations: (params?: Record<string, any>) => api.get('/reports/quotations', { params }),
  trips: (params?: Record<string, any>) => api.get('/reports/trips', { params }),
  exportExcel: (type: string, params?: Record<string, any>) => api.get(`/reports/exports/${type}`, { params, responseType: 'blob' }),
  pdf: (type: string, params?: Record<string, any>) => api.get(`/reports/${type}/pdf`, { params, responseType: 'blob' }),
};

export const exportsApi = {
  table: (type: 'clients' | 'prospects' | 'quotations' | 'invoices' | 'payments' | 'trips' | 'vouchers' | 'credit-notes', params?: Record<string, string>) => api.get(`/reports/exports/${type}`, { params, responseType: 'blob' }),
};
